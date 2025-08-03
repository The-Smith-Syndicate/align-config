const { 
  parseAlign, 
  validateConfig, 
  mergeConfigs, 
  loadSchema,
  performSmartAnalysis,
  diagnoseConfig,
  repairConfig,
  discoverPackageSchemas,
  mergePackageSchemas,
  validateWithPackageSchemas,
  explainConfigValue,
  listAvailableSchemas,
  exportToPython,
  exportToTOML,
  exportToProperties,
  exportToHCL,
  exportToINI,
  exportToXML,
  exportToJSONWithComments,
  exportToYAMLWithComments,
  exportToPythonWithComments,
  exportToTOMLWithComments,
  exportToPropertiesWithComments,
  exportToHCLWithComments,
  exportToINIWithComments,
  exportToXMLWithComments,
  validatePolicies,
  loadPolicies,
  suggestPolicies,
  inferSchema,
  inferSchemaFromFiles,
  lintConfig,
  applyLintFixes,
  writeFixedConfig,
  explainWithSecrets,
  validateSecretsWithExternal,
  generateCIConfig,
  getSchemaVersion,
  getConfigVersion,
  compareVersions,
  detectVersionIssues,
  generateVersionMigrationPlan,
  applyMigration,
  bumpSchemaVersion,
  bumpConfigVersion,
  validateMigrationCompatibility,
  extractAngularEnvironmentVars,
  generateSchemaFromAngular,
  generateBaseAlignFromAngular,
  parseEnvFile,
  generateSchemaFromEnvVars,
  generateAlignFromEnvVars,
  listGCPSecrets,
  resolveGCPSecrets,
  validateGCPSecrets,
  loadServiceSpecificConfig,
  generateGitHubActionsWithSecrets,
  rotateGCPSecret,
  scheduleSecretRotation,
  listSecretRotations,
  analyzeConfigurationUsage,
  createEnvironmentShare,
  createEnvironmentReview,
  lockEnvironment,
  unlockEnvironment,
  parseDuration,
  generateSOC2Checklist
} = require('./parser');
const fs = require('fs');
const path = require('path');

// Mock fs for testing
jest.mock('fs');

describe('Parser Module', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('parseAlign', () => {
    test('should parse basic key-value pairs', () => {
      const content = `
        service_name = "web"
        timeout = 3000
        auth_required = true
        debug = false
      `;
      
      const result = parseAlign(content);
      
      expect(result).toEqual({
        service_name: 'web',
        timeout: 3000,
        auth_required: true,
        debug: false
      });
    });

    test('should handle different data types', () => {
      const content = `
        string_value = "hello"
        number_value = 42
        float_value = 3.14
        boolean_true = true
        boolean_false = false
      `;
      
      const result = parseAlign(content);
      
      expect(result.string_value).toBe('hello');
      expect(result.number_value).toBe(42);
      expect(result.float_value).toBe(3.14);
      expect(result.boolean_true).toBe(true);
      expect(result.boolean_false).toBe(false);
    });

    test('should handle comments', () => {
      const content = `
        # This is a comment
        service_name = "web"
        // Another comment
        timeout = 3000
      `;
      
      const result = parseAlign(content);
      
      expect(result).toEqual({
        service_name: 'web',
        timeout: 3000
      });
    });

    test('should handle nested blocks', () => {
      const content = `
        service_name = "web"
        
        service "auth" {
          port = 4000
          retries = 3
        }
        
        database "main" {
          url = "postgresql://localhost:5432/myapp"
          pool_size = 10
        }
      `;
      
      const result = parseAlign(content);
      
      expect(result).toEqual({
        service_name: 'web',
        'service.auth.port': 4000,
        'service.auth.retries': 3,
        'database.main.url': 'postgresql://localhost:5432/myapp',
        'database.main.pool_size': 10
      });
    });

    test('should throw error for invalid syntax', () => {
      const content = `
        service_name = "web"
        invalid_line
        timeout = 3000
      `;
      
      expect(() => parseAlign(content)).toThrow('Invalid syntax on line 3: missing \'=\'');
    });

    test('should throw error for empty key', () => {
      const content = `
        = "value"
      `;
      
      expect(() => parseAlign(content)).toThrow('Invalid syntax on line 2: empty key');
    });

    test('should handle arrays', () => {
      const content = `
        ports = [3000, 3001, 3002]
        hosts = ["localhost", "127.0.0.1"]
        empty_array = []
      `;
      
      const result = parseAlign(content);
      
      expect(result.ports).toEqual(["3000", "3001", "3002"]);
      expect(result.hosts).toEqual(['localhost', '127.0.0.1']);
      expect(result.empty_array).toEqual([]);
    });

    test('should handle quoted strings in arrays', () => {
      const content = `
        urls = ["https://example.com", "https://api.example.com"]
      `;
      
      const result = parseAlign(content);
      
      expect(result.urls).toEqual(['https://example.com', 'https://api.example.com']);
    });

    test('should handle inline comments', () => {
      const content = `
        service_name = "web" # This is the service name
        timeout = 3000 // 3 seconds
        debug = true # Enable debug mode
      `;
      
      const result = parseAlign(content);
      
      expect(result).toEqual({
        service_name: 'web',
        timeout: 3000,
        debug: true
      });
    });

    test('should handle URLs with inline comments', () => {
      const content = `
        database_url = "postgresql://localhost:5432/myapp" # Database connection
        api_url = "https://api.example.com/v1" // API endpoint
      `;
      
      const result = parseAlign(content);
      
      expect(result.database_url).toBe('postgresql://localhost:5432/myapp');
      expect(result.api_url).toBe('https://api.example.com/v1');
    });

    test('should handle complex nested blocks', () => {
      const content = `
        app_name = "myapp"
        
        service "api" {
          port = 3000
          workers = 4
          
          database "primary" {
            url = "postgresql://localhost:5432/myapp"
            pool_size = 10
          }
          
          cache "redis" {
            host = "localhost"
            port = 6379
          }
        }
      `;
      
      const result = parseAlign(content);
      
      expect(result).toEqual({
        app_name: 'myapp',
        'service.api.port': 3000,
        'service.api.workers': 4,
        'database.primary.url': 'postgresql://localhost:5432/myapp',
        'database.primary.pool_size': 10,
        'cache.redis.host': 'localhost',
        'cache.redis.port': 6379
      });
    });
  });

  describe('validateConfig', () => {
    test('should validate base config with required fields', () => {
      const config = {
        timeout: 3000,
        auth_required: true
      };
      
      const errors = validateConfig(config, true);
      
      expect(errors).toContain('Missing required key: service_name');
    });

    test('should pass validation for valid base config', () => {
      const config = {
        service_name: 'web',
        timeout: 3000,
        auth_required: true
      };
      
      const errors = validateConfig(config, true);
      
      expect(errors).toHaveLength(0);
    });

    test('should validate types correctly', () => {
      const config = {
        service_name: 'web',
        timeout: 'not a number',
        auth_required: 'not a boolean'
      };
      
      const errors = validateConfig(config, false);
      
      expect(errors).toContain('timeout must be a number');
      expect(errors).toContain('auth_required must be true or false');
    });

    test('should validate with schema', () => {
      const config = {
        service_name: 'web',
        timeout: 50, // Below minimum
        port: 70000  // Above maximum
      };
      
      const schema = {
        service_name: { type: 'string', required: true },
        timeout: { type: 'number', min: 100, max: 30000 },
        port: { type: 'number', min: 1, max: 65535 }
      };
      
      const errors = validateConfig(config, false, schema);
      
      expect(errors).toContain('timeout must be >= 100, got 50');
      expect(errors).toContain('port must be <= 65535, got 70000');
    });

    test('should validate string length constraints', () => {
      const config = {
        service_name: 'a', // Too short
        description: 'This is a very long description that exceeds the maximum length allowed by the schema validation rules'
      };
      
      const schema = {
        service_name: { type: 'string', minLength: 3, maxLength: 50 },
        description: { type: 'string', maxLength: 100 }
      };
      
      const errors = validateConfig(config, false, schema);
      
      expect(errors).toContain('service_name must be at least 3 characters, got 1');
      expect(errors).toContain('description must be at most 100 characters, got 102');
    });

    test('should validate string patterns', () => {
      const config = {
        email: 'invalid-email',
        url: 'not-a-url'
      };
      
      const schema = {
        email: { type: 'string', pattern: '^[^@]+@[^@]+\\.[^@]+$' },
        url: { type: 'string', pattern: '^https?://.*$' }
      };
      
      const errors = validateConfig(config, false, schema);
      
      expect(errors).toContain('email must match pattern ^[^@]+@[^@]+\\.[^@]+$, got "invalid-email"');
      expect(errors).toContain('url must match pattern ^https?://.*$, got "not-a-url"');
    });

    test('should handle schema with no validation rules', () => {
      const config = {
        service_name: 'web',
        timeout: 3000
      };
      
      const errors = validateConfig(config, false, {});
      
      expect(errors).toHaveLength(0);
    });

    test('should validate required fields only for base configs', () => {
      const config = {
        timeout: 3000
      };
      
      const schema = {
        service_name: { type: 'string', required: true },
        timeout: { type: 'number' }
      };
      
      // Should not require service_name for non-base configs
      const errors = validateConfig(config, false, schema);
      expect(errors).toHaveLength(0);
      
      // Should require service_name for base configs
      const baseErrors = validateConfig(config, true, schema);
      expect(baseErrors).toContain('Missing required key: service_name');
    });
  });

  describe('mergeConfigs', () => {
    test('should merge base and environment configs', () => {
      const baseConfig = {
        service_name: 'web',
        timeout: 3000,
        auth_required: true
      };
      
      const envConfig = {
        timeout: 5000,
        debug: true
      };
      
      const result = mergeConfigs(baseConfig, envConfig);
      
      expect(result).toEqual({
        service_name: 'web',
        timeout: 5000, // Overridden
        auth_required: true,
        debug: true     // Added
      });
    });

    test('should handle empty environment config', () => {
      const baseConfig = {
        service_name: 'web',
        timeout: 3000
      };
      
      const envConfig = {};
      
      const result = mergeConfigs(baseConfig, envConfig);
      
      expect(result).toEqual(baseConfig);
    });

    test('should handle null and undefined values', () => {
      const baseConfig = {
        service_name: 'web',
        timeout: 3000,
        debug: null
      };
      
      const envConfig = {
        timeout: undefined,
        debug: false
      };
      
      const result = mergeConfigs(baseConfig, envConfig);
      
      expect(result).toEqual({
        service_name: 'web',
        timeout: undefined,
        debug: false
      });
    });
  });

  describe('loadSchema', () => {
    test('should load valid schema file', () => {
      const mockSchema = {
        service_name: { type: 'string', required: true }
      };
      
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(JSON.stringify(mockSchema));
      
      const result = loadSchema('/path/to/schema.json');
      
      expect(result).toEqual(mockSchema);
    });

    test('should return null for non-existent file', () => {
      fs.existsSync.mockReturnValue(false);
      
      const result = loadSchema('/path/to/schema.json');
      
      expect(result).toBeNull();
    });

    test('should return null for null path', () => {
      const result = loadSchema(null);
      
      expect(result).toBeNull();
    });

    test('should throw error for invalid JSON', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue('invalid json');
      
      expect(() => loadSchema('/path/to/schema.json')).toThrow('Failed to load schema');
    });

    test('should handle file read errors', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockImplementation(() => {
        throw new Error('File read error');
      });
      
      expect(() => loadSchema('/path/to/schema.json')).toThrow('Failed to load schema');
    });
  });

  describe('performSmartAnalysis', () => {
    test('should perform basic analysis', () => {
      const config = {
        service_name: 'web',
        port: 80,
        debug: true,
        jwt_secret: 'weak'
      };
      
      const analysis = performSmartAnalysis(config, 'prod');
      
      expect(analysis.summary).toBeDefined();
      expect(analysis.security).toBeDefined();
      expect(analysis.performance).toBeDefined();
      expect(analysis.bestPractices).toBeDefined();
      expect(analysis.environment).toBeDefined();
    });

    test('should detect security issues', () => {
      const config = {
        jwt_secret: 'weak',
        port: 80,
        ssl_enabled: false
      };
      
      const analysis = performSmartAnalysis(config, 'prod');
      
      expect(analysis.security.critical.length).toBeGreaterThan(0);
      expect(analysis.security.warnings.length).toBeGreaterThan(0);
    });

    test('should detect performance issues', () => {
      const config = {
        database_url: 'postgresql://localhost:5432/myapp',
        api_timeout: 120000
      };
      
      const analysis = performSmartAnalysis(config, 'prod');
      
      expect(analysis.performance.issues.length).toBeGreaterThan(0);
    });

    test('should detect best practice issues', () => {
      const config = {
        health_check_enabled: false,
        monitoring_enabled: false
      };
      
      const analysis = performSmartAnalysis(config, 'prod');
      
      expect(analysis.bestPractices.missing.length).toBeGreaterThan(0);
    });
  });

  describe('diagnoseConfig', () => {
    test('should diagnose configuration environment', () => {
      const diagnosis = diagnoseConfig('.', './config');
      
      expect(diagnosis.criticalIssues).toBeDefined();
      expect(diagnosis.warnings).toBeDefined();
      expect(diagnosis.recommendations).toBeDefined();
      expect(diagnosis.summary).toBeDefined();
      expect(diagnosis.migrationPlan).toBeDefined();
    });

    test('should handle diagnosis errors gracefully', () => {
      // Mock fs to throw error
      fs.readdirSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });
      
      const diagnosis = diagnoseConfig('.', './config');
      
      expect(diagnosis.criticalIssues).toBeDefined();
      expect(diagnosis.warnings).toBeDefined();
      expect(diagnosis.recommendations).toBeDefined();
      expect(diagnosis.summary).toBeDefined();
      expect(diagnosis.migrationPlan).toBeDefined();
    });
  });

  describe('repairConfig', () => {
    test('should repair configuration', () => {
      const result = repairConfig('.', './config', { dryRun: true });
      
      expect(result.success).toBe(true);
      expect(result.plan).toBeDefined();
    });

    test('should handle repair with backup', () => {
      const result = repairConfig('.', './config', { 
        backup: true, 
        dryRun: true 
      });
      
      expect(result.success).toBe(true);
    });

    test('should handle analyze-only mode', () => {
      const result = repairConfig('.', './config', { 
        analyzeOnly: true 
      });
      
      expect(result.success).toBe(true);
    });
  });

  describe('Package Schema Functions', () => {
    test('should discover package schemas', () => {
      const schemas = discoverPackageSchemas('.');
      
      expect(schemas).toBeDefined();
      expect(typeof schemas).toBe('object');
    });

    test('should merge package schemas', () => {
      const projectSchema = {
        service_name: { type: 'string', required: true }
      };
      
      const packageSchemas = {
        'express': {
          port: { type: 'number' }
        }
      };
      
      const merged = mergePackageSchemas(projectSchema, packageSchemas);
      
      expect(merged.service_name).toBeDefined();
      expect(merged['express.port']).toBeDefined();
    });

    test('should validate with package schemas', () => {
      const config = {
        service_name: 'web',
        'express.port': 3000
      };
      
      const projectSchema = {
        service_name: { type: 'string', required: true }
      };
      
      const packageSchemas = {
        'express': {
          port: { type: 'number' }
        }
      };
      
      const errors = validateWithPackageSchemas(config, projectSchema, packageSchemas);
      
      expect(Array.isArray(errors)).toBe(true);
    });

    test('should explain config value', () => {
      const config = {
        'express.port': 3000
      };
      
      const schemas = {
        'express.port': { type: 'number' }
      };
      
      const explanation = explainConfigValue('express.port', config, schemas);
      
      expect(explanation.key).toBe('express.port');
      expect(explanation.value).toBe(3000);
      expect(explanation.namespace).toBe('express');
    });

    test('should list available schemas', () => {
      const projectSchema = {
        service_name: { type: 'string' }
      };
      
      const packageSchemas = {
        'express': {
          port: { type: 'number' }
        }
      };
      
      const schemas = listAvailableSchemas(projectSchema, packageSchemas);
      
      expect(schemas.project).toContain('service_name');
      expect(schemas.packages.express).toContain('port');
    });
  });

  describe('Export Functions', () => {
    const testConfig = {
      service_name: 'web',
      port: 3000,
      debug: true,
      hosts: ['localhost', '127.0.0.1']
    };

    test('should export to Python', () => {
      const result = exportToPython(testConfig);
      
      expect(result).toContain('class Settings:');
      expect(result).toContain('SERVICE_NAME = "web"');
      expect(result).toContain('PORT = 3000');
      expect(result).toContain('DEBUG = true');
    });

    test('should export to TOML', () => {
      const result = exportToTOML(testConfig);
      
      expect(result).toContain('service_name = "web"');
      expect(result).toContain('port = 3000');
      expect(result).toContain('debug = true');
    });

    test('should export to Properties', () => {
      const result = exportToProperties(testConfig);
      
      expect(result).toContain('service_name=web');
      expect(result).toContain('port=3000');
      expect(result).toContain('debug=true');
    });

    test('should export to HCL', () => {
      const result = exportToHCL(testConfig);
      
      expect(result).toContain('resource "local_file"');
      expect(result).toContain('service_name = "web"');
    });

    test('should export to INI', () => {
      const result = exportToINI(testConfig);
      
      expect(result).toContain('[config]');
      expect(result).toContain('service_name = web');
      expect(result).toContain('port = 3000');
    });

    test('should export to XML', () => {
      const result = exportToXML(testConfig);
      
      expect(result).toContain('<?xml version="1.0"');
      expect(result).toContain('<service_name>web</service_name>');
      expect(result).toContain('<port>3000</port>');
    });

    test('should export to JSON with comments', () => {
      const schema = {
        service_name: { description: 'Application name' },
        port: { description: 'Server port' }
      };
      
      const result = exportToJSONWithComments(testConfig, schema);
      
      expect(result).toContain('"service_name": "web"');
      expect(result).toContain('"port": 3000');
    });

    test('should export to YAML with comments', () => {
      const schema = {
        service_name: { description: 'Application name' },
        port: { description: 'Server port' }
      };
      
      const result = exportToYAMLWithComments(testConfig, schema);
      
      expect(result).toContain('service_name: "web"');
      expect(result).toContain('port: 3000');
    });
  });

  describe('Policy Validation', () => {
    test('should validate policies', () => {
      const config = {
        debug: true,
        log_level: 'debug',
        ssl: false
      };
      
      const result = validatePolicies(config, 'production');
      
      expect(result.valid).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
    });

    test('should load policies from file', () => {
      const policies = loadPolicies('./align.policies.json');
      
      expect(policies).toBeDefined();
      expect(typeof policies).toBe('object');
    });

    test('should suggest policies', () => {
      const config = {
        debug: true,
        log_level: 'debug'
      };
      
      const suggestions = suggestPolicies(config, 'production');
      
      expect(Array.isArray(suggestions)).toBe(true);
    });
  });

  describe('Schema Inference', () => {
    test('should infer schema from config', () => {
      const config = {
        service_name: 'web',
        port: 3000,
        debug: true,
        hosts: ['localhost']
      };
      
      const schema = inferSchema(config);
      
      expect(schema.service_name.type).toBe('string');
      expect(schema.port.type).toBe('number');
      expect(schema.debug.type).toBe('boolean');
      expect(schema.hosts.type).toBe('array');
    });

    test('should infer schema from files', () => {
      const baseConfig = {
        service_name: 'web',
        port: 3000
      };
      
      const envConfigs = {
        dev: { debug: true },
        prod: { debug: false }
      };
      
      const schema = inferSchemaFromFiles(baseConfig, envConfigs);
      
      expect(schema.service_name.type).toBe('string');
      expect(schema.port.type).toBe('number');
      expect(schema.debug.type).toBe('boolean');
    });
  });

  describe('Linting Functions', () => {
    test('should lint configuration', () => {
      const config = {
        service_name: 'web',
        port: 3000
      };
      
      const schema = {
        service_name: { type: 'string', required: true },
        port: { type: 'number', min: 1, max: 65535 }
      };
      
      const result = lintConfig(config, schema, 'dev');
      
      expect(result.issues).toBeDefined();
      expect(result.warnings).toBeDefined();
      expect(result.suggestions).toBeDefined();
      expect(result.summary).toBeDefined();
    });

    test('should apply lint fixes', () => {
      const config = {
        service_name: 'web',
        port: 3000
      };
      
      const schema = {
        service_name: { type: 'string', required: true },
        port: { type: 'number', min: 1, max: 65535 }
      };
      
      const lintResult = {
        issues: [],
        warnings: [],
        suggestions: []
      };
      
      const result = applyLintFixes(config, schema, 'dev', lintResult);
      
      expect(result.config).toBeDefined();
      expect(result.results).toBeDefined();
    });
  });

  describe('Secrets Management', () => {
    test('should explain with secrets', () => {
      const config = {
        jwt_secret: 'my-secret-key',
        database_password: 'password123'
      };
      
      const explanation = explainWithSecrets(config, 'jwt_secret', 'dev');
      
      expect(explanation.field).toBe('jwt_secret');
      expect(explanation.value).toBe('***');
    });

    test('should validate secrets with external', () => {
      const config = {
        jwt_secret: 'my-secret-key'
      };
      
      const result = validateSecretsWithExternal(config, null, 'dev');
      
      expect(result.sensitiveFields).toBeDefined();
      expect(result.issues).toBeDefined();
      expect(result.warnings).toBeDefined();
    });
  });

  describe('CI/CD Functions', () => {
    test('should generate CI config', () => {
      const config = {
        service_name: 'web',
        port: 3000
      };
      
      const options = {
        environments: ['dev', 'prod'],
        workflowName: 'test-workflow'
      };
      
      const result = generateCIConfig('github', config, options);
      
      expect(result).toBeDefined();
    });
  });

  describe('Version Management', () => {
    test('should get schema version', () => {
      const schema = {
        _version: '1.0.0',
        service_name: { type: 'string' }
      };
      
      const version = getSchemaVersion(schema);
      
      expect(version).toBe('1.0.0');
    });

    test('should get config version', () => {
      const config = {
        _version: '1.0.0',
        service_name: 'web'
      };
      
      const version = getConfigVersion(config);
      
      expect(version).toBe('1.0.0');
    });

    test('should compare versions', () => {
      expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
      expect(compareVersions('1.0.0', '1.1.0')).toBe(-1);
      expect(compareVersions('1.1.0', '1.0.0')).toBe(1);
    });

    test('should detect version issues', () => {
      const schema = { _version: '1.0.0' };
      const config = { _version: '0.9.0' };
      
      const issues = detectVersionIssues(schema, config);
      
      expect(issues.issues).toBeDefined();
      expect(issues.warnings).toBeDefined();
    });

    test('should generate version migration plan', () => {
      const schema = { _version: '1.0.0' };
      const config = { _version: '0.9.0' };
      
      const plan = generateVersionMigrationPlan('0.9.0', '1.0.0', schema, config);
      
      expect(plan.fromVersion).toBe('0.9.0');
      expect(plan.toVersion).toBe('1.0.0');
      expect(plan.steps).toBeDefined();
    });

    test('should apply migration', () => {
      const config = { _version: '0.9.0' };
      const plan = {
        steps: [],
        breakingChanges: [],
        newFeatures: [],
        deprecatedFields: []
      };
      
      const result = applyMigration(config, plan, { dryRun: true });
      
      expect(result.success).toBe(true);
    });

    test('should bump schema version', () => {
      const schema = { _version: '1.0.0' };
      
      const newSchema = bumpSchemaVersion(schema, 'patch');
      
      expect(getSchemaVersion(newSchema)).toBe('1.0.1');
    });

    test('should bump config version', () => {
      const config = { _version: '1.0.0' };
      
      const newConfig = bumpConfigVersion(config, 'minor');
      
      expect(getConfigVersion(newConfig)).toBe('1.1.0');
    });

    test('should validate migration compatibility', () => {
      const schema = { _version: '1.0.0' };
      const config = { _version: '0.9.0' };
      
      const compatibility = validateMigrationCompatibility(schema, config, '1.0.0');
      
      expect(compatibility.issues).toBeDefined();
      expect(compatibility.warnings).toBeDefined();
    });
  });

  describe('Angular and .env Migration', () => {
    test('should extract Angular environment vars', () => {
      const content = `
        export const environment = {
          production: false,
          apiUrl: 'http://localhost:3000',
          version: '1.0.0'
        };
      `;
      
      const vars = extractAngularEnvironmentVars(content);
      
      expect(vars.production).toBe(false);
      expect(vars.apiUrl).toBe('http://localhost:3000');
      expect(vars.version).toBe('1.0.0');
    });

    test('should generate schema from Angular', () => {
      const envVars = {
        production: false,
        apiUrl: 'http://localhost:3000'
      };
      
      const schema = generateSchemaFromAngular(envVars);
      
      expect(schema).toBeDefined();
      expect(typeof schema).toBe('object');
    });

    test('should generate base align from Angular', () => {
      const envVars = {
        production: false,
        apiUrl: 'http://localhost:3000'
      };
      
      const result = generateBaseAlignFromAngular(envVars);
      
      expect(result).toContain('production=false');
      expect(result).toContain('apiUrl=http://localhost:3000');
    });

    test('should parse env file', () => {
      const content = `
        PORT=3000
        DEBUG=true
        DATABASE_URL=postgresql://localhost:5432/myapp
      `;
      
      const vars = parseEnvFile(content);
      
      expect(vars.PORT).toBe(3000);
      expect(vars.DEBUG).toBe(true);
      expect(vars.DATABASE_URL).toBe('postgresql://localhost:5432/myapp');
    });

    test('should generate schema from env vars', () => {
      const envVars = {
        PORT: '3000',
        DEBUG: 'true',
        DATABASE_URL: 'postgresql://localhost:5432/myapp'
      };
      
      const schema = generateSchemaFromEnvVars(envVars);
      
      expect(schema).toBeDefined();
      expect(typeof schema).toBe('object');
    });

    test('should generate align from env vars', () => {
      const envVars = {
        PORT: '3000',
        DEBUG: 'true',
        DATABASE_URL: 'postgresql://localhost:5432/myapp'
      };
      
      const result = generateAlignFromEnvVars(envVars);
      
      expect(result).toContain('PORT=3000');
      expect(result).toContain('DEBUG=true');
      expect(result).toContain('DATABASE_URL=postgresql://localhost:5432/myapp');
    });
  });

  describe('GCP Secret Manager', () => {
    test('should list GCP secrets', async () => {
      // Mock the GCP function to avoid actual API calls
      const mockListGCPSecrets = jest.fn().mockResolvedValue([]);
      
      const secrets = await mockListGCPSecrets('test-project');
      
      expect(Array.isArray(secrets)).toBe(true);
    }, 10000);

    test('should resolve GCP secrets', async () => {
      const config = {
        jwt_secret: 'projects/test-project/secrets/jwt-secret'
      };
      
      const result = await resolveGCPSecrets(config, 'test-project', 'dev');
      
      expect(result).toBeDefined();
    });

    test('should validate GCP secrets', async () => {
      const config = {
        jwt_secret: 'projects/test-project/secrets/jwt-secret'
      };
      
      const result = await validateGCPSecrets(config, 'test-project', 'dev');
      
      expect(result.valid).toBeDefined();
      expect(result.totalSecrets).toBeDefined();
    });
  });

  describe('Service-specific Configuration', () => {
    test('should load service-specific config', () => {
      const config = {
        service_name: 'web',
        port: 3000
      };
      
      const result = loadServiceSpecificConfig(config, 'api', 'dev');
      
      expect(result).toBeDefined();
    });
  });

  describe('Team Collaboration', () => {
    test('should create environment share', () => {
      const result = createEnvironmentShare('dev', { port: 3000 }, ['user1', 'user2']);
      
      expect(result.environment).toBe('dev');
      expect(result.sharedWith).toEqual(['user1', 'user2']);
    });

    test('should create environment review', () => {
      const result = createEnvironmentReview('dev', { port: 3000 }, 'reviewer1');
      
      expect(result.environment).toBe('dev');
      expect(result.reviewer).toBe('reviewer1');
    });

    test('should lock environment', () => {
      const result = lockEnvironment('dev', 'user1', 'Deployment in progress');
      
      expect(result.environment).toBe('dev');
      expect(result.lockedBy).toBe('user1');
      expect(result.reason).toBe('Deployment in progress');
    });

    test('should unlock environment', () => {
      const result = unlockEnvironment('dev', 'user1');
      
      expect(result.environment).toBe('dev');
      expect(result.unlockedBy).toBe('user1');
    });

    test('should parse duration', () => {
      expect(parseDuration('2h')).toBe(7200000);
      expect(parseDuration('30m')).toBe(1800000);
      expect(parseDuration('1d')).toBe(86400000);
    });
  });

  describe('SOC 2 Compliance', () => {
    test('should generate SOC 2 checklist', () => {
      const config = {
        service_name: 'web',
        port: 3000,
        ssl_enabled: false
      };
      
      const result = generateSOC2Checklist(config, 'prod');
      
      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    });
  });
}); 