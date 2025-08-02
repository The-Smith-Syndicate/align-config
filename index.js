#!/usr/bin/env node
const { parseAlign, validateConfig, mergeConfigs, loadSchema, performSmartAnalysis } = require('./parser');
const { Command } = require('commander');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const program = new Command();
program.name('align').description('Align config CLI').version('0.1.0');

// INIT COMMAND
program
  .command('init')
  .description('Initialize a new configuration from a template')
  .requiredOption('--template <name>', 'Template name (nodejs-api, python-api)')
  .option('--config-dir <dir>', 'Configuration directory', './config')
  .option('--app-name <name>', 'Application name', 'myapp')
  .action((options) => {
    try {
      const templateDir = path.join(__dirname, 'templates', options.template);
      const configDir = path.resolve(options.configDir);
      
      // Check if template exists
      if (!fs.existsSync(templateDir)) {
        console.error(chalk.red(`❌ Template not found: ${options.template}`));
                         console.log(chalk.gray('Available templates:'));
                 const templatesDir = path.join(__dirname, 'templates');
                 if (fs.existsSync(templatesDir)) {
                   const templates = fs.readdirSync(templatesDir, { withFileTypes: true })
                     .filter(dirent => dirent.isDirectory())
                     .map(dirent => dirent.name);
                   templates.forEach(template => console.log(chalk.gray(`  - ${template}`)));
                   console.log(chalk.blue('\nTemplate descriptions:'));
                   console.log(chalk.gray('  - nodejs-api: Node.js API with Express, JWT, and database'));
                   console.log(chalk.gray('  - python-api: Python API with FastAPI, authentication, and validation'));
                   console.log(chalk.gray('  - go-api: Go API with Gin, database, and monitoring'));
                   console.log(chalk.gray('  - react-app: React frontend with build optimization and analytics'));
                   console.log(chalk.gray('  - nextjs-app: Next.js with SSR, API routes, and image optimization'));
                   console.log(chalk.gray('  - angular-app: Angular with AOT compilation and service workers'));
                   console.log(chalk.gray('  - microservices: Distributed system with service discovery and tracing'));
                   console.log(chalk.gray('  - database: Database configuration with connection pooling and backup'));
                 }
        process.exit(1);
      }
      
      // Create config directory if it doesn't exist
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      
      // Copy template files
      const templateFiles = ['base.align', 'dev.align', 'prod.align', 'align.schema.json'];
      let copiedFiles = 0;
      
      templateFiles.forEach(filename => {
        const templatePath = path.join(templateDir, filename);
        const targetPath = path.join(configDir, filename);
        
        if (fs.existsSync(templatePath)) {
          let content = fs.readFileSync(templatePath, 'utf-8');
          
          // Replace app_name if provided
          if (options.appName && filename.endsWith('.align')) {
            content = content.replace(/app_name = "[^"]*"/g, `app_name = "${options.appName}"`);
          }
          
          fs.writeFileSync(targetPath, content);
          copiedFiles++;
          console.log(chalk.green(`✅ Created ${filename}`));
        }
      });
      
      console.log(chalk.blue(`\n🎯 Template initialization complete!`));
      console.log(chalk.gray(`📁 Configuration directory: ${configDir}`));
      console.log(chalk.gray(`📄 Files created: ${copiedFiles}`));
      console.log(chalk.blue(`\nNext steps:`));
      console.log(chalk.gray(`1. Customize the configuration files in ${configDir}`));
      console.log(chalk.gray(`2. Validate: node index.js validate ${configDir}/base.align --base`));
      console.log(chalk.gray(`3. Build: node index.js build --env=dev --out=./output/config.dev.json`));
      
    } catch (err) {
      console.error(chalk.red('❌ Init error:'), err.message);
      process.exit(1);
    }
  });

// VALIDATE COMMAND
program
  .command('validate <file>')
  .description('Validate a .align config file')
  .option('--base', 'Treat as base config (validate required fields)')
  .option('--schema <file>', 'Schema file path (align.schema.json)')
  .action((filePath, options) => {
    try {
      const absPath = path.resolve(filePath);
      
      if (!fs.existsSync(absPath)) {
        console.error(chalk.red(`❌ File not found: ${filePath}`));
        process.exit(1);
      }

      const content = fs.readFileSync(absPath, 'utf-8');
      const parsed = parseAlign(content);
      
      // Load schema if provided
      let schema = null;
      if (options.schema) {
        const schemaPath = path.resolve(options.schema);
        schema = loadSchema(schemaPath);
        if (schema) {
          console.log(chalk.blue(`📋 Using schema: ${schemaPath}`));
        }
      } else {
        // Try to find align.schema.json in the same directory
        const defaultSchemaPath = path.join(path.dirname(absPath), 'align.schema.json');
        schema = loadSchema(defaultSchemaPath);
        if (schema) {
          console.log(chalk.blue(`📋 Using schema: ${defaultSchemaPath}`));
        }
      }
      
      const errors = validateConfig(parsed, options.base, schema);

      if (errors.length > 0) {
        console.log(chalk.red('❌ Validation failed:\n'));
        errors.forEach(err => console.log(chalk.red(`- ${err}`)));
        process.exit(1);
      } else {
        console.log(chalk.green('✅ Validation passed: config is valid!'));
        console.log(chalk.gray(`Found ${Object.keys(parsed).length} configuration keys`));
      }
    } catch (err) {
      console.error(chalk.red('❌ Parse error:'), err.message);
      process.exit(1);
    }
  });

// BUILD COMMAND
program
  .command('build')
  .description('Build merged configuration from base and environment files')
  .requiredOption('--env <environment>', 'Environment name (e.g., dev, prod)')
  .option('--out <file>', 'Output file path', './output/config.json')
  .option('--config-dir <dir>', 'Configuration directory', './config')
  .option('--format <format>', 'Output format (json, yaml)', 'json')
  .option('--schema <file>', 'Schema file path (align.schema.json)')
  .option('--k8s-configmap', 'Generate Kubernetes ConfigMap YAML')
  .action((options) => {
    try {
      const configDir = path.resolve(options.configDir);
      const basePath = path.join(configDir, 'base.align');
      const envPath = path.join(configDir, `${options.env}.align`);
      const outPath = path.resolve(options.out);

      // Validate format
      if (!['json', 'yaml', 'env'].includes(options.format)) {
        console.error(chalk.red(`❌ Invalid format: ${options.format}. Supported: json, yaml, env`));
        process.exit(1);
      }

      // Check if config directory exists
      if (!fs.existsSync(configDir)) {
        console.error(chalk.red(`❌ Config directory not found: ${options.configDir}`));
        process.exit(1);
      }

      // Load schema if provided
      let schema = null;
      if (options.schema) {
        const schemaPath = path.resolve(options.schema);
        schema = loadSchema(schemaPath);
        if (schema) {
          console.log(chalk.blue(`📋 Using schema: ${schemaPath}`));
        }
      } else {
        // Try to find align.schema.json in config directory
        const defaultSchemaPath = path.join(configDir, 'align.schema.json');
        schema = loadSchema(defaultSchemaPath);
        if (schema) {
          console.log(chalk.blue(`📋 Using schema: ${defaultSchemaPath}`));
        }
      }

      // Load and parse base config
      if (!fs.existsSync(basePath)) {
        console.error(chalk.red(`❌ Base config not found: ${basePath}`));
        process.exit(1);
      }

      console.log(chalk.blue(`📁 Loading base config: ${basePath}`));
      const baseContent = fs.readFileSync(basePath, 'utf-8');
      const baseConfig = parseAlign(baseContent);
      const baseErrors = validateConfig(baseConfig, true, schema); // Base config validation
      
      if (baseErrors.length > 0) {
        console.error(chalk.red('❌ Base config validation failed:'));
        baseErrors.forEach(err => console.log(chalk.red(`- ${err}`)));
        process.exit(1);
      }

      // Load and parse environment config
      if (!fs.existsSync(envPath)) {
        console.error(chalk.red(`❌ Environment config not found: ${envPath}`));
        process.exit(1);
      }

      console.log(chalk.blue(`📁 Loading environment config: ${envPath}`));
      const envContent = fs.readFileSync(envPath, 'utf-8');
      const envConfig = parseAlign(envContent);
      const envErrors = validateConfig(envConfig, false, schema); // Environment config validation
      
      if (envErrors.length > 0) {
        console.error(chalk.red('❌ Environment config validation failed:'));
        envErrors.forEach(err => console.log(chalk.red(`- ${err}`)));
        process.exit(1);
      }

      // Merge configs
      console.log(chalk.blue('🔄 Merging configurations...'));
      const mergedConfig = mergeConfigs(baseConfig, envConfig);

      // Validate merged config against schema
      if (schema) {
        const mergedErrors = validateConfig(mergedConfig, false, schema);
        if (mergedErrors.length > 0) {
          console.error(chalk.red('❌ Merged config validation failed:'));
          mergedErrors.forEach(err => console.log(chalk.red(`- ${err}`)));
          process.exit(1);
        }
      }

      // Ensure output directory exists
      const outDir = path.dirname(outPath);
      if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
      }

      // Generate output based on format
      let output;
      let fileExtension;
      
      if (options.format === 'yaml') {
        output = yaml.dump(mergedConfig, { indent: 2 });
        fileExtension = '.yaml';
      } else if (options.format === 'env') {
        // Convert to .env format
        output = Object.entries(mergedConfig)
          .map(([key, value]) => {
            // Convert key to UPPER_CASE format
            const envKey = key.toUpperCase().replace(/[^A-Z0-9_]/g, '_');
            
            // Handle different value types
            if (typeof value === 'string') {
              return `${envKey}="${value}"`;
            } else if (typeof value === 'boolean') {
              return `${envKey}=${value}`;
            } else if (typeof value === 'number') {
              return `${envKey}=${value}`;
            } else if (Array.isArray(value)) {
              return `${envKey}="${value.join(',')}"`;
            } else {
              return `${envKey}="${String(value)}"`;
            }
          })
          .join('\n');
        fileExtension = '.env';
      } else {
        output = JSON.stringify(mergedConfig, null, 2);
        fileExtension = '.json';
      }

      // Update output path if format doesn't match extension
      const finalOutPath = outPath.endsWith(fileExtension) ? outPath : outPath.replace(/\.[^.]+$/, fileExtension);
      
      fs.writeFileSync(finalOutPath, output);

      console.log(chalk.green('✅ Configuration built successfully!'));
      console.log(chalk.gray(`📄 Output: ${finalOutPath}`));
      console.log(chalk.gray(`📊 Keys: ${Object.keys(mergedConfig).length}`));
      console.log(chalk.gray(`📋 Format: ${options.format.toUpperCase()}`));
      
      // Show what was overridden
      const overriddenKeys = Object.keys(envConfig);
      if (overriddenKeys.length > 0) {
        console.log(chalk.yellow(`🔄 Overridden keys: ${overriddenKeys.join(', ')}`));
      }

      // Generate Kubernetes ConfigMap if requested
      if (options.k8sConfigmap) {
        const configMapYaml = generateK8sConfigMap(mergedConfig, options.env);
        const configMapPath = finalOutPath.replace(/\.[^.]+$/, '.configmap.yaml');
        
        fs.writeFileSync(configMapPath, configMapYaml);
        console.log(chalk.blue(`📄 ConfigMap: ${configMapPath}`));
      }

    } catch (err) {
      console.error(chalk.red('❌ Build error:'), err.message);
      process.exit(1);
    }
  });

// DRY-RUN COMMAND
program
  .command('dry-run')
  .description('Simulate configuration changes without applying them')
  .requiredOption('--env <environment>', 'Environment name (e.g., dev, prod)')
  .requiredOption('--key <key>', 'Configuration key to simulate')
  .requiredOption('--value <value>', 'New value to simulate')
  .option('--config-dir <dir>', 'Configuration directory', './config')
  .action((options) => {
    try {
      const configDir = path.resolve(options.configDir);
      const basePath = path.join(configDir, 'base.align');
      const envPath = path.join(configDir, `${options.env}.align`);

      // Check if config directory exists
      if (!fs.existsSync(configDir)) {
        console.error(chalk.red(`❌ Config directory not found: ${options.configDir}`));
        process.exit(1);
      }

      // Load and parse base config
      if (!fs.existsSync(basePath)) {
        console.error(chalk.red(`❌ Base config not found: ${basePath}`));
        process.exit(1);
      }

      const baseContent = fs.readFileSync(basePath, 'utf-8');
      const baseConfig = parseAlign(baseContent);

      // Load and parse environment config
      if (!fs.existsSync(envPath)) {
        console.error(chalk.red(`❌ Environment config not found: ${envPath}`));
        process.exit(1);
      }

      const envContent = fs.readFileSync(envPath, 'utf-8');
      const envConfig = parseAlign(envContent);

      // Parse the new value with proper type conversion
      let newValue = options.value;
      
      // Handle booleans
      if (newValue === 'true' || newValue === 'false') {
        newValue = newValue === 'true';
      } else if (newValue === '1' || newValue === '0') {
        newValue = newValue === '1';
      } else if (newValue === 'yes' || newValue === 'no') {
        newValue = newValue === 'yes';
      }
      // Handle numbers
      else if (!isNaN(Number(newValue)) && newValue !== '') {
        newValue = Number(newValue);
      }
      // Otherwise keep as string

      // Get current merged config
      const currentConfig = mergeConfigs(baseConfig, envConfig);
      const currentValue = currentConfig[options.key];

      // Simulate the change
      const simulatedEnvConfig = { ...envConfig, [options.key]: newValue };
      const simulatedConfig = mergeConfigs(baseConfig, simulatedEnvConfig);
      const simulatedValue = simulatedConfig[options.key];

      console.log(chalk.blue('🔍 DRY RUN: Simulating configuration change'));
      console.log(chalk.gray(`Environment: ${options.env}`));
      console.log(chalk.gray(`Key: ${options.key}`));
      console.log(chalk.gray(`New value: ${JSON.stringify(newValue)}`));
      console.log('');

      // Show what would change
      if (currentValue === undefined) {
        console.log(chalk.green(`➕ Would add new key: ${options.key} = ${JSON.stringify(simulatedValue)}`));
      } else if (currentValue !== simulatedValue) {
        console.log(chalk.yellow(`🔄 Would change: ${options.key}`));
        console.log(chalk.red(`  From: ${JSON.stringify(currentValue)}`));
        console.log(chalk.green(`  To:   ${JSON.stringify(simulatedValue)}`));
      } else {
        console.log(chalk.gray(`ℹ️  No change: ${options.key} already equals ${JSON.stringify(simulatedValue)}`));
      }

      // Show which file would be affected
      if (baseConfig[options.key] !== undefined) {
        console.log(chalk.gray(`📁 Would override base.align value`));
      } else {
        console.log(chalk.gray(`📁 Would add to ${options.env}.align`));
      }

    } catch (err) {
      console.error(chalk.red('❌ Dry-run error:'), err.message);
      process.exit(1);
    }
  });

// EXPLAIN COMMAND
program
  .command('explain')
  .description('Trace where a configuration value came from')
  .requiredOption('--key <key>', 'Configuration key to trace')
  .requiredOption('--env <environment>', 'Environment name (e.g., dev, prod)')
  .option('--config-dir <dir>', 'Configuration directory', './config')
  .action((options) => {
    try {
      const configDir = path.resolve(options.configDir);
      const basePath = path.join(configDir, 'base.align');
      const envPath = path.join(configDir, `${options.env}.align`);

      // Check if config directory exists
      if (!fs.existsSync(configDir)) {
        console.error(chalk.red(`❌ Config directory not found: ${options.configDir}`));
        process.exit(1);
      }

      // Load and parse base config
      if (!fs.existsSync(basePath)) {
        console.error(chalk.red(`❌ Base config not found: ${basePath}`));
        process.exit(1);
      }

      const baseContent = fs.readFileSync(basePath, 'utf-8');
      const baseConfig = parseAlign(baseContent);

      // Load and parse environment config
      if (!fs.existsSync(envPath)) {
        console.error(chalk.red(`❌ Environment config not found: ${envPath}`));
        process.exit(1);
      }

      const envContent = fs.readFileSync(envPath, 'utf-8');
      const envConfig = parseAlign(envContent);

      // Get merged config
      const mergedConfig = mergeConfigs(baseConfig, envConfig);
      const finalValue = mergedConfig[options.key];

      console.log(chalk.blue(`🔍 EXPLAIN: Tracing configuration key`));
      console.log(chalk.gray(`Key: ${options.key}`));
      console.log(chalk.gray(`Environment: ${options.env}`));
      console.log('');

      if (finalValue === undefined) {
        console.log(chalk.red(`❌ Key '${options.key}' not found in configuration`));
        console.log(chalk.gray(`Available keys: ${Object.keys(mergedConfig).join(', ')}`));
        process.exit(1);
      }

      console.log(chalk.green(`📊 Final value: ${JSON.stringify(finalValue)}`));
      console.log('');

      // Trace the origin
      const baseValue = baseConfig[options.key];
      const envValue = envConfig[options.key];

      if (baseValue !== undefined && envValue !== undefined) {
        // Overridden from base
        console.log(chalk.yellow(`🧱 Defined in: base.align = ${JSON.stringify(baseValue)}`));
        console.log(chalk.blue(`♻️  Overridden by: ${options.env}.align = ${JSON.stringify(envValue)}`));
        console.log(chalk.gray(`📁 File: ${envPath}`));
      } else if (baseValue !== undefined) {
        // Only in base
        console.log(chalk.green(`🧱 Defined in: base.align = ${JSON.stringify(baseValue)}`));
        console.log(chalk.gray(`📁 File: ${basePath}`));
      } else if (envValue !== undefined) {
        // Only in environment
        console.log(chalk.blue(`➕ Added in: ${options.env}.align = ${JSON.stringify(envValue)}`));
        console.log(chalk.gray(`📁 File: ${envPath}`));
      }

    } catch (err) {
      console.error(chalk.red('❌ Explain error:'), err.message);
      process.exit(1);
    }
  });

// DIFF COMMAND
program
  .command('diff')
  .description('Compare configurations between two environments')
  .requiredOption('--env1 <environment>', 'First environment name')
  .requiredOption('--env2 <environment>', 'Second environment name')
  .option('--config-dir <dir>', 'Configuration directory', './config')
  .option('--schema <file>', 'Schema file path (align.schema.json)')
  .action((options) => {
    try {
      const configDir = path.resolve(options.configDir);
      const basePath = path.join(configDir, 'base.align');

      // Check if config directory exists
      if (!fs.existsSync(configDir)) {
        console.error(chalk.red(`❌ Config directory not found: ${options.configDir}`));
        process.exit(1);
      }

      // Load schema if provided
      let schema = null;
      if (options.schema) {
        const schemaPath = path.resolve(options.schema);
        schema = loadSchema(schemaPath);
        if (schema) {
          console.log(chalk.blue(`📋 Using schema: ${schemaPath}`));
        }
      } else {
        // Try to find align.schema.json in config directory
        const defaultSchemaPath = path.join(configDir, 'align.schema.json');
        schema = loadSchema(defaultSchemaPath);
        if (schema) {
          console.log(chalk.blue(`📋 Using schema: ${defaultSchemaPath}`));
        }
      }

      // Load and parse base config
      if (!fs.existsSync(basePath)) {
        console.error(chalk.red(`❌ Base config not found: ${basePath}`));
        process.exit(1);
      }

      const baseContent = fs.readFileSync(basePath, 'utf-8');
      const baseConfig = parseAlign(baseContent);

      // Load and parse environment configs
      const env1Path = path.join(configDir, `${options.env1}.align`);
      const env2Path = path.join(configDir, `${options.env2}.align`);

      if (!fs.existsSync(env1Path)) {
        console.error(chalk.red(`❌ Environment config not found: ${env1Path}`));
        process.exit(1);
      }

      if (!fs.existsSync(env2Path)) {
        console.error(chalk.red(`❌ Environment config not found: ${env2Path}`));
        process.exit(1);
      }

      const env1Content = fs.readFileSync(env1Path, 'utf-8');
      const env2Content = fs.readFileSync(env2Path, 'utf-8');
      
      const env1Config = parseAlign(env1Content);
      const env2Config = parseAlign(env2Content);

      // Merge configs
      const config1 = mergeConfigs(baseConfig, env1Config);
      const config2 = mergeConfigs(baseConfig, env2Config);

      // Get all unique keys
      const allKeys = new Set([...Object.keys(config1), ...Object.keys(config2)]);
      const sortedKeys = Array.from(allKeys).sort();

      console.log(chalk.blue(`🔍 DIFF: Comparing ${options.env1} vs ${options.env2}`));
      console.log('');

      let hasDifferences = false;

      for (const key of sortedKeys) {
        const value1 = config1[key];
        const value2 = config2[key];

        if (value1 !== value2) {
          hasDifferences = true;
          
          if (value1 === undefined) {
            console.log(chalk.green(`➕ ${key}: ${JSON.stringify(value2)} (only in ${options.env2})`));
          } else if (value2 === undefined) {
            console.log(chalk.red(`➖ ${key}: ${JSON.stringify(value1)} (only in ${options.env1})`));
          } else {
            console.log(chalk.yellow(`🔄 ${key}:`));
            console.log(chalk.red(`  ${options.env1}: ${JSON.stringify(value1)}`));
            console.log(chalk.green(`  ${options.env2}: ${JSON.stringify(value2)}`));
          }
        }
      }

      if (!hasDifferences) {
        console.log(chalk.gray('✅ No differences found between environments'));
      }

    } catch (err) {
      console.error(chalk.red('❌ Diff error:'), err.message);
      process.exit(1);
    }
  });

// SMART ANALYSIS COMMAND
program
  .command('analyze')
  .description('Smart analysis of configuration with security, performance, and best practice recommendations')
  .option('--config-dir <dir>', 'Configuration directory', './config')
  .option('--env <environment>', 'Environment to analyze (dev, prod, staging)', 'prod')
  .option('--detailed', 'Show detailed analysis with explanations')
  .option('--format <format>', 'Output format (text, json)', 'text')
  .action(async (options) => {
    try {
      const configDir = path.resolve(options.configDir);
      const env = options.env;
      
      console.log(chalk.blue(`🔍 Smart Analysis: ${env} environment`));
      console.log(chalk.gray(`📁 Config directory: ${configDir}\n`));

      // Load and merge configuration
      const baseConfig = await loadConfig(path.join(configDir, 'base.align'), false);
      const envConfig = await loadConfig(path.join(configDir, `${env}.align`), false);
      const mergedConfig = mergeConfigs(baseConfig, envConfig);

      // Perform comprehensive analysis
      const analysis = performSmartAnalysis(mergedConfig, env, options.detailed);

      // Output results
      if (options.format === 'json') {
        console.log(JSON.stringify(analysis, null, 2));
      } else {
        displayAnalysisResults(analysis, options.detailed);
      }

    } catch (err) {
      console.error(chalk.red('❌ Analysis error:'), err.message);
      process.exit(1);
    }
  });

// Helper function to generate Kubernetes ConfigMap YAML
function generateK8sConfigMap(config, environment) {
  const appName = config.app_name || 'myapp';
  const namespace = config.namespace || 'default';
  
  // Convert config to environment variables format
  const data = {};
  for (const [key, value] of Object.entries(config)) {
    // Skip internal keys and convert to uppercase
    if (!key.startsWith('_')) {
      const envKey = key.toUpperCase().replace(/[^A-Z0-9]/g, '_');
      data[envKey] = typeof value === 'string' ? value : JSON.stringify(value);
    }
  }
  
  return `apiVersion: v1
kind: ConfigMap
metadata:
  name: ${appName}-config-${environment}
  namespace: ${namespace}
  labels:
    app: ${appName}
    environment: ${environment}
data:
${Object.entries(data).map(([key, value]) => `  ${key}: "${value}"`).join('\n')}`;
}

// Helper function to load configuration
async function loadConfig(filePath, isBaseConfig = false) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const config = parseAlign(content);
    
    // Validate the config (skip required field validation for analysis)
    const errors = validateConfig(config, false);
    if (errors.length > 0) {
      throw new Error(`Configuration validation failed: ${errors.join(', ')}`);
    }
    
    return config;
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new Error(`Configuration file not found: ${filePath}`);
    }
    throw err;
  }
}

// Display analysis results
function displayAnalysisResults(analysis, detailed = false) {
  const { summary, security, performance, bestPractices, environment } = analysis;

  // Summary
  console.log(chalk.blue('📊 Analysis Summary:'));
  console.log(chalk.gray(`  Total Issues: ${summary.totalIssues}`));
  console.log(chalk.red(`  Security Issues: ${summary.securityIssues}`));
  console.log(chalk.yellow(`  Performance Issues: ${summary.performanceIssues}`));
  console.log(chalk.cyan(`  Best Practice Issues: ${summary.bestPracticeIssues}`));
  console.log(chalk.green(`  Good Practices: ${summary.goodPractices}`));
  console.log('');

  // Critical Security Issues
  if (security.critical.length > 0) {
    console.log(chalk.red('🚨 Critical Security Issues:'));
    security.critical.forEach((issue, index) => {
      console.log(chalk.red(`  ${index + 1}. ${issue.issue}`));
      console.log(chalk.gray(`     ${issue.description}`));
      if (detailed) {
        console.log(chalk.gray(`     Impact: ${issue.impact}`));
        if (issue.fix) {
          console.log(chalk.green(`     Fix: ${issue.fix}`));
        }
      }
      console.log(chalk.blue(`     Recommendation: ${issue.recommendation}`));
      console.log('');
    });
  }

  // Security Warnings
  if (security.warnings.length > 0) {
    console.log(chalk.yellow('⚠️  Security Warnings:'));
    security.warnings.forEach((issue, index) => {
      console.log(chalk.yellow(`  ${index + 1}. ${issue.issue}`));
      console.log(chalk.gray(`     ${issue.description}`));
      if (detailed) {
        console.log(chalk.gray(`     Impact: ${issue.impact}`));
      }
      console.log(chalk.blue(`     Recommendation: ${issue.recommendation}`));
      console.log('');
    });
  }

  // Performance Issues
  if (performance.issues.length > 0) {
    console.log(chalk.cyan('⚡ Performance Issues:'));
    performance.issues.forEach((issue, index) => {
      console.log(chalk.cyan(`  ${index + 1}. ${issue.issue}`));
      console.log(chalk.gray(`     ${issue.description}`));
      if (detailed) {
        console.log(chalk.gray(`     Impact: ${issue.impact}`));
        if (issue.fix) {
          console.log(chalk.green(`     Fix: ${issue.fix}`));
        }
      }
      console.log(chalk.blue(`     Recommendation: ${issue.recommendation}`));
      console.log('');
    });
  }

  // Best Practice Issues
  if (bestPractices.missing.length > 0) {
    console.log(chalk.magenta('📋 Missing Best Practices:'));
    bestPractices.missing.forEach((issue, index) => {
      console.log(chalk.magenta(`  ${index + 1}. ${issue.issue}`));
      console.log(chalk.gray(`     ${issue.description}`));
      if (detailed) {
        console.log(chalk.gray(`     Impact: ${issue.impact}`));
        if (issue.fix) {
          console.log(chalk.green(`     Fix: ${issue.fix}`));
        }
      }
      console.log(chalk.blue(`     Recommendation: ${issue.recommendation}`));
      console.log('');
    });
  }

  // Environment-Specific Issues
  if (environment.specific.length > 0) {
    console.log(chalk.blue('🌍 Environment-Specific Issues:'));
    environment.specific.forEach((issue, index) => {
      console.log(chalk.blue(`  ${index + 1}. ${issue.issue}`));
      console.log(chalk.gray(`     ${issue.description}`));
      if (detailed) {
        console.log(chalk.gray(`     Impact: ${issue.impact}`));
      }
      console.log(chalk.blue(`     Recommendation: ${issue.recommendation}`));
      console.log('');
    });
  }

  // Good Practices
  if (bestPractices.goodPractices.length > 0) {
    console.log(chalk.green('✅ Good Practices Found:'));
    bestPractices.goodPractices.forEach((practice, index) => {
      console.log(chalk.green(`  ${index + 1}. ${practice}`));
    });
    console.log('');
  }

  // Overall Assessment
  if (summary.totalIssues === 0) {
    console.log(chalk.green('🎉 Excellent! Your configuration looks great!'));
  } else if (summary.totalIssues <= 3) {
    console.log(chalk.yellow('👍 Good configuration with a few minor issues to address.'));
  } else if (summary.totalIssues <= 7) {
    console.log(chalk.orange('⚠️  Configuration has several issues that should be addressed.'));
  } else {
    console.log(chalk.red('🚨 Configuration has many issues that need immediate attention.'));
  }

  console.log('');
  console.log(chalk.gray('💡 Use --detailed flag for more information about each issue.'));
}

program.parse();
