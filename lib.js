// lib.js - Align library for direct import into Node.js applications
const { parseAlign, validateConfig, mergeConfigs, loadSchema } = require('./parser');
const fs = require('fs');
const path = require('path');

class Align {
  constructor(configDir = './config') {
    this.configDir = path.resolve(configDir);
    this.schema = null;
    this.loadSchema();
  }

  loadSchema() {
    const schemaPath = path.join(this.configDir, 'align.schema.json');
    this.schema = loadSchema(schemaPath);
  }

  /**
   * Load configuration for a specific environment
   * @param {string} environment - Environment name (e.g., 'dev', 'prod')
   * @returns {Object} Merged configuration object
   */
  load(environment) {
    const basePath = path.join(this.configDir, 'base.align');
    const envPath = path.join(this.configDir, `${environment}.align`);

    // Check if files exist
    if (!fs.existsSync(basePath)) {
      throw new Error(`Base config not found: ${basePath}`);
    }
    if (!fs.existsSync(envPath)) {
      throw new Error(`Environment config not found: ${envPath}`);
    }

    // Load and parse configs
    const baseContent = fs.readFileSync(basePath, 'utf-8');
    const envContent = fs.readFileSync(envPath, 'utf-8');
    
    const baseConfig = parseAlign(baseContent);
    const envConfig = parseAlign(envContent);

    // Validate configs
    const baseErrors = validateConfig(baseConfig, true, this.schema);
    const envErrors = validateConfig(envConfig, false, this.schema);

    if (baseErrors.length > 0) {
      throw new Error(`Base config validation failed: ${baseErrors.join(', ')}`);
    }
    if (envErrors.length > 0) {
      throw new Error(`Environment config validation failed: ${envErrors.join(', ')}`);
    }

    // Merge and validate final config
    const mergedConfig = mergeConfigs(baseConfig, envConfig);
    const mergedErrors = validateConfig(mergedConfig, false, this.schema);
    
    if (mergedErrors.length > 0) {
      throw new Error(`Merged config validation failed: ${mergedErrors.join(', ')}`);
    }

    return mergedConfig;
  }

  /**
   * Validate a configuration file
   * @param {string} filePath - Path to the .align file
   * @param {boolean} isBaseConfig - Whether this is a base config
   * @returns {Array} Array of validation errors (empty if valid)
   */
  validate(filePath, isBaseConfig = false) {
    const absPath = path.resolve(filePath);
    
    if (!fs.existsSync(absPath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const content = fs.readFileSync(absPath, 'utf-8');
    const parsed = parseAlign(content);
    
    return validateConfig(parsed, isBaseConfig, this.schema);
  }

  /**
   * Get configuration metadata (what was overridden, etc.)
   * @param {string} environment - Environment name
   * @returns {Object} Metadata about the configuration
   */
  getMetadata(environment) {
    const basePath = path.join(this.configDir, 'base.align');
    const envPath = path.join(this.configDir, `${environment}.align`);

    const baseContent = fs.readFileSync(basePath, 'utf-8');
    const envContent = fs.readFileSync(envPath, 'utf-8');
    
    const baseConfig = parseAlign(baseContent);
    const envConfig = parseAlign(envContent);
    const mergedConfig = mergeConfigs(baseConfig, envConfig);

    return {
      environment,
      baseKeys: Object.keys(baseConfig),
      envKeys: Object.keys(envConfig),
      mergedKeys: Object.keys(mergedConfig),
      overriddenKeys: Object.keys(envConfig),
      baseConfig,
      envConfig,
      mergedConfig
    };
  }

  /**
   * Trace where a configuration value came from
   * @param {string} key - Configuration key to trace
   * @param {string} environment - Environment name
   * @returns {Object} Trace information
   */
  explain(key, environment) {
    const basePath = path.join(this.configDir, 'base.align');
    const envPath = path.join(this.configDir, `${environment}.align`);

    const baseContent = fs.readFileSync(basePath, 'utf-8');
    const envContent = fs.readFileSync(envPath, 'utf-8');
    
    const baseConfig = parseAlign(baseContent);
    const envConfig = parseAlign(envContent);
    const mergedConfig = mergeConfigs(baseConfig, envConfig);

    const finalValue = mergedConfig[key];
    const baseValue = baseConfig[key];
    const envValue = envConfig[key];

    if (finalValue === undefined) {
      throw new Error(`Key '${key}' not found in configuration`);
    }

    let source = 'unknown';
    let sourceFile = '';
    let overrideFile = '';

    if (baseValue !== undefined && envValue !== undefined) {
      source = 'overridden';
      sourceFile = basePath;
      overrideFile = envPath;
    } else if (baseValue !== undefined) {
      source = 'base';
      sourceFile = basePath;
    } else if (envValue !== undefined) {
      source = 'environment';
      sourceFile = envPath;
    }

    return {
      key,
      environment,
      finalValue,
      baseValue,
      envValue,
      source,
      sourceFile,
      overrideFile
    };
  }

  /**
   * Compare configurations between two environments
   * @param {string} env1 - First environment
   * @param {string} env2 - Second environment
   * @returns {Object} Comparison results
   */
  diff(env1, env2) {
    const config1 = this.load(env1);
    const config2 = this.load(env2);

    const allKeys = new Set([...Object.keys(config1), ...Object.keys(config2)]);
    const differences = [];

    for (const key of allKeys) {
      const value1 = config1[key];
      const value2 = config2[key];

      if (value1 !== value2) {
        differences.push({
          key,
          env1Value: value1,
          env2Value: value2,
          type: value1 === undefined ? 'added' : value2 === undefined ? 'removed' : 'changed'
        });
      }
    }

    return {
      env1,
      env2,
      differences,
      hasDifferences: differences.length > 0
    };
  }
}

module.exports = Align; 