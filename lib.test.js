const Align = require('./lib');
const fs = require('fs');
const path = require('path');

// Mock fs for testing
jest.mock('fs');

describe('Align Library', () => {
  let align;
  
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
    
    align = new Align('./config');
  });

  describe('load', () => {
    test('should load configuration for environment', () => {
      const config = align.load('dev');
      
      expect(config.service_name).toBe('web');
      expect(config.timeout).toBe(3000);
      expect(config.auth_required).toBe(true);
      expect(config.debug).toBe(true);
      expect(config.port).toBe(3000);
    });

    test('should throw error for missing base config', () => {
      fs.existsSync.mockImplementation((path) => {
        return path.includes('dev.align');
      });
      
      expect(() => align.load('dev')).toThrow('Base config not found');
    });

    test('should throw error for missing environment config', () => {
      fs.existsSync.mockImplementation((path) => {
        return path.includes('base.align');
      });
      
      expect(() => align.load('prod')).toThrow('Environment config not found');
    });
  });

  describe('validate', () => {
    test('should validate configuration file', () => {
      const errors = align.validate('./config/base.align', true);
      
      expect(errors).toHaveLength(0);
    });

    test('should return errors for invalid config', () => {
      fs.readFileSync.mockReturnValue('invalid syntax');
      
      expect(() => align.validate('./config/invalid.align', true)).toThrow();
    });
  });

  describe('getMetadata', () => {
    test('should return configuration metadata', () => {
      const metadata = align.getMetadata('dev');
      
      expect(metadata.environment).toBe('dev');
      expect(metadata.baseKeys).toContain('service_name');
      expect(metadata.envKeys).toContain('debug');
      expect(metadata.overriddenKeys).toContain('debug');
      expect(metadata.mergedConfig).toBeDefined();
    });
  });

  describe('explain', () => {
    test('should trace configuration origin', () => {
      const trace = align.explain('timeout', 'dev');
      
      expect(trace.key).toBe('timeout');
      expect(trace.environment).toBe('dev');
      expect(trace.finalValue).toBe(3000);
      expect(trace.source).toBe('base');
    });

    test('should handle overridden values', () => {
      const trace = align.explain('debug', 'dev');
      
      expect(trace.key).toBe('debug');
      expect(trace.finalValue).toBe(true);
      expect(trace.source).toBe('environment');
    });

    test('should throw error for missing key', () => {
      expect(() => align.explain('missing_key', 'dev')).toThrow('Key \'missing_key\' not found');
    });
  });

  describe('diff', () => {
    test('should compare environments', () => {
      const diff = align.diff('dev', 'prod');
      
      expect(diff.env1).toBe('dev');
      expect(diff.env2).toBe('prod');
      expect(diff.hasDifferences).toBe(true);
      expect(diff.differences.length).toBeGreaterThan(0);
    });
  });
}); 