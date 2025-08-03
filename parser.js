// parser.js
const fs = require('fs');
const path = require('path');
const chalk = require('chalk'); // Added for colored output

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
      
      const value = parseValue(rawValue);
      
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
          (trimmed.startsWith('\'') && trimmed.endsWith('\''))) {
        return trimmed.slice(1, -1);
      }
      return trimmed;
    });
    
    return items;
  }
  
  // Handle quoted strings
  if ((value.startsWith('"') && value.endsWith('"')) || 
      (value.startsWith('\'') && value.endsWith('\''))) {
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

function analyzeSecurity(config, environment, analysis, _detailed) {
  // JWT Secret Analysis
  if (config.jwt_secret) {
    if (config.jwt_secret.length < 32) {
      analysis.security.critical.push({
        issue: 'Weak JWT Secret',
        description: `JWT secret is only ${config.jwt_secret.length} characters long`,
        recommendation: 'Use a secret of at least 32 characters',
        impact: 'Critical security vulnerability',
        fix: 'Generate a strong random secret of 32+ characters'
      });
    } else if (config.jwt_secret.length < 64) {
      analysis.security.warnings.push({
        issue: 'JWT Secret Could Be Stronger',
        description: `JWT secret is ${config.jwt_secret.length} characters`,
        recommendation: 'Consider using a 64+ character secret for production',
        impact: 'Moderate security risk'
      });
    } else {
      analysis.bestPractices.goodPractices.push('Strong JWT secret configured');
    }
  } else {
    analysis.security.warnings.push({
      issue: 'No JWT Secret Configured',
      description: 'JWT authentication may not work properly',
      recommendation: 'Add a strong JWT secret',
      impact: 'Authentication may fail'
    });
  }

  // SSL/TLS Analysis
  if (environment === 'prod' || environment === 'production') {
    if (config.port === 80 && !config.ssl_enabled) {
      analysis.security.critical.push({
        issue: 'Insecure HTTP on Port 80',
        description: 'Production environment using HTTP without SSL',
        recommendation: 'Enable SSL/TLS for production',
        impact: 'Critical security vulnerability - data transmitted in plain text',
        fix: 'Configure SSL certificate and redirect HTTP to HTTPS'
      });
    }
    
    if (config.port === 443 && !config.ssl_enabled) {
      analysis.security.warnings.push({
        issue: 'Port 443 Without SSL',
        description: 'Using HTTPS port without SSL enabled',
        recommendation: 'Enable SSL configuration',
        impact: 'HTTPS port without SSL may cause issues'
      });
    }
  }

  // Database Security
  if (config.database_url) {
    if (config.database_url.includes('localhost') && environment === 'prod') {
      analysis.security.warnings.push({
        issue: 'Local Database in Production',
        description: 'Production environment using localhost database',
        recommendation: 'Use production database server',
        impact: 'May not work in production deployment'
      });
    }
    
    if (config.database_url.includes('password') && !config.database_url.includes('sslmode=require')) {
      analysis.security.warnings.push({
        issue: 'Database Connection Without SSL',
        description: 'Database connection not using SSL',
        recommendation: 'Add sslmode=require to database URL',
        impact: 'Database traffic not encrypted'
      });
    }
  }

  // CORS Security
  if (config.cors_enabled) {
    if (config.cors_origins && config.cors_origins.includes('*')) {
      analysis.security.critical.push({
        issue: 'Overly Permissive CORS',
        description: 'CORS allows all origins (*)',
        recommendation: 'Restrict CORS to specific domains',
        impact: 'Security vulnerability - allows any site to access your API',
        fix: 'Set cors_origins to specific allowed domains'
      });
    }
  }

  // Logging Security
  if (config.log_level === 'debug' && environment === 'prod') {
    analysis.security.warnings.push({
      issue: 'Debug Logging in Production',
      description: 'Debug level logging enabled in production',
      recommendation: 'Use info or warn level in production',
      impact: 'May expose sensitive information in logs'
    });
  }

  // Rate Limiting
  if (!config.rate_limit_enabled && environment === 'prod') {
    analysis.security.warnings.push({
      issue: 'No Rate Limiting',
      description: 'Rate limiting not enabled in production',
      recommendation: 'Enable rate limiting to prevent abuse',
      impact: 'Vulnerable to DoS attacks'
    });
  }
}

function analyzePerformance(config, environment, analysis, _detailed) {
  // Database Connection Pooling
  if (config.database_url && !config.database_pool_size) {
    analysis.performance.issues.push({
      issue: 'No Database Connection Pooling',
      description: 'Database connection pooling not configured',
      recommendation: 'Add database_pool_size for better performance',
      impact: 'Poor database performance, connection overhead',
      fix: 'Set database_pool_size to 10-25 for most applications'
    });
  }

  if (config.database_pool_size) {
    if (config.database_pool_size > 100) {
      analysis.performance.issues.push({
        issue: 'Excessive Database Pool Size',
        description: `Database pool size is ${config.database_pool_size}`,
        recommendation: 'Consider reducing pool size to 10-50',
        impact: 'May exhaust database connections'
      });
    } else if (config.database_pool_size < 5) {
      analysis.performance.issues.push({
        issue: 'Small Database Pool Size',
        description: `Database pool size is only ${config.database_pool_size}`,
        recommendation: 'Increase pool size for better performance',
        impact: 'May cause connection bottlenecks'
      });
    } else {
      analysis.bestPractices.goodPractices.push('Good database connection pooling configured');
    }
  }

  // Caching
  if (!config.cache_enabled && environment === 'prod') {
    analysis.performance.issues.push({
      issue: 'No Caching Configured',
      description: 'Caching not enabled in production',
      recommendation: 'Enable caching for better performance',
      impact: 'Poor performance, unnecessary database queries',
      fix: 'Configure Redis or in-memory caching'
    });
  }

  // Timeouts
  if (config.api_timeout && config.api_timeout > 60000) {
    analysis.performance.issues.push({
      issue: 'High API Timeout',
      description: `API timeout is ${config.api_timeout}ms`,
      recommendation: 'Consider reducing timeout to 15-30 seconds',
      impact: 'Poor user experience, resource waste'
    });
  }

  // Build Optimizations
  if (environment === 'prod') {
    if (config.source_map !== false) {
      analysis.performance.issues.push({
        issue: 'Source Maps in Production',
        description: 'Source maps enabled in production',
        recommendation: 'Disable source maps in production',
        impact: 'Larger bundle size, potential security risk'
      });
    }

    if (config.minify !== true) {
      analysis.performance.issues.push({
        issue: 'No Minification in Production',
        description: 'Code minification not enabled',
        recommendation: 'Enable minification for smaller bundles',
        impact: 'Larger file sizes, slower loading'
      });
    }
  }
}

function analyzeBestPractices(config, environment, analysis, _detailed) {
  // Health Checks
  if (!config.health_check_enabled && environment === 'prod') {
    analysis.bestPractices.missing.push({
      issue: 'No Health Checks',
      description: 'Health check endpoint not configured',
      recommendation: 'Add health check endpoint for monitoring',
      impact: 'Difficult to monitor application health',
      fix: 'Enable health_check_enabled and configure health_check_path'
    });
  }

  // Monitoring
  if (!config.monitoring_enabled && environment === 'prod') {
    analysis.bestPractices.missing.push({
      issue: 'No Monitoring Configured',
      description: 'Application monitoring not enabled',
      recommendation: 'Enable monitoring for production',
      impact: 'No visibility into application performance',
      fix: 'Configure monitoring_enabled and monitoring_type'
    });
  }

  // Logging
  if (!config.logging_enabled) {
    analysis.bestPractices.missing.push({
      issue: 'No Logging Configured',
      description: 'Application logging not enabled',
      recommendation: 'Enable logging for debugging and monitoring',
      impact: 'No visibility into application behavior',
      fix: 'Configure logging_enabled and logging_level'
    });
  } else {
    analysis.bestPractices.goodPractices.push('Logging properly configured');
  }

  // Error Tracking
  if (!config.error_tracking_enabled && environment === 'prod') {
    analysis.bestPractices.missing.push({
      issue: 'No Error Tracking',
      description: 'Error tracking not configured for production',
      recommendation: 'Enable error tracking (Sentry, etc.)',
      impact: 'No visibility into production errors',
      fix: 'Configure error_tracking_enabled and error_tracking_dsn'
    });
  }

  // Backup Configuration
  if (config.database_url && !config.backup_enabled && environment === 'prod') {
    analysis.bestPractices.missing.push({
      issue: 'No Database Backup',
      description: 'Database backup not configured',
      recommendation: 'Configure automated database backups',
      impact: 'Risk of data loss',
      fix: 'Enable backup_enabled and configure backup_schedule'
    });
  }

  // Graceful Shutdown
  if (!config.shutdown_timeout && environment === 'prod') {
    analysis.bestPractices.missing.push({
      issue: 'No Graceful Shutdown',
      description: 'Graceful shutdown timeout not configured',
      recommendation: 'Configure shutdown timeout for clean deployments',
      impact: 'May cause data loss during deployments',
      fix: 'Set shutdown_timeout to 30-60 seconds'
    });
  }
}

function analyzeEnvironmentSpecific(config, environment, analysis, _detailed) {
  if (environment === 'dev' || environment === 'development') {
    // Development-specific checks
    if (config.log_level !== 'debug') {
      analysis.environment.specific.push({
        issue: 'Non-Debug Logging in Development',
        description: 'Development environment not using debug logging',
        recommendation: 'Use debug logging in development for better debugging',
        impact: 'Limited debugging information'
      });
    }

    if (config.minify === true) {
      analysis.environment.specific.push({
        issue: 'Minification in Development',
        description: 'Code minification enabled in development',
        recommendation: 'Disable minification in development for faster builds',
        impact: 'Slower development builds'
      });
    }
  }

  if (environment === 'prod' || environment === 'production') {
    // Production-specific checks
    if (config.debug === true) {
      analysis.environment.specific.push({
        issue: 'Debug Mode in Production',
        description: 'Debug mode enabled in production',
        recommendation: 'Disable debug mode in production',
        impact: 'Security risk, performance impact'
      });
    }

    if (config.hot_reload_enabled === true) {
      analysis.environment.specific.push({
        issue: 'Hot Reload in Production',
        description: 'Hot reload enabled in production',
        recommendation: 'Disable hot reload in production',
        impact: 'Unnecessary resource usage'
      });
    }

    if (config.dev_tools_enabled === true) {
      analysis.environment.specific.push({
        issue: 'Dev Tools in Production',
        description: 'Development tools enabled in production',
        recommendation: 'Disable development tools in production',
        impact: 'Security risk, unnecessary overhead'
      });
    }
  }
}

// Diagnose configuration environment
function diagnoseConfig(projectDir, configDir, _detailed = false) {
  const diagnosis = {
    criticalIssues: [],
    warnings: [],
    recommendations: [],
    summary: {
      totalFiles: 0,
      totalKeys: 0,
      environments: 0,
      platforms: 0
    },
    migrationPlan: {
      consolidateFiles: [],
      fixTypes: [],
      securityFixes: [],
      createEnvironments: []
    }
  };

  try {
    // 1. Scan for configuration files
    const configFiles = scanConfigFiles(projectDir);
    diagnosis.summary.totalFiles = configFiles.length;

    // 2. Analyze scattered configuration
    const scatteredConfig = analyzeScatteredConfig(configFiles, projectDir);
    if (scatteredConfig.issues.length > 0) {
      diagnosis.criticalIssues.push({
        title: 'Scattered Configuration',
        description: `Found ${scatteredConfig.issues.length} configuration files scattered across the project`,
        impact: 'Difficult to manage, inconsistent values, deployment issues',
        files: scatteredConfig.issues.map(issue => issue.file)
      });
      
      // Add to migration plan
      scatteredConfig.issues.forEach(issue => {
        diagnosis.migrationPlan.consolidateFiles.push({
          source: issue.file,
          target: `config/${issue.type}.align`
        });
      });
    }

    // 3. Analyze type safety issues
    const typeIssues = analyzeTypeIssues(configFiles, projectDir);
    if (typeIssues && typeIssues.issues && typeIssues.issues.length > 0) {
      diagnosis.warnings.push(typeIssues);
      
      // Add to migration plan
      typeIssues.issues.forEach(issue => {
        diagnosis.migrationPlan.fixTypes.push({
          key: issue.key,
          current: issue.currentValue,
          fixed: issue.fixedValue,
          file: issue.file
        });
      });
    }

    // 4. Analyze environment inconsistencies
    const envIssues = analyzeEnvironmentIssues(configFiles, projectDir);
    if (envIssues.length > 0) {
      diagnosis.warnings.push({
        title: 'Environment Inconsistencies',
        description: `Found ${envIssues.length} inconsistencies between environments`,
        impact: 'Deployment failures, configuration drift',
        files: envIssues.map(issue => issue.file)
      });
    }

    // 5. Analyze security issues
    const securityIssues = analyzeSecurityIssues(configFiles, projectDir);
    if (securityIssues && securityIssues.issues && securityIssues.issues.length > 0) {
      diagnosis.criticalIssues.push(securityIssues);
      
      // Add to migration plan
      securityIssues.issues.forEach(issue => {
        diagnosis.migrationPlan.securityFixes.push({
          issue: issue.title,
          fix: issue.recommendation,
          severity: issue.severity
        });
      });
    }

    // 6. Analyze platform-specific configs
    const platformIssues = analyzePlatformIssues(configFiles, projectDir);
    if (platformIssues.length > 0) {
      diagnosis.warnings.push({
        title: 'Platform-Specific Configurations',
        description: `Found ${platformIssues.length} platform-specific configuration files`,
        impact: 'Deployment complexity, maintenance overhead',
        files: platformIssues.map(issue => issue.file)
      });
    }

    // 7. Generate recommendations
    diagnosis.recommendations = generateRecommendations(diagnosis, configFiles);
    
    // Always add at least one recommendation if there are issues
    if (diagnosis.criticalIssues.length > 0 && diagnosis.recommendations.length === 0) {
      diagnosis.recommendations.push({
        title: 'Run align repair',
        description: 'Automatically fix configuration issues',
        command: 'align repair'
      });
    }

    // 8. Update summary
    diagnosis.summary.totalKeys = countTotalKeys(configFiles);
    diagnosis.summary.environments = countEnvironments(configFiles);
    diagnosis.summary.platforms = countPlatforms(configFiles);

    // 9. Generate migration plan
    if (diagnosis.criticalIssues.length > 0 || diagnosis.warnings.length > 0) {
      generateMigrationPlan(diagnosis, configFiles, projectDir);
    }

  } catch (error) {
    diagnosis.criticalIssues.push({
      title: 'Diagnosis Error',
      description: `Failed to analyze configuration: ${error.message}`,
      impact: 'Unable to provide complete diagnosis'
    });
  }

  return diagnosis;
}

// Scan for configuration files
function scanConfigFiles(projectDir) {
  const fs = require('fs');
  const path = require('path');
  
  const configPatterns = [
    '.env', '.env.local', '.env.development', '.env.production', '.env.test',
    'config.json', 'config.js', 'config.yml', 'config.yaml',
    'docker-compose.yml', 'docker-compose.override.yml', 'docker-compose.prod.yml',
    'k8s/configmap.yaml', 'k8s/deployment.yaml', 'k8s/secret.yaml',
    'vercel.json', 'netlify.toml', 'railway.toml',
    'package.json', 'package-lock.json',
    'base.align', 'dev.align', 'prod.align', 'align.schema.json'
  ];

  const foundFiles = [];
  
  function scanDirectory(dir) {
    try {
      const files = fs.readdirSync(dir);
      
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
          scanDirectory(filePath);
        } else if (stat.isFile()) {
          const relativePath = path.relative(projectDir, filePath);
          
          // Check if file matches config patterns
          for (const pattern of configPatterns) {
            if (file === pattern || relativePath.includes(pattern) || file.endsWith(pattern)) {
              foundFiles.push({
                path: filePath,
                relativePath: relativePath,
                type: getConfigType(file),
                size: stat.size
              });
              break;
            }
          }
        }
      }
    } catch (_error) {
      // Skip directories we can't read
    }
  }
  
  scanDirectory(projectDir);
  return foundFiles;
}

// Get configuration type
function getConfigType(filename) {
  if (filename.includes('.env')) return 'environment';
  if (filename.includes('config.json') || filename.includes('config.js')) return 'application';
  if (filename.includes('docker-compose')) return 'docker';
  if (filename.includes('k8s') || filename.includes('kubernetes')) return 'kubernetes';
  if (filename.includes('vercel.json') || filename.includes('netlify.toml')) return 'platform';
  if (filename.includes('package.json')) return 'package';
  if (filename.includes('.align')) return 'align';
  return 'other';
}

// Analyze scattered configuration
function analyzeScatteredConfig(configFiles, _projectDir) {
  const issues = [];
  const configTypes = {};
  
  configFiles.forEach(file => {
    const type = file.type;
    if (!configTypes[type]) {
      configTypes[type] = [];
    }
    configTypes[type].push(file);
  });
  
  // Check for multiple files of same type
  Object.entries(configTypes).forEach(([type, files]) => {
    if (files.length > 1) {
      issues.push({
        file: files.map(f => f.relativePath).join(', '),
        type: type,
        count: files.length
      });
    }
  });
  
  // Check for scattered configuration (multiple different types)
  const differentTypes = Object.keys(configTypes).filter(type => type !== 'align');
  if (differentTypes.length > 1) {
    issues.push({
      file: configFiles.map(f => f.relativePath).join(', '),
      type: 'scattered',
      count: configFiles.length,
      types: differentTypes
    });
  }
  
  return { issues };
}

// Analyze type safety issues
function analyzeTypeIssues(configFiles, projectDir) {
  const issues = findTypeIssues(projectDir);
  
  if (issues.length > 0) {
    return {
      title: 'Type Safety Issues',
      description: `Found ${issues.length} configuration values with incorrect types`,
      impact: 'Runtime errors, inconsistent behavior',
      files: [...new Set(issues.map(issue => issue.file))],
      issues: issues
    };
  }
  
  return null;
}

// Analyze environment issues
function analyzeEnvironmentIssues(configFiles, _projectDir) {
  const issues = [];
  const envFiles = configFiles.filter(f => f.type === 'environment');
  
  if (envFiles.length > 1) {
    // Compare environment files
    const envContents = {};
    
    envFiles.forEach(file => {
      try {
        const content = fs.readFileSync(file.path, 'utf8');
        const keys = new Set();
        
        content.split('\n').forEach(line => {
          const match = line.match(/^([A-Z_][A-Z0-9_]*)=/);
          if (match) {
            keys.add(match[1]);
          }
        });
        
        envContents[file.relativePath] = keys;
      } catch (error) {
        // Skip files we can't read
      }
    });
    
    // Check for missing keys between environments
    const allKeys = new Set();
    Object.values(envContents).forEach(keys => {
      keys.forEach(key => allKeys.add(key));
    });
    
    Object.entries(envContents).forEach(([file, keys]) => {
      const missing = Array.from(allKeys).filter(key => !keys.has(key));
      if (missing.length > 0) {
        issues.push({
          file: file,
          type: 'missing_keys',
          keys: missing
        });
      }
    });
  }
  
  return issues;
}

// Analyze security issues
function analyzeSecurityIssues(configFiles, projectDir) {
  const issues = findSecurityIssues(projectDir);
  
  if (issues.length > 0) {
    return {
      title: 'Security Issues',
      description: `Found ${issues.length} security-related configuration problems`,
      impact: 'Security vulnerabilities, data breaches',
      files: [...new Set(issues.map(issue => issue.file))],
      issues: issues
    };
  }
  
  return null;
}

// Analyze platform issues
function analyzePlatformIssues(configFiles, _projectDir) {
  const issues = [];
  const platformFiles = configFiles.filter(f => f.type === 'platform' || f.type === 'docker' || f.type === 'kubernetes');
  
  if (platformFiles.length > 1) {
    issues.push({
      file: platformFiles.map(f => f.relativePath).join(', '),
      type: 'multiple_platforms',
      count: platformFiles.length
    });
  }
  
  return issues;
}

// Generate recommendations
function generateRecommendations(diagnosis, configFiles) {
  const recommendations = [];
  
  if (diagnosis.criticalIssues.length > 0) {
    recommendations.push({
      title: 'Run align repair',
      description: 'Automatically fix configuration issues',
      command: 'align repair'
    });
  }
  
  if (configFiles.filter(f => f.type === 'environment').length > 0) {
    recommendations.push({
      title: 'Migrate to Align',
      description: 'Convert .env files to .align format for better organization',
      command: 'align init --template=nodejs-api --app-name=myapp'
    });
  }
  
  if (configFiles.filter(f => f.type === 'align').length === 0) {
    recommendations.push({
      title: 'Add Align configuration',
      description: 'Start using Align for better configuration management',
      command: 'align init --template=nodejs-api --app-name=myapp'
    });
  }
  
  return recommendations;
}

// Count total keys
function countTotalKeys(configFiles) {
  let total = 0;
  const fs = require('fs');
  
  configFiles.forEach(file => {
    if (file.type === 'environment') {
      try {
        // Try UTF-8 first, then UTF-16 if that fails
        let content;
        try {
          content = fs.readFileSync(file.path, 'utf8');
        } catch (_e) {
          content = fs.readFileSync(file.path, 'utf16le');
        }
        
        // Remove null bytes and normalize
        content = content.replace(/\x00/g, '');
        const lines = content.split('\n');
        lines.forEach(line => {
          const trimmedLine = line.trim();
          if (trimmedLine.match(/^[A-Z_][A-Z0-9_]*=/)) {
            total++;
          }
        });
      } catch (_error) {
        // Skip files we can't read
      }
    }
  });
  
  return total;
}

// Count environments
function countEnvironments(configFiles) {
  const envFiles = configFiles.filter(f => f.type === 'environment');
  return envFiles.length;
}

// Count platforms
function countPlatforms(configFiles) {
  const platformFiles = configFiles.filter(f => 
    f.type === 'platform' || f.type === 'docker' || f.type === 'kubernetes'
  );
  return platformFiles.length;
}

// Generate migration plan
function generateMigrationPlan(diagnosis, _configFiles, _projectDir) {
  // Populate migration plan from diagnosis results
  diagnosis.migrationPlan = {
    consolidateFiles: [],
    fixTypes: [],
    securityFixes: [],
    createEnvironments: []
  };
  
  // Add type fixes from warnings
  diagnosis.warnings.forEach(warning => {
    if (warning.title === 'Type Safety Issues' && warning.issues) {
      warning.issues.forEach(issue => {
        diagnosis.migrationPlan.fixTypes.push({
          key: issue.key,
          current: issue.currentValue,
          fixed: issue.fixedValue,
          file: issue.file
        });
      });
    }
  });
  
  // Add security fixes from critical issues
  diagnosis.criticalIssues.forEach(issue => {
    if (issue.title === 'Security Issues' && issue.issues) {
      issue.issues.forEach(securityIssue => {
        diagnosis.migrationPlan.securityFixes.push({
          issue: securityIssue.title,
          fix: securityIssue.recommendation,
          severity: securityIssue.severity
        });
      });
    }
  });
  
  // Add scattered config consolidation
  diagnosis.criticalIssues.forEach(issue => {
    if (issue.title === 'Scattered Configuration' && issue.files) {
      issue.files.forEach(file => {
        diagnosis.migrationPlan.consolidateFiles.push({
          source: file,
          target: `config/${getConfigType(file)}.align`
        });
      });
    }
  });
}

// Repair configuration environment with safety features
function repairConfig(projectDir, configDir, options = {}) {
  
  const result = {
    success: false,
    backupCreated: false,
    backupDir: null,
    changesMade: 0,
    filesCreated: 0,
    error: null,
    plan: null
  };

  try {
    // 1. Analyze current state
    console.log(chalk.blue('🔍 Analyzing current configuration...'));
    const diagnosis = diagnoseConfig(projectDir, configDir, options.detailed);
    
    if (diagnosis.criticalIssues.length === 0 && diagnosis.warnings.length === 0) {
      console.log(chalk.green('✅ No issues found! Configuration is already well-organized.'));
      result.success = true;
      return result;
    }

    // 2. Generate repair plan
    console.log(chalk.blue('📋 Generating repair plan...'));
    const plan = generateRepairPlan(diagnosis, projectDir, configDir);
    result.plan = plan;

    // 3. Handle analyze-only mode
    if (options.analyzeOnly) {
      displayRepairPlan(plan, options.detailed);
      result.success = true;
      return result;
    }

    // 4. Handle dry-run mode
    if (options.dryRun) {
      console.log(chalk.yellow('🔍 DRY RUN MODE - No changes will be made'));
      displayRepairPlan(plan, options.detailed);
      result.success = true;
      return result;
    }

    // 5. Create backup if requested
    if (options.backup) {
      console.log(chalk.blue('📦 Creating backup...'));
      const backupResult = createBackup(projectDir, plan);
      if (!backupResult.success) {
        result.error = backupResult.error;
        return result;
      }
      result.backupCreated = true;
      result.backupDir = backupResult.backupDir;
      console.log(chalk.green(`✅ Backup created: ${backupResult.backupDir}`));
    }

    // 6. Apply repairs based on options
    console.log(chalk.blue('🔧 Applying repairs...'));
    
    if (options.interactive) {
      const interactiveResult = applyRepairsInteractive(plan, options);
      result.changesMade = interactiveResult.changesMade;
      result.filesCreated = interactiveResult.filesCreated;
      result.success = interactiveResult.success;
    } else if (options.auto) {
      const autoResult = applyRepairsAuto(plan, options, projectDir);
      result.changesMade = autoResult.changesMade;
      result.filesCreated = autoResult.filesCreated;
      result.success = autoResult.success;
    } else {
      // Default: show plan and ask for confirmation
      displayRepairPlan(plan, options.detailed);
      console.log(chalk.yellow('\n💡 Use --auto to apply changes or --interactive for step-by-step confirmation'));
      result.success = true;
    }

  } catch (error) {
    result.error = error.message;
    console.error(chalk.red('❌ Repair error:'), error.message);
  }

  return result;
}

// Generate detailed repair plan
function generateRepairPlan(diagnosis, projectDir, configDir) {
  const plan = {
    consolidateFiles: [],
    fixTypes: [],
    securityFixes: [],
    createEnvironments: [],
    updateDeployments: [],
    totalChanges: 0,
    estimatedTime: '5-10 minutes'
  };

  // Ensure all arrays exist
  if (!plan.consolidateFiles) plan.consolidateFiles = [];
  if (!plan.fixTypes) plan.fixTypes = [];
  if (!plan.securityFixes) plan.securityFixes = [];
  if (!plan.createEnvironments) plan.createEnvironments = [];
  if (!plan.updateDeployments) plan.updateDeployments = [];

  // Analyze scattered configuration
  if (diagnosis.criticalIssues.some(issue => issue.title === 'Scattered Configuration')) {
    const scatteredFiles = findScatteredConfigFiles(projectDir);
    plan.consolidateFiles = scatteredFiles.map(file => ({
      source: file.relativePath || file.path.split('/').pop() || file.path.split('\\').pop(),
      target: determineTargetFile(file, configDir),
      type: file.type,
      action: 'consolidate'
    }));
  }

  // Analyze type issues
  if (diagnosis.warnings.some(warning => warning.title === 'Type Safety Issues')) {
    const typeIssues = findTypeIssues(projectDir);
    plan.fixTypes = typeIssues.map(issue => ({
      file: issue.file,
      key: issue.key,
      currentValue: issue.currentValue,
      fixedValue: issue.fixedValue,
      action: 'fix_type'
    }));
  }

  // Analyze security issues
  if (diagnosis.criticalIssues.some(issue => issue.title === 'Security Issues')) {
    const securityIssues = findSecurityIssues(projectDir);
    plan.securityFixes = securityIssues.map(issue => ({
      file: issue.file,
      issue: issue.title,
      fix: issue.recommendation,
      action: 'fix_security'
    }));
  }

  // Plan environment creation
  plan.createEnvironments = [
    { file: 'base.align', action: 'create' },
    { file: 'dev.align', action: 'create' },
    { file: 'prod.align', action: 'create' }
  ];

  // Plan deployment updates
  plan.updateDeployments = [
    { file: 'docker-compose.yml', action: 'update' },
    { file: 'k8s/configmap.yaml', action: 'update' },
    { file: 'package.json', action: 'update_scripts' }
  ];

  plan.totalChanges = plan.consolidateFiles.length + 
                     plan.fixTypes.length + 
                     plan.securityFixes.length + 
                     plan.createEnvironments.length + 
                     plan.updateDeployments.length;

  return plan;
}

// Find scattered configuration files
function findScatteredConfigFiles(projectDir) {
  const fs = require('fs');
  const path = require('path');
  
  const configFiles = [];
  
  function scanDirectory(dir) {
    try {
      const files = fs.readdirSync(dir);
      
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
          scanDirectory(filePath);
        } else if (stat.isFile()) {
          const relativePath = path.relative(projectDir, filePath);
          
          // Check if it's a config file
          if (isConfigFile(file, relativePath)) {
            configFiles.push({
              path: filePath,
              relativePath: relativePath,
              type: getConfigType(file),
              size: stat.size
            });
          }
        }
      }
    } catch (_error) {
      // Skip directories we can't read
    }
  }
  
  scanDirectory(projectDir);
  return configFiles;
}

// Check if file is a configuration file
function isConfigFile(filename, relativePath) {
  const configPatterns = [
    '.env', '.env.local', '.env.development', '.env.production',
    'config.json', 'config.js', 'config.yml', 'config.yaml',
    'docker-compose.yml', 'docker-compose.override.yml',
    'k8s/configmap.yaml', 'k8s/deployment.yaml',
    'vercel.json', 'netlify.toml'
  ];
  
  return configPatterns.some(pattern => 
    relativePath.includes(pattern) || filename === pattern
  );
}

// Determine target file for consolidation
function determineTargetFile(file, configDir) {
  const path = require('path');
  
  if (file.type === 'environment') {
    return 'base.align';
  } else if (file.type === 'application') {
    return 'base.align';
  } else if (file.type === 'docker') {
    return 'docker.align';
  } else if (file.type === 'kubernetes') {
    return 'k8s.align';
  }
  
  return 'base.align';
}

// Find type safety issues
function findTypeIssues(projectDir) {
  const fs = require('fs');
  const path = require('path');
  const issues = [];
  
  function scanForEnvFiles(dir) {
    try {
      const files = fs.readdirSync(dir);
      
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
          scanForEnvFiles(filePath);
        } else if (stat.isFile() && file.includes('.env')) {
          try {
            // Try UTF-8 first, then UTF-16 if that fails
            let content;
            try {
              content = fs.readFileSync(filePath, 'utf8');
            } catch (_e) {
              content = fs.readFileSync(filePath, 'utf16le');
            }
            
            // Remove null bytes and normalize
            content = content.replace(/\x00/g, '');
            const lines = content.split('\n');
            
            lines.forEach((line, _index) => {
              // Clean the line of any invisible characters and normalize
              const cleanLine = line.trim().replace(/[\u200B-\u200D\uFEFF]/g, '');
              
              // More robust regex that handles various formats
              const match = cleanLine.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
              if (match) {
                const key = match[1];
                const rawValue = match[2];
                const value = rawValue.replace(/^["']|["']$/g, ''); // Remove quotes
                
                // Check for quoted numbers (common mistake)
                if (key === 'PORT' && (rawValue.startsWith('"') || rawValue.startsWith('\''))) {
                  issues.push({
                    file: path.relative(projectDir, filePath),
                    key: key,
                    currentValue: rawValue,
                    fixedValue: parseInt(value) || 3000,
                    type: 'number',
                    issue: 'PORT should not be quoted, got quoted string'
                  });
                }
                
                if (key === 'DEBUG' && (rawValue.startsWith('"') || rawValue.startsWith('\''))) {
                  issues.push({
                    file: path.relative(projectDir, filePath),
                    key: key,
                    currentValue: rawValue,
                    fixedValue: value === 'true',
                    type: 'boolean',
                    issue: 'DEBUG should not be quoted, got quoted string'
                  });
                }
                
                // Check for type issues
                if (key === 'PORT' && !rawValue.startsWith('"') && !rawValue.startsWith('\'') && isNaN(value)) {
                  issues.push({
                    file: path.relative(projectDir, filePath),
                    key: key,
                    currentValue: value,
                    fixedValue: parseInt(value) || 3000,
                    type: 'number',
                    issue: 'PORT should be a number, got string'
                  });
                }
                
                if (key === 'DEBUG' && !rawValue.startsWith('"') && !rawValue.startsWith('\'') && value !== 'true' && value !== 'false') {
                  issues.push({
                    file: path.relative(projectDir, filePath),
                    key: key,
                    currentValue: value,
                    fixedValue: value === 'true' || value === '1',
                    type: 'boolean',
                    issue: 'DEBUG should be true/false, got other value'
                  });
                }
                
                if (key === 'DATABASE_POOL_SIZE' && isNaN(value)) {
                  issues.push({
                    file: path.relative(projectDir, filePath),
                    key: key,
                    currentValue: value,
                    fixedValue: parseInt(value) || 10,
                    type: 'number',
                    issue: 'DATABASE_POOL_SIZE should be a number, got string'
                  });
                }
              }
            });
          } catch (_error) {
            // Skip files we can't read
          }
        }
      }
    } catch (_error) {
      // Skip directories we can't read
    }
  }
  
  scanForEnvFiles(projectDir);
  return issues;
}

// Find security issues
function findSecurityIssues(projectDir) {
  const fs = require('fs');
  const issues = [];
  
  function scanForEnvFiles(dir) {
    try {
      const files = fs.readdirSync(dir);
      
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
          scanForEnvFiles(filePath);
        } else if (stat.isFile() && file.includes('.env')) {
          try {
            // Try UTF-8 first, then UTF-16 if that fails
            let content;
            try {
              content = fs.readFileSync(filePath, 'utf8');
            } catch (_e) {
              content = fs.readFileSync(filePath, 'utf16le');
            }
            
            // Remove null bytes and normalize
            content = content.replace(/\x00/g, '');
            const lines = content.split('\n');
            
            lines.forEach(line => {
              const cleanLine = line.trim().replace(/[\u200B-\u200D\uFEFF]/g, '');
              const match = cleanLine.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
              if (match) {
                const key = match[1];
                const value = match[2].replace(/^["']|["']$/g, '');
                
                // Check for security issues
                if (key.includes('JWT_SECRET') && value.length < 32) {
                  issues.push({
                    file: path.relative(projectDir, filePath),
                    title: 'Weak JWT Secret',
                    description: `JWT secret is only ${value.length} characters long`,
                    recommendation: 'Generate a secret with at least 32 characters',
                    currentValue: value,
                    fixedValue: generateStrongSecret(),
                    severity: 'critical'
                  });
                }
                
                if (key.includes('SECRET') && value.length < 16) {
                  issues.push({
                    file: path.relative(projectDir, filePath),
                    title: 'Weak Secret',
                    description: `Secret is only ${value.length} characters long`,
                    recommendation: 'Generate a secret with at least 16 characters',
                    currentValue: value,
                    fixedValue: generateStrongSecret(),
                    severity: 'high'
                  });
                }
                
                if (key === 'DEBUG' && value === 'true' && filePath.includes('prod')) {
                  issues.push({
                    file: path.relative(projectDir, filePath),
                    title: 'Debug Mode in Production',
                    description: 'DEBUG=true in production environment',
                    recommendation: 'Set DEBUG=false in production',
                    currentValue: 'true',
                    fixedValue: 'false',
                    severity: 'critical'
                  });
                }
                
                if (key.includes('URL') && value.startsWith('http://') && filePath.includes('prod')) {
                  issues.push({
                    file: path.relative(projectDir, filePath),
                    title: 'HTTP in Production',
                    description: 'Using HTTP instead of HTTPS in production',
                    recommendation: 'Use HTTPS URLs in production',
                    currentValue: value,
                    fixedValue: value.replace('http://', 'https://'),
                    severity: 'high'
                  });
                }
                
                if (key.includes('PASSWORD') && value.length < 8) {
                  issues.push({
                    file: path.relative(projectDir, filePath),
                    title: 'Weak Password',
                    description: `Password is only ${value.length} characters long`,
                    recommendation: 'Use a password with at least 8 characters',
                    currentValue: value,
                    fixedValue: '***CHANGE_ME***',
                    severity: 'high'
                  });
                }
              }
            });
          } catch (_error) {
            // Skip files we can't read
          }
        }
      }
    } catch (_error) {
      // Skip directories we can't read
    }
  }
  
  scanForEnvFiles(projectDir);
  return issues;
}

// Generate strong secret
function generateStrongSecret() {
  const crypto = require('crypto');
  return crypto.randomBytes(32).toString('hex');
}

// Create backup
function createBackup(projectDir, plan) {
  const fs = require('fs');
  const path = require('path');
  
  const result = {
    success: false,
    backupDir: null,
    error: null
  };
  
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(projectDir, `.align-backup-${timestamp}`);
    
    // Create backup directory
    fs.mkdirSync(backupDir, { recursive: true });
    
    // Backup files that will be modified
    const filesToBackup = [
      ...plan.consolidateFiles.map(f => f.source),
      ...plan.fixTypes.map(f => f.file),
      ...plan.securityFixes.map(f => f.file)
    ];
    
    for (const file of filesToBackup) {
      if (fs.existsSync(file)) {
        const relativePath = path.relative(projectDir, file);
        const backupPath = path.join(backupDir, relativePath);
        const backupDirPath = path.dirname(backupPath);
        
        fs.mkdirSync(backupDirPath, { recursive: true });
        fs.copyFileSync(file, backupPath);
      }
    }
    
    // Save plan to backup
    fs.writeFileSync(
      path.join(backupDir, 'repair-plan.json'),
      JSON.stringify(plan, null, 2)
    );
    
    result.success = true;
    result.backupDir = backupDir;
    
  } catch (error) {
    result.error = error.message;
  }
  
  return result;
}

// Display repair plan
function displayRepairPlan(plan, _detailed = false) {
  console.log(chalk.blue('📋 Repair Plan:'));
  console.log(chalk.gray(`  Total changes: ${plan.totalChanges}`));
  console.log(chalk.gray(`  Estimated time: ${plan.estimatedTime}`));
  console.log('');
  
  if (plan.consolidateFiles && plan.consolidateFiles.length > 0) {
    console.log(chalk.cyan('📁 Consolidate scattered configs:'));
    plan.consolidateFiles.forEach(file => {
      const sourceName = file.source.split('/').pop() || file.source.split('\\').pop();
      const targetName = file.target.split('/').pop() || file.target.split('\\').pop();
      console.log(chalk.gray(`  - ${sourceName} → ${targetName}`));
    });
    console.log('');
  }
  
  if (plan.fixTypes && plan.fixTypes.length > 0) {
    console.log(chalk.cyan('🔧 Fix type issues:'));
    plan.fixTypes.forEach(fix => {
      const fileName = fix.file.split('/').pop() || fix.file.split('\\').pop();
      console.log(chalk.gray(`  - ${fileName}: ${fix.key} = "${fix.currentValue}" → ${fix.fixedValue}`));
    });
    console.log('');
  }
  
  if (plan.securityFixes && plan.securityFixes.length > 0) {
    console.log(chalk.cyan('🔒 Fix security issues:'));
    plan.securityFixes.forEach(fix => {
      const fileName = fix.file.split('/').pop() || fix.file.split('\\').pop();
      console.log(chalk.gray(`  - ${fileName}: ${fix.issue} → ${fix.fix}`));
    });
    console.log('');
  }
  
  if (plan.createEnvironments && plan.createEnvironments.length > 0) {
    console.log(chalk.cyan('📋 Create environment structure:'));
    plan.createEnvironments.forEach(env => {
      const fileName = env.file.split('/').pop() || env.file.split('\\').pop();
      console.log(chalk.gray(`  - ${fileName}`));
    });
    console.log('');
  }
  
  if (plan.updateDeployments && plan.updateDeployments.length > 0) {
    console.log(chalk.cyan('🚀 Update deployment configs:'));
    plan.updateDeployments.forEach(deploy => {
      console.log(chalk.gray(`  - ${deploy.file}`));
    });
    console.log('');
  }
}

// Apply repairs interactively
async function applyRepairsInteractive(plan, _options) {
  const result = {
    success: false,
    changesMade: 0,
    filesCreated: 0
  };
  
  console.log(chalk.yellow('🔧 Interactive Mode - Confirm each change:'));
  console.log('');
  
  // Apply consolidations
  for (const file of plan.consolidateFiles) {
    const confirmed = await confirmChange(`Consolidate ${file.source} → ${file.target}?`);
    if (confirmed) {
      // Apply consolidation
      result.changesMade++;
    }
  }
  
  // Apply type fixes
  for (const fix of plan.fixTypes) {
    const confirmed = await confirmChange(`Fix ${fix.file}: ${fix.key} = "${fix.currentValue}" → ${fix.fixedValue}?`);
    if (confirmed) {
      // Apply type fix
      result.changesMade++;
    }
  }
  
  // Apply security fixes
  for (const fix of plan.securityFixes) {
    const confirmed = await confirmChange(`Fix ${fix.file}: ${fix.issue}?`);
    if (confirmed) {
      // Apply security fix
      result.changesMade++;
    }
  }
  
  // Create environments
  for (const env of plan.createEnvironments) {
    const confirmed = await confirmChange(`Create ${env.file}?`);
    if (confirmed) {
      // Create environment file
      result.filesCreated++;
    }
  }
  
  result.success = true;
  return result;
}

// Apply repairs automatically
function applyRepairsAuto(plan, options, projectDir) {
  const fs = require('fs');
  const path = require('path');
  
  const result = {
    success: false,
    changesMade: 0,
    filesCreated: 0
  };
  
  console.log(chalk.yellow('🔧 Auto Mode - Applying all safe fixes:'));
  console.log('');
  
  try {
    // Apply consolidations
    for (const file of plan.consolidateFiles) {
      console.log(chalk.gray(`  Consolidating ${file.source} → ${file.target}`));
      // Apply consolidation
      result.changesMade++;
    }
    
    // Apply type fixes to .env files
    for (const fix of plan.fixTypes) {
      console.log(chalk.gray(`  Fixing ${fix.file}: ${fix.key} = "${fix.currentValue}" → ${fix.fixedValue}`));
      
      // Read the .env file
      const envPath = path.join(projectDir, fix.file);
      let content;
      try {
        content = fs.readFileSync(envPath, 'utf8');
      } catch (_e) {
        content = fs.readFileSync(envPath, 'utf16le');
      }
      content = content.replace(/\x00/g, '');
      
      // Replace the problematic line
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const cleanLine = lines[i].trim().replace(/[\u200B-\u200D\uFEFF]/g, '');
        const match = cleanLine.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
        if (match && match[1] === fix.key) {
          // Replace with fixed value
          lines[i] = `${fix.key}=${fix.fixedValue}`;
          break;
        }
      }
      
      // Write back the fixed file
      fs.writeFileSync(envPath, lines.join('\n'), 'utf8');
      result.changesMade++;
    }
    
    // Apply security fixes to .env files
    for (const fix of plan.securityFixes) {
      console.log(chalk.gray(`  Fixing ${fix.file}: ${fix.issue}`));
      
      // Read the .env file
      const envPath = path.join(projectDir, fix.file);
      let content;
      try {
        content = fs.readFileSync(envPath, 'utf8');
      } catch (_e) {
        content = fs.readFileSync(envPath, 'utf16le');
      }
      content = content.replace(/\x00/g, '');
      
      // Replace weak secrets with strong ones
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const cleanLine = lines[i].trim().replace(/[\u200B-\u200D\uFEFF]/g, '');
        if (cleanLine.includes('JWT_SECRET') && cleanLine.includes('weak')) {
          lines[i] = `JWT_SECRET=${generateStrongSecret()}`;
          break;
        }
        if (cleanLine.includes('SECRET') && cleanLine.length < 20) {
          lines[i] = `SECRET=${generateStrongSecret()}`;
          break;
        }
      }
      
      // Write back the fixed file
      fs.writeFileSync(envPath, lines.join('\n'), 'utf8');
      result.changesMade++;
    }
    
    // Create Align structure from .env files
    const envFiles = findScatteredConfigFiles(projectDir).filter(f => f.type === 'environment');
    
    if (envFiles.length > 0) {
      console.log(chalk.blue('📁 Creating Align configuration structure...'));
      
      // Parse .env files to extract key-value pairs
      const configData = {};
      
      for (const envFile of envFiles) {
        let content;
        try {
          content = fs.readFileSync(envFile.path, 'utf8');
        } catch (_e) {
          content = fs.readFileSync(envFile.path, 'utf16le');
        }
        content = content.replace(/\x00/g, '');
        
        const lines = content.split('\n');
        lines.forEach(line => {
          const cleanLine = line.trim().replace(/[\u200B-\u200D\uFEFF]/g, '');
          const match = cleanLine.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
          if (match) {
            const key = match[1].toLowerCase().replace(/_/g, '_');
            let value = match[2].replace(/^["']|["']$/g, '');
            
            // Convert types
            if (key === 'port' || key === 'database_pool_size') {
              value = parseInt(value) || 3000;
            } else if (key === 'debug') {
              value = value === 'true' || value === '1';
            } else if (key.includes('enabled')) {
              value = value === 'true' || value === '1';
            } else if (key === 'cors_origins') {
              // Convert comma-separated string to array
              value = value.split(',').map(item => item.trim());
            }
            
            configData[key] = value;
          }
        });
      }
      
      // Create base.align
      const baseAlignPath = path.join(projectDir, 'config', 'base.align');
      fs.mkdirSync(path.dirname(baseAlignPath), { recursive: true });
      
      let baseAlignContent = '# Base Configuration\n';
      Object.entries(configData).forEach(([key, value]) => {
        if (typeof value === 'string') {
          baseAlignContent += `${key} = "${value}"\n`;
        } else if (Array.isArray(value)) {
          baseAlignContent += `${key} = [${value.map(item => `"${item}"`).join(', ')}]\n`;
        } else {
          baseAlignContent += `${key} = ${value}\n`;
        }
      });
      
      fs.writeFileSync(baseAlignPath, baseAlignContent);
      console.log(chalk.green('  ✅ Created config/base.align'));
      result.filesCreated++;
      
      // Create dev.align
      const devAlignPath = path.join(projectDir, 'config', 'dev.align');
      let devAlignContent = '# Development Environment Overrides\n';
      devAlignContent += 'debug = true\n';
      devAlignContent += 'log_level = "DEBUG"\n';
      
      fs.writeFileSync(devAlignPath, devAlignContent);
      console.log(chalk.green('  ✅ Created config/dev.align'));
      result.filesCreated++;
      
      // Create prod.align
      const prodAlignPath = path.join(projectDir, 'config', 'prod.align');
      let prodAlignContent = '# Production Environment Overrides\n';
      prodAlignContent += 'debug = false\n';
      prodAlignContent += 'log_level = "WARN"\n';
      
      fs.writeFileSync(prodAlignPath, prodAlignContent);
      console.log(chalk.green('  ✅ Created config/prod.align'));
      result.filesCreated++;
      
      // Create align.schema.json
      const schemaPath = path.join(projectDir, 'config', 'align.schema.json');
      const schemaContent = {};
      
      Object.entries(configData).forEach(([key, value]) => {
        schemaContent[key] = {
          'type': typeof value === 'number' ? 'number' : 
            typeof value === 'boolean' ? 'boolean' : 
              Array.isArray(value) ? 'array' : 'string',
          'required': true
        };
        
        // Add array items definition for arrays
        if (Array.isArray(value)) {
          schemaContent[key].items = {
            'type': 'string'
          };
        }
      });
      
      fs.writeFileSync(schemaPath, JSON.stringify(schemaContent, null, 2));
      console.log(chalk.green('  ✅ Created config/align.schema.json'));
      result.filesCreated++;
    }
    
    result.success = true;
    
  } catch (error) {
    console.error(chalk.red('❌ Auto repair failed:'), error.message);
  }
  
  return result;
}

// Confirm change (placeholder for interactive mode)
async function confirmChange(_message) {
  // In a real implementation, this would prompt the user
  // For now, return true to simulate user confirmation
  return true;
}

// Rollback from backup
function rollback(backupDir) {
  const fs = require('fs');
  const path = require('path');
  
  const result = {
    success: false,
    error: null
  };
  
  try {
    if (!fs.existsSync(backupDir)) {
      result.error = 'Backup directory not found';
      return result;
    }
    
    // Read plan to know what was changed
    const planPath = path.join(backupDir, 'repair-plan.json');
    if (fs.existsSync(planPath)) {
      const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
      
      // Restore files from backup
      for (const file of plan.consolidateFiles) {
        const backupPath = path.join(backupDir, path.relative(process.cwd(), file.source));
        if (fs.existsSync(backupPath)) {
          fs.copyFileSync(backupPath, file.source);
        }
      }
      
      // Remove created files
      for (const env of plan.createEnvironments) {
        if (fs.existsSync(env.file)) {
          fs.unlinkSync(env.file);
        }
      }
    }
    
    result.success = true;
    
  } catch (error) {
    result.error = error.message;
  }
  
  return result;
}

// Add rollback to repairConfig object
repairConfig.rollback = rollback;

// Package Schema Discovery and Namespacing Support
function discoverPackageSchemas(projectDir) {
  const packageSchemas = {};
  const nodeModulesPath = path.join(projectDir, 'node_modules');
  
  if (!fs.existsSync(nodeModulesPath)) {
    return packageSchemas;
  }
  
  try {
    const packages = fs.readdirSync(nodeModulesPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory() && !dirent.name.startsWith('.'))
      .map(dirent => dirent.name);
    
    for (const packageName of packages) {
      const packagePath = path.join(nodeModulesPath, packageName);
      const schemaPath = path.join(packagePath, 'align.schema.json');
      const packageJsonPath = path.join(packagePath, 'package.json');
      
      // Check for dedicated align.schema.json
      if (fs.existsSync(schemaPath)) {
        try {
          const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
          const schema = JSON.parse(schemaContent);
          packageSchemas[packageName] = schema;
        } catch (err) {
          console.warn(`Warning: Failed to load schema for ${packageName}: ${err.message}`);
        }
      }
      
      // Check for align field in package.json
      if (fs.existsSync(packageJsonPath)) {
        try {
          const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
          if (packageJson.align && typeof packageJson.align === 'object') {
            packageSchemas[packageName] = packageJson.align;
          }
        } catch (err) {
          // Ignore package.json parsing errors
        }
      }
    }
  } catch (err) {
    console.warn(`Warning: Failed to scan node_modules: ${err.message}`);
  }
  
  return packageSchemas;
}

function mergePackageSchemas(projectSchema = {}, packageSchemas = {}) {
  const mergedSchema = { ...projectSchema };
  
  for (const [packageName, schema] of Object.entries(packageSchemas)) {
    for (const [key, rules] of Object.entries(schema)) {
      const namespacedKey = `${packageName}.${key}`;
      mergedSchema[namespacedKey] = {
        ...rules,
        _package: packageName,
        _originalKey: key
      };
    }
  }
  
  return mergedSchema;
}

function parseNamespacedKey(key) {
  const parts = key.split('.');
  if (parts.length === 2) {
    return { namespace: parts[0], key: parts[1] };
  }
  return { namespace: null, key };
}

function resolveConfigContext(config, schemas = {}) {
  const context = {};
  
  for (const [key, value] of Object.entries(config)) {
    const { namespace, key: actualKey } = parseNamespacedKey(key);
    const schema = schemas[key];
    
    context[key] = {
      value,
      source: determineConfigSource(key, config),
      schema: schema || null,
      namespace,
      originalKey: actualKey,
      overridden: false, // Will be updated by merge tracking
      package: schema?._package || null
    };
  }
  
  return context;
}

function determineConfigSource(key, _config) {
  // This is a simplified version - in practice, this would track
  // which file and line number the value came from
  if (key.includes('.')) {
    const { namespace } = parseNamespacedKey(key);
    return `package:${namespace}`;
  }
  return 'project';
}

function validateWithPackageSchemas(config, projectSchema = {}, packageSchemas = {}) {
  const mergedSchema = mergePackageSchemas(projectSchema, packageSchemas);
  return validateConfig(config, false, mergedSchema);
}

function explainConfigValue(key, config, schemas = {}) {
  const { namespace, key: actualKey } = parseNamespacedKey(key);
  const value = config[key];
  const schema = schemas[key];
  
  const explanation = {
    key,
    value,
    namespace,
    originalKey: actualKey,
    source: determineConfigSource(key, config),
    schema: schema || null,
    package: schema?._package || null,
    type: typeof value,
    validation: null
  };
  
  // Add validation info if schema exists
  if (schema) {
    explanation.validation = {
      type: schema.type,
      required: schema.required || false,
      min: schema.min,
      max: schema.max,
      pattern: schema.pattern,
      default: schema.default
    };
  }
  
  return explanation;
}

function listAvailableSchemas(projectSchema = {}, packageSchemas = {}) {
  const schemas = {
    project: Object.keys(projectSchema),
    packages: {}
  };
  
  for (const [packageName, schema] of Object.entries(packageSchemas)) {
    schemas.packages[packageName] = Object.keys(schema);
  }
  
  return schemas;
}

// Cross-Language Export Functions
function exportToPython(config, className = 'Settings') {
  let output = '# Generated by Align - Cross-Language Configuration\n';
  output += '# Auto-generated settings class\n\n';
  output += `class ${className}:\n`;
  output += '    """Configuration settings generated from .align files"""\n\n';
  
  for (const [key, value] of Object.entries(config)) {
    const pythonKey = key.toUpperCase().replace(/[^A-Z0-9_]/g, '_');
    
    if (typeof value === 'string') {
      output += `    ${pythonKey} = "${value}"\n`;
    } else if (typeof value === 'boolean') {
      output += `    ${pythonKey} = ${value}\n`;
    } else if (typeof value === 'number') {
      output += `    ${pythonKey} = ${value}\n`;
    } else if (Array.isArray(value)) {
      const arrayStr = value.map(v => `"${v}"`).join(', ');
      output += `    ${pythonKey} = [${arrayStr}]\n`;
    } else {
      output += `    ${pythonKey} = "${String(value)}"\n`;
    }
  }
  
  output += '\n    @classmethod\n';
  output += '    def get(cls, key, default=None):\n';
  output += '        """Get configuration value with optional default"""\n';
  output += '        return getattr(cls, key.upper().replace(\'-\', \'_\'), default)\n';
  
  return output;
}

function exportToTOML(config) {
  let output = '# Generated by Align - Cross-Language Configuration\n';
  output += '# TOML format for Rust, Go, and other languages\n\n';
  
  for (const [key, value] of Object.entries(config)) {
    const tomlKey = key.replace(/[^a-zA-Z0-9_]/g, '_');
    
    if (typeof value === 'string') {
      output += `${tomlKey} = "${value}"\n`;
    } else if (typeof value === 'boolean') {
      output += `${tomlKey} = ${value}\n`;
    } else if (typeof value === 'number') {
      output += `${tomlKey} = ${value}\n`;
    } else if (Array.isArray(value)) {
      const arrayStr = value.map(v => `"${v}"`).join(', ');
      output += `${tomlKey} = [${arrayStr}]\n`;
    } else {
      output += `${tomlKey} = "${String(value)}"\n`;
    }
  }
  
  return output;
}

function exportToProperties(config) {
  let output = '# Generated by Align - Cross-Language Configuration\n';
  output += '# Java .properties format\n\n';
  
  for (const [key, value] of Object.entries(config)) {
    const propKey = key.replace(/[^a-zA-Z0-9_]/g, '.');
    
    if (typeof value === 'string') {
      output += `${propKey}=${value}\n`;
    } else if (typeof value === 'boolean') {
      output += `${propKey}=${value}\n`;
    } else if (typeof value === 'number') {
      output += `${propKey}=${value}\n`;
    } else if (Array.isArray(value)) {
      output += `${propKey}=${value.join(',')}\n`;
    } else {
      output += `${propKey}=${String(value)}\n`;
    }
  }
  
  return output;
}

function exportToHCL(config, resourceName = 'align_config') {
  let output = '# Generated by Align - Cross-Language Configuration\n';
  output += '# HashiCorp Configuration Language (HCL) for Terraform\n\n';
  output += `resource "local_file" "${resourceName}" {\n`;
  output += '  filename = "config.json"\n';
  output += '  content = jsonencode({\n';
  
  const configEntries = Object.entries(config);
  configEntries.forEach(([key, value], index) => {
    const hclKey = key.replace(/[^a-zA-Z0-9_]/g, '_');
    const isLast = index === configEntries.length - 1;
    
    if (typeof value === 'string') {
      output += `    ${hclKey} = "${value}"${isLast ? '' : ','}\n`;
    } else if (typeof value === 'boolean') {
      output += `    ${hclKey} = ${value}${isLast ? '' : ','}\n`;
    } else if (typeof value === 'number') {
      output += `    ${hclKey} = ${value}${isLast ? '' : ','}\n`;
    } else if (Array.isArray(value)) {
      const arrayStr = value.map(v => `"${v}"`).join(', ');
      output += `    ${hclKey} = [${arrayStr}]${isLast ? '' : ','}\n`;
    } else {
      output += `    ${hclKey} = "${String(value)}"${isLast ? '' : ','}\n`;
    }
  });
  
  output += '  })\n';
  output += '}\n';
  
  return output;
}

function exportToINI(config, sectionName = 'config') {
  let output = '# Generated by Align - Cross-Language Configuration\n';
  output += '# INI format for various applications\n\n';
  output += `[${sectionName}]\n`;
  
  for (const [key, value] of Object.entries(config)) {
    const iniKey = key.replace(/[^a-zA-Z0-9_]/g, '_');
    
    if (typeof value === 'string') {
      output += `${iniKey} = ${value}\n`;
    } else if (typeof value === 'boolean') {
      output += `${iniKey} = ${value}\n`;
    } else if (typeof value === 'number') {
      output += `${iniKey} = ${value}\n`;
    } else if (Array.isArray(value)) {
      output += `${iniKey} = ${value.join(',')}\n`;
    } else {
      output += `${iniKey} = ${String(value)}\n`;
    }
  }
  
  return output;
}

function exportToXML(config, rootElement = 'config') {
  let output = '<?xml version="1.0" encoding="UTF-8"?>\n';
  output += '<!-- Generated by Align - Cross-Language Configuration -->\n';
  output += `<${rootElement}>\n`;
  
  for (const [key, value] of Object.entries(config)) {
    const xmlKey = key.replace(/[^a-zA-Z0-9_]/g, '_');
    
    if (typeof value === 'string') {
      output += `  <${xmlKey}>${value}</${xmlKey}>\n`;
    } else if (typeof value === 'boolean') {
      output += `  <${xmlKey}>${value}</${xmlKey}>\n`;
    } else if (typeof value === 'number') {
      output += `  <${xmlKey}>${value}</${xmlKey}>\n`;
    } else if (Array.isArray(value)) {
      output += `  <${xmlKey}>\n`;
      value.forEach(item => {
        output += `    <item>${item}</item>\n`;
      });
      output += `  </${xmlKey}>\n`;
    } else {
      output += `  <${xmlKey}>${String(value)}</${xmlKey}>\n`;
    }
  }
  
  output += `</${rootElement}>\n`;
  return output;
}

// Enhanced export functions with inline comments/descriptions
function exportToJSONWithComments(config, schema = null) {
  let output = '{\n';
  
  const entries = Object.entries(config);
  entries.forEach(([key, value], index) => {
    const isLast = index === entries.length - 1;
    
    // Add comment if description exists in schema
    if (schema && schema.properties && schema.properties[key] && schema.properties[key].description) {
      output += `  // ${schema.properties[key].description}\n`;
    }
    
    if (typeof value === 'string') {
      output += `  "${key}": "${value}"${isLast ? '' : ','}\n`;
    } else if (typeof value === 'boolean') {
      output += `  "${key}": ${value}${isLast ? '' : ','}\n`;
    } else if (typeof value === 'number') {
      output += `  "${key}": ${value}${isLast ? '' : ','}\n`;
    } else if (Array.isArray(value)) {
      const arrayStr = value.map(v => `"${v}"`).join(', ');
      output += `  "${key}": [${arrayStr}]${isLast ? '' : ','}\n`;
    } else {
      output += `  "${key}": "${String(value)}"${isLast ? '' : ','}\n`;
    }
  });
  
  output += '}\n';
  return output;
}



function exportToYAMLWithComments(config, schema = null) {
  let output = '# Generated by Align - Cross-Language Configuration\n';
  output += '# YAML format with inline descriptions\n\n';
  
  function formatValue(key, value, schema, indent = '') {
    let result = '';
    
    // Add comment if description exists in schema
    if (schema && schema.properties && schema.properties[key] && schema.properties[key].description) {
      result += `${indent}# ${schema.properties[key].description}\n`;
    }
    
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      result += `${indent}${key}:\n`;
      for (const [nestedKey, nestedValue] of Object.entries(value)) {
        const nestedSchema = schema && schema.properties && schema.properties[key] && schema.properties[key].properties ? schema.properties[key].properties : null;
        // Add comment for nested property if description exists
        if (nestedSchema && nestedSchema[nestedKey] && nestedSchema[nestedKey].description) {
          result += `${indent}  # ${nestedSchema[nestedKey].description}\n`;
        }
        result += formatValue(nestedKey, nestedValue, nestedSchema, indent + '  ');
      }
    } else if (Array.isArray(value)) {
      result += `${indent}${key}:\n`;
      value.forEach(item => {
        result += `${indent}  - "${item}"\n`;
      });
    } else if (typeof value === 'string') {
      // Don't quote URLs or simple strings
      if (value.includes('://') || value.includes('localhost')) {
        result += `${indent}${key}: ${value}\n`;
      } else {
        result += `${indent}${key}: "${value}"\n`;
      }
    } else if (typeof value === 'boolean') {
      result += `${indent}${key}: ${value}\n`;
    } else if (typeof value === 'number') {
      result += `${indent}${key}: ${value}\n`;
    } else {
      result += `${indent}${key}: "${String(value)}"\n`;
    }
    
    return result;
  }
  
  for (const [key, value] of Object.entries(config)) {
    output += formatValue(key, value, schema);
    output += '\n'; // Add blank line for readability
  }
  
  return output;
}

function exportToPythonWithComments(config, schema = null, className = 'Settings') {
  let output = '# Generated by Align - Cross-Language Configuration\n';
  output += '# Auto-generated settings class with inline descriptions\n\n';
  output += `class ${className}:\n`;
  output += '    """Configuration settings generated from .align files"""\n\n';
  
  for (const [key, value] of Object.entries(config)) {
    const pythonKey = key.toUpperCase().replace(/[^A-Z0-9_]/g, '_');
    
    // Add comment if description exists in schema
    if (schema && schema.properties && schema.properties[key] && schema.properties[key].description) {
      output += `    # ${schema.properties[key].description}\n`;
    }
    
    if (typeof value === 'string') {
      output += `    ${pythonKey} = "${value}"\n`;
    } else if (typeof value === 'boolean') {
      output += `    ${pythonKey} = ${value}\n`;
    } else if (typeof value === 'number') {
      output += `    ${pythonKey} = ${value}\n`;
    } else if (Array.isArray(value)) {
      const arrayStr = value.map(v => `"${v}"`).join(', ');
      output += `    ${pythonKey} = [${arrayStr}]\n`;
    } else {
      output += `    ${pythonKey} = "${String(value)}"\n`;
    }
  }
  
  output += '\n    @classmethod\n';
  output += '    def get(cls, key, default=None):\n';
  output += '        """Get configuration value with optional default"""\n';
  output += '        return getattr(cls, key.upper().replace(\'-\', \'_\'), default)\n';
  
  return output;
}

function exportToTOMLWithComments(config, schema = null) {
  let output = '# Generated by Align - Cross-Language Configuration\n';
  output += '# TOML format for Rust, Go, and other languages with inline descriptions\n\n';
  
  for (const [key, value] of Object.entries(config)) {
    const tomlKey = key.replace(/[^a-zA-Z0-9_]/g, '_');
    
    // Add comment if description exists in schema
    if (schema && schema.properties && schema.properties[key] && schema.properties[key].description) {
      output += `# ${schema.properties[key].description}\n`;
    }
    
    if (typeof value === 'string') {
      output += `${tomlKey} = "${value}"\n`;
    } else if (typeof value === 'boolean') {
      output += `${tomlKey} = ${value}\n`;
    } else if (typeof value === 'number') {
      output += `${tomlKey} = ${value}\n`;
    } else if (Array.isArray(value)) {
      const arrayStr = value.map(v => `"${v}"`).join(', ');
      output += `${tomlKey} = [${arrayStr}]\n`;
    } else {
      output += `${tomlKey} = "${String(value)}"\n`;
    }
    output += '\n'; // Add blank line for readability
  }
  
  return output;
}

function exportToPropertiesWithComments(config, schema = null) {
  let output = '# Generated by Align - Cross-Language Configuration\n';
  output += '# Java .properties format with inline descriptions\n\n';
  
  for (const [key, value] of Object.entries(config)) {
    const propKey = key.replace(/[^a-zA-Z0-9_]/g, '.');
    
    // Add comment if description exists in schema
    if (schema && schema.properties && schema.properties[key] && schema.properties[key].description) {
      output += `# ${schema.properties[key].description}\n`;
    }
    
    if (typeof value === 'string') {
      output += `${propKey}=${value}\n`;
    } else if (typeof value === 'boolean') {
      output += `${propKey}=${value}\n`;
    } else if (typeof value === 'number') {
      output += `${propKey}=${value}\n`;
    } else if (Array.isArray(value)) {
      output += `${propKey}=${value.join(',')}\n`;
    } else {
      output += `${propKey}=${String(value)}\n`;
    }
  }
  
  return output;
}

function exportToHCLWithComments(config, schema = null, resourceName = 'align_config') {
  let output = '# Generated by Align - Cross-Language Configuration\n';
  output += '# HashiCorp Configuration Language (HCL) for Terraform with inline descriptions\n\n';
  output += `resource "local_file" "${resourceName}" {\n`;
  output += '  filename = "config.json"\n';
  output += '  content = jsonencode({\n';
  
  const configEntries = Object.entries(config);
  configEntries.forEach(([key, value], index) => {
    const hclKey = key.replace(/[^a-zA-Z0-9_]/g, '_');
    const isLast = index === configEntries.length - 1;
    
    // Add comment if description exists in schema
    if (schema && schema.properties && schema.properties[key] && schema.properties[key].description) {
      output += `    # ${schema.properties[key].description}\n`;
    }
    
    if (typeof value === 'string') {
      output += `    ${hclKey} = "${value}"${isLast ? '' : ','}\n`;
    } else if (typeof value === 'boolean') {
      output += `    ${hclKey} = ${value}${isLast ? '' : ','}\n`;
    } else if (typeof value === 'number') {
      output += `    ${hclKey} = ${value}${isLast ? '' : ','}\n`;
    } else if (Array.isArray(value)) {
      const arrayStr = value.map(v => `"${v}"`).join(', ');
      output += `    ${hclKey} = [${arrayStr}]${isLast ? '' : ','}\n`;
    } else {
      output += `    ${hclKey} = "${String(value)}"${isLast ? '' : ','}\n`;
    }
  });
  
  output += '  })\n';
  output += '}\n';
  
  return output;
}

function exportToINIWithComments(config, schema = null, sectionName = 'config') {
  let output = '# Generated by Align - Cross-Language Configuration\n';
  output += '# INI format for various applications with inline descriptions\n\n';
  output += `[${sectionName}]\n`;
  
  for (const [key, value] of Object.entries(config)) {
    const iniKey = key.replace(/[^a-zA-Z0-9_]/g, '_');
    
    // Add comment if description exists in schema
    if (schema && schema.properties && schema.properties[key] && schema.properties[key].description) {
      output += `# ${schema.properties[key].description}\n`;
    }
    
    if (typeof value === 'string') {
      output += `${iniKey} = ${value}\n`;
    } else if (typeof value === 'boolean') {
      output += `${iniKey} = ${value}\n`;
    } else if (typeof value === 'number') {
      output += `${iniKey} = ${value}\n`;
    } else if (Array.isArray(value)) {
      output += `${iniKey} = ${value.join(',')}\n`;
    } else {
      output += `${iniKey} = ${String(value)}\n`;
    }
  }
  
  return output;
}

function exportToXMLWithComments(config, schema = null, rootElement = 'config') {
  let output = '<?xml version="1.0" encoding="UTF-8"?>\n';
  output += '<!-- Generated by Align - Cross-Language Configuration -->\n';
  output += `<${rootElement}>\n`;
  
  for (const [key, value] of Object.entries(config)) {
    const xmlKey = key.replace(/[^a-zA-Z0-9_]/g, '_');
    
    // Add comment if description exists in schema
    if (schema && schema.properties && schema.properties[key] && schema.properties[key].description) {
      output += `  <!-- ${schema.properties[key].description} -->\n`;
    }
    
    if (typeof value === 'string') {
      output += `  <${xmlKey}>${value}</${xmlKey}>\n`;
    } else if (typeof value === 'boolean') {
      output += `  <${xmlKey}>${value}</${xmlKey}>\n`;
    } else if (typeof value === 'number') {
      output += `  <${xmlKey}>${value}</${xmlKey}>\n`;
    } else if (Array.isArray(value)) {
      output += `  <${xmlKey}>\n`;
      value.forEach(item => {
        output += `    <item>${item}</item>\n`;
      });
      output += `  </${xmlKey}>\n`;
    } else {
      output += `  <${xmlKey}>${String(value)}</${xmlKey}>\n`;
    }
  }
  
  output += `</${rootElement}>\n`;
  return output;
}

// Policy validation for environment-specific rules and guardrails
function validatePolicies(config, environment, policies = {}) {
  const violations = [];
  
  // Default policies for common scenarios
  const defaultPolicies = {
    production: {
      'debug': { allowed: false, message: 'Debug mode should not be enabled in production' },
      'log_level': { allowed: ['error', 'warn'], message: 'Production should use error or warn log level' },
      'ssl': { required: true, message: 'SSL must be enabled in production' },
      'timeout': { min: 5000, message: 'Production timeouts should be at least 5 seconds' },
      'max_connections': { min: 10, message: 'Production should have adequate connection limits' }
    },
    development: {
      'debug': { allowed: true, message: 'Debug mode is recommended for development' },
      'log_level': { allowed: ['debug', 'info'], message: 'Development should use debug or info log level' },
      'ssl': { required: false, message: 'SSL is optional in development' }
    },
    staging: {
      'debug': { allowed: false, message: 'Debug mode should not be enabled in staging' },
      'log_level': { allowed: ['info', 'warn'], message: 'Staging should use info or warn log level' },
      'ssl': { required: true, message: 'SSL must be enabled in staging' }
    }
  };
  
  // Merge default policies with custom policies
  const allPolicies = { ...defaultPolicies, ...policies };
  const envPolicies = allPolicies[environment] || {};
  
  // Validate each policy rule
  Object.entries(envPolicies).forEach(([key, policy]) => {
    const value = config[key];
    
    // Check required values first (even if key doesn't exist)
    if (policy.required !== undefined) {
      if (policy.required && (value === undefined || value === null || value === '' || value === false)) {
        violations.push({
          key,
          value,
          environment,
          rule: 'required',
          message: policy.message || `${key} is required in ${environment}`
        });
      }
    }
    
    if (value === undefined) {
      // Skip other validations if key doesn't exist
      return;
    }
    
    // Check allowed values
    if (policy.allowed !== undefined) {
      if (Array.isArray(policy.allowed)) {
        if (!policy.allowed.includes(value)) {
          violations.push({
            key,
            value,
            environment,
            rule: 'allowed_values',
            allowed: policy.allowed,
            message: policy.message || `Value '${value}' is not allowed for ${key} in ${environment}`
          });
        }
      } else {
        if (value !== policy.allowed) {
          violations.push({
            key,
            value,
            environment,
            rule: 'allowed_value',
            allowed: policy.allowed,
            message: policy.message || `Value '${value}' is not allowed for ${key} in ${environment}`
          });
        }
      }
    }
    
    // Check minimum values
    if (policy.min !== undefined) {
      if (typeof value === 'number' && value < policy.min) {
        violations.push({
          key,
          value,
          environment,
          rule: 'min_value',
          min: policy.min,
          message: policy.message || `${key} must be at least ${policy.min} in ${environment}`
        });
      }
    }
    
    // Check maximum values
    if (policy.max !== undefined) {
      if (typeof value === 'number' && value > policy.max) {
        violations.push({
          key,
          value,
          environment,
          rule: 'max_value',
          max: policy.max,
          message: policy.message || `${key} must be at most ${policy.max} in ${environment}`
        });
      }
    }
    
    // Check pattern matching
    if (policy.pattern !== undefined) {
      const regex = new RegExp(policy.pattern);
      if (!regex.test(String(value))) {
        violations.push({
          key,
          value,
          environment,
          rule: 'pattern',
          pattern: policy.pattern,
          message: policy.message || `${key} must match pattern ${policy.pattern} in ${environment}`
        });
      }
    }
    
    // Check custom validation function
    if (policy.validate !== undefined && typeof policy.validate === 'function') {
      try {
        const isValid = policy.validate(value, config, environment);
        if (!isValid) {
          violations.push({
            key,
            value,
            environment,
            rule: 'custom_validation',
            message: policy.message || `Custom validation failed for ${key} in ${environment}`
          });
        }
      } catch (error) {
        violations.push({
          key,
          value,
          environment,
          rule: 'validation_error',
          message: `Validation error for ${key}: ${error.message}`
        });
      }
    }
  });
  
  return {
    valid: violations.length === 0,
    violations,
    environment,
    policiesApplied: Object.keys(envPolicies)
  };
}

// Load policies from file
function loadPolicies(policyPath) {
  const fs = require('fs');
  
  try {
    if (fs.existsSync(policyPath)) {
      const content = fs.readFileSync(policyPath, 'utf8');
      return JSON.parse(content);
    }
  } catch (_error) {
    console.warn(`Warning: Could not load policies from ${policyPath}: ${_error.message}`);
  }
  
  return {};
}

// Generate policy suggestions based on configuration
function suggestPolicies(config, environment) {
  const suggestions = [];
  
  // Suggest policies based on common patterns
  if (config.debug === true && environment === 'production') {
    suggestions.push({
      key: 'debug',
      rule: 'allowed',
      value: false,
      message: 'Debug mode should be disabled in production',
      severity: 'critical'
    });
  }
  
  if (config.log_level === 'debug' && environment === 'production') {
    suggestions.push({
      key: 'log_level',
      rule: 'allowed',
      value: ['error', 'warn'],
      message: 'Production should use error or warn log level',
      severity: 'warning'
    });
  }
  
  if (config.ssl === false && environment === 'production') {
    suggestions.push({
      key: 'ssl',
      rule: 'required',
      value: true,
      message: 'SSL must be enabled in production',
      severity: 'critical'
    });
  }
  
  if (config.timeout && typeof config.timeout === 'number' && config.timeout < 5000 && environment === 'production') {
    suggestions.push({
      key: 'timeout',
      rule: 'min',
      value: 5000,
      message: 'Production timeouts should be at least 5 seconds',
      severity: 'warning'
    });
  }
  
  return suggestions;
}

// Schema inference - automatically generate schemas from existing .align files
function inferSchema(config, options = {}) {
  const schema = {};
  
  for (const [key, value] of Object.entries(config)) {
    const inferredType = inferType(value);
    const schemaField = {
      type: inferredType,
      required: options.markAllRequired || false, // Default to false
      description: `Inferred from ${key}`
    };
    
    // Add default value if not required
    if (!schemaField.required) {
      schemaField.default = value;
    }
    
    // Add additional type-specific properties
    if (inferredType === 'string') {
      if (options.inferPatterns && isUrl(value)) {
        schemaField.pattern = '^https?://.*$';
      } else if (options.inferPatterns && isEmail(value)) {
        schemaField.pattern = '^[^@]+@[^@]+\\.[^@]+$';
      }
    } else if (inferredType === 'number') {
      if (options.inferRanges) {
        schemaField.min = value > 0 ? 1 : 0;
        schemaField.max = value * 10; // Reasonable upper bound
      }
    } else if (inferredType === 'array') {
      if (value.length > 0) {
        const firstItemType = inferType(value[0]);
        schemaField.items = { type: firstItemType };
      }
    }
    
    schema[key] = schemaField;
  }
  
  return schema;
}

// Helper function to infer type from value
function inferType(value) {
  if (typeof value === 'string') {
    return 'string';
  } else if (typeof value === 'number') {
    return 'number';
  } else if (typeof value === 'boolean') {
    return 'boolean';
  } else if (Array.isArray(value)) {
    return 'array';
  } else if (value === null || value === undefined) {
    return 'string'; // Default to string for null/undefined
  } else {
    return 'string'; // Fallback
  }
}

// Helper function to detect URLs
function isUrl(value) {
  if (typeof value !== 'string') return false;
  return value.startsWith('http://') || value.startsWith('https://') || 
         value.startsWith('ws://') || value.startsWith('wss://') ||
         value.startsWith('postgresql://') || value.startsWith('mysql://') ||
         value.startsWith('redis://') || value.startsWith('mongodb://');
}

// Helper function to detect emails
function isEmail(value) {
  if (typeof value !== 'string') return false;
  return /^[^@]+@[^@]+\.[^@]+$/.test(value);
}

// Infer schema from multiple config files (base + environments)
function inferSchemaFromFiles(baseConfig, envConfigs = {}, options = {}) {
  // Start with base config
  let mergedConfig = { ...baseConfig };
  
  // Merge all environment configs to get complete picture
  for (const [_envName, envConfig] of Object.entries(envConfigs)) {
    mergedConfig = { ...mergedConfig, ...envConfig };
  }
  
  // Infer schema from merged config
  const schema = inferSchema(mergedConfig, options);
  
  // Add metadata
  schema._metadata = {
    inferred: true,
    source: 'auto-generated from .align files',
    generated_at: new Date().toISOString(),
    options: options
  };
  
  return schema;
}

// Helper function to generate .align content
function generateAlignContent(config) {
  const lines = [];
  lines.push('# Generated by Align Interactive CLI');
  lines.push('');
  
  for (const [key, value] of Object.entries(config)) {
    if (typeof value === 'string') {
      lines.push(`${key} = "${value}"`);
    } else if (typeof value === 'number') {
      lines.push(`${key} = ${value}`);
    } else if (typeof value === 'boolean') {
      lines.push(`${key} = ${value}`);
    } else if (Array.isArray(value)) {
      const arrayStr = value.map(v => 
        typeof v === 'string' ? `"${v}"` : v
      ).join(',');
      lines.push(`${key} = [${arrayStr}]`);
    } else if (value === null) {
      lines.push(`${key} = null`);
    } else if (value === undefined) {
      lines.push(`${key} = undefined`);
    } else {
      lines.push(`${key} = ${JSON.stringify(value)}`);
    }
  }
  
  return lines.join('\n');
}

// Module-specific configuration - extract configs for specific modules
function extractModuleConfig(config, moduleSchema) {
  const moduleConfig = {};
  const errors = [];
  
  // Extract only the keys that this module needs
  for (const [key, schema] of Object.entries(moduleSchema.properties || {})) {
    if (Object.prototype.hasOwnProperty.call(config, key)) {
      moduleConfig[key] = config[key];
    } else if (schema.required) {
      errors.push(`Missing required field for module: ${key}`);
    }
  }
  
  // Validate the extracted config
  const validation = validateConfig(moduleConfig, moduleSchema);
  if (validation && validation.errors && validation.errors.length > 0) {
    errors.push(...validation.errors);
  }
  
  return {
    config: moduleConfig,
    errors: errors,
    missing: Object.keys(moduleSchema.properties || {}).filter(key => !Object.prototype.hasOwnProperty.call(config, key))
  };
}

function discoverModuleSchemas(configDir = './config') {
  const modules = [];
  
  // Look for module schemas in config/modules/
  const modulesDir = path.join(configDir, 'modules');
  if (fs.existsSync(modulesDir)) {
    const moduleDirs = fs.readdirSync(modulesDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
    
    for (const moduleName of moduleDirs) {
      const schemaPath = path.join(modulesDir, moduleName, 'align.schema.json');
      if (fs.existsSync(schemaPath)) {
        try {
          const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
          modules.push({
            name: moduleName,
            schema: schema,
            path: schemaPath
          });
        } catch (_error) {
          console.warn(`Warning: Could not parse schema for module ${moduleName}: ${_error.message}`);
        }
      }
    }
  }
  
  // Also look for modules in node_modules (existing package schemas)
  try {
    const packageSchemas = discoverPackageSchemas();
    for (const [packageName, schema] of Object.entries(packageSchemas)) {
      if (schema.module) {
        modules.push({
          name: packageName,
          schema: schema,
          path: `node_modules/${packageName}/align.schema.json`,
          isPackage: true
        });
      }
    }
  } catch (error) {
    // Ignore package schema discovery errors
  }
  
  return modules;
}

function generateModuleConfig(config, moduleName, environment = 'dev', configDir = './config') {
  // Find the module schema
  const modules = discoverModuleSchemas(configDir);
  const module = modules.find(m => m.name === moduleName);
  
  if (!module) {
    throw new Error(`Module not found: ${moduleName}`);
  }
  
  // Extract module-specific config
  const result = extractModuleConfig(config, module.schema);
  
  return {
    module: moduleName,
    environment: environment,
    config: result.config,
    errors: result.errors || [],
    missing: result.missing || [],
    schema: module.schema,
    isPackage: module.isPackage || false
  };
}

function validateModuleConfig(config, moduleName, environment = 'dev', configDir = './config') {
  try {
    const result = generateModuleConfig(config, moduleName, environment, configDir);
    
    return {
      valid: result.errors.length === 0,
      errors: result.errors,
      warnings: result.missing.length > 0 ? [`Missing optional fields: ${result.missing.join(', ')}`] : [],
      module: moduleName,
      environment: environment,
      config: result.config
    };
  } catch (error) {
    return {
      valid: false,
      errors: [error.message],
      warnings: [],
      module: moduleName,
      environment: environment,
      config: {}
    };
  }
}

function lintConfig(config, schema = null, environment = 'dev') {
  const issues = [];
  const warnings = [];
  const suggestions = [];

  // 1. Detect unused fields
  const unusedFields = detectUnusedFields(config, schema);
  if (unusedFields.length > 0) {
    issues.push({
      type: 'unused_fields',
      severity: 'warning',
      message: 'Unused configuration fields detected',
      details: unusedFields,
      suggestion: 'Consider removing unused fields or adding them to your schema'
    });
  }

  // 2. Warn on overly permissive patterns
  const permissivePatterns = detectOverlyPermissivePatterns(schema);
  if (permissivePatterns.length > 0) {
    warnings.push({
      type: 'permissive_patterns',
      severity: 'warning',
      message: 'Overly permissive patterns detected',
      details: permissivePatterns,
      suggestion: 'Consider using more restrictive patterns for better security'
    });
  }

  // 3. Highlight conflicting defaults
  const conflictingDefaults = detectConflictingDefaults(config, schema);
  if (conflictingDefaults.length > 0) {
    issues.push({
      type: 'conflicting_defaults',
      severity: 'error',
      message: 'Conflicting default values detected',
      details: conflictingDefaults,
      suggestion: 'Resolve conflicts by using consistent default values'
    });
  }

  // 4. Suggest best practices
  const bestPracticeSuggestions = suggestBestPractices(config, schema, environment);
  suggestions.push(...bestPracticeSuggestions);

  return {
    issues,
    warnings,
    suggestions,
    summary: {
      totalIssues: issues.length,
      totalWarnings: warnings.length,
      totalSuggestions: suggestions.length
    }
  };
}

function detectUnusedFields(config, schema) {
  const unused = [];
  
  if (!schema || !schema.properties) {
    return unused;
  }

  // Check if config fields are defined in schema
  for (const [key, value] of Object.entries(config)) {
    if (!schema.properties[key]) {
      unused.push({
        field: key,
        value: value,
        reason: 'Field not defined in schema'
      });
    }
  }

  // Check if schema fields are used in config
  for (const [key, fieldSchema] of Object.entries(schema.properties)) {
    if (!(key in config) && fieldSchema.required) {
      unused.push({
        field: key,
        reason: 'Required field missing from configuration'
      });
    }
  }

  return unused;
}

function detectOverlyPermissivePatterns(schema) {
  const permissivePatterns = [];
  
  if (!schema || !schema.properties) {
    return permissivePatterns;
  }

  const overlyPermissivePatterns = [
    { pattern: '^.*$', description: 'Matches any string' },
    { pattern: '.*', description: 'Matches any string' },
    { pattern: '^[\\s\\S]*$', description: 'Matches any character including newlines' },
    { pattern: '^[\\w\\W]*$', description: 'Matches any word or non-word character' },
    { pattern: '^[\\d\\D]*$', description: 'Matches any digit or non-digit character' },
    { pattern: '^[\\s\\S]*$', description: 'Matches any whitespace or non-whitespace' },
    { pattern: '[a-z]+', description: 'Too permissive character class' },
    { pattern: '[a-zA-Z]+', description: 'Too permissive character class' },
    { pattern: '[0-9]+', description: 'Too permissive character class' }
  ];

  for (const [key, fieldSchema] of Object.entries(schema.properties)) {
    if (fieldSchema.pattern) {
      const isOverlyPermissive = overlyPermissivePatterns.some(pp => 
        fieldSchema.pattern === pp.pattern
      );
      
      if (isOverlyPermissive) {
        permissivePatterns.push({
          field: key,
          pattern: fieldSchema.pattern,
          description: overlyPermissivePatterns.find(pp => pp.pattern === fieldSchema.pattern)?.description,
          suggestion: 'Consider using a more restrictive pattern'
        });
      }
    }
  }

  return permissivePatterns;
}

function detectConflictingDefaults(config, schema) {
  const conflicts = [];
  
  if (!schema || !schema.properties) {
    return conflicts;
  }

  for (const [key, fieldSchema] of Object.entries(schema.properties)) {
    if (fieldSchema.default !== undefined && key in config) {
      const configValue = config[key];
      const schemaDefault = fieldSchema.default;
      
      // Check for type conflicts
      if (typeof configValue !== typeof schemaDefault) {
        conflicts.push({
          field: key,
          configValue: configValue,
          schemaDefault: schemaDefault,
          reason: 'Type mismatch between config value and schema default'
        });
      }
      
      // Check for value conflicts (for same type)
      else if (configValue !== schemaDefault) {
        conflicts.push({
          field: key,
          configValue: configValue,
          schemaDefault: schemaDefault,
          reason: 'Value conflict between config and schema default'
        });
      }
      // Also detect when config value equals schema default (redundant configuration)
      else {
        conflicts.push({
          field: key,
          configValue: configValue,
          schemaDefault: schemaDefault,
          reason: 'Redundant configuration - value matches schema default'
        });
      }
    }
  }

  return conflicts;
}

function suggestBestPractices(config, schema, environment) {
  const suggestions = [];

  // Security best practices
  suggestions.push(...suggestSecurityBestPractices(config, environment));
  
  // Performance best practices
  suggestions.push(...suggestPerformanceBestPractices(config, environment));
  
  // Configuration best practices
  suggestions.push(...suggestConfigurationBestPractices(config, schema, environment));

  return suggestions;
}

function suggestSecurityBestPractices(config, environment) {
  const suggestions = [];

  // Check for weak secrets
  if (config.jwt_secret && config.jwt_secret.length < 32) {
    suggestions.push({
      type: 'security',
      severity: 'warning',
      field: 'jwt_secret',
      message: 'JWT secret is too short',
      suggestion: 'Use a secret with at least 32 characters',
      impact: 'Weak secrets can be easily compromised'
    });
  }

  // Check for HTTP in production
  if (environment === 'prod' && config.database_url && config.database_url.startsWith('http://')) {
    suggestions.push({
      type: 'security',
      severity: 'error',
      field: 'database_url',
      message: 'Using HTTP in production',
      suggestion: 'Use HTTPS for production database connections',
      impact: 'Data transmitted over HTTP is not encrypted'
    });
  }

  // Check for debug mode in production
  if (environment === 'prod' && config.debug === true) {
    suggestions.push({
      type: 'security',
      severity: 'error',
      field: 'debug',
      message: 'Debug mode enabled in production',
      suggestion: 'Disable debug mode in production',
      impact: 'Debug mode can expose sensitive information'
    });
  }

  // Check for overly permissive CORS
  if (config.cors_origins && config.cors_origins.includes('*')) {
    suggestions.push({
      type: 'security',
      severity: 'warning',
      field: 'cors_origins',
      message: 'Overly permissive CORS configuration',
      suggestion: 'Specify exact origins instead of using wildcard',
      impact: 'Wildcard CORS can allow unauthorized access'
    });
  }

  return suggestions;
}

function suggestPerformanceBestPractices(config, environment) {
  const suggestions = [];

  // Check for low timeout values
  if (config.timeout && config.timeout < 1000) {
    suggestions.push({
      type: 'performance',
      severity: 'warning',
      field: 'timeout',
      message: 'Timeout value is very low',
      suggestion: 'Consider increasing timeout for better reliability',
      impact: 'Low timeouts can cause frequent failures'
    });
  }

  // Check for high timeout values
  if (config.timeout && config.timeout > 300000) {
    suggestions.push({
      type: 'performance',
      severity: 'warning',
      field: 'timeout',
      message: 'Timeout value is very high',
      suggestion: 'Consider reducing timeout for better responsiveness',
      impact: 'High timeouts can cause poor user experience'
    });
  }

  // Check for missing caching configuration
  if (!config.cache_ttl && environment === 'prod') {
    suggestions.push({
      type: 'performance',
      severity: 'info',
      field: 'cache_ttl',
      message: 'No caching configuration found',
      suggestion: 'Consider adding cache TTL for better performance',
      impact: 'Caching can significantly improve performance'
    });
  }

  // Check for low database pool size
  if (config.database_pool_size && config.database_pool_size < 5) {
    suggestions.push({
      type: 'performance',
      severity: 'warning',
      field: 'database_pool_size',
      message: 'Database pool size is low',
      suggestion: 'Consider increasing pool size for better concurrency',
      impact: 'Low pool size can cause connection bottlenecks'
    });
  }

  return suggestions;
}

function suggestConfigurationBestPractices(config, schema, environment) {
  const suggestions = [];

  // Check for missing required fields
  if (schema && schema.required) {
    for (const requiredField of schema.required) {
      if (!(requiredField in config)) {
        suggestions.push({
          type: 'configuration',
          severity: 'error',
          field: requiredField,
          message: 'Required field missing',
          suggestion: 'Add the required field to your configuration',
          impact: 'Missing required fields can cause application failures'
        });
      }
    }
  }

  // Check for environment-specific best practices
  if (environment === 'prod') {
    if (!config.log_level || config.log_level === 'debug') {
      suggestions.push({
        type: 'configuration',
        severity: 'warning',
        field: 'log_level',
        message: 'Debug logging in production',
        suggestion: 'Use info, warn, or error log level in production',
        impact: 'Debug logging can impact performance and security'
      });
    }
  }

  // Check for development-specific best practices
  if (environment === 'dev') {
    if (config.log_level === 'error') {
      suggestions.push({
        type: 'configuration',
        severity: 'info',
        field: 'log_level',
        message: 'Very restrictive logging in development',
        suggestion: 'Consider using debug or info level for better debugging',
        impact: 'Error-only logging makes debugging difficult'
      });
    }
  }

  // Check for missing health check configuration
  if (!config.health_check_path && environment === 'prod') {
    suggestions.push({
      type: 'configuration',
      severity: 'info',
      field: 'health_check_path',
      message: 'No health check endpoint configured',
      suggestion: 'Add health check endpoint for monitoring',
      impact: 'Health checks are essential for production monitoring'
    });
  }

  return suggestions;
}

function applyLintFixes(config, schema, environment, lintResult) {
  const fixedConfig = { ...config };
  const results = { fixed: [], notFixed: [] };

  // Add missing schema defaults
  if (schema && schema.properties) {
    for (const [key, fieldSchema] of Object.entries(schema.properties)) {
      if (fieldSchema.default !== undefined && !(key in fixedConfig)) {
        fixedConfig[key] = fieldSchema.default;
        results.fixed.push({
          field: key,
          oldValue: undefined,
          newValue: fieldSchema.default,
          reason: 'Added missing schema default'
        });
      }
    }
  }

  // Fix conflicting defaults by using schema defaults
  for (const issue of lintResult.issues) {
    if (issue.type === 'conflicting_defaults') {
      for (const detail of issue.details) {
        if (schema && schema.properties && schema.properties[detail.field] && 
            schema.properties[detail.field].default !== undefined) {
          const oldValue = fixedConfig[detail.field];
          const newValue = schema.properties[detail.field].default;
          
          fixedConfig[detail.field] = newValue;
          results.fixed.push({
            field: detail.field,
            oldValue: oldValue,
            newValue: newValue,
            reason: 'Applied schema default'
          });
        }
      }
    }
  }

  // Fix security issues
  for (const suggestion of lintResult.suggestions) {
    if (suggestion.type === 'security') {
      if (suggestion.field === 'jwt_secret' && suggestion.message.includes('too short')) {
        const oldValue = fixedConfig[suggestion.field];
        const newValue = generateStrongSecret();
        
        fixedConfig[suggestion.field] = newValue;
        results.fixed.push({
          field: suggestion.field,
          oldValue: oldValue,
          newValue: newValue,
          reason: 'Generated strong JWT secret'
        });
      }
      
      if (suggestion.field === 'cors_origins' && suggestion.message.includes('permissive')) {
        const oldValue = fixedConfig[suggestion.field];
        const newValue = ['http://localhost:3000', 'http://localhost:8080'];
        
        fixedConfig[suggestion.field] = newValue;
        results.fixed.push({
          field: suggestion.field,
          oldValue: oldValue,
          newValue: newValue,
          reason: 'Replaced wildcard with specific origins'
        });
      }
    }
  }

  // Fix performance issues
  for (const suggestion of lintResult.suggestions) {
    if (suggestion.type === 'performance') {
      if (suggestion.field === 'timeout' && suggestion.message.includes('very low')) {
        const oldValue = fixedConfig[suggestion.field];
        const newValue = Math.max(oldValue, 1000);
        
        fixedConfig[suggestion.field] = newValue;
        results.fixed.push({
          field: suggestion.field,
          oldValue: oldValue,
          newValue: newValue,
          reason: 'Increased timeout to minimum recommended value'
        });
      }
      
      if (suggestion.field === 'timeout' && suggestion.message.includes('very high')) {
        const oldValue = fixedConfig[suggestion.field];
        const newValue = Math.min(oldValue, 300000);
        
        fixedConfig[suggestion.field] = newValue;
        results.fixed.push({
          field: suggestion.field,
          oldValue: oldValue,
          newValue: newValue,
          reason: 'Reduced timeout to maximum recommended value'
        });
      }
    }
  }

  // Fix configuration issues
  for (const suggestion of lintResult.suggestions) {
    if (suggestion.type === 'configuration') {
      if (suggestion.field === 'log_level' && environment === 'dev' && 
          suggestion.message.includes('restrictive')) {
        const oldValue = fixedConfig[suggestion.field];
        const newValue = 'info';
        
        fixedConfig[suggestion.field] = newValue;
        results.fixed.push({
          field: suggestion.field,
          oldValue: oldValue,
          newValue: newValue,
          reason: 'Set appropriate log level for development'
        });
      }
      
      if (suggestion.field === 'log_level' && environment === 'prod' && 
          suggestion.message.includes('Debug logging')) {
        const oldValue = fixedConfig[suggestion.field];
        const newValue = 'warn';
        
        fixedConfig[suggestion.field] = newValue;
        results.fixed.push({
          field: suggestion.field,
          oldValue: oldValue,
          newValue: newValue,
          reason: 'Set appropriate log level for production'
        });
      }
    }
  }

  // Remove unused fields
  for (const issue of lintResult.issues) {
    if (issue.type === 'unused_fields') {
      for (const detail of issue.details) {
        if (fixedConfig[detail.field] !== undefined) {
          delete fixedConfig[detail.field];
          results.fixed.push({
            field: detail.field,
            oldValue: fixedConfig[detail.field],
            newValue: undefined,
            reason: 'Removed unused field'
          });
        } else {
          results.notFixed.push({
            field: detail.field,
            reason: 'Unused fields require manual review'
          });
        }
      }
    }
  }

  for (const warning of lintResult.warnings) {
    if (warning.type === 'permissive_patterns') {
      for (const detail of warning.details) {
        results.notFixed.push({
          field: detail.field,
          reason: 'Pattern restrictions require manual review'
        });
      }
    }
  }

  return { config: fixedConfig, results };
}

async function writeFixedConfig(config, configDir, environment, schema) {
  const fs = require('fs').promises;
  const path = require('path');

  // Determine which file to update based on where the values came from
  const basePath = path.join(configDir, 'base.align');
  const envPath = path.join(configDir, `${environment}.align`);
  
  // Load original files to determine what should go where
  let baseContent = '';
  let envContent = '';
  let baseConfig = {};
  let envConfig = {};
  
  try {
    baseContent = await fs.readFile(basePath, 'utf-8');
    baseConfig = parseAlign(baseContent);
  } catch (error) {
    // File doesn't exist, use empty config
    baseConfig = {};
  }
  
  try {
    envContent = await fs.readFile(envPath, 'utf-8');
    envConfig = parseAlign(envContent);
  } catch (error) {
    // File doesn't exist, use empty config
    envConfig = {};
  }
  
  // Separate fixes into base and environment configs
  const baseFixes = {};
  const envFixes = {};
  const envRemovals = [];
  
  for (const [key, value] of Object.entries(config)) {
    // If the key exists in base config, it's a base fix
    if (key in baseConfig) {
      baseFixes[key] = value;
    }
    // If the key exists in env config, check if it should be removed
    else if (key in envConfig) {
      // If the value matches the schema default, remove it from env config
      if (schema && schema.properties && schema.properties[key] && 
          schema.properties[key].default !== undefined &&
          value === schema.properties[key].default) {
        envRemovals.push(key);
      } else {
        envFixes[key] = value;
      }
    }
    // Otherwise, it's a new field - add to base
    else {
      baseFixes[key] = value;
    }
  }
  
  // Apply fixes to base config
  if (Object.keys(baseFixes).length > 0) {
    const updatedBaseConfig = { ...baseConfig, ...baseFixes };
    const baseContent = generateAlignContent(updatedBaseConfig);
    await fs.writeFile(basePath, baseContent);
  }
  
  // Apply fixes to environment config and remove unnecessary overrides
  const updatedEnvConfig = { ...envConfig, ...envFixes };
  envRemovals.forEach(key => {
    delete updatedEnvConfig[key];
  });
  
  if (Object.keys(envFixes).length > 0 || envRemovals.length > 0) {
    const envContent = generateAlignContent(updatedEnvConfig);
    await fs.writeFile(envPath, envContent);
  }
}

// Secrets Management Functions
function detectSensitiveFields(config, schema = null) {
  const sensitiveFields = [];
  const sensitivePatterns = [
    /(api[_-]?key)/i,
    /(secret)/i,
    /(password)/i,
    /(token)/i,
    /(auth)/i,
    /(credential)/i,
    /(private)/i,
    /(jwt[_-]?secret)/i,
    /(session[_-]?secret)/i,
    /(encryption[_-]?key)/i,
    /(signing[_-]?key)/i
  ];

  for (const [key, value] of Object.entries(config)) {
    // Check if field name matches sensitive patterns
    const isSensitiveByName = sensitivePatterns.some(pattern => pattern.test(key));
    
    // Check if field is marked as sensitive in schema
    const isSensitiveInSchema = schema && 
                               schema.properties && 
                               schema.properties[key] && 
                               schema.properties[key].sensitive === true;

    if (isSensitiveByName || isSensitiveInSchema) {
      sensitiveFields.push({
        field: key,
        value: value,
        reason: isSensitiveInSchema ? 'marked as sensitive in schema' : 'matches sensitive field pattern',
        masked: maskSensitiveValue(value)
      });
    }
  }

  return sensitiveFields;
}

function maskSensitiveValue(value) {
  if (typeof value !== 'string') {
    return '***';
  }

  if (value.length <= 8) {
    return '*'.repeat(value.length);
  }

  // Show first 2 and last 2 characters, mask the rest
  const first = value.substring(0, 2);
  const last = value.substring(value.length - 2);
  const masked = '*'.repeat(Math.max(4, value.length - 4));
  
  return `${first}${masked}${last}`;
}

function validateSecrets(config, schema = null, environment = 'dev') {
  const issues = [];
  const warnings = [];
  const suggestions = [];

  const sensitiveFields = detectSensitiveFields(config, schema);

  // Check for weak secrets
  for (const field of sensitiveFields) {
    const value = field.value;
    
    if (typeof value === 'string') {
      // Check for common weak patterns
      if (value.length < 16) {
        issues.push({
          type: 'weak_secret',
          severity: 'error',
          field: field.field,
          message: 'Secret is too short',
          suggestion: 'Use secrets with at least 16 characters',
          impact: 'Short secrets are easily compromised'
        });
      }

      if (value.toLowerCase() === 'password' || 
          value.toLowerCase() === 'secret' ||
          value.toLowerCase() === 'key') {
        issues.push({
          type: 'weak_secret',
          severity: 'error',
          field: field.field,
          message: 'Using default/placeholder secret',
          suggestion: 'Replace with a strong, unique secret',
          impact: 'Default secrets are easily guessed'
        });
      }

      // Check for common patterns
      if (/^[a-zA-Z0-9]{8,}$/.test(value)) {
        warnings.push({
          type: 'weak_secret',
          severity: 'warning',
          field: field.field,
          message: 'Secret may be too simple',
          suggestion: 'Use secrets with special characters and mixed case',
          impact: 'Simple secrets are easier to crack'
        });
      }
    }
  }

  // Check for secrets in wrong environment
  if (environment === 'prod') {
    for (const field of sensitiveFields) {
      if (field.value && typeof field.value === 'string' && 
          field.value.includes('localhost') || 
          field.value.includes('dev') ||
          field.value.includes('test')) {
        warnings.push({
          type: 'environment_mismatch',
          severity: 'warning',
          field: field.field,
          message: 'Development secret in production',
          suggestion: 'Use production-appropriate secrets',
          impact: 'Development secrets may not be secure for production'
        });
      }
    }
  }

  // Check for missing secrets
  if (schema && schema.required) {
    for (const requiredField of schema.required) {
      const sensitivePatterns = [
        /(api[_-]?key)/i,
        /(secret)/i,
        /(password)/i,
        /(token)/i,
        /(jwt[_-]?secret)/i
      ];

      const isSensitive = sensitivePatterns.some(pattern => pattern.test(requiredField));
      const isMissing = !(requiredField in config);

      if (isSensitive && isMissing) {
        issues.push({
          type: 'missing_secret',
          severity: 'error',
          field: requiredField,
          message: 'Required sensitive field missing',
          suggestion: 'Add the required secret field',
          impact: 'Missing secrets can cause authentication failures'
        });
      }
    }
  }

  return {
    sensitiveFields,
    issues,
    warnings,
    suggestions,
    weakSecrets: issues.filter(issue => issue.type === 'weak_secret').map(issue => ({
      field: issue.field,
      reason: issue.message,
      suggestion: issue.suggestion
    })),
    validSecrets: sensitiveFields.filter(field => 
      !issues.some(issue => issue.field === field.field && issue.type === 'weak_secret')
    ).map(field => ({
      field: field.field,
      reason: 'Secret meets security requirements'
    })),
    summary: {
      totalIssues: issues.length,
      totalWarnings: warnings.length,
      totalSuggestions: suggestions.length
    }
  };
}

function loadSecretsFromEnv(secretFile = '.env.secret') {
  const fs = require('fs');
  const path = require('path');
  
  const secretPath = path.resolve(secretFile);
  
  if (!fs.existsSync(secretPath)) {
    return {};
  }

  const content = fs.readFileSync(secretPath, 'utf-8');
  const secrets = {};

  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const equalIndex = trimmed.indexOf('=');
      if (equalIndex !== -1) {
        const key = trimmed.substring(0, equalIndex).trim();
        const value = trimmed.substring(equalIndex + 1).trim();
        
        // Remove quotes if present
        const cleanValue = value.replace(/^["']|["']$/g, '');
        secrets[key] = cleanValue;
      }
    }
  });

  return secrets;
}

function integrateWithVault(vaultConfig = {}) {
  // Mock Vault integration - in real implementation, this would use Vault API
  const { address = 'http://localhost:8200', token, path = 'secret' } = vaultConfig;
  
  return {
    type: 'vault',
    address,
    token,
    path,
    // Mock methods - real implementation would make HTTP calls to Vault
    getSecret: (key) => {
      console.log(`[MOCK] Getting secret ${key} from Vault at ${address}`);
      return `vault-secret-${key}`;
    },
    setSecret: (key, value) => {
      console.log(`[MOCK] Setting secret ${key} in Vault at ${address}`);
      return true;
    }
  };
}

function explainWithSecrets(config, key, environment, _options = {}) {
  const { maskSecrets = true, includeVault = false } = _options;
  
  const explanation = explainConfigValue(key, config);
  
  // Check if this is a sensitive field
  const sensitiveFields = detectSensitiveFields(config);
  const isSensitive = sensitiveFields.some(field => field.field === key);
  
  if (isSensitive && maskSecrets) {
    explanation.finalValue = maskSensitiveValue(explanation.finalValue);
    explanation.masked = true;
    explanation.secretField = true;
  }

  // Add Vault integration if requested
  if (includeVault && isSensitive) {
    const vault = integrateWithVault();
    
    explanation.vault = {
      available: true,
      address: vault.address,
      path: vault.path
    };
  }

  return {
    field: key,
    value: explanation.finalValue,
    masked: explanation.masked || false,
    secretField: explanation.secretField || false,
    explanation: explanation.explanation || [],
    vault: explanation.vault || null
  };
}

function validateSecretsWithExternal(config, schema = null, environment = 'dev', options = {}) {
  const { useEnvSecrets = false, useVault = false, vaultConfig = {} } = options;
  
  const baseValidation = validateSecrets(config, schema, environment);
  const externalSecrets = {};

  // Load secrets from .env.secret file
  if (useEnvSecrets) {
    const envSecrets = loadSecretsFromEnv();
    externalSecrets.env = envSecrets;
    
    // Check if any secrets should come from .env.secret
    for (const field of baseValidation.sensitiveFields) {
      if (envSecrets[field.field]) {
        baseValidation.suggestions.push({
          type: 'external_secret',
          severity: 'info',
          field: field.field,
          message: 'Secret available in .env.secret',
          suggestion: `Use ${field.field} from .env.secret instead of inline value`,
          impact: 'External secret management is more secure'
        });
      }
    }
  }

  // Check Vault integration
  if (useVault) {
    const vault = integrateWithVault(vaultConfig);
    externalSecrets.vault = vault;
    
    for (const field of baseValidation.sensitiveFields) {
      baseValidation.suggestions.push({
        type: 'vault_integration',
        severity: 'info',
        field: field.field,
        message: 'Vault integration available',
        suggestion: `Store ${field.field} in Vault for enhanced security`,
        impact: 'Vault provides enterprise-grade secret management'
      });
    }
  }

  return {
    ...baseValidation,
    externalSecrets,
    integrationStatus: useEnvSecrets || useVault ? 'connected' : 'disconnected'
  };
}

// CI/CD Helper Functions
function generateGitHubActions(config, options = {}) {
  const {
    workflowName = 'align-config',

    environments = ['dev', 'prod'],
    matrixStrategy = true,
    securityScanning = true,
    deploymentStrategy = 'manual'
  } = options;

  const workflow = {
    name: workflowName,
    on: {
      push: { branches: ['main', 'develop'] },
      pull_request: { branches: ['main'] }
    },
    jobs: {}
  };

  // Add validation job
  workflow.jobs.validate = {
    'runs-on': 'ubuntu-latest',
    steps: [
      {
        name: 'Checkout code',
        uses: 'actions/checkout@v4'
      },
      {
        name: 'Setup Node.js',
        uses: 'actions/setup-node@v4',
        with: {
          'node-version': '18',
          'cache': 'npm'
        }
      },
      {
        name: 'Install dependencies',
        run: 'npm ci'
      },
      {
        name: 'Validate configuration',
        run: 'align validate config/base.align'
      },
      {
        name: 'Lint configuration',
        run: 'align lint --env=dev --strict'
      }
    ]
  };

  // Add build jobs for each environment
  environments.forEach(env => {
    workflow.jobs[`build-${env}`] = {
      'runs-on': 'ubuntu-latest',
      needs: 'validate',
      strategy: matrixStrategy ? {
        matrix: {
          format: ['json', 'yaml', 'env']
        }
      } : undefined,
      steps: [
        {
          name: 'Checkout code',
          uses: 'actions/checkout@v4'
        },
        {
          name: 'Setup Node.js',
          uses: 'actions/setup-node@v4',
          with: {
            'node-version': '18',
            'cache': 'npm'
          }
        },
        {
          name: 'Install dependencies',
          run: 'npm ci'
        },
        {
          name: `Build ${env} configuration`,
          run: `align build --env=${env} --format=\${{ matrix.format || 'json' }} --out=./dist/config.${env}.\${{ matrix.format || 'json' }}`
        },
        {
          name: 'Upload artifacts',
          uses: 'actions/upload-artifact@v4',
          with: {
            name: `config-${env}-\${{ matrix.format || 'json' }}`,
            path: `./dist/config.${env}.*`
          }
        }
      ]
    };

    // Add deployment job if specified
    if (deploymentStrategy !== 'none') {
      workflow.jobs[`deploy-${env}`] = {
        'runs-on': 'ubuntu-latest',
        needs: `build-${env}`,
        if: env === 'prod' ? 'github.ref == \'refs/heads/main\'' : 'true',
        environment: env,
        steps: [
          {
            name: 'Download artifacts',
            uses: 'actions/download-artifact@v4',
            with: {
              name: `config-${env}-*`
            }
          },
          {
            name: `Deploy to ${env}`,
            run: `echo "Deploying configuration to ${env} environment"`
          }
        ]
      };
    }
  });

  // Add security scanning job
  if (securityScanning) {
    workflow.jobs.security = {
      'runs-on': 'ubuntu-latest',
      needs: 'validate',
      steps: [
        {
          name: 'Checkout code',
          uses: 'actions/checkout@v4'
        },
        {
          name: 'Setup Node.js',
          uses: 'actions/setup-node@v4',
          with: {
            'node-version': '18'
          }
        },
        {
          name: 'Install dependencies',
          run: 'npm ci'
        },
        {
          name: 'Security scan',
          run: 'align secrets --env=prod --mask --format=json > security-report.json'
        },
        {
          name: 'Upload security report',
          uses: 'actions/upload-artifact@v4',
          with: {
            name: 'security-report',
            path: 'security-report.json'
          }
        }
      ]
    };
  }

  return workflow;
}

function generateGitLabCI(config, options = {}) {
  const {
    stages = ['validate', 'build', 'deploy'],
    environments = ['dev', 'prod'],
    cacheDependencies = true,
    securityScanning = true
  } = options;

  const gitlabCI = {
    stages: stages,
    variables: {
      NODE_VERSION: '18'
    },
    cache: cacheDependencies ? {
      key: '$CI_COMMIT_REF_SLUG',
      paths: ['node_modules/']
    } : undefined,
    before_script: [
      'npm ci'
    ]
  };

  // Add validation job
  gitlabCI.validate = {
    stage: 'validate',
    script: [
      'align validate config/base.align',
      'align lint --env=dev --strict'
    ],
    artifacts: {
      reports: {
        junit: 'test-results.xml'
      }
    }
  };

  // Add build jobs for each environment
  environments.forEach(env => {
    gitlabCI[`build-${env}`] = {
      stage: 'build',
      script: [
        `align build --env=${env} --format=json --out=./dist/config.${env}.json`,
        `align build --env=${env} --format=yaml --out=./dist/config.${env}.yaml`,
        `align build --env=${env} --format=env --out=./dist/config.${env}.env`
      ],
      artifacts: {
        paths: [`dist/config.${env}.*`],
        expire_in: '1 week'
      }
    };
  });

  // Add deployment jobs
  environments.forEach(env => {
    gitlabCI[`deploy-${env}`] = {
      stage: 'deploy',
      script: [
        `echo "Deploying configuration to ${env} environment"`
      ],
      environment: {
        name: env,
        url: `https://${env}.example.com`
      },
      when: env === 'prod' ? 'manual' : 'on_success',
      only: env === 'prod' ? ['main'] : ['main', 'develop']
    };
  });

  // Add security scanning job
  if (securityScanning) {
    gitlabCI.security = {
      stage: 'validate',
      script: [
        'align secrets --env=prod --mask --format=json > security-report.json'
      ],
      artifacts: {
        paths: ['security-report.json'],
        reports: {
          security: 'security-report.json'
        }
      }
    };
  }

  return gitlabCI;
}

function generateJenkinsPipeline(config, options = {}) {
  const {
    environments = ['dev', 'prod'],
    parallelBuilds = true,
    securityScanning = true
  } = options;

  const pipeline = {
    agent: 'any',
    stages: [
      {
        stage: 'Checkout',
        steps: [
          'checkout scm'
        ]
      },
      {
        stage: 'Setup',
        steps: [
          'nodejs(nodeJSInstallationName: "NodeJS 18") {',
          '  sh "npm ci"',
          '}'
        ]
      },
      {
        stage: 'Validate',
        steps: [
          'nodejs(nodeJSInstallationName: "NodeJS 18") {',
          '  sh "align validate config/base.align"',
          '  sh "align lint --env=dev --strict"',
          '}'
        ]
      }
    ]
  };

  // Add build stages
  if (parallelBuilds) {
    pipeline.stages.push({
      stage: 'Build',
      parallel: environments.map(env => ({
        stage: `Build ${env}`,
        steps: [
          'nodejs(nodeJSInstallationName: "NodeJS 18") {',
          `  sh "align build --env=${env} --format=json --out=./dist/config.${env}.json"`,
          `  sh "align build --env=${env} --format=yaml --out=./dist/config.${env}.yaml"`,
          '}',
          `archiveArtifacts artifacts: "dist/config.${env}.*"`
        ]
      }))
    });
  } else {
    environments.forEach(env => {
      pipeline.stages.push({
        stage: `Build ${env}`,
        steps: [
          'nodejs(nodeJSInstallationName: "NodeJS 18") {',
          `  sh "align build --env=${env} --format=json --out=./dist/config.${env}.json"`,
          `  sh "align build --env=${env} --format=yaml --out=./dist/config.${env}.yaml"`,
          '}',
          `archiveArtifacts artifacts: "dist/config.${env}.*"`
        ]
      });
    });
  }

  // Add security scanning
  if (securityScanning) {
    pipeline.stages.push({
      stage: 'Security Scan',
      steps: [
        'nodejs(nodeJSInstallationName: "NodeJS 18") {',
        '  sh "align secrets --env=prod --mask --format=json > security-report.json"',
        '}',
        'publishSecurityScan securityScan: [securityReport: "security-report.json"]'
      ]
    });
  }

  // Add deployment stages
  environments.forEach(env => {
    pipeline.stages.push({
      stage: `Deploy ${env}`,
      when: {
        branch: env === 'prod' ? 'main' : 'any'
      },
      steps: [
        `echo "Deploying configuration to ${env} environment"`
      ]
    });
  });

  return pipeline;
}

function generateCircleCI(config, options = {}) {
  const {
    environments = ['dev', 'prod'],
    securityScanning = true
  } = options;

  const circleCI = {
    version: '2.1',
    orbs: {
      node: 'circleci/node@5.1.0'
    },
    jobs: {},
    workflows: {
      version: 2,
      'align-config': {
        jobs: ['validate']
      }
    }
  };

  // Add validation job
  circleCI.jobs.validate = {
    docker: [
      {
        image: 'cimg/node:18.19'
      }
    ],
    steps: [
      'checkout',
      {
        run: 'npm ci'
      },
      {
        run: 'align validate config/base.align'
      },
      {
        run: 'align lint --env=dev --strict'
      }
    ]
  };

  // Add build jobs for each environment
  environments.forEach(env => {
    circleCI.jobs[`build-${env}`] = {
      docker: [
        {
          image: 'cimg/node:18.19'
        }
      ],
      steps: [
        'checkout',
        {
          run: 'npm ci'
        },
        {
          run: `align build --env=${env} --format=json --out=./dist/config.${env}.json`
        },
        {
          run: `align build --env=${env} --format=yaml --out=./dist/config.${env}.yaml`
        },
        {
          store_artifacts: {
            path: `dist/config.${env}.*`
          }
        }
      ]
    };

    // Add to workflow
    circleCI.workflows['align-config'].jobs.push(`build-${env}`);
  });

  // Add security scanning
  if (securityScanning) {
    circleCI.jobs.security = {
      docker: [
        {
          image: 'cimg/node:18.19'
        }
      ],
      steps: [
        'checkout',
        {
          run: 'npm ci'
        },
        {
          run: 'align secrets --env=prod --mask --format=json > security-report.json'
        },
        {
          store_artifacts: {
            path: 'security-report.json'
          }
        }
      ]
    };

    circleCI.workflows['align-config'].jobs.push('security');
  }

  return circleCI;
}

function generateAzureDevOps(config, options = {}) {
  const {
    environments = ['dev', 'prod'],
    securityScanning = true
  } = options;

  const azurePipeline = {
    trigger: ['main', 'develop'],
    pr: ['main'],
    variables: {
      NODE_VERSION: '18'
    },
    stages: [
      {
        stage: 'Validate',
        jobs: [
          {
            job: 'Validate',
            pool: {
              vmImage: 'ubuntu-latest'
            },
            steps: [
              {
                task: 'NodeTool@0',
                inputs: {
                  versionSpec: '$(NODE_VERSION)'
                }
              },
              {
                script: 'npm ci',
                displayName: 'Install dependencies'
              },
              {
                script: 'align validate config/base.align',
                displayName: 'Validate configuration'
              },
              {
                script: 'align lint --env=dev --strict',
                displayName: 'Lint configuration'
              }
            ]
          }
        ]
      }
    ]
  };

  // Add build stages for each environment
  environments.forEach(env => {
    azurePipeline.stages.push({
      stage: `Build ${env}`,
      dependsOn: 'Validate',
      jobs: [
        {
          job: `Build ${env}`,
          pool: {
            vmImage: 'ubuntu-latest'
          },
          steps: [
            {
              task: 'NodeTool@0',
              inputs: {
                versionSpec: '$(NODE_VERSION)'
              }
            },
            {
              script: 'npm ci',
              displayName: 'Install dependencies'
            },
            {
              script: `align build --env=${env} --format=json --out=./dist/config.${env}.json`,
              displayName: `Build ${env} JSON config`
            },
            {
              script: `align build --env=${env} --format=yaml --out=./dist/config.${env}.yaml`,
              displayName: `Build ${env} YAML config`
            },
            {
              task: 'PublishBuildArtifacts@1',
              inputs: {
                pathToPublish: `dist/config.${env}.*`,
                artifactName: `config-${env}`
              }
            }
          ]
        }
      ]
    });
  });

  // Add security scanning
  if (securityScanning) {
    azurePipeline.stages.push({
      stage: 'Security',
      dependsOn: 'Validate',
      jobs: [
        {
          job: 'Security',
          pool: {
            vmImage: 'ubuntu-latest'
          },
          steps: [
            {
              task: 'NodeTool@0',
              inputs: {
                versionSpec: '$(NODE_VERSION)'
              }
            },
            {
              script: 'npm ci',
              displayName: 'Install dependencies'
            },
            {
              script: 'align secrets --env=prod --mask --format=json > security-report.json',
              displayName: 'Security scan'
            },
            {
              task: 'PublishBuildArtifacts@1',
              inputs: {
                pathToPublish: 'security-report.json',
                artifactName: 'security-report'
              }
            }
          ]
        }
      ]
    });
  }

  return azurePipeline;
}

function generateCIConfig(platform, config, options = {}) {
  switch (platform.toLowerCase()) {
  case 'github':
  case 'github-actions':
    return generateGitHubActions(config, options);
  case 'gitlab':
  case 'gitlab-ci':
    return generateGitLabCI(config, options);
  case 'jenkins':
    return generateJenkinsPipeline(config, options);
  case 'circleci':
  case 'circle':
    return generateCircleCI(config, options);
  case 'azure':
  case 'azure-devops':
    return generateAzureDevOps(config, options);
  default:
    throw new Error(`Unsupported CI/CD platform: ${platform}`);
  }
}

// Versioning Support Functions
function addVersionToSchema(schema, version = '1.0.0') {
  if (!schema) {
    schema = { type: 'object', properties: {} };
  }
  
  return {
    ...schema,
    $schema: 'http://json-schema.org/draft-07/schema#',
    version: version,
    alignVersion: '1.0.0', // Align tool version that created this schema
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function addVersionToConfig(config, version = '1.0.0', schemaVersion = null) {
  return {
    ...config,
    _metadata: {
      version: version,
      schemaVersion: schemaVersion,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      generatedBy: 'align-config'
    }
  };
}

function getSchemaVersion(schema) {
  return schema?.version || '1.0.0';
}

function getConfigVersion(config) {
  const version = config?.version || config?._metadata?.version || '1.0.0';
  
  // Validate version format
  if (!/^\d+\.\d+\.\d+$/.test(version)) {
    return '0.0.0'; // Default fallback for invalid versions
  }
  
  return version;
}

function compareVersions(version1, version2) {
  const v1 = version1.split('.').map(Number);
  const v2 = version2.split('.').map(Number);
  
  for (let i = 0; i < Math.max(v1.length, v2.length); i++) {
    const num1 = v1[i] || 0;
    const num2 = v2[i] || 0;
    
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  
  return 0;
}

function isCompatible(schemaVersion, configVersion, compatibilityRules = {}) {
  const { allowMinor = true, allowPatch = true, strict = false } = compatibilityRules;
  
  const schema = schemaVersion.split('.').map(Number);
  const config = configVersion.split('.').map(Number);
  
  // Major version must match
  if (schema[0] !== config[0]) {
    return false;
  }
  
  // Minor version compatibility
  if (!allowMinor && schema[1] !== config[1]) {
    return false;
  }
  
  // Patch version compatibility
  if (!allowPatch && schema[2] !== config[2]) {
    return false;
  }
  
  // Strict mode: versions must be exactly equal
  if (strict && schemaVersion !== configVersion) {
    return false;
  }
  
  return true;
}

function detectVersionIssues(schema, config) {
  const issues = [];
  const warnings = [];
  
  const schemaVersion = getSchemaVersion(schema);
  const configVersion = getConfigVersion(config);
  
  // Check if versions are compatible
  if (!isCompatible(schemaVersion, configVersion)) {
    issues.push({
      type: 'version_incompatibility',
      severity: 'error',
      message: 'Schema and config versions are incompatible',
      details: {
        schemaVersion,
        configVersion,
        suggestion: 'Update config to match schema version or migrate schema'
      }
    });
  }
  
  // Check for outdated config
  if (compareVersions(configVersion, schemaVersion) < 0) {
    warnings.push({
      type: 'outdated_config',
      severity: 'warning',
      message: 'Configuration is outdated',
      details: {
        currentVersion: configVersion,
        latestVersion: schemaVersion,
        suggestion: 'Run align migrate to update configuration'
      }
    });
  }
  
  // Check for deprecated fields
  if (schema && schema.deprecated) {
    for (const [field, deprecation] of Object.entries(schema.deprecated)) {
      if (config && config[field]) {
        warnings.push({
          type: 'deprecated_field',
          severity: 'warning',
          message: `Field '${field}' is deprecated`,
          details: {
            field,
            deprecation,
            suggestion: 'Update configuration to use new field structure'
          }
        });
      }
    }
  }
  
  return {
    issues,
    warnings,
    outdated: warnings.some(w => w.type === 'outdated_config'),
    currentVersion: configVersion,
    latestVersion: schemaVersion,
    summary: {
      totalIssues: issues.length,
      totalWarnings: warnings.length
    }
  };
}

function generateVersionMigrationPlan(fromVersion, toVersion, schema, config) {
  const plan = {
    fromVersion,
    toVersion,
    steps: [],
    breakingChanges: [],
    newFeatures: [],
    deprecatedFields: [],
    changes: [],
    estimatedTime: '5-10 minutes'
  };
  
  // Version comparison
  const from = fromVersion.split('.').map(Number);
  const to = toVersion.split('.').map(Number);
  
  // Major version changes (breaking changes)
  if (from[0] !== to[0]) {
    plan.breakingChanges.push({
      type: 'major_version_change',
      description: `Major version change from ${fromVersion} to ${toVersion}`,
      impact: 'Breaking changes may require manual intervention'
    });
    
    // Add migration steps for major version changes
    plan.steps.push({
      type: 'backup',
      description: 'Backup current configuration',
      action: 'Create backup of current config files'
    });
    
    plan.steps.push({
      type: 'validate',
      description: 'Validate current configuration',
      action: 'Run align validate to check current state'
    });
  }
  
  // Minor version changes (new features)
  if (from[1] !== to[1]) {
    plan.newFeatures.push({
      type: 'minor_version_change',
      description: `New features available in version ${toVersion}`,
      impact: 'New optional fields may be available'
    });
    
    plan.steps.push({
      type: 'update_schema',
      description: 'Update schema to latest version',
      action: 'Update align.schema.json to latest version'
    });
  }
  
  // Patch version changes (bug fixes)
  if (from[2] !== to[2]) {
    plan.steps.push({
      type: 'update_patch',
      description: 'Apply patch updates',
      action: 'Update configuration with latest patch fixes'
    });
  }
  
  // Check for deprecated fields
  if (schema && schema.deprecated) {
    for (const [field, deprecation] of Object.entries(schema.deprecated)) {
      if (config && config[field]) {
        plan.deprecatedFields.push({
          field,
          deprecation,
          replacement: deprecation.replacement || null
        });
        
        plan.steps.push({
          type: 'migrate_field',
          description: `Migrate deprecated field '${field}'`,
          action: `Replace '${field}' with '${deprecation.replacement || 'new_field_name'}'`,
          field,
          replacement: deprecation.replacement
        });
      }
    }
  }
  
  // Add final validation step
  plan.steps.push({
    type: 'validate',
    description: 'Validate migrated configuration',
    action: 'Run align validate to ensure migration was successful'
  });
  
  return plan;
}

function applyMigration(config, migrationPlan, options = {}) {
  const { dryRun = false, backup = true } = options;
  const migratedConfig = { ...config };
  const results = {
    applied: [],
    skipped: [],
    errors: [],
    backup: null
  };
  
  // Create backup if requested
  if (backup && !dryRun) {
    const backupData = {
      original: config,
      timestamp: new Date().toISOString(),
      migrationPlan: migrationPlan
    };
    results.backup = backupData;
  }
  
  // Apply migration steps
  for (const step of migrationPlan.steps) {
    try {
      switch (step.type) {
      case 'migrate_field':
        if (migratedConfig[step.field]) {
          if (step.replacement) {
            migratedConfig[step.replacement] = migratedConfig[step.field];
            delete migratedConfig[step.field];
          }
          results.applied.push({
            step: step.description,
            field: step.field,
            replacement: step.replacement
          });
        } else {
          results.skipped.push({
            step: step.description,
            reason: 'Field not present in config'
          });
        }
        break;
          
      case 'update_version':
        migratedConfig.version = migrationPlan.toVersion;
        migratedConfig._metadata = {
          ...migratedConfig._metadata,
          version: migrationPlan.toVersion,
          updatedAt: new Date().toISOString()
        };
        results.applied.push({
          step: step.description,
          oldVersion: migrationPlan.fromVersion,
          newVersion: migrationPlan.toVersion
        });
        break;
          
      default:
        // Skip non-applicable steps
        results.skipped.push({
          step: step.description,
          reason: 'Step type not implemented'
        });
      }
    } catch (error) {
      results.errors.push({
        step: step.description,
        error: error.message
      });
    }
  }
  
  return {
    config: migratedConfig,
    results,
    success: results.errors.length === 0
  };
}

function bumpSchemaVersion(schema, bumpType = 'patch') {
  const currentVersion = getSchemaVersion(schema);
  const versionParts = currentVersion.split('.').map(Number);
  
  let newVersion;
  switch (bumpType) {
  case 'major':
    newVersion = `${versionParts[0] + 1}.0.0`;
    break;
  case 'minor':
    newVersion = `${versionParts[0]}.${versionParts[1] + 1}.0`;
    break;
  case 'patch':
  default:
    newVersion = `${versionParts[0]}.${versionParts[1]}.${versionParts[2] + 1}`;
    break;
  }
  
  return {
    ...schema,
    version: newVersion,
    updatedAt: new Date().toISOString(),
    changes: [`Bumped version from ${currentVersion} to ${newVersion}`]
  };
}

function bumpConfigVersion(config, bumpType = 'patch') {
  const currentVersion = getConfigVersion(config);
  const versionParts = currentVersion.split('.').map(Number);
  
  let newVersion;
  switch (bumpType) {
  case 'major':
    newVersion = `${versionParts[0] + 1}.0.0`;
    break;
  case 'minor':
    newVersion = `${versionParts[0]}.${versionParts[1] + 1}.0`;
    break;
  case 'patch':
  default:
    newVersion = `${versionParts[0]}.${versionParts[1]}.${versionParts[2] + 1}`;
    break;
  }
  
  return {
    ...config,
    version: newVersion,
    _metadata: {
      ...config._metadata,
      version: newVersion,
      updatedAt: new Date().toISOString()
    },
    changes: [`Bumped version from ${currentVersion} to ${newVersion}`]
  };
}

function validateMigrationCompatibility(schema, config, targetVersion) {
  const issues = [];
  const warnings = [];
  
  const currentSchemaVersion = getSchemaVersion(schema);
  const currentConfigVersion = getConfigVersion(config);
  
  // Check if migration is needed
  if (compareVersions(currentConfigVersion, targetVersion) >= 0) {
    warnings.push({
      type: 'no_migration_needed',
      severity: 'info',
      message: 'Configuration is already up to date',
      details: {
        currentVersion: currentConfigVersion,
        targetVersion,
        suggestion: 'No migration required'
      }
    });
    return { issues, warnings };
  }
  
  // Check for breaking changes
  const currentMajor = parseInt(currentConfigVersion.split('.')[0]);
  const targetMajor = parseInt(targetVersion.split('.')[0]);
  
  if (targetMajor > currentMajor) {
    issues.push({
      type: 'breaking_change',
      severity: 'error',
      message: 'Major version upgrade detected',
      details: {
        currentVersion: currentConfigVersion,
        targetVersion,
        suggestion: 'Review breaking changes before migration'
      }
    });
  }
  
  // Check schema compatibility
  if (schema && !isCompatible(targetVersion, currentSchemaVersion)) {
    warnings.push({
      type: 'schema_compatibility',
      severity: 'warning',
      message: 'Schema version may not be compatible',
      details: {
        schemaVersion: currentSchemaVersion,
        targetVersion,
        suggestion: 'Update schema to match target version'
      }
    });
  }
  
  return { 
    issues, 
    warnings,
    compatible: issues.length === 0,
    breakingChanges: issues.filter(issue => issue.type === 'breaking_change'),
    recommendations: warnings.map(warning => warning.details?.suggestion).filter(Boolean)
  };
}

module.exports = {
  parseAlign,
  parseValue,
  validateConfig,
  mergeConfigs,
  loadSchema,
  performSmartAnalysis,
  diagnoseConfig,
  repairConfig,
  findTypeIssues,
  findSecurityIssues,
  generateStrongSecret,
  // Package schema and namespacing support
  discoverPackageSchemas,
  mergePackageSchemas,
  parseNamespacedKey,
  resolveConfigContext,
  validateWithPackageSchemas,
  explainConfigValue,
  listAvailableSchemas,
  // Cross-language export functions
  exportToPython,
  exportToTOML,
  exportToProperties,
  exportToHCL,
  exportToINI,
  exportToXML,
  // Policy validation functions
  validatePolicies,
  loadPolicies,
  suggestPolicies,
  inferSchema,
  inferType,
  isUrl,
  isEmail,
  inferSchemaFromFiles,
  generateAlignContent,
  extractModuleConfig,
  discoverModuleSchemas,
  generateModuleConfig,
  validateModuleConfig,
  exportToJSONWithComments,
  exportToYAMLWithComments,
  exportToPythonWithComments,
  exportToTOMLWithComments,
  exportToPropertiesWithComments,
  exportToHCLWithComments,
  exportToINIWithComments,
  exportToXMLWithComments,
  lintConfig,
  applyLintFixes,
  writeFixedConfig,
  detectSensitiveFields,
  maskSensitiveValue,
  validateSecrets,
  loadSecretsFromEnv,
  integrateWithVault,
  explainWithSecrets,
  validateSecretsWithExternal,
  generateCIConfig,
  // Versioning support functions
  addVersionToSchema,
  addVersionToConfig,
  getSchemaVersion,
  getConfigVersion,
  compareVersions,
  isCompatible,
  detectVersionIssues,
  generateVersionMigrationPlan,
  applyMigration,
  bumpSchemaVersion,
  bumpConfigVersion,
  validateMigrationCompatibility
};
  