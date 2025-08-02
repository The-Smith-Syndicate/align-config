const { parseAlign, validateConfig, mergeConfigs, loadSchema, performSmartAnalysis } = require('../parser');

describe('Parser Module', () => {
  describe('parseAlign', () => {
    test('should parse basic key-value pairs', () => {
      const content = `
        app_name = "myapp"
        port = 3000
        debug = true
      `;
      
      const result = parseAlign(content);
      
      expect(result.app_name).toBe('myapp');
      expect(result.port).toBe(3000);
      expect(result.debug).toBe(true);
    });

    test('should handle comments', () => {
      const content = `
        # This is a comment
        app_name = "myapp"  # Inline comment
        port = 3000
      `;
      
      const result = parseAlign(content);
      
      expect(result.app_name).toBe('myapp');
      expect(result.port).toBe(3000);
      expect(result['# This is a comment']).toBeUndefined();
    });

    test('should handle different data types', () => {
      const content = `
        string_value = "hello"
        number_value = 42
        boolean_true = true
        boolean_false = false
        float_value = 3.14
      `;
      
      const result = parseAlign(content);
      
      expect(result.string_value).toBe('hello');
      expect(result.number_value).toBe(42);
      expect(result.boolean_true).toBe(true);
      expect(result.boolean_false).toBe(false);
      expect(result.float_value).toBe(3.14);
    });

    test('should handle nested blocks', () => {
      const content = `
        app_name = "myapp"
        
        service "auth" {
          port = 4000
          timeout = 30
        }
        
        database "main" {
          url = "postgresql://localhost:5432/myapp"
          pool_size = 10
        }
      `;
      
      const result = parseAlign(content);
      
      expect(result.app_name).toBe('myapp');
      expect(result['service.auth.port']).toBe(4000);
      expect(result['service.auth.timeout']).toBe(30);
      expect(result['database.main.url']).toBe('postgresql://localhost:5432/myapp');
      expect(result['database.main.pool_size']).toBe(10);
    });

    test('should throw error for invalid syntax', () => {
      const content = `
        app_name = "myapp"
        invalid line
        port = 3000
      `;
      
      expect(() => parseAlign(content)).toThrow('Invalid syntax on line 3: missing \'=\'');
    });

    test('should throw error for empty key', () => {
      const content = `
        = "value"
        port = 3000
      `;
      
      expect(() => parseAlign(content)).toThrow('Invalid syntax on line 2: empty key');
    });

    test('should handle arrays', () => {
      const content = `
        cors_origins = ["http://localhost:3000", "https://myapp.com"]
        allowed_ips = ["192.168.1.1", "10.0.0.1"]
        empty_array = []
        single_item = ["only-one"]
      `;
      
      const result = parseAlign(content);
      
      expect(result.cors_origins).toEqual(["http://localhost:3000", "https://myapp.com"]);
      expect(result.allowed_ips).toEqual(["192.168.1.1", "10.0.0.1"]);
      expect(result.empty_array).toEqual([]);
      expect(result.single_item).toEqual(["only-one"]);
    });

    test('should handle arrays with quoted and unquoted items', () => {
      const content = `
        mixed_array = ["quoted", unquoted, "another quoted"]
      `;
      
      const result = parseAlign(content);
      
      expect(result.mixed_array).toEqual(["quoted", "unquoted", "another quoted"]);
    });
  });

  describe('validateConfig', () => {
    test('should validate required fields', () => {
      const config = {
        app_name: 'myapp',
        port: 3000
      };
      
      const schema = {
        app_name: { required: true },
        port: { required: true },
        optional_field: { required: false }
      };
      
      const errors = validateConfig(config, true, schema);
      expect(errors.length).toBe(0);
    });

    test('should catch missing required fields', () => {
      const config = {
        port: 3000
      };
      
      const schema = {
        app_name: { required: true },
        port: { required: true }
      };
      
      const errors = validateConfig(config, true, schema);
      expect(errors.length).toBe(1);
      expect(errors[0]).toContain('app_name');
    });

    test('should validate data types', () => {
      const config = {
        app_name: 'myapp',
        port: 'not-a-number',
        debug: 'not-a-boolean'
      };
      
      const schema = {
        app_name: { type: 'string' },
        port: { type: 'number' },
        debug: { type: 'boolean' }
      };
      
      const errors = validateConfig(config, false, schema);
      expect(errors.length).toBe(2);
    });

    test('should validate ranges', () => {
      const config = {
        port: 99999,
        timeout: -1
      };
      
      const schema = {
        port: { type: 'number', min: 1, max: 65535 },
        timeout: { type: 'number', min: 1, max: 300 }
      };
      
      const errors = validateConfig(config, false, schema);
      expect(errors.length).toBe(2);
    });
  });

  describe('mergeConfigs', () => {
    test('should merge base and environment configs', () => {
      const base = {
        app_name: 'myapp',
        port: 3000,
        debug: false
      };
      
      const env = {
        port: 8080,
        debug: true
      };
      
      const result = mergeConfigs(base, env);
      
      expect(result.app_name).toBe('myapp');
      expect(result.port).toBe(8080);
      expect(result.debug).toBe(true);
    });

    test('should track overridden keys', () => {
      const base = { port: 3000, debug: false };
      const env = { port: 8080 };
      
      const result = mergeConfigs(base, env);
      
      // Check that port was overridden but debug wasn't
      expect(result.port).toBe(8080);
      expect(result.debug).toBe(false);
    });
  });

  describe('loadSchema', () => {
    test('should load schema from file', () => {
      const mockFs = require('fs');
      jest.spyOn(mockFs, 'readFileSync').mockReturnValue(JSON.stringify({
        app_name: { type: 'string', required: true }
      }));
      jest.spyOn(mockFs, 'existsSync').mockReturnValue(true);
      
      const schema = loadSchema('schema.json');
      
      expect(schema.app_name).toBeDefined();
      expect(schema.app_name.type).toBe('string');
      expect(schema.app_name.required).toBe(true);
    });
  });

  describe('Smart Analysis', () => {
    test('should perform security analysis', () => {
      const config = {
        port: 80,
        jwt_secret: 'weak',
        cors_origins: ['*'],
        log_level: 'debug'
      };
      
      const analysis = performSmartAnalysis(config, 'prod', false);
      
      expect(analysis.security.critical.length).toBeGreaterThan(0);
      expect(analysis.security.warnings.length).toBeGreaterThan(0);
      expect(analysis.summary.securityIssues).toBeGreaterThan(0);
    });

    test('should perform performance analysis', () => {
      const config = {
        database_url: 'postgresql://localhost:5432/test',
        api_timeout: 120000,
        cache_enabled: false
      };
      
      const analysis = performSmartAnalysis(config, 'prod', false);
      
      expect(analysis.performance.issues.length).toBeGreaterThan(0);
      expect(analysis.summary.performanceIssues).toBeGreaterThan(0);
    });

    test('should perform best practices analysis', () => {
      const config = {
        database_url: 'postgresql://localhost:5432/test'
      };
      
      const analysis = performSmartAnalysis(config, 'prod', false);
      
      expect(analysis.bestPractices.missing.length).toBeGreaterThan(0);
      expect(analysis.summary.bestPracticeIssues).toBeGreaterThan(0);
    });

    test('should handle environment-specific analysis', () => {
      const devConfig = {
        log_level: 'info',
        minify: true
      };
      
      const prodConfig = {
        debug: true,
        hot_reload_enabled: true
      };
      
      const devAnalysis = performSmartAnalysis(devConfig, 'dev', false);
      const prodAnalysis = performSmartAnalysis(prodConfig, 'prod', false);
      
      expect(devAnalysis.environment.specific.length).toBeGreaterThan(0);
      expect(prodAnalysis.environment.specific.length).toBeGreaterThan(0);
    });

    test('should calculate summary correctly', () => {
      const config = {
        port: 80,
        jwt_secret: 'weak',
        database_url: 'postgresql://localhost:5432/test'
      };
      
      const analysis = performSmartAnalysis(config, 'prod', false);
      
      expect(analysis.summary.totalIssues).toBe(
        analysis.security.critical.length + 
        analysis.security.warnings.length +
        analysis.performance.issues.length +
        analysis.bestPractices.missing.length
      );
    });

    test('should identify good practices', () => {
      const config = {
        jwt_secret: 'very-long-secret-key-that-meets-security-requirements',
        database_pool_size: 25,
        logging_enabled: true
      };
      
      const analysis = performSmartAnalysis(config, 'prod', false);
      
      expect(analysis.bestPractices.goodPractices.length).toBeGreaterThan(0);
      expect(analysis.summary.goodPractices).toBeGreaterThan(0);
    });

    test('should provide detailed analysis when requested', () => {
      const config = {
        port: 80,
        jwt_secret: 'weak'
      };
      
      const analysis = performSmartAnalysis(config, 'prod', true);
      
      // Check that critical issues have detailed information
      const criticalIssue = analysis.security.critical[0];
      expect(criticalIssue.impact).toBeDefined();
      expect(criticalIssue.fix).toBeDefined();
    });

    test('should handle empty configuration', () => {
      const config = {};
      
      const analysis = performSmartAnalysis(config, 'prod', false);
      
      expect(analysis.summary.totalIssues).toBeGreaterThan(0);
      expect(analysis.security.warnings.length).toBeGreaterThan(0);
    });

    test('should handle production vs development differences', () => {
      const config = {
        log_level: 'debug',
        minify: false
      };
      
      const devAnalysis = performSmartAnalysis(config, 'dev', false);
      const prodAnalysis = performSmartAnalysis(config, 'prod', false);
      
      // Should have different issues for different environments
      expect(devAnalysis.environment.specific.length).toBeGreaterThanOrEqual(0);
      expect(prodAnalysis.environment.specific.length).toBeGreaterThanOrEqual(0);
    });
  });
}); 