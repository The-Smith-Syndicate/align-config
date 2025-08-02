// parser.js
const fs = require('fs');

function parseAlign(content) {
  const lines = content.split('\n');
  const config = {};
  let currentBlock = null;
  let currentBlockName = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines and comments
    if (line === '' || line.startsWith('#') || line.startsWith('//')) {
      continue;
    }

    // Handle block start
    if (line.includes('{')) {
      const match = line.match(/(\w+)\s*"([^"]+)"\s*\{/);
      if (match) {
        currentBlock = match[1];
        currentBlockName = match[2];
        continue;
      }
    }

    // Handle block end
    if (line === '}') {
      currentBlock = null;
      currentBlockName = null;
      continue;
    }

    // Handle key-value pairs
    const equalIndex = line.indexOf('=');
    if (equalIndex !== -1) {
      const key = line.substring(0, equalIndex).trim();
      const rawValue = line.substring(equalIndex + 1).trim();
      
      if (!key) {
        throw new Error(`Invalid syntax on line ${i + 1}: empty key`);
      }
      
      let value = parseValue(rawValue);
      
      // Handle nested keys
      if (currentBlock && currentBlockName) {
        const nestedKey = `${currentBlock}.${currentBlockName}.${key}`;
        config[nestedKey] = value;
      } else {
        config[key] = value;
      }
    } else if (line && !line.startsWith('#') && !line.startsWith('//') && !line.includes('{') && line !== '}') {
      // If we have a non-empty line that's not a comment, block start/end, or key-value, it's invalid
      throw new Error(`Invalid syntax on line ${i + 1}: missing '='`);
    }
  }

  return config;
}

function parseValue(rawValue) {
  // Strip inline comments (but not URLs)
  const value = rawValue.replace(/#.*$|\/\/\s.*$/, '').trim();
  
  // Handle arrays (check before quoted strings to avoid conflicts)
  if (value.startsWith('[') && value.endsWith(']')) {
    const arrayContent = value.slice(1, -1).trim();
    if (arrayContent === '') return [];
    
    // Split by comma and handle quoted items
    const items = arrayContent.split(',').map(item => {
      const trimmed = item.trim();
      // Remove quotes from array items
      if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || 
          (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
        return trimmed.slice(1, -1);
      }
      return trimmed;
    });
    
    return items;
  }
  
  // Handle quoted strings
  if ((value.startsWith('"') && value.endsWith('"')) || 
      (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  
  // Handle booleans
  if (value === 'true' || value === 'false') {
    return value === 'true';
  }
  
  // Handle numbers
  const num = parseFloat(value);
  if (!isNaN(num)) {
    return num;
  }
  
  // Return as string
  return value;
}

function loadSchema(schemaPath) {
  try {
    if (!schemaPath || !fs.existsSync(schemaPath)) {
      return null;
    }
    
    const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
    return JSON.parse(schemaContent);
  } catch (err) {
    throw new Error(`Failed to load schema: ${err.message}`);
  }
}

function validateConfig(config, isBaseConfig = false, schema = null) {
  const errors = [];

  // Schema-based validation
  if (schema) {
    for (const [key, rules] of Object.entries(schema)) {
      const value = config[key];
      
      // Check required fields only for base configs or if the key is present
      if (rules.required && isBaseConfig && value === undefined) {
        errors.push(`Missing required key: ${key}`);
        continue;
      }
      
      // Skip if not present and not required
      if (value === undefined) {
        continue;
      }
      
      // Type validation
      if (rules.type) {
        const expectedType = rules.type;
        const actualType = typeof value;
        
        if (expectedType === 'number' && actualType !== 'number') {
          errors.push(`${key} must be a number, got ${actualType}`);
        } else if (expectedType === 'boolean' && actualType !== 'boolean') {
          errors.push(`${key} must be a boolean, got ${actualType}`);
        } else if (expectedType === 'string' && actualType !== 'string') {
          errors.push(`${key} must be a string, got ${actualType}`);
        }
      }
      
      // Range validation for numbers
      if (rules.type === 'number' && typeof value === 'number') {
        if (rules.min !== undefined && value < rules.min) {
          errors.push(`${key} must be >= ${rules.min}, got ${value}`);
        }
        if (rules.max !== undefined && value > rules.max) {
          errors.push(`${key} must be <= ${rules.max}, got ${value}`);
        }
      }
      
      // String validation
      if (rules.type === 'string' && typeof value === 'string') {
        if (rules.minLength !== undefined && value.length < rules.minLength) {
          errors.push(`${key} must be at least ${rules.minLength} characters, got ${value.length}`);
        }
        if (rules.maxLength !== undefined && value.length > rules.maxLength) {
          errors.push(`${key} must be at most ${rules.maxLength} characters, got ${value.length}`);
        }
        if (rules.pattern && !new RegExp(rules.pattern).test(value)) {
          errors.push(`${key} must match pattern ${rules.pattern}, got "${value}"`);
        }
      }
    }
  } else {
    // Legacy validation (only for base configs)
    if (isBaseConfig) {
      if (!('service_name' in config)) {
        errors.push('Missing required key: service_name');
      }
    }

    // Type validation for all configs
    if ('timeout' in config && typeof config.timeout !== 'number') {
      errors.push('timeout must be a number');
    }

    if ('auth_required' in config && typeof config.auth_required !== 'boolean') {
      errors.push('auth_required must be true or false');
    }

    if ('service_name' in config && typeof config.service_name !== 'string') {
      errors.push('service_name must be a string');
    }

    if ('debug' in config && typeof config.debug !== 'boolean') {
      errors.push('debug must be true or false');
    }

    if ('port' in config && typeof config.port !== 'number') {
      errors.push('port must be a number');
    }

    if ('database_url' in config && typeof config.database_url !== 'string') {
      errors.push('database_url must be a string');
    }

    if ('log_level' in config && typeof config.log_level !== 'string') {
      errors.push('log_level must be a string');
    }
  }

  return errors;
}

function mergeConfigs(baseConfig, envConfig) {
  return { ...baseConfig, ...envConfig };
}

// SMART ANALYSIS FUNCTIONS
function performSmartAnalysis(config, environment, detailed = false) {
  const analysis = {
    summary: {
      totalIssues: 0,
      securityIssues: 0,
      performanceIssues: 0,
      bestPracticeIssues: 0,
      goodPractices: 0
    },
    security: {
      critical: [],
      warnings: [],
      recommendations: []
    },
    performance: {
      issues: [],
      optimizations: [],
      recommendations: []
    },
    bestPractices: {
      missing: [],
      recommendations: [],
      goodPractices: []
    },
    environment: {
      specific: [],
      recommendations: []
    }
  };

  // Security Analysis
  analyzeSecurity(config, environment, analysis, detailed);
  
  // Performance Analysis
  analyzePerformance(config, environment, analysis, detailed);
  
  // Best Practices Analysis
  analyzeBestPractices(config, environment, analysis, detailed);
  
  // Environment-Specific Analysis
  analyzeEnvironmentSpecific(config, environment, analysis, detailed);

  // Calculate summary
  analysis.summary.totalIssues = 
    analysis.security.critical.length + 
    analysis.security.warnings.length +
    analysis.performance.issues.length +
    analysis.bestPractices.missing.length;

  analysis.summary.securityIssues = 
    analysis.security.critical.length + 
    analysis.security.warnings.length;

  analysis.summary.performanceIssues = 
    analysis.performance.issues.length;

  analysis.summary.bestPracticeIssues = 
    analysis.bestPractices.missing.length;

  analysis.summary.goodPractices = 
    analysis.bestPractices.goodPractices.length;

  return analysis;
}

function analyzeSecurity(config, environment, analysis, detailed) {
  // JWT Secret Analysis
  if (config.jwt_secret) {
    if (config.jwt_secret.length < 32) {
      analysis.security.critical.push({
        issue: "Weak JWT Secret",
        description: `JWT secret is only ${config.jwt_secret.length} characters long`,
        recommendation: "Use a secret of at least 32 characters",
        impact: "Critical security vulnerability",
        fix: "Generate a strong random secret of 32+ characters"
      });
    } else if (config.jwt_secret.length < 64) {
      analysis.security.warnings.push({
        issue: "JWT Secret Could Be Stronger",
        description: `JWT secret is ${config.jwt_secret.length} characters`,
        recommendation: "Consider using a 64+ character secret for production",
        impact: "Moderate security risk"
      });
    } else {
      analysis.bestPractices.goodPractices.push("Strong JWT secret configured");
    }
  } else {
    analysis.security.warnings.push({
      issue: "No JWT Secret Configured",
      description: "JWT authentication may not work properly",
      recommendation: "Add a strong JWT secret",
      impact: "Authentication may fail"
    });
  }

  // SSL/TLS Analysis
  if (environment === 'prod' || environment === 'production') {
    if (config.port === 80 && !config.ssl_enabled) {
      analysis.security.critical.push({
        issue: "Insecure HTTP on Port 80",
        description: "Production environment using HTTP without SSL",
        recommendation: "Enable SSL/TLS for production",
        impact: "Critical security vulnerability - data transmitted in plain text",
        fix: "Configure SSL certificate and redirect HTTP to HTTPS"
      });
    }
    
    if (config.port === 443 && !config.ssl_enabled) {
      analysis.security.warnings.push({
        issue: "Port 443 Without SSL",
        description: "Using HTTPS port without SSL enabled",
        recommendation: "Enable SSL configuration",
        impact: "HTTPS port without SSL may cause issues"
      });
    }
  }

  // Database Security
  if (config.database_url) {
    if (config.database_url.includes('localhost') && environment === 'prod') {
      analysis.security.warnings.push({
        issue: "Local Database in Production",
        description: "Production environment using localhost database",
        recommendation: "Use production database server",
        impact: "May not work in production deployment"
      });
    }
    
    if (config.database_url.includes('password') && !config.database_url.includes('sslmode=require')) {
      analysis.security.warnings.push({
        issue: "Database Connection Without SSL",
        description: "Database connection not using SSL",
        recommendation: "Add sslmode=require to database URL",
        impact: "Database traffic not encrypted"
      });
    }
  }

  // CORS Security
  if (config.cors_enabled) {
    if (config.cors_origins && config.cors_origins.includes('*')) {
      analysis.security.critical.push({
        issue: "Overly Permissive CORS",
        description: "CORS allows all origins (*)",
        recommendation: "Restrict CORS to specific domains",
        impact: "Security vulnerability - allows any site to access your API",
        fix: "Set cors_origins to specific allowed domains"
      });
    }
  }

  // Logging Security
  if (config.log_level === 'debug' && environment === 'prod') {
    analysis.security.warnings.push({
      issue: "Debug Logging in Production",
      description: "Debug level logging enabled in production",
      recommendation: "Use info or warn level in production",
      impact: "May expose sensitive information in logs"
    });
  }

  // Rate Limiting
  if (!config.rate_limit_enabled && environment === 'prod') {
    analysis.security.warnings.push({
      issue: "No Rate Limiting",
      description: "Rate limiting not enabled in production",
      recommendation: "Enable rate limiting to prevent abuse",
      impact: "Vulnerable to DoS attacks"
    });
  }
}

function analyzePerformance(config, environment, analysis, detailed) {
  // Database Connection Pooling
  if (config.database_url && !config.database_pool_size) {
    analysis.performance.issues.push({
      issue: "No Database Connection Pooling",
      description: "Database connection pooling not configured",
      recommendation: "Add database_pool_size for better performance",
      impact: "Poor database performance, connection overhead",
      fix: "Set database_pool_size to 10-25 for most applications"
    });
  }

  if (config.database_pool_size) {
    if (config.database_pool_size > 100) {
      analysis.performance.issues.push({
        issue: "Excessive Database Pool Size",
        description: `Database pool size is ${config.database_pool_size}`,
        recommendation: "Consider reducing pool size to 10-50",
        impact: "May exhaust database connections"
      });
    } else if (config.database_pool_size < 5) {
      analysis.performance.issues.push({
        issue: "Small Database Pool Size",
        description: `Database pool size is only ${config.database_pool_size}`,
        recommendation: "Increase pool size for better performance",
        impact: "May cause connection bottlenecks"
      });
    } else {
      analysis.bestPractices.goodPractices.push("Good database connection pooling configured");
    }
  }

  // Caching
  if (!config.cache_enabled && environment === 'prod') {
    analysis.performance.issues.push({
      issue: "No Caching Configured",
      description: "Caching not enabled in production",
      recommendation: "Enable caching for better performance",
      impact: "Poor performance, unnecessary database queries",
      fix: "Configure Redis or in-memory caching"
    });
  }

  // Timeouts
  if (config.api_timeout && config.api_timeout > 60000) {
    analysis.performance.issues.push({
      issue: "High API Timeout",
      description: `API timeout is ${config.api_timeout}ms`,
      recommendation: "Consider reducing timeout to 15-30 seconds",
      impact: "Poor user experience, resource waste"
    });
  }

  // Build Optimizations
  if (environment === 'prod') {
    if (config.source_map !== false) {
      analysis.performance.issues.push({
        issue: "Source Maps in Production",
        description: "Source maps enabled in production",
        recommendation: "Disable source maps in production",
        impact: "Larger bundle size, potential security risk"
      });
    }

    if (config.minify !== true) {
      analysis.performance.issues.push({
        issue: "No Minification in Production",
        description: "Code minification not enabled",
        recommendation: "Enable minification for smaller bundles",
        impact: "Larger file sizes, slower loading"
      });
    }
  }
}

function analyzeBestPractices(config, environment, analysis, detailed) {
  // Health Checks
  if (!config.health_check_enabled && environment === 'prod') {
    analysis.bestPractices.missing.push({
      issue: "No Health Checks",
      description: "Health check endpoint not configured",
      recommendation: "Add health check endpoint for monitoring",
      impact: "Difficult to monitor application health",
      fix: "Enable health_check_enabled and configure health_check_path"
    });
  }

  // Monitoring
  if (!config.monitoring_enabled && environment === 'prod') {
    analysis.bestPractices.missing.push({
      issue: "No Monitoring Configured",
      description: "Application monitoring not enabled",
      recommendation: "Enable monitoring for production",
      impact: "No visibility into application performance",
      fix: "Configure monitoring_enabled and monitoring_type"
    });
  }

  // Logging
  if (!config.logging_enabled) {
    analysis.bestPractices.missing.push({
      issue: "No Logging Configured",
      description: "Application logging not enabled",
      recommendation: "Enable logging for debugging and monitoring",
      impact: "No visibility into application behavior",
      fix: "Configure logging_enabled and logging_level"
    });
  } else {
    analysis.bestPractices.goodPractices.push("Logging properly configured");
  }

  // Error Tracking
  if (!config.error_tracking_enabled && environment === 'prod') {
    analysis.bestPractices.missing.push({
      issue: "No Error Tracking",
      description: "Error tracking not configured for production",
      recommendation: "Enable error tracking (Sentry, etc.)",
      impact: "No visibility into production errors",
      fix: "Configure error_tracking_enabled and error_tracking_dsn"
    });
  }

  // Backup Configuration
  if (config.database_url && !config.backup_enabled && environment === 'prod') {
    analysis.bestPractices.missing.push({
      issue: "No Database Backup",
      description: "Database backup not configured",
      recommendation: "Configure automated database backups",
      impact: "Risk of data loss",
      fix: "Enable backup_enabled and configure backup_schedule"
    });
  }

  // Graceful Shutdown
  if (!config.shutdown_timeout && environment === 'prod') {
    analysis.bestPractices.missing.push({
      issue: "No Graceful Shutdown",
      description: "Graceful shutdown timeout not configured",
      recommendation: "Configure shutdown timeout for clean deployments",
      impact: "May cause data loss during deployments",
      fix: "Set shutdown_timeout to 30-60 seconds"
    });
  }
}

function analyzeEnvironmentSpecific(config, environment, analysis, detailed) {
  if (environment === 'dev' || environment === 'development') {
    // Development-specific checks
    if (config.log_level !== 'debug') {
      analysis.environment.specific.push({
        issue: "Non-Debug Logging in Development",
        description: "Development environment not using debug logging",
        recommendation: "Use debug logging in development for better debugging",
        impact: "Limited debugging information"
      });
    }

    if (config.minify === true) {
      analysis.environment.specific.push({
        issue: "Minification in Development",
        description: "Code minification enabled in development",
        recommendation: "Disable minification in development for faster builds",
        impact: "Slower development builds"
      });
    }
  }

  if (environment === 'prod' || environment === 'production') {
    // Production-specific checks
    if (config.debug === true) {
      analysis.environment.specific.push({
        issue: "Debug Mode in Production",
        description: "Debug mode enabled in production",
        recommendation: "Disable debug mode in production",
        impact: "Security risk, performance impact"
      });
    }

    if (config.hot_reload_enabled === true) {
      analysis.environment.specific.push({
        issue: "Hot Reload in Production",
        description: "Hot reload enabled in production",
        recommendation: "Disable hot reload in production",
        impact: "Unnecessary resource usage"
      });
    }

    if (config.dev_tools_enabled === true) {
      analysis.environment.specific.push({
        issue: "Dev Tools in Production",
        description: "Development tools enabled in production",
        recommendation: "Disable development tools in production",
        impact: "Security risk, unnecessary overhead"
      });
    }
  }
}

module.exports = { parseAlign, parseValue, validateConfig, mergeConfigs, loadSchema, performSmartAnalysis };
  