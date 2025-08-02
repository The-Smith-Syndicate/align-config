const { parseAlign, validateConfig, mergeConfigs, loadSchema } = require('./parser');
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

    test('should throw error for invalid JSON', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue('invalid json');
      
      expect(() => loadSchema('/path/to/schema.json')).toThrow('Failed to load schema');
    });
  });
}); 