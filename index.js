#!/usr/bin/env node
const { 
  parseAlign, 
  validateConfig, 
  mergeConfigs, 
  loadSchema, 
  performSmartAnalysis,
  discoverPackageSchemas,
  mergePackageSchemas,
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
  validatePolicies,
  loadPolicies,
  suggestPolicies,
  inferSchema,
  inferSchemaFromFiles,
  diagnoseConfig,
  // Module-specific configuration functions
  extractModuleConfig,
  discoverModuleSchemas,
  generateModuleConfig,
  validateModuleConfig
} = require('./parser');
const { Command } = require('commander');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const inquirer = require('inquirer');

const program = new Command();
program.name('align').description('Align config CLI').version('1.0.2');

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
  .option('--include-packages', 'Include package schemas from node_modules')
  .option('--project-dir <dir>', 'Project root directory (for package discovery)', '.')
  .action((filePath, options) => {
    try {
      const absPath = path.resolve(filePath);
      
      if (!fs.existsSync(absPath)) {
        console.error(chalk.red(`❌ File not found: ${filePath}`));
        process.exit(1);
      }

      const content = fs.readFileSync(absPath, 'utf-8');
      const parsed = parseAlign(content);
      
      // Load project schema if provided
      let projectSchema = null;
      if (options.schema) {
        const schemaPath = path.resolve(options.schema);
        projectSchema = loadSchema(schemaPath);
        if (projectSchema) {
          console.log(chalk.blue(`📋 Using project schema: ${schemaPath}`));
        }
      } else {
        // Try to find align.schema.json in the same directory
        const defaultSchemaPath = path.join(path.dirname(absPath), 'align.schema.json');
        projectSchema = loadSchema(defaultSchemaPath);
        if (projectSchema) {
          console.log(chalk.blue(`📋 Using project schema: ${defaultSchemaPath}`));
        }
      }
      
      // Load package schemas if requested
      let packageSchemas = {};
      if (options.includePackages) {
        const projectDir = path.resolve(options.projectDir);
        packageSchemas = discoverPackageSchemas(projectDir);
        
        if (Object.keys(packageSchemas).length > 0) {
          console.log(chalk.blue(`📦 Found ${Object.keys(packageSchemas).length} package schemas:`));
          Object.keys(packageSchemas).forEach(pkg => {
            console.log(chalk.gray(`  - ${pkg}`));
          });
        } else {
          console.log(chalk.gray(`📦 No package schemas found in ${projectDir}/node_modules`));
        }
      }
      
      // Validate with merged schemas
      const errors = validateWithPackageSchemas(parsed, projectSchema || {}, packageSchemas);

      if (errors.length > 0) {
        console.log(chalk.red('❌ Validation failed:\n'));
        errors.forEach(err => console.log(chalk.red(`- ${err}`)));
        process.exit(1);
      } else {
        console.log(chalk.green('✅ Validation passed: config is valid!'));
        console.log(chalk.gray(`Found ${Object.keys(parsed).length} configuration keys`));
        
        if (options.includePackages && Object.keys(packageSchemas).length > 0) {
          console.log(chalk.gray(`Validated against ${Object.keys(packageSchemas).length} package schemas`));
        }
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
  .option('--format <format>', 'Output format (json, yaml, env, python, toml, properties, hcl, ini, xml)', 'json')
  .option('--schema <file>', 'Schema file path (align.schema.json)')
  .option('--k8s-configmap', 'Generate Kubernetes ConfigMap YAML')
  .action((options) => {
    try {
      const configDir = path.resolve(options.configDir);
      const basePath = path.join(configDir, 'base.align');
      const envPath = path.join(configDir, `${options.env}.align`);
      const outPath = path.resolve(options.out);

      // Validate format
      const supportedFormats = ['json', 'yaml', 'env', 'python', 'toml', 'properties', 'hcl', 'ini', 'xml'];
      if (!supportedFormats.includes(options.format)) {
        console.error(chalk.red(`❌ Invalid format: ${options.format}. Supported: ${supportedFormats.join(', ')}`));
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
      } else if (options.format === 'python') {
        output = exportToPython(mergedConfig);
        fileExtension = '.py';
      } else if (options.format === 'toml') {
        output = exportToTOML(mergedConfig);
        fileExtension = '.toml';
      } else if (options.format === 'properties') {
        output = exportToProperties(mergedConfig);
        fileExtension = '.properties';
      } else if (options.format === 'hcl') {
        output = exportToHCL(mergedConfig);
        fileExtension = '.tf';
      } else if (options.format === 'ini') {
        output = exportToINI(mergedConfig);
        fileExtension = '.ini';
      } else if (options.format === 'xml') {
        output = exportToXML(mergedConfig);
        fileExtension = '.xml';
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
  .description('Debug configuration values with step-by-step trace showing override path')
  .requiredOption('--key <key>', 'Configuration key to trace')
  .requiredOption('--env <environment>', 'Environment name (e.g., dev, prod)')
  .option('--config-dir <dir>', 'Configuration directory', './config')
  .option('--project-dir <dir>', 'Project root directory (for package schemas)', '.')
  .option('--include-packages', 'Include package schema information')
  .action(async (options) => {
    try {
      const configDir = path.resolve(options.configDir);
      const projectDir = path.resolve(options.projectDir);
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

      // Load package schemas if requested
      if (options.includePackages) {
        const packageSchemas = discoverPackageSchemas(projectDir);
        const projectSchema = loadSchema(path.join(configDir, 'align.schema.json')) || {};
        const mergedSchemas = mergePackageSchemas(projectSchema, packageSchemas);
        const explanation = explainConfigValue(options.key, mergedConfig, mergedSchemas);
        
        if (explanation.package) {
          console.log(chalk.cyan(`📦 Package: ${explanation.package}`));
        }
        
        if (explanation.namespace) {
          console.log(chalk.cyan(`🏷️  Namespace: ${explanation.namespace}`));
        }
        
        if (explanation.validation) {
          console.log(chalk.gray(`🔍 Validation:`));
          console.log(chalk.gray(`  Type: ${explanation.validation.type}`));
          console.log(chalk.gray(`  Required: ${explanation.validation.required}`));
          if (explanation.validation.default !== undefined) {
            console.log(chalk.gray(`  Default: ${explanation.validation.default}`));
          }
        }
        console.log('');
      }

      // Enhanced trace showing step-by-step resolution
      console.log(chalk.blue(`🔍 Config Trace for key: "${options.key}" in env: "${options.env}"`));
      console.log('');

      const baseValue = baseConfig[options.key];
      const envValue = envConfig[options.key];

      // Step 1: Base config
      if (baseValue !== undefined) {
        console.log(chalk.gray(`1. base.align         → ${options.key} = ${JSON.stringify(baseValue)}`));
      } else {
        console.log(chalk.gray(`1. base.align         → (not defined)`));
      }

      // Step 2: Environment config
      if (envValue !== undefined) {
        if (baseValue !== undefined) {
          console.log(chalk.gray(`2. ${options.env}.align      → ${options.key} = ${JSON.stringify(envValue)} ✅ ACTIVE VALUE`));
        } else {
          console.log(chalk.gray(`2. ${options.env}.align      → ${options.key} = ${JSON.stringify(envValue)} ✅ ACTIVE VALUE`));
        }
      } else {
        if (baseValue !== undefined) {
          console.log(chalk.gray(`2. ${options.env}.align      → (no override)`));
          console.log(chalk.gray(`   → ${options.key} = ${JSON.stringify(baseValue)} ✅ ACTIVE VALUE`));
        } else {
          console.log(chalk.gray(`2. ${options.env}.align      → (not defined)`));
        }
      }

      console.log('');
      
      // Additional context
      if (baseValue !== undefined && envValue !== undefined) {
        console.log(chalk.yellow(`💡 Override detected: Value changed from ${JSON.stringify(baseValue)} to ${JSON.stringify(envValue)}`));
      } else if (baseValue !== undefined && envValue === undefined) {
        console.log(chalk.green(`💡 Inherited: Value from base.align is being used`));
      } else if (baseValue === undefined && envValue !== undefined) {
        console.log(chalk.blue(`💡 Environment-specific: Value only defined in ${options.env}.align`));
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

program
  .command('diagnose')
  .description('Diagnose configuration environment for issues and inconsistencies')
  .option('--config-dir <dir>', 'Configuration directory to analyze', './config')
  .option('--project-dir <dir>', 'Project root directory to scan', '.')
  .option('--detailed', 'Show detailed analysis with file paths')
  .option('--format <format>', 'Output format (text, json)', 'text')
  .option('--generate-plan', 'Generate migration plan for align repair')
  .action((options) => {
    try {
      const { diagnoseConfig } = require('./parser.js');
      const projectDir = path.resolve(options.projectDir);
      const configDir = path.resolve(options.configDir);
      
      console.log(chalk.blue('🔍 Diagnosing configuration environment...'));
      console.log(chalk.gray(`📁 Project directory: ${projectDir}`));
      console.log(chalk.gray(`📁 Config directory: ${configDir}`));
      console.log('');

      const diagnosis = diagnoseConfig(projectDir, configDir, options.detailed);
      
      if (options.format === 'json') {
        console.log(JSON.stringify(diagnosis, null, 2));
      } else {
        displayDiagnosisResults(diagnosis, options.generatePlan);
      }

      // Exit with appropriate code
      if (diagnosis.criticalIssues.length > 0) {
        process.exit(1);
      } else if (diagnosis.warnings.length > 0) {
        process.exit(0);
      } else {
        process.exit(0);
      }
    } catch (err) {
      console.error(chalk.red('❌ Diagnosis error:'), err.message);
      process.exit(1);
    }
  });

program
  .command('repair')
  .description('Automatically fix configuration issues with safety features')
  .option('--config-dir <dir>', 'Configuration directory to analyze', './config')
  .option('--project-dir <dir>', 'Project root directory to scan', '.')
  .option('--backup', 'Create backup before making changes')
  .option('--dry-run', 'Show what would change without making changes')
  .option('--interactive', 'Ask for confirmation before each change')
  .option('--auto', 'Automatically apply all safe fixes')
  .option('--analyze-only', 'Show detailed migration plan without changes')
  .option('--rollback', 'Restore from backup (use with --backup-dir)')
  .option('--backup-dir <dir>', 'Backup directory for rollback')
  .option('--fix-types', 'Only fix type safety issues')
  .option('--consolidate-configs', 'Only consolidate scattered configs')
  .option('--fix-security', 'Only fix security issues')
  .option('--detailed', 'Show detailed information about changes')
  .action((options) => {
    try {
      const { repairConfig } = require('./parser.js');
      const projectDir = path.resolve(options.projectDir);
      const configDir = path.resolve(options.configDir);
      
      console.log(chalk.blue('🔧 Align Repair - Configuration Migration Tool'));
      console.log(chalk.gray(`📁 Project directory: ${projectDir}`));
      console.log(chalk.gray(`📁 Config directory: ${configDir}`));
      console.log('');

      // Handle rollback
      if (options.rollback) {
        if (!options.backupDir) {
          console.error(chalk.red('❌ Error: --backup-dir required for rollback'));
          process.exit(1);
        }
        
        const rollbackResult = repairConfig.rollback(options.backupDir);
        if (rollbackResult.success) {
          console.log(chalk.green('✅ Rollback completed successfully!'));
        } else {
          console.error(chalk.red('❌ Rollback failed:'), rollbackResult.error);
          process.exit(1);
        }
        return;
      }

      // Run repair with safety options
      const repairResult = repairConfig(projectDir, configDir, options);
      
      if (repairResult.success) {
        console.log(chalk.green('✅ Repair completed successfully!'));
        
        if (repairResult.backupCreated) {
          console.log(chalk.cyan(`📦 Backup created: ${repairResult.backupDir}`));
          console.log(chalk.gray('💡 Use "align repair --rollback --backup-dir=' + repairResult.backupDir + '" to undo'));
        }
        
        if (repairResult.changesMade) {
          console.log(chalk.green(`📝 ${repairResult.changesMade} changes applied`));
        }
        
        if (repairResult.filesCreated) {
          console.log(chalk.green(`📁 ${repairResult.filesCreated} files created`));
        }
      } else {
        console.error(chalk.red('❌ Repair failed:'), repairResult.error);
        process.exit(1);
      }

    } catch (err) {
      console.error(chalk.red('❌ Repair error:'), err.message);
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

// Helper function to display diagnosis results
function displayDiagnosisResults(diagnosis, generatePlan = false) {
  const { criticalIssues, warnings, recommendations, summary, migrationPlan } = diagnosis;
  
  // Display summary
  console.log(chalk.blue('📊 Diagnosis Summary:'));
  console.log(chalk.gray(`  Total Issues: ${criticalIssues.length + warnings.length}`));
  console.log(chalk.red(`  Critical Issues: ${criticalIssues.length}`));
  console.log(chalk.yellow(`  Warnings: ${warnings.length}`));
  console.log(chalk.green(`  Recommendations: ${recommendations.length}`));
  console.log('');

  // Display critical issues
  if (criticalIssues.length > 0) {
    console.log(chalk.red('🚨 Critical Issues:'));
    criticalIssues.forEach((issue, index) => {
      console.log(chalk.red(`  ${index + 1}. ${issue.title}`));
      console.log(chalk.gray(`     ${issue.description}`));
      if (issue.impact) {
        console.log(chalk.gray(`     Impact: ${issue.impact}`));
      }
      if (issue.files && issue.files.length > 0) {
        console.log(chalk.gray(`     Files: ${issue.files.join(', ')}`));
      }
      console.log('');
    });
  }

  // Display warnings
  if (warnings.length > 0) {
    console.log(chalk.yellow('⚠️  Warnings:'));
    warnings.forEach((warning, index) => {
      console.log(chalk.yellow(`  ${index + 1}. ${warning.title}`));
      console.log(chalk.gray(`     ${warning.description}`));
      if (warning.impact) {
        console.log(chalk.gray(`     Impact: ${warning.impact}`));
      }
      if (warning.files && warning.files.length > 0) {
        console.log(chalk.gray(`     Files: ${warning.files.join(', ')}`));
      }
      console.log('');
    });
  }

  // Display recommendations
  if (recommendations.length > 0) {
    console.log(chalk.green('✅ Recommendations:'));
    recommendations.forEach((rec, index) => {
      console.log(chalk.green(`  ${index + 1}. ${rec.title}`));
      console.log(chalk.gray(`     ${rec.description}`));
      if (rec.command) {
        console.log(chalk.cyan(`     Command: ${rec.command}`));
      }
      console.log('');
    });
  }

  // Display migration plan if requested
  if (generatePlan && migrationPlan) {
    console.log(chalk.blue('📋 Migration Plan:'));
    console.log(chalk.gray('  Run "align repair" to automatically fix these issues:'));
    console.log('');
    
    if (migrationPlan.consolidateFiles) {
      console.log(chalk.cyan('  📁 Consolidate scattered configs:'));
      migrationPlan.consolidateFiles.forEach(file => {
        console.log(chalk.gray(`    - ${file.source} → ${file.target}`));
      });
      console.log('');
    }

    if (migrationPlan.fixTypes) {
      console.log(chalk.cyan('  🔧 Fix type issues:'));
      migrationPlan.fixTypes.forEach(fix => {
        console.log(chalk.gray(`    - ${fix.key}: "${fix.current}" → ${fix.fixed}`));
      });
      console.log('');
    }

    if (migrationPlan.securityFixes) {
      console.log(chalk.cyan('  🔒 Fix security issues:'));
      migrationPlan.securityFixes.forEach(fix => {
        console.log(chalk.gray(`    - ${fix.issue}: ${fix.fix}`));
      });
      console.log('');
    }

    if (migrationPlan.createEnvironments) {
      console.log(chalk.cyan('  📋 Create environment structure:'));
      migrationPlan.createEnvironments.forEach(env => {
        console.log(chalk.gray(`    - ${env.file} with ${env.keys.length} keys`));
      });
      console.log('');
    }
  }

  // Display summary
  console.log(chalk.blue('📈 Summary:'));
  console.log(chalk.gray(`  ${summary.totalFiles} configuration files found`));
  console.log(chalk.gray(`  ${summary.totalKeys} configuration keys analyzed`));
  console.log(chalk.gray(`  ${summary.environments} environments detected`));
  console.log(chalk.gray(`  ${summary.platforms} deployment platforms found`));
  
  if (criticalIssues.length === 0 && warnings.length === 0) {
    console.log(chalk.green('\n✅ No issues found! Your configuration is well-organized.'));
  } else {
    console.log(chalk.yellow('\n💡 Run "align repair" to automatically fix these issues.'));
  }
}

// PACKAGE SCHEMA COMMANDS
program
  .command('discover-packages')
  .description('Discover and list available package schemas from node_modules')
  .option('--project-dir <dir>', 'Project root directory', '.')
  .option('--format <format>', 'Output format (text, json)', 'text')
  .action((options) => {
    try {
      const projectDir = path.resolve(options.projectDir);
      
      console.log(chalk.blue('🔍 Discovering package schemas...'));
      console.log(chalk.gray(`📁 Project directory: ${projectDir}\n`));

      const packageSchemas = discoverPackageSchemas(projectDir);
      const schemas = listAvailableSchemas({}, packageSchemas);
      
      if (options.format === 'json') {
        console.log(JSON.stringify(schemas, null, 2));
      } else {
        console.log(chalk.green('📦 Package Schemas Found:'));
        
        if (Object.keys(schemas.packages).length === 0) {
          console.log(chalk.gray('  No package schemas found in node_modules'));
        } else {
          for (const [packageName, keys] of Object.entries(schemas.packages)) {
            console.log(chalk.cyan(`  ${packageName}:`));
            keys.forEach(key => {
              console.log(chalk.gray(`    - ${key}`));
            });
            console.log('');
          }
        }
        
        console.log(chalk.blue('💡 Packages can provide schemas via:'));
        console.log(chalk.gray('  - align.schema.json file in package root'));
        console.log(chalk.gray('  - "align" field in package.json'));
      }

    } catch (err) {
      console.error(chalk.red('❌ Package discovery error:'), err.message);
      process.exit(1);
    }
  });



program
  .command('list-schemas')
  .description('List all available schemas (project + packages)')
  .option('--config-dir <dir>', 'Configuration directory', './config')
  .option('--project-dir <dir>', 'Project root directory', '.')
  .option('--format <format>', 'Output format (text, json)', 'text')
  .action((options) => {
    try {
      const projectDir = path.resolve(options.projectDir);
      const configDir = path.resolve(options.configDir);
      
      console.log(chalk.blue('📋 Available Schemas:'));
      console.log(chalk.gray(`📁 Project directory: ${projectDir}`));
      console.log(chalk.gray(`📁 Config directory: ${configDir}\n`));

      // Load schemas
      const projectSchema = loadSchema(path.join(configDir, 'align.schema.json')) || {};
      const packageSchemas = discoverPackageSchemas(projectDir);
      const schemas = listAvailableSchemas(projectSchema, packageSchemas);
      
      if (options.format === 'json') {
        console.log(JSON.stringify(schemas, null, 2));
      } else {
        console.log(chalk.green('📁 Project Schema:'));
        if (schemas.project.length === 0) {
          console.log(chalk.gray('  No project schema found'));
        } else {
          schemas.project.forEach(key => {
            console.log(chalk.gray(`  - ${key}`));
          });
        }
        console.log('');
        
        console.log(chalk.green('📦 Package Schemas:'));
        if (Object.keys(schemas.packages).length === 0) {
          console.log(chalk.gray('  No package schemas found'));
        } else {
          for (const [packageName, keys] of Object.entries(schemas.packages)) {
            console.log(chalk.cyan(`  ${packageName}:`));
            keys.forEach(key => {
              console.log(chalk.gray(`    - ${key}`));
            });
            console.log('');
          }
        }
      }

    } catch (err) {
      console.error(chalk.red('❌ Schema listing error:'), err.message);
      process.exit(1);
    }
  });

// POLICY VALIDATION COMMANDS
program
  .command('validate-policies')
  .description('Validate configuration against environment policies and guardrails')
  .option('--env <environment>', 'Environment to validate (e.g., dev, prod, staging)')
  .option('--config-dir <dir>', 'Configuration directory (default: "./config")')
  .option('--policy-file <file>', 'Custom policy file path (default: "./align.policies.json")')
  .option('--format <format>', 'Output format (text, json) (default: "text")')
  .action(async (options) => {
    try {
      const environment = options.env || 'production';
      const configDir = path.resolve(options.configDir || './config');
      const policyFile = options.policyFile || './align.policies.json';
      
      // Load configuration
      const baseConfig = await loadConfig(path.join(configDir, 'base.align'), true);
      const envConfig = await loadConfig(path.join(configDir, `${environment}.align`));
      const config = mergeConfigs(baseConfig, envConfig);
      
      // Load policies
      const customPolicies = loadPolicies(policyFile);
      
      // Validate policies
      const result = validatePolicies(config, environment, customPolicies);
      
      if (options.format === 'json') {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(chalk.blue(`🔒 Policy Validation for ${environment}:`));
        
        if (result.valid) {
          console.log(chalk.green('✅ All policies passed!'));
          console.log(chalk.gray(`Applied ${result.policiesApplied.length} policies`));
        } else {
          console.log(chalk.red(`❌ ${result.violations.length} policy violations found:`));
          result.violations.forEach((violation, index) => {
            console.log(chalk.red(`\n${index + 1}. ${violation.key} = ${violation.value}`));
            console.log(chalk.gray(`   Environment: ${violation.environment}`));
            console.log(chalk.gray(`   Rule: ${violation.rule}`));
            console.log(chalk.gray(`   Message: ${violation.message}`));
          });
        }
      }
    } catch (error) {
      console.error(chalk.red('❌ Error validating policies:'), error.message);
      process.exit(1);
    }
  });

program
  .command('suggest-policies')
  .description('Generate policy suggestions based on current configuration')
  .option('--env <environment>', 'Environment to analyze (e.g., dev, prod, staging)')
  .option('--config-dir <dir>', 'Configuration directory (default: "./config")')
  .option('--format <format>', 'Output format (text, json) (default: "text")')
  .action(async (options) => {
    try {
      const environment = options.env || 'production';
      const configDir = path.resolve(options.configDir || './config');
      
      // Load configuration
      const baseConfig = await loadConfig(path.join(configDir, 'base.align'), true);
      const envConfig = await loadConfig(path.join(configDir, `${environment}.align`));
      const config = mergeConfigs(baseConfig, envConfig);
      
      // Generate suggestions
      const suggestions = suggestPolicies(config, environment);
      
      if (options.format === 'json') {
        console.log(JSON.stringify(suggestions, null, 2));
      } else {
        console.log(chalk.blue(`💡 Policy Suggestions for ${environment}:`));
        
        if (suggestions.length === 0) {
          console.log(chalk.green('✅ No policy suggestions needed!'));
        } else {
          suggestions.forEach((suggestion, index) => {
            const severityColor = suggestion.severity === 'critical' ? chalk.red : chalk.yellow;
            console.log(severityColor(`\n${index + 1}. ${suggestion.key} (${suggestion.severity})`));
            console.log(chalk.gray(`   Rule: ${suggestion.rule}`));
            console.log(chalk.gray(`   Suggested: ${JSON.stringify(suggestion.value)}`));
            console.log(chalk.gray(`   Message: ${suggestion.message}`));
          });
        }
      }
    } catch (error) {
      console.error(chalk.red('❌ Error generating policy suggestions:'), error.message);
      process.exit(1);
    }
  });

// SCHEMA INFERENCE COMMAND
program
  .command('infer')
  .description('Infer schema from existing .align configuration files')
  .option('--config-dir <dir>', 'Configuration directory (default: "./config")')
  .option('--out <file>', 'Output schema file (default: "./align.schema.json")')
  .option('--mark-all-required', 'Mark all fields as required (default: false)')
  .option('--infer-patterns', 'Infer patterns for URLs and emails (default: true)')
  .option('--infer-ranges', 'Infer min/max ranges for numbers (default: false)')
  .option('--format <format>', 'Output format (json, yaml) (default: "json")')
  .action(async (options) => {
    try {
      const configDir = path.resolve(options.configDir || './config');
      const outputFile = options.out || './align.schema.json';
      
      console.log(chalk.blue('🧠 Inferring schema from .align files...'));
      console.log(chalk.gray(`📁 Config directory: ${configDir}`));
      console.log(chalk.gray(`📄 Output file: ${outputFile}`));
      console.log('');
      
      // Load base config
      const basePath = path.join(configDir, 'base.align');
      if (!fs.existsSync(basePath)) {
        console.error(chalk.red(`❌ Base config not found: ${basePath}`));
        process.exit(1);
      }
      
      const baseContent = fs.readFileSync(basePath, 'utf-8');
      const baseConfig = parseAlign(baseContent);
      
      // Load environment configs
      const envConfigs = {};
      const envFiles = fs.readdirSync(configDir).filter(file => 
        file.endsWith('.align') && file !== 'base.align'
      );
      
      for (const file of envFiles) {
        const envName = file.replace('.align', '');
        const envPath = path.join(configDir, file);
        const envContent = fs.readFileSync(envPath, 'utf-8');
        envConfigs[envName] = parseAlign(envContent);
      }
      
      // Infer schema
      const inferenceOptions = {
        markAllRequired: options.markAllRequired || false,
        inferPatterns: options.inferPatterns !== false, // Default to true
        inferRanges: options.inferRanges || false
      };
      
      const schema = inferSchemaFromFiles(baseConfig, envConfigs, inferenceOptions);
      
      // Write output
      if (options.format === 'yaml') {
        const yaml = require('js-yaml');
        const yamlContent = yaml.dump(schema);
        fs.writeFileSync(outputFile.replace('.json', '.yaml'), yamlContent);
        console.log(chalk.green(`✅ Schema inferred and saved to: ${outputFile.replace('.json', '.yaml')}`));
      } else {
        fs.writeFileSync(outputFile, JSON.stringify(schema, null, 2));
        console.log(chalk.green(`✅ Schema inferred and saved to: ${outputFile}`));
      }
      
      console.log('');
      console.log(chalk.blue('📊 Inference Summary:'));
      console.log(chalk.gray(`  Total fields: ${Object.keys(schema).filter(k => !k.startsWith('_')).length}`));
      console.log(chalk.gray(`  Required fields: ${Object.values(schema).filter(f => f.required && !f.key?.startsWith('_')).length}`));
      console.log(chalk.gray(`  String fields: ${Object.values(schema).filter(f => f.type === 'string').length}`));
      console.log(chalk.gray(`  Number fields: ${Object.values(schema).filter(f => f.type === 'number').length}`));
      console.log(chalk.gray(`  Boolean fields: ${Object.values(schema).filter(f => f.type === 'boolean').length}`));
      console.log(chalk.gray(`  Array fields: ${Object.values(schema).filter(f => f.type === 'array').length}`));
      
      if (inferenceOptions.inferPatterns) {
        const patternFields = Object.values(schema).filter(f => f.pattern).length;
        if (patternFields > 0) {
          console.log(chalk.gray(`  Pattern fields: ${patternFields}`));
        }
      }
      
      console.log('');
      console.log(chalk.blue('💡 Next Steps:'));
      console.log(chalk.gray('  1. Review the generated schema'));
      console.log(chalk.gray('  2. Adjust required fields and validation rules'));
      console.log(chalk.gray('  3. Add descriptions and documentation'));
      console.log(chalk.gray('  4. Run "align validate" to test the schema'));
      
    } catch (error) {
      console.error(chalk.red('❌ Error inferring schema:'), error.message);
      process.exit(1);
    }
  });

// INTERACTIVE COMMANDS
program
  .command('setup')
  .description('Interactive Align configuration setup')
  .option('--interactive <mode>', 'Use interactive mode (true/false, default: true)')
  .option('--template <template>', 'Template to use (when not interactive)')
  .option('--app-name <name>', 'Application name (when not interactive)')
  .action(async (options) => {
    try {
      if (options.interactive === 'false' || options.interactive === false) {
        // Fall back to template-based init
        const template = options.template || 'nodejs-api';
        const appName = options.appName || 'myapp';
        
        console.log(chalk.blue('🚀 Initializing Align configuration...'));
        console.log(chalk.gray(`Template: ${template}`));
        console.log(chalk.gray(`App name: ${appName}`));
        
        // Use existing template logic
        const templateDir = path.join(__dirname, 'templates', template);
        if (!fs.existsSync(templateDir)) {
          console.error(chalk.red(`❌ Template not found: ${template}`));
          process.exit(1);
        }
        
        // Copy template files
        const configDir = './config';
        if (!fs.existsSync(configDir)) {
          fs.mkdirSync(configDir, { recursive: true });
        }
        
        // Copy template files to config directory
        const templateFiles = fs.readdirSync(templateDir);
        for (const file of templateFiles) {
          const sourcePath = path.join(templateDir, file);
          const destPath = path.join(configDir, file);
          
          if (fs.statSync(sourcePath).isFile()) {
            let content = fs.readFileSync(sourcePath, 'utf8');
            content = content.replace(/myapp/g, appName);
            fs.writeFileSync(destPath, content);
          }
        }
        
        console.log(chalk.green('✅ Configuration initialized!'));
        console.log(chalk.gray(`📁 Config directory: ${configDir}`));
      } else {
        await interactiveInit();
      }
    } catch (error) {
      console.error(chalk.red('❌ Error during initialization:'), error.message);
      process.exit(1);
    }
  });

program
  .command('wizard')
  .description('Interactive configuration wizard')
  .option('--interactive <mode>', 'Use interactive mode (true/false, default: true)')
  .option('--env <environment>', 'Environment to edit (when not interactive)')
  .option('--key <key>', 'Key to edit (when not interactive)')
  .option('--value <value>', 'New value (when not interactive)')
  .action(async (options) => {
    try {
      if (options.interactive === 'false' || options.interactive === false) {
        // Fall back to command-line edit
        const env = options.env || 'dev';
        const key = options.key;
        const value = options.value;
        
        if (!key || value === undefined) {
          console.error(chalk.red('❌ --key and --value are required in non-interactive mode'));
          process.exit(1);
        }
        
        // Use existing edit logic
        const configPath = path.join('./config', `${env}.align`);
        if (!fs.existsSync(configPath)) {
          console.error(chalk.red(`❌ Config file not found: ${configPath}`));
          process.exit(1);
        }
        
        let content = fs.readFileSync(configPath, 'utf8');
        const lines = content.split('\n');
        let updated = false;
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (line.trim().startsWith(`${key} =`)) {
            lines[i] = `${key} = ${JSON.stringify(value)}`;
            updated = true;
            break;
          }
        }
        
        if (!updated) {
          lines.push(`${key} = ${JSON.stringify(value)}`);
        }
        
        fs.writeFileSync(configPath, lines.join('\n'));
        console.log(chalk.green(`✅ Updated ${key} = ${JSON.stringify(value)} in ${env}.align`));
      } else {
        await interactiveEdit();
      }
    } catch (error) {
      console.error(chalk.red('❌ Error during edit:'), error.message);
      process.exit(1);
    }
  });

program
  .command('troubleshoot')
  .description('Interactive configuration diagnosis wizard')
  .option('--interactive <mode>', 'Use interactive mode (true/false, default: true)')
  .option('--config-dir <dir>', 'Configuration directory (default: "./config")')
  .option('--detailed', 'Show detailed analysis')
  .action(async (options) => {
    try {
      if (options.interactive === 'false' || options.interactive === false) {
        // Fall back to command-line diagnose
        const configDir = path.resolve(options.configDir || './config');
        const detailed = options.detailed || false;
        
        console.log(chalk.blue('🔍 Diagnosing configuration...'));
        const diagnosis = await diagnoseConfig('.', configDir, detailed);
        displayDiagnosisResults(diagnosis, true);
      } else {
        await interactiveDiagnose(options);
      }
    } catch (error) {
      console.error(chalk.red('❌ Error during diagnosis:'), error.message);
      process.exit(1);
    }
  });

// Interactive functions
async function interactiveInit() {
  console.log(chalk.blue('🛠️  Let\'s create a new Align config!'));
  console.log('');
  
  const responses = await inquirer.prompt([
    {
      type: 'list',
      name: 'environment',
      message: 'What environment are you targeting?',
      choices: ['dev', 'prod', 'staging'],
      default: 'dev'
    },
    {
      type: 'input',
      name: 'service_name',
      message: 'Service name:',
      default: 'web',
      validate: (input) => {
        if (input.trim().length === 0) {
          return 'Service name cannot be empty';
        }
        return true;
      }
    },
    {
      type: 'number',
      name: 'port',
      message: 'Port:',
      default: 3000,
      validate: (input) => {
        if (input < 1 || input > 65535) {
          return 'Port must be between 1 and 65535';
        }
        return true;
      }
    },
    {
      type: 'number',
      name: 'timeout',
      message: 'Timeout (ms):',
      default: 3000,
      validate: (input) => {
        if (input < 100) {
          return 'Timeout must be at least 100ms';
        }
        return true;
      }
    },
    {
      type: 'confirm',
      name: 'auth_required',
      message: 'Require authentication?',
      default: true
    },
    {
      type: 'list',
      name: 'log_level',
      message: 'Log level:',
      choices: ['debug', 'info', 'warn', 'error'],
      default: 'info'
    },
    {
      type: 'input',
      name: 'database_url',
      message: 'Database URL (optional):',
      default: '',
      filter: (input) => input.trim() || undefined
    },
    {
      type: 'confirm',
      name: 'generate_schema',
      message: 'Generate schema automatically?',
      default: true
    }
  ]);
  
  // Create config directory
  const configDir = './config';
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  
  // Generate base config
  const baseConfig = {
    service_name: responses.service_name,
    port: responses.port,
    timeout: responses.timeout,
    auth_required: responses.auth_required,
    log_level: responses.log_level
  };
  
  if (responses.database_url) {
    baseConfig.database_url = responses.database_url;
  }
  
  // Generate environment-specific config
  const envConfig = {
    // Environment-specific overrides can be added here
  };
  
  // Write base config
  const baseContent = generateAlignContent(baseConfig);
  fs.writeFileSync(path.join(configDir, 'base.align'), baseContent);
  
  // Write environment config
  const envContent = generateAlignContent(envConfig);
  fs.writeFileSync(path.join(configDir, `${responses.environment}.align`), envContent);
  
  // Generate schema if requested
  if (responses.generate_schema) {
    const schema = inferSchema(baseConfig, { inferPatterns: true });
    fs.writeFileSync(path.join(configDir, 'align.schema.json'), JSON.stringify(schema, null, 2));
  }
  
  console.log('');
  console.log(chalk.green('✅ Configuration created successfully!'));
  console.log(chalk.gray(`📁 Config directory: ${configDir}`));
  console.log(chalk.gray(`📄 Base config: ${configDir}/base.align`));
  console.log(chalk.gray(`📄 Environment config: ${configDir}/${responses.environment}.align`));
  if (responses.generate_schema) {
    console.log(chalk.gray(`📋 Schema: ${configDir}/align.schema.json`));
  }
  console.log('');
  console.log(chalk.blue('💡 Next steps:'));
  console.log(chalk.gray('  1. Review and customize the generated config'));
  console.log(chalk.gray('  2. Run "align validate" to check your config'));
  console.log(chalk.gray('  3. Run "align build" to generate output files'));
}

async function interactiveEdit() {
  console.log(chalk.blue('📝 Interactive Configuration Editor'));
  console.log('');
  
  // Check if config exists
  const configDir = './config';
  if (!fs.existsSync(configDir)) {
    console.log(chalk.red('❌ No configuration found. Run "align init" first.'));
    return;
  }
  
  // Get available environments
  const envFiles = fs.readdirSync(configDir).filter(file => 
    file.endsWith('.align') && file !== 'base.align'
  );
  
  if (envFiles.length === 0) {
    console.log(chalk.red('❌ No environment configs found. Run "align init" first.'));
    return;
  }
  
  const responses = await inquirer.prompt([
    {
      type: 'list',
      name: 'environment',
      message: 'Which environment to edit?',
      choices: envFiles.map(file => file.replace('.align', '')),
      default: envFiles[0].replace('.align', '')
    },
    {
      type: 'list',
      name: 'action',
      message: 'What would you like to do?',
      choices: [
        { name: 'Edit existing key', value: 'edit' },
        { name: 'Add new key', value: 'add' },
        { name: 'Remove key', value: 'remove' },
        { name: 'View current config', value: 'view' }
      ],
      default: 'edit'
    }
  ]);
  
  const envPath = path.join(configDir, `${responses.environment}.align`);
  let content = '';
  
  if (fs.existsSync(envPath)) {
    content = fs.readFileSync(envPath, 'utf8');
  }
  
  const config = parseAlign(content);
  
  if (responses.action === 'view') {
    console.log('');
    console.log(chalk.blue(`📋 Current ${responses.environment} configuration:`));
    Object.entries(config).forEach(([key, value]) => {
      console.log(chalk.gray(`  ${key} = ${JSON.stringify(value)}`));
    });
    return;
  }
  
  if (responses.action === 'edit' || responses.action === 'add') {
    const keyResponse = await inquirer.prompt([
      {
        type: 'input',
        name: 'key',
        message: responses.action === 'edit' ? 'Which key to edit?' : 'New key name:',
        validate: (input) => {
          if (input.trim().length === 0) {
            return 'Key name cannot be empty';
          }
          return true;
        }
      }
    ]);
    
    const valueResponse = await inquirer.prompt([
      {
        type: 'input',
        name: 'value',
        message: `Value for ${keyResponse.key}:`,
        default: config[keyResponse.key] || '',
        validate: (input) => {
          if (input.trim().length === 0) {
            return 'Value cannot be empty';
          }
          return true;
        }
      }
    ]);
    
    // Update config
    const lines = content.split('\n');
    let updated = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim().startsWith(`${keyResponse.key} =`)) {
        lines[i] = `${keyResponse.key} = ${JSON.stringify(valueResponse.value)}`;
        updated = true;
        break;
      }
    }
    
    if (!updated) {
      lines.push(`${keyResponse.key} = ${JSON.stringify(valueResponse.value)}`);
    }
    
    fs.writeFileSync(envPath, lines.join('\n'));
    console.log(chalk.green(`✅ Updated ${keyResponse.key} = ${JSON.stringify(valueResponse.value)} in ${responses.environment}.align`));
  }
  
  if (responses.action === 'remove') {
    const keyResponse = await inquirer.prompt([
      {
        type: 'list',
        name: 'key',
        message: 'Which key to remove?',
        choices: Object.keys(config),
        default: Object.keys(config)[0]
      }
    ]);
    
    const lines = content.split('\n');
    const filteredLines = lines.filter(line => !line.trim().startsWith(`${keyResponse.key} =`));
    
    fs.writeFileSync(envPath, filteredLines.join('\n'));
    console.log(chalk.green(`✅ Removed ${keyResponse.key} from ${responses.environment}.align`));
  }
}

async function interactiveDiagnose(options) {
  console.log(chalk.blue('🔍 Interactive Configuration Diagnosis'));
  console.log('');
  
  const responses = await inquirer.prompt([
    {
      type: 'list',
      name: 'issue_type',
      message: 'What issue are you experiencing?',
      choices: [
        { name: 'Configuration errors', value: 'config' },
        { name: 'Security warnings', value: 'security' },
        { name: 'Performance issues', value: 'performance' },
        { name: 'All of the above', value: 'all' }
      ],
      default: 'all'
    },
    {
      type: 'list',
      name: 'environment',
      message: 'Which environment to analyze?',
      choices: ['dev', 'prod', 'staging'],
      default: 'dev'
    },
    {
      type: 'confirm',
      name: 'detailed',
      message: 'Show detailed analysis?',
      default: true
    }
  ]);
  
  const configDir = path.resolve(options.configDir || './config');
  
  console.log('');
  console.log(chalk.blue('🔍 Analyzing configuration...'));
  
  const diagnosis = await diagnoseConfig('.', configDir, responses.detailed);
  
  console.log('');
  console.log(chalk.blue('📊 Analysis Results:'));
  
  if (diagnosis.criticalIssues.length > 0) {
    console.log(chalk.red(`❌ ${diagnosis.criticalIssues.length} critical issues found:`));
    diagnosis.criticalIssues.forEach((issue, index) => {
      console.log(chalk.red(`  ${index + 1}. ${issue.title}`));
    });
  }
  
  if (diagnosis.warnings.length > 0) {
    console.log(chalk.yellow(`⚠️  ${diagnosis.warnings.length} warnings found:`));
    diagnosis.warnings.forEach((warning, index) => {
      console.log(chalk.yellow(`  ${index + 1}. ${warning.title}`));
    });
  }
  
  if (diagnosis.criticalIssues.length === 0 && diagnosis.warnings.length === 0) {
    console.log(chalk.green('✅ No issues found! Your configuration looks good.'));
  }
  
  console.log('');
  console.log(chalk.blue('💡 Recommendations:'));
  diagnosis.recommendations.forEach((rec, index) => {
    console.log(chalk.gray(`  ${index + 1}. ${rec.title}: ${rec.description}`));
  });
}

// Helper function to generate .align content
function generateAlignContent(config) {
  const lines = [];
  lines.push('# Generated by Align Interactive CLI');
  lines.push('');
  
  for (const [key, value] of Object.entries(config)) {
    if (typeof value === 'string') {
      lines.push(`${key} = "${value}"`);
    } else {
      lines.push(`${key} = ${JSON.stringify(value)}`);
    }
  }
  
  return lines.join('\n');
}

// MODULE-SPECIFIC CONFIGURATION COMMANDS
program
  .command('module-config')
  .description('Generate module-specific configuration')
  .requiredOption('--module <name>', 'Module name')
  .option('--env <environment>', 'Environment (default: dev)', 'dev')
  .option('--config-dir <dir>', 'Configuration directory (default: ./config)', './config')
  .option('--format <format>', 'Output format (json, yaml, env)', 'json')
  .option('--out <file>', 'Output file (default: stdout)')
  .action(async (options) => {
    try {
      const configDir = path.resolve(options.configDir);
      const baseConfigPath = path.join(configDir, 'base.align');
      const envConfigPath = path.join(configDir, `${options.env}.align`);
      
      // Load configurations
      let baseConfig = {};
      let envConfig = {};
      
      if (fs.existsSync(baseConfigPath)) {
        const baseContent = fs.readFileSync(baseConfigPath, 'utf8');
        baseConfig = parseAlign(baseContent);
      }
      
      if (fs.existsSync(envConfigPath)) {
        const envContent = fs.readFileSync(envConfigPath, 'utf8');
        envConfig = parseAlign(envContent);
      }
      
      // Merge configurations
      const mergedConfig = mergeConfigs(baseConfig, envConfig);
      
      // Generate module-specific config
      const result = generateModuleConfig(mergedConfig, options.module, options.env, configDir);
      
      if (result.errors.length > 0) {
        console.error(chalk.red('❌ Module configuration errors:'));
        result.errors.forEach(error => console.error(chalk.red(`  - ${error}`)));
        process.exit(1);
      }
      
      // Format output
      let output;
      switch (options.format.toLowerCase()) {
        case 'json':
          output = JSON.stringify(result.config, null, 2);
          break;
        case 'yaml':
          output = yaml.dump(result.config);
          break;
        case 'env':
          output = Object.entries(result.config)
            .map(([key, value]) => `${key.toUpperCase()}=${JSON.stringify(value)}`)
            .join('\n');
          break;
        default:
          output = JSON.stringify(result.config, null, 2);
      }
      
      // Output result
      if (options.out) {
        fs.writeFileSync(options.out, output);
        console.log(chalk.green(`✅ Module config saved to: ${options.out}`));
      } else {
        console.log(output);
      }
      
      // Show warnings if any
      if (result.missing.length > 0) {
        console.log(chalk.yellow(`⚠️  Missing optional fields: ${result.missing.join(', ')}`));
      }
      
    } catch (error) {
      console.error(chalk.red('❌ Error generating module config:'), error.message);
      process.exit(1);
    }
  });

program
  .command('list-modules')
  .description('List all available modules')
  .option('--config-dir <dir>', 'Configuration directory (default: ./config)', './config')
  .option('--format <format>', 'Output format (table, json)', 'table')
  .action(async (options) => {
    try {
      const modules = discoverModuleSchemas(options.configDir);
      
      if (modules.length === 0) {
        console.log(chalk.yellow('⚠️  No modules found'));
        console.log(chalk.gray('Create modules in config/modules/ or install packages with align.schema.json'));
        return;
      }
      
      if (options.format === 'json') {
        console.log(JSON.stringify(modules.map(m => ({
          name: m.name,
          path: m.path,
          isPackage: m.isPackage || false,
          properties: Object.keys(m.schema.properties || {})
        })), null, 2));
      } else {
        console.log(chalk.blue('📦 Available Modules:'));
        console.log('');
        
        modules.forEach(module => {
          const type = module.isPackage ? '📦 Package' : '📁 Local';
          const properties = Object.keys(module.schema.properties || {}).join(', ');
          console.log(chalk.gray(`${type} ${module.name}`));
          console.log(chalk.gray(`  Path: ${module.path}`));
          console.log(chalk.gray(`  Properties: ${properties}`));
          console.log('');
        });
      }
      
    } catch (error) {
      console.error(chalk.red('❌ Error listing modules:'), error.message);
      process.exit(1);
    }
  });

program
  .command('validate-module')
  .description('Validate module-specific configuration')
  .requiredOption('--module <name>', 'Module name')
  .option('--env <environment>', 'Environment (default: dev)', 'dev')
  .option('--config-dir <dir>', 'Configuration directory (default: ./config)', './config')
  .option('--detailed', 'Show detailed validation results')
  .action(async (options) => {
    try {
      const configDir = path.resolve(options.configDir);
      const baseConfigPath = path.join(configDir, 'base.align');
      const envConfigPath = path.join(configDir, `${options.env}.align`);
      
      // Load configurations
      let baseConfig = {};
      let envConfig = {};
      
      if (fs.existsSync(baseConfigPath)) {
        const baseContent = fs.readFileSync(baseConfigPath, 'utf8');
        baseConfig = parseAlign(baseContent);
      }
      
      if (fs.existsSync(envConfigPath)) {
        const envContent = fs.readFileSync(envConfigPath, 'utf8');
        envConfig = parseAlign(envContent);
      }
      
      // Merge configurations
      const mergedConfig = mergeConfigs(baseConfig, envConfig);
      
      // Validate module config
      const result = validateModuleConfig(mergedConfig, options.module, options.env, configDir);
      
      console.log(chalk.blue(`🔍 Validating module: ${options.module} (${options.env})`));
      console.log('');
      
      if (result.valid) {
        console.log(chalk.green('✅ Module configuration is valid'));
      } else {
        console.log(chalk.red('❌ Module configuration has errors:'));
        result.errors.forEach(error => console.log(chalk.red(`  - ${error}`)));
      }
      
      if (result.warnings.length > 0) {
        console.log(chalk.yellow('⚠️  Warnings:'));
        result.warnings.forEach(warning => console.log(chalk.yellow(`  - ${warning}`)));
      }
      
      if (options.detailed) {
        console.log('');
        console.log(chalk.blue('📋 Module Configuration:'));
        console.log(JSON.stringify(result.config, null, 2));
      }
      
    } catch (error) {
      console.error(chalk.red('❌ Error validating module:'), error.message);
      process.exit(1);
    }
  });

program.parse();
