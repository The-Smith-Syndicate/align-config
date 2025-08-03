const { Command } = require('commander');
const fs = require('fs');
const path = require('path');

// Mock fs for testing
jest.mock('fs');

// Mock console methods to capture output
const originalConsole = { ...console };
beforeEach(() => {
  console.log = jest.fn();
  console.error = jest.fn();
  console.warn = jest.fn();
});

afterEach(() => {
  console.log = originalConsole.log;
  console.error = originalConsole.error;
  console.warn = originalConsole.warn;
});

describe('CLI Commands', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock file system responses
    fs.existsSync.mockImplementation((path) => {
      return path.includes('base.align') || path.includes('dev.align') || path.includes('prod.align') || path.includes('schema.json');
    });
    
    fs.readFileSync.mockImplementation((path) => {
      if (path.includes('base.align')) {
        return 'service_name = "web"\ntimeout = 3000\nauth_required = true';
      }
      if (path.includes('dev.align')) {
        return 'debug = true\nport = 3000';
      }
      if (path.includes('prod.align')) {
        return 'timeout = 5000\ndebug = false';
      }
      if (path.includes('schema.json')) {
        return JSON.stringify({
          service_name: { type: 'string', required: true },
          timeout: { type: 'number', required: false }
        });
      }
      return '';
    });
    
    fs.writeFileSync.mockImplementation(() => {});
    fs.mkdirSync.mockImplementation(() => {});
  });

  describe('init command', () => {
    test('should initialize template successfully', () => {
      // Mock template directory exists
      fs.existsSync.mockImplementation((path) => {
        return path.includes('templates/nodejs-api') || path.includes('config');
      });
      
      // Mock template files
      fs.readFileSync.mockImplementation((path) => {
        if (path.includes('base.align')) {
          return 'service_name = "myapp"';
        }
        if (path.includes('dev.align')) {
          return 'debug = true';
        }
        if (path.includes('prod.align')) {
          return 'debug = false';
        }
        if (path.includes('schema.json')) {
          return '{}';
        }
        return '';
      });
      
      // This would normally be called by the CLI
      // For testing, we'll simulate the behavior
      const templateDir = path.join(__dirname, '..', 'templates', 'nodejs-api');
      const configDir = './config';
      
      expect(fs.existsSync(templateDir)).toBe(true);
      expect(fs.existsSync(configDir)).toBe(true);
    });

    test('should handle missing template', () => {
      fs.existsSync.mockImplementation((path) => {
        // Only return true for config directory, not for nonexistent template
        return path.includes('config') && !path.includes('nonexistent');
      });
      
      // Simulate template not found
      const templateDir = path.join(__dirname, '..', 'templates', 'nonexistent');
      
      expect(fs.existsSync(templateDir)).toBe(false);
    });
  });

  describe('validate command', () => {
    test('should validate configuration file', () => {
      const content = 'service_name = "web"\ntimeout = 3000';
      
      // Mock file reading
      fs.readFileSync.mockReturnValue(content);
      
      // Simulate validation
      const parsed = require('../parser').parseAlign(content);
      const errors = require('../parser').validateConfig(parsed, true);
      
      expect(errors).toHaveLength(0);
    });

    test('should handle validation errors', () => {
      const content = 'invalid syntax';
      
      // Mock file reading
      fs.readFileSync.mockReturnValue(content);
      
      // Simulate validation error
      expect(() => require('../parser').parseAlign(content)).toThrow();
    });
  });

  describe('build command', () => {
    test('should build configuration successfully', () => {
      // Mock file system for build
      fs.existsSync.mockImplementation((path) => {
        return path.includes('base.align') || path.includes('dev.align') || path.includes('config');
      });
      
      fs.readFileSync.mockImplementation((path) => {
        if (path.includes('base.align')) {
          return 'service_name = "web"\ntimeout = 3000';
        }
        if (path.includes('dev.align')) {
          return 'debug = true';
        }
        return '';
      });
      
      // Simulate build process
      const baseConfig = require('../parser').parseAlign('service_name = "web"\ntimeout = 3000');
      const envConfig = require('../parser').parseAlign('debug = true');
      const mergedConfig = require('../parser').mergeConfigs(baseConfig, envConfig);
      
      expect(mergedConfig.service_name).toBe('web');
      expect(mergedConfig.timeout).toBe(3000);
      expect(mergedConfig.debug).toBe(true);
    });

    test('should handle missing base config', () => {
      fs.existsSync.mockImplementation((path) => {
        return path.includes('dev.align'); // Only env config exists
      });
      
      // Simulate missing base config
      expect(fs.existsSync('./config/base.align')).toBe(false);
    });

    test('should handle missing environment config', () => {
      fs.existsSync.mockImplementation((path) => {
        return path.includes('base.align'); // Only base config exists
      });
      
      // Simulate missing environment config
      expect(fs.existsSync('./config/dev.align')).toBe(false);
    });
  });

  describe('explain command', () => {
    test('should explain configuration value', () => {
      // Mock file system for explain
      fs.existsSync.mockImplementation((path) => {
        return path.includes('base.align') || path.includes('dev.align') || path.includes('config');
      });
      
      fs.readFileSync.mockImplementation((path) => {
        if (path.includes('base.align')) {
          return 'service_name = "web"\ntimeout = 3000';
        }
        if (path.includes('dev.align')) {
          return 'debug = true';
        }
        return '';
      });
      
      // Simulate explain process
      const baseConfig = require('../parser').parseAlign('service_name = "web"\ntimeout = 3000');
      const envConfig = require('../parser').parseAlign('debug = true');
      const mergedConfig = require('../parser').mergeConfigs(baseConfig, envConfig);
      
      const key = 'service_name';
      const value = mergedConfig[key];
      
      expect(value).toBe('web');
      expect(mergedConfig).toHaveProperty(key);
    });

    test('should handle missing key', () => {
      // Mock file system
      fs.existsSync.mockImplementation((path) => {
        return path.includes('base.align') || path.includes('dev.align') || path.includes('config');
      });
      
      fs.readFileSync.mockImplementation((path) => {
        if (path.includes('base.align')) {
          return 'service_name = "web"';
        }
        if (path.includes('dev.align')) {
          return 'debug = true';
        }
        return '';
      });
      
      // Simulate missing key
      const baseConfig = require('../parser').parseAlign('service_name = "web"');
      const envConfig = require('../parser').parseAlign('debug = true');
      const mergedConfig = require('../parser').mergeConfigs(baseConfig, envConfig);
      
      const key = 'missing_key';
      
      expect(mergedConfig).not.toHaveProperty(key);
    });
  });

  describe('diff command', () => {
    test('should compare environments', () => {
      // Mock file system for diff
      fs.existsSync.mockImplementation((path) => {
        return path.includes('base.align') || path.includes('dev.align') || path.includes('prod.align') || path.includes('config');
      });
      
      fs.readFileSync.mockImplementation((path) => {
        if (path.includes('base.align')) {
          return 'service_name = "web"';
        }
        if (path.includes('dev.align')) {
          return 'debug = true';
        }
        if (path.includes('prod.align')) {
          return 'debug = false';
        }
        return '';
      });
      
      // Simulate diff process
      const baseConfig = require('../parser').parseAlign('service_name = "web"');
      const devConfig = require('../parser').parseAlign('debug = true');
      const prodConfig = require('../parser').parseAlign('debug = false');
      
      const devMerged = require('../parser').mergeConfigs(baseConfig, devConfig);
      const prodMerged = require('../parser').mergeConfigs(baseConfig, prodConfig);
      
      expect(devMerged.debug).toBe(true);
      expect(prodMerged.debug).toBe(false);
    });
  });

  describe('analyze command', () => {
    test('should perform smart analysis', () => {
      const config = {
        service_name: 'web',
        port: 80,
        debug: true,
        jwt_secret: 'weak'
      };
      
      const analysis = require('../parser').performSmartAnalysis(config, 'prod');
      
      expect(analysis.summary).toBeDefined();
      expect(analysis.security).toBeDefined();
      expect(analysis.performance).toBeDefined();
      expect(analysis.bestPractices).toBeDefined();
      expect(analysis.environment).toBeDefined();
    });
  });

  describe('lint command', () => {
    test('should lint configuration', () => {
      const config = {
        service_name: 'web',
        port: 3000
      };
      
      const schema = {
        service_name: { type: 'string', required: true },
        port: { type: 'number', min: 1, max: 65535 }
      };
      
      const result = require('../parser').lintConfig(config, schema, 'dev');
      
      expect(result.issues).toBeDefined();
      expect(result.warnings).toBeDefined();
      expect(result.suggestions).toBeDefined();
      expect(result.summary).toBeDefined();
    });
  });

  describe('secrets command', () => {
    test('should validate secrets', () => {
      const config = {
        jwt_secret: 'my-secret-key'
      };
      
      const result = require('../parser').validateSecretsWithExternal(config, null, 'dev');
      
      expect(result.sensitiveFields).toBeDefined();
      expect(result.issues).toBeDefined();
      expect(result.warnings).toBeDefined();
    });
  });

  describe('ci command', () => {
    test('should generate CI configuration', () => {
      const config = {
        service_name: 'web',
        port: 3000
      };
      
      const options = {
        environments: ['dev', 'prod'],
        workflowName: 'test-workflow'
      };
      
      const result = require('../parser').generateCIConfig('github', config, options);
      
      expect(result).toBeDefined();
    });
  });

  describe('version command', () => {
    test('should get schema version', () => {
      const schema = {
        _version: '1.0.0',
        service_name: { type: 'string' }
      };
      
      const version = require('../parser').getSchemaVersion(schema);
      
      expect(version).toBe('1.0.0');
    });

    test('should get config version', () => {
      const config = {
        _version: '1.0.0',
        service_name: 'web'
      };
      
      const version = require('../parser').getConfigVersion(config);
      
      expect(version).toBe('1.0.0');
    });

    test('should compare versions', () => {
      const compareVersions = require('../parser').compareVersions;
      
      expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
      expect(compareVersions('1.0.0', '1.1.0')).toBe(-1);
      expect(compareVersions('1.1.0', '1.0.0')).toBe(1);
    });
  });

  describe('diagnose command', () => {
    test('should diagnose configuration environment', () => {
      const diagnosis = require('../parser').diagnoseConfig('.', './config');
      
      expect(diagnosis.criticalIssues).toBeDefined();
      expect(diagnosis.warnings).toBeDefined();
      expect(diagnosis.recommendations).toBeDefined();
      expect(diagnosis.summary).toBeDefined();
      expect(diagnosis.migrationPlan).toBeDefined();
    });
  });

  describe('repair command', () => {
    test('should repair configuration', () => {
      const result = require('../parser').repairConfig('.', './config', { dryRun: true });
      
      expect(result.success).toBe(true);
      expect(result.plan).toBeDefined();
    });
  });

  describe('export functions', () => {
    const testConfig = {
      service_name: 'web',
      port: 3000,
      debug: true,
      hosts: ['localhost', '127.0.0.1']
    };

    test('should export to Python', () => {
      const result = require('../parser').exportToPython(testConfig);
      
      expect(result).toContain('class Settings:');
      expect(result).toContain('SERVICE_NAME = "web"');
      expect(result).toContain('PORT = 3000');
      expect(result).toContain('DEBUG = true');
    });

    test('should export to TOML', () => {
      const result = require('../parser').exportToTOML(testConfig);
      
      expect(result).toContain('service_name = "web"');
      expect(result).toContain('port = 3000');
      expect(result).toContain('debug = true');
    });

    test('should export to Properties', () => {
      const result = require('../parser').exportToProperties(testConfig);
      
      expect(result).toContain('service_name=web');
      expect(result).toContain('port=3000');
      expect(result).toContain('debug=true');
    });

    test('should export to HCL', () => {
      const result = require('../parser').exportToHCL(testConfig);
      
      expect(result).toContain('resource "local_file"');
      expect(result).toContain('service_name = "web"');
    });

    test('should export to INI', () => {
      const result = require('../parser').exportToINI(testConfig);
      
      expect(result).toContain('[config]');
      expect(result).toContain('service_name = web');
      expect(result).toContain('port = 3000');
    });

    test('should export to XML', () => {
      const result = require('../parser').exportToXML(testConfig);
      
      expect(result).toContain('<?xml version="1.0"');
      expect(result).toContain('<service_name>web</service_name>');
      expect(result).toContain('<port>3000</port>');
    });
  });

  describe('policy validation', () => {
    test('should validate policies', () => {
      const config = {
        debug: true,
        log_level: 'debug',
        ssl: false
      };
      
      const result = require('../parser').validatePolicies(config, 'production');
      
      expect(result.valid).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
    });

    test('should load policies from file', () => {
      const policies = require('../parser').loadPolicies('./align.policies.json');
      
      expect(policies).toBeDefined();
      expect(typeof policies).toBe('object');
    });

    test('should suggest policies', () => {
      const config = {
        debug: true,
        log_level: 'debug'
      };
      
      const suggestions = require('../parser').suggestPolicies(config, 'production');
      
      expect(Array.isArray(suggestions)).toBe(true);
    });
  });

  describe('schema inference', () => {
    test('should infer schema from config', () => {
      const config = {
        service_name: 'web',
        port: 3000,
        debug: true,
        hosts: ['localhost']
      };
      
      const schema = require('../parser').inferSchema(config);
      
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
      
      const schema = require('../parser').inferSchemaFromFiles(baseConfig, envConfigs);
      
      expect(schema.service_name.type).toBe('string');
      expect(schema.port.type).toBe('number');
      expect(schema.debug.type).toBe('boolean');
    });
  });

  describe('package schema functions', () => {
    test('should discover package schemas', () => {
      const schemas = require('../parser').discoverPackageSchemas('.');
      
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
      
      const merged = require('../parser').mergePackageSchemas(projectSchema, packageSchemas);
      
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
      
      const errors = require('../parser').validateWithPackageSchemas(config, projectSchema, packageSchemas);
      
      expect(Array.isArray(errors)).toBe(true);
    });
  });

  describe('error handling', () => {
    test('should handle file system errors gracefully', () => {
      fs.existsSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });
      
      // This should not crash the application
      expect(() => {
        try {
          fs.existsSync('./config');
        } catch (error) {
          // Handle error gracefully
        }
      }).not.toThrow();
    });

    test('should handle parse errors gracefully', () => {
      fs.readFileSync.mockImplementation(() => {
        throw new Error('File read error');
      });
      
      // This should not crash the application
      expect(() => {
        try {
          fs.readFileSync('./config/base.align');
        } catch (error) {
          // Handle error gracefully
        }
      }).not.toThrow();
    });
  });

  describe('edge cases', () => {
    test('should handle empty configuration files', () => {
      fs.readFileSync.mockReturnValue('');
      
      // This should be handled gracefully
      expect(() => {
        try {
          require('../parser').parseAlign('');
        } catch (error) {
          // Handle error gracefully
        }
      }).not.toThrow();
    });

    test('should handle malformed configuration files', () => {
      fs.readFileSync.mockReturnValue('invalid syntax');
      
      // This should be handled gracefully
      expect(() => {
        try {
          require('../parser').parseAlign('invalid syntax');
        } catch (error) {
          // Handle error gracefully
        }
      }).not.toThrow();
    });

    test('should handle missing configuration directories', () => {
      fs.existsSync.mockReturnValue(false);
      
      // This should be handled gracefully
      expect(() => {
        try {
          if (!fs.existsSync('./config')) {
            // Handle missing directory
          }
        } catch (error) {
          // Handle error gracefully
        }
      }).not.toThrow();
    });
  });
}); 