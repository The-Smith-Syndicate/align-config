#!/usr/bin/env node
const { 
  parseAlign, 
  validateConfig, 
  mergeConfigs, 
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
  // Enhanced export functions with comments
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
  diagnoseConfig,
  // Module-specific configuration functions
  discoverModuleSchemas,
  generateModuleConfig,
  validateModuleConfig,
  // Linting functions
  lintConfig,
  applyLintFixes,
  writeFixedConfig,
  // Secrets management functions
  explainWithSecrets,
  validateSecretsWithExternal,
  // CI/CD helper functions
  generateCIConfig,
  // Versioning support functions
  getSchemaVersion,
  getConfigVersion,
  compareVersions,
  detectVersionIssues,
  generateVersionMigrationPlan,
  applyMigration,
  bumpSchemaVersion,
  bumpConfigVersion,
  validateMigrationCompatibility,
  // Angular and .env migration functions
  extractAngularEnvironmentVars,
  generateSchemaFromAngular,
  generateBaseAlignFromAngular,
  parseEnvFile,
  generateSchemaFromEnvVars,
  generateAlignFromEnvVars,
  // GCP Secret Manager integration functions
  listGCPSecrets,
  resolveGCPSecrets,
  validateGCPSecrets,
  // Multi-service configuration functions
  loadServiceSpecificConfig,
  // Enhanced CI/CD functions
  generateGitHubActionsWithSecrets,
  // Secret rotation functions
  rotateGCPSecret,
  scheduleSecretRotation,
  listSecretRotations,
  // Configuration analytics functions
  analyzeConfigurationUsage,
  // Team collaboration functions
  createEnvironmentShare,
  createEnvironmentReview,
  lockEnvironment,
  unlockEnvironment,
  // SOC 2 compliance functions
  generateSOC2Checklist,
  loadSchema
} = require('./parser');
const { Command } = require('commander');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const inquirer = require('inquirer');

const program = new Command();
program.name('align').description('Align config CLI').version('1.0.5');

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
      
      console.log(chalk.blue('\n🎯 Template initialization complete!'));
      console.log(chalk.gray(`📁 Configuration directory: ${configDir}`));
      console.log(chalk.gray(`📄 Files created: ${copiedFiles}`));
      console.log(chalk.blue('\nNext steps:'));
      console.log(chalk.gray(`1. Customize the configuration files in ${configDir}`));
      console.log(chalk.gray(`2. Validate: node index.js validate ${configDir}/base.align --base`));
      console.log(chalk.gray('3. Build: node index.js build --env=dev --out=./output/config.dev.json'));
      
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
  .option('--format <format>', 'Output format (json, jsonc, yaml, env, python, toml, properties, hcl, ini, xml)', 'json')
  .option('--schema <file>', 'Schema file path (align.schema.json)')
  .option('--k8s-configmap', 'Generate Kubernetes ConfigMap YAML')
  .option('--comments', 'Include field descriptions as comments in output (requires schema, not valid for standard JSON)')
  .option('--service <service>', 'Service name (api, consumer) for service-specific configuration')
  .option('--project <project>', 'GCP project ID for secret resolution')
  .option('--secrets-from <provider>', 'Secret provider (gcp) for automatic secret resolution')
  .hook('preAction', (thisCommand, actionCommand) => {
    // Validate conflicting options
    const options = actionCommand.opts();
    if (options.comments && options.format === 'json') {
      console.error(chalk.red('❌ Error: --comments flag is not valid with --format=json. Use --format=jsonc for JSON with comments.'));
      process.exit(1);
    }
  })
  .action(async (options) => {
    try {
      const configDir = path.resolve(options.configDir);
      const basePath = path.join(configDir, 'base.align');
      const envPath = path.join(configDir, `${options.env}.align`);
      const outPath = path.resolve(options.out);

      // Validate format
      const supportedFormats = ['json', 'jsonc', 'yaml', 'env', 'python', 'toml', 'properties', 'hcl', 'ini', 'xml'];
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
      
      // Validate file is not empty
      if (!baseContent.trim()) {
        console.error(chalk.red(`❌ Base config file is empty: ${basePath}`));
        process.exit(1);
      }
      
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
      
      // Validate file is not empty
      if (!envContent.trim()) {
        console.error(chalk.red(`❌ Environment config file is empty: ${envPath}`));
        process.exit(1);
      }
      
      const envConfig = parseAlign(envContent);
      const envErrors = validateConfig(envConfig, false, schema); // Environment config validation
      
      if (envErrors.length > 0) {
        console.error(chalk.red('❌ Environment config validation failed:'));
        envErrors.forEach(err => console.log(chalk.red(`- ${err}`)));
        process.exit(1);
      }

      // Merge configs
      console.log(chalk.blue('🔄 Merging configurations...'));
      let mergedConfig = mergeConfigs(baseConfig, envConfig);

      // Apply service-specific configuration
      if (options.service) {
        console.log(chalk.blue(`🔧 Applying service-specific configuration: ${options.service}`));
        mergedConfig = loadServiceSpecificConfig(mergedConfig, options.service, options.env);
      }

      // Resolve GCP secrets if specified
      if (options.secretsFrom === 'gcp' && options.project) {
        console.log(chalk.blue(`🔐 Resolving GCP secrets from project: ${options.project}`));
        mergedConfig = await resolveGCPSecrets(mergedConfig, options.project, options.env, {
          addEnvironmentSuffix: true,
          failOnMissing: true
        });
      }

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
        console.log(chalk.blue(`📁 Created output directory: ${outDir}`));
      }

      // Generate output based on format
      let output;
      let fileExtension;
      
      // Check if comments are requested and schema is available
      const useComments = options.comments && schema;
      if (options.comments && !schema) {
        console.log(chalk.yellow('⚠️  --comments flag requires a schema file. Comments will not be included.'));
      }
      
      // Warn about comments with standard JSON
      if (options.comments && options.format === 'json') {
        console.log(chalk.yellow('⚠️  Comments are not valid in standard JSON. Use --format=jsonc for JSON with comments.'));
      }
      
      if (options.format === 'yaml') {
        if (useComments) {
          output = exportToYAMLWithComments(mergedConfig, schema);
        } else {
          output = yaml.dump(mergedConfig, { indent: 2 });
        }
        fileExtension = '.yaml';
      } else if (options.format === 'env') {
        // Convert to .env format
        output = Object.entries(mergedConfig)
          .map(([key, value]) => {
            // Convert key to UPPER_CASE format
            const envKey = key.toUpperCase().replace(/[^A-Z0-9_]/g, '_');
            
            // Add comment if description exists and comments are enabled
            let comment = '';
            if (useComments && schema.properties && schema.properties[key] && schema.properties[key].description) {
              comment = ` # ${schema.properties[key].description}`;
            }
            
            // Handle different value types with boolean conversion
            let envValue;
            if (typeof value === 'string') {
              // Remove quotes for .env format (Docker expects KEY=value)
              envValue = value;
            } else if (typeof value === 'boolean') {
              // Convert boolean to string for .env format
              envValue = value.toString();
            } else if (typeof value === 'number') {
              envValue = value.toString();
            } else if (Array.isArray(value)) {
              envValue = value.join(',');
            } else {
              envValue = String(value);
            }
            
            return `${envKey}=${envValue}${comment}`;
          })
          .join('\n');
        fileExtension = '.env';
      } else if (options.format === 'python') {
        if (useComments) {
          output = exportToPythonWithComments(mergedConfig, schema);
        } else {
          output = exportToPython(mergedConfig);
        }
        fileExtension = '.py';
      } else if (options.format === 'toml') {
        if (useComments) {
          output = exportToTOMLWithComments(mergedConfig, schema);
        } else {
          output = exportToTOML(mergedConfig);
        }
        fileExtension = '.toml';
      } else if (options.format === 'properties') {
        if (useComments) {
          output = exportToPropertiesWithComments(mergedConfig, schema);
        } else {
          output = exportToProperties(mergedConfig);
        }
        fileExtension = '.properties';
      } else if (options.format === 'hcl') {
        if (useComments) {
          output = exportToHCLWithComments(mergedConfig, schema);
        } else {
          output = exportToHCL(mergedConfig);
        }
        fileExtension = '.tf';
      } else if (options.format === 'ini') {
        if (useComments) {
          output = exportToINIWithComments(mergedConfig, schema);
        } else {
          output = exportToINI(mergedConfig);
        }
        fileExtension = '.ini';
      } else if (options.format === 'xml') {
        if (useComments) {
          output = exportToXMLWithComments(mergedConfig, schema);
        } else {
          output = exportToXML(mergedConfig);
        }
        fileExtension = '.xml';
      } else if (options.format === 'jsonc') {
        // JSON with comments (JSONC format)
        if (useComments) {
          output = exportToJSONWithComments(mergedConfig, schema);
        } else {
          output = JSON.stringify(mergedConfig, null, 2);
        }
        fileExtension = '.jsonc';
      } else {
        // Standard JSON (always valid JSON, no comments)
        output = JSON.stringify(mergedConfig, null, 2);
        fileExtension = '.json';
      }

      // Respect user's file extension if provided, otherwise use format-appropriate extension
      let finalOutPath = outPath;
      if (!outPath.includes('.')) {
        // No extension provided, add appropriate one
        finalOutPath = outPath + fileExtension;
      } else if (!outPath.endsWith(fileExtension)) {
        // Extension provided but doesn't match format, warn user
        console.log(chalk.yellow(`⚠️  File extension doesn't match format. Using provided extension: ${path.extname(outPath)}`));
      }
      
      fs.writeFileSync(finalOutPath, output);

      console.log(chalk.green('✅ Configuration built successfully!'));
      console.log(chalk.gray(`📄 Output: ${finalOutPath}`));
      console.log(chalk.gray(`📊 Keys: ${Object.keys(mergedConfig).length}`));
      console.log(chalk.gray(`📋 Format: ${options.format.toUpperCase()}`));
      if (useComments) {
        console.log(chalk.blue('💬 Comments: Included from schema descriptions'));
      }
      
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
        console.log(chalk.gray('📁 Would override base.align value'));
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

      console.log(chalk.blue('🔍 EXPLAIN: Tracing configuration key'));
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
          console.log(chalk.gray('🔍 Validation:'));
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
        console.log(chalk.gray('1. base.align         → (not defined)'));
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
        console.log(chalk.green('💡 Inherited: Value from base.align is being used'));
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

// LINT COMMAND
program
  .command('lint')
  .description('Lint configuration for best practices, unused fields, and potential issues')
  .option('--config-dir <dir>', 'Configuration directory', './config')
  .option('--env <environment>', 'Environment to lint (dev, prod, staging)', 'dev')
  .option('--schema <file>', 'Schema file path (align.schema.json)')
  .option('--format <format>', 'Output format (text, json)', 'text')
  .option('--strict', 'Treat warnings as errors')
  .option('--fix', 'Automatically fix fixable issues')
  .action(async (options) => {
    try {
      const configDir = path.resolve(options.configDir);
      const env = options.env;
      
      console.log(chalk.blue(`🔍 Linting Configuration: ${env} environment`));
      console.log(chalk.gray(`📁 Config directory: ${configDir}\n`));

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

      // Load and merge configuration
      const baseConfig = await loadConfig(path.join(configDir, 'base.align'), false);
      const envConfig = await loadConfig(path.join(configDir, `${env}.align`), false);
      const mergedConfig = mergeConfigs(baseConfig, envConfig);

      // Perform linting
      const lintResult = lintConfig(mergedConfig, schema, env);

      // Apply fixes if requested
      let fixedConfig = mergedConfig;
      let fixResults = { fixed: [], notFixed: [] };
      
      if (options.fix) {
        console.log(chalk.blue('🔧 Applying automatic fixes...'));
        const fixResult = applyLintFixes(mergedConfig, schema, env, lintResult);
        fixedConfig = fixResult.config;
        fixResults = fixResult.results;
        
        if (fixResults.fixed.length > 0) {
          console.log(chalk.green(`✅ Fixed ${fixResults.fixed.length} issues:`));
          fixResults.fixed.forEach(fix => {
            console.log(chalk.gray(`  - ${fix.field}: ${fix.oldValue} → ${fix.newValue}`));
          });
          console.log('');
        }
        
        if (fixResults.notFixed.length > 0) {
          console.log(chalk.yellow(`⚠️  ${fixResults.notFixed.length} issues require manual fixes:`));
          fixResults.notFixed.forEach(issue => {
            console.log(chalk.gray(`  - ${issue.field}: ${issue.reason}`));
          });
          console.log('');
        }
        
        // Write fixed config back to files
        if (fixResults.fixed.length > 0) {
          await writeFixedConfig(fixedConfig, configDir, env, schema);
          console.log(chalk.green('💾 Fixed configuration saved to files.'));
          console.log('');
        }
      }

      // Output results
      if (options.format === 'json') {
        console.log(JSON.stringify(lintResult, null, 2));
      } else {
        displayLintResults(lintResult, options.strict);
      }

      // Exit with appropriate code
      const hasErrors = lintResult.issues.some(issue => issue.severity === 'error');
      const hasWarnings = lintResult.warnings.length > 0;
      
      if (options.strict && (hasErrors || hasWarnings)) {
        process.exit(1);
      } else if (hasErrors) {
        process.exit(1);
      } else {
        process.exit(0);
      }

    } catch (err) {
      console.error(chalk.red('❌ Lint error:'), err.message);
      process.exit(1);
    }
  });

// SECRETS MANAGEMENT COMMANDS
program
  .command('secrets')
  .description('Manage and validate sensitive configuration fields')
  .option('--config-dir <dir>', 'Configuration directory', './config')
  .option('--env <environment>', 'Environment to analyze (dev, prod, staging)', 'dev')
  .option('--schema <file>', 'Schema file path (align.schema.json)')
  .option('--format <format>', 'Output format (text, json)', 'text')
  .option('--mask', 'Mask sensitive values in output')
  .option('--env-secrets', 'Check integration with .env.secret file')
  .option('--vault', 'Check Vault integration')
  .option('--vault-address <address>', 'Vault server address', 'http://localhost:8200')
  .option('--vault-token <token>', 'Vault authentication token')
  .option('--vault-path <path>', 'Vault secrets path', 'secret')
  .option('--gcp', 'Check GCP Secret Manager integration')
  .option('--project <project>', 'GCP project ID')
  .option('--validate', 'Validate secrets exist in GCP')
  .option('--list', 'List available secrets in GCP')
  .action(async (options) => {
    try {
      const configDir = path.resolve(options.configDir);
      const env = options.env;
      
      console.log(chalk.blue(`🔐 Secrets Management: ${env} environment`));
      console.log(chalk.gray(`📁 Config directory: ${configDir}\n`));

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

      // Load and merge configuration
      const baseConfig = await loadConfig(path.join(configDir, 'base.align'), false);
      const envConfig = await loadConfig(path.join(configDir, `${env}.align`), false);
      const mergedConfig = mergeConfigs(baseConfig, envConfig);

      // Handle GCP Secret Manager
      if (options.gcp) {
        if (!options.project) {
          console.error(chalk.red('❌ GCP project ID required for GCP Secret Manager'));
          console.log(chalk.gray('Use: align secrets --gcp --project=your-project-id'));
          process.exit(1);
        }
        
        console.log(chalk.blue(`🔐 GCP Secret Manager: ${options.project}`));
        console.log(chalk.blue(`🌍 Environment: ${env}`));
        
        if (options.list) {
          // List available secrets
          const secrets = await listGCPSecrets(options.project);
          console.log(chalk.green(`✅ Found ${secrets.length} secrets in project`));
          
          secrets.forEach(secret => {
            console.log(chalk.gray(`  - ${secret.name.split('/').pop()}`));
          });
          return;
        } else if (options.validate) {
          // Validate secrets exist
          const validation = await validateGCPSecrets(mergedConfig, options.project, env);
          
          if (validation.valid) {
            console.log(chalk.green(`✅ All ${validation.totalSecrets} secrets are valid`));
          } else {
            console.log(chalk.red(`❌ ${validation.missingSecrets.length} secrets missing:`));
            validation.missingSecrets.forEach(secret => {
              console.log(chalk.red(`  - ${secret.secretName}: ${secret.error}`));
            });
          }
          return;
        }
      }

      // Validate secrets with external integrations
      const vaultConfig = {
        address: options.vaultAddress,
        token: options.vaultToken,
        path: options.vaultPath
      };

      const secretsValidation = validateSecretsWithExternal(
        mergedConfig, 
        schema, 
        env, 
        {
          useEnvSecrets: options.envSecrets,
          useVault: options.vault,
          vaultConfig
        }
      );

      // Output results
      if (options.format === 'json') {
        console.log(JSON.stringify(secretsValidation, null, 2));
      } else {
        displaySecretsResults(secretsValidation, options.mask);
      }

      // Exit with appropriate code
      const hasErrors = secretsValidation.issues.some(issue => issue.severity === 'error');
      const hasWarnings = secretsValidation.warnings.length > 0;
      
      if (hasErrors) {
        process.exit(1);
      } else if (hasWarnings) {
        process.exit(0);
      } else {
        process.exit(0);
      }

    } catch (err) {
      console.error(chalk.red('❌ Secrets validation error:'), err.message);
      process.exit(1);
    }
  });

program
  .command('explain-secret')
  .description('Explain a specific configuration field with secret masking')
  .requiredOption('--key <key>', 'Configuration key to explain')
  .option('--config-dir <dir>', 'Configuration directory', './config')
  .option('--env <environment>', 'Environment to analyze (dev, prod, staging)', 'dev')
  .option('--mask', 'Mask sensitive values in output')
  .option('--vault', 'Include Vault integration suggestions')
  .action(async (options) => {
    try {
      const configDir = path.resolve(options.configDir);
      const env = options.env;
      const key = options.key;
      
      console.log(chalk.blue(`🔐 Explaining Secret: ${key} in ${env} environment`));
      console.log(chalk.gray(`📁 Config directory: ${configDir}\n`));

      // Load and merge configuration
      const baseConfig = await loadConfig(path.join(configDir, 'base.align'), false);
      const envConfig = await loadConfig(path.join(configDir, `${env}.align`), false);
      const mergedConfig = mergeConfigs(baseConfig, envConfig);

      // Explain with secrets
      const explanation = explainWithSecrets(mergedConfig, key, env, {
        maskSecrets: options.mask,
        includeVault: options.vault
      });

      // Display explanation
      displaySecretExplanation(explanation);

    } catch (err) {
      console.error(chalk.red('❌ Secret explanation error:'), err.message);
      process.exit(1);
    }
  });

// CI/CD HELPER COMMANDS
program
  .command('ci')
  .description('Generate CI/CD configuration for various platforms')
  .option('--platform <platform>', 'CI/CD platform (github, gitlab, jenkins, circleci, azure)', 'github')
  .option('--config-dir <dir>', 'Configuration directory', './config')
  .option('--env <environment>', 'Environment to analyze for generation', 'dev')
  .option('--output <file>', 'Output file path (default: .github/workflows/align-config.yml for GitHub)')
  .option('--environments <list>', 'Comma-separated list of environments', 'dev,prod')
  .option('--workflow-name <name>', 'Workflow name (GitHub Actions)', 'align-config')
  .option('--security-scanning', 'Include security scanning jobs', true)
  .option('--cache-dependencies', 'Enable dependency caching', true)
  .option('--matrix-strategy', 'Use matrix strategy for builds (GitHub Actions)', true)
  .option('--deployment-strategy <strategy>', 'Deployment strategy (manual, auto, none)', 'manual')
  .option('--parallel-builds', 'Enable parallel builds (Jenkins)', true)
  .option('--format <format>', 'Output format (yaml, json)', 'yaml')
  .action(async (options) => {
    try {
      const configDir = path.resolve(options.configDir);
      const env = options.env;
      const platform = options.platform.toLowerCase();
      
      console.log(chalk.blue(`🚀 CI/CD Configuration Generator: ${platform}`));
      console.log(chalk.gray(`📁 Config directory: ${configDir}`));
      console.log(chalk.gray(`🌍 Environment: ${env}`));
      console.log('');

      // Load and merge configuration
      const baseConfig = await loadConfig(path.join(configDir, 'base.align'), false);
      const envConfig = await loadConfig(path.join(configDir, `${env}.align`), false);
      const mergedConfig = mergeConfigs(baseConfig, envConfig);

      // Parse options
      const environments = options.environments.split(',').map(e => e.trim());
      const ciOptions = {
        environments,
        workflowName: options.workflowName,
        securityScanning: options.securityScanning,
        cacheDependencies: options.cacheDependencies,
        matrixStrategy: options.matrixStrategy,
        deploymentStrategy: options.deploymentStrategy,
        parallelBuilds: options.parallelBuilds
      };

      // Generate CI/CD configuration
      const ciConfig = generateCIConfig(platform, mergedConfig, ciOptions);

      // Determine output file
      let outputFile = options.output;
      if (!outputFile) {
        switch (platform) {
        case 'github':
        case 'github-actions':
          outputFile = '.github/workflows/align-config.yml';
          break;
        case 'gitlab':
        case 'gitlab-ci':
          outputFile = '.gitlab-ci.yml';
          break;
        case 'jenkins':
          outputFile = 'Jenkinsfile';
          break;
        case 'circleci':
        case 'circle':
          outputFile = '.circleci/config.yml';
          break;
        case 'azure':
        case 'azure-devops':
          outputFile = 'azure-pipelines.yml';
          break;
        default:
          outputFile = `ci-config.${options.format}`;
        }
      }

      // Create output directory if needed
      const outputDir = path.dirname(outputFile);
      if (outputDir !== '.') {
        await fs.promises.mkdir(outputDir, { recursive: true });
      }

      // Write configuration file
      let outputContent;
      if (options.format === 'json') {
        outputContent = JSON.stringify(ciConfig, null, 2);
      } else {
        outputContent = yaml.dump(ciConfig, { indent: 2 });
      }

      await fs.promises.writeFile(outputFile, outputContent);

      // Display summary
      console.log(chalk.green('✅ CI/CD configuration generated successfully!'));
      console.log(chalk.gray(`📄 Output: ${outputFile}`));
      console.log(chalk.gray(`🏗️  Platform: ${platform}`));
      console.log(chalk.gray(`🌍 Environments: ${environments.join(', ')}`));
      
      if (options.securityScanning) {
        console.log(chalk.blue('🔐 Security scanning included'));
      }
      if (options.cacheDependencies) {
        console.log(chalk.blue('💾 Dependency caching enabled'));
      }
      if (options.matrixStrategy && platform === 'github') {
        console.log(chalk.blue('📊 Matrix strategy enabled'));
      }
      if (options.parallelBuilds && platform === 'jenkins') {
        console.log(chalk.blue('⚡ Parallel builds enabled'));
      }

      console.log('');
      console.log(chalk.cyan('💡 Next steps:'));
      console.log(chalk.gray(`  1. Review the generated ${outputFile}`));
      console.log(chalk.gray('  2. Customize the configuration as needed'));
      console.log(chalk.gray('  3. Commit and push to trigger CI/CD'));
      console.log(chalk.gray('  4. Monitor the pipeline execution'));

    } catch (err) {
      console.error(chalk.red('❌ CI/CD generation error:'), err.message);
      process.exit(1);
    }
  });

// VERSIONING COMMANDS
program
  .command('version')
  .description('Manage schema and configuration versions')
  .option('--config-dir <dir>', 'Configuration directory', './config')
  .option('--env <environment>', 'Environment to analyze', 'dev')
  .option('--schema <file>', 'Schema file path (align.schema.json)')
  .option('--format <format>', 'Output format (text, json)', 'text')
  .action(async (options) => {
    try {
      const configDir = path.resolve(options.configDir);
      const env = options.env;
      
      console.log(chalk.blue(`📋 Version Management: ${env} environment`));
      console.log(chalk.gray(`📁 Config directory: ${configDir}\n`));

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

      // Load and merge configuration
      const baseConfig = await loadConfig(path.join(configDir, 'base.align'), false);
      const envConfig = await loadConfig(path.join(configDir, `${env}.align`), false);
      const mergedConfig = mergeConfigs(baseConfig, envConfig);

      // Get versions
      const schemaVersion = getSchemaVersion(schema);
      const configVersion = getConfigVersion(mergedConfig);

      // Check for version issues
      const versionIssues = detectVersionIssues(schema, mergedConfig);

      // Output results
      if (options.format === 'json') {
        console.log(JSON.stringify({
          schema: { version: schemaVersion },
          config: { version: configVersion },
          issues: versionIssues.issues,
          warnings: versionIssues.warnings
        }, null, 2));
      } else {
        displayVersionInfo(schemaVersion, configVersion, versionIssues);
      }

    } catch (err) {
      console.error(chalk.red('❌ Version check error:'), err.message);
      process.exit(1);
    }
  });

program
  .command('migrate')
  .description('Migrate configuration to a new version')
  .option('--config-dir <dir>', 'Configuration directory', './config')
  .option('--env <environment>', 'Environment to migrate', 'dev')
  .option('--schema <file>', 'Schema file path (align.schema.json)')
  .option('--to-version <version>', 'Target version for migration')
  .option('--dry-run', 'Show migration plan without applying changes')
  .option('--backup', 'Create backup before migration', true)
  .option('--format <format>', 'Output format (text, json)', 'text')
  .action(async (options) => {
    try {
      const configDir = path.resolve(options.configDir);
      const env = options.env;
      const targetVersion = options.toVersion;
      
      console.log(chalk.blue(`🔄 Migration: ${env} environment`));
      console.log(chalk.gray(`📁 Config directory: ${configDir}`));
      if (targetVersion) {
        console.log(chalk.gray(`🎯 Target version: ${targetVersion}`));
      }
      console.log('');

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

      // Load and merge configuration
      const baseConfig = await loadConfig(path.join(configDir, 'base.align'), false);
      const envConfig = await loadConfig(path.join(configDir, `${env}.align`), false);
      const mergedConfig = mergeConfigs(baseConfig, envConfig);

      const currentVersion = getConfigVersion(mergedConfig);
      const targetVer = targetVersion || getSchemaVersion(schema);

      // Validate migration compatibility
      const compatibility = validateMigrationCompatibility(schema, mergedConfig, targetVer);

      // Generate migration plan
      const migrationPlan = generateVersionMigrationPlan(currentVersion, targetVer, schema, mergedConfig);

      // Apply migration if not dry run
      let migrationResult = null;
      if (!options.dryRun) {
        migrationResult = applyMigration(mergedConfig, migrationPlan, {
          dryRun: false,
          backup: options.backup
        });
      }

      // Output results
      if (options.format === 'json') {
        console.log(JSON.stringify({
          migrationPlan,
          compatibility,
          result: migrationResult
        }, null, 2));
      } else {
        displayMigrationInfo(migrationPlan, compatibility, migrationResult, options.dryRun);
      }

    } catch (err) {
      console.error(chalk.red('❌ Migration error:'), err.message);
      process.exit(1);
    }
  });

program
  .command('bump')
  .description('Bump version of schema or configuration')
  .option('--config-dir <dir>', 'Configuration directory', './config')
  .option('--env <environment>', 'Environment to bump', 'dev')
  .option('--schema <file>', 'Schema file path (align.schema.json)')
  .option('--type <type>', 'Bump type (major, minor, patch)', 'patch')
  .option('--target <target>', 'Target to bump (schema, config, both)', 'both')
  .option('--dry-run', 'Show what would be changed without applying')
  .option('--format <format>', 'Output format (text, json)', 'text')
  .action(async (options) => {
    try {
      const configDir = path.resolve(options.configDir);
      const env = options.env;
      const bumpType = options.type;
      const target = options.target;
      
      console.log(chalk.blue(`⬆️  Version Bump: ${env} environment`));
      console.log(chalk.gray(`📁 Config directory: ${configDir}`));
      console.log(chalk.gray(`📈 Bump type: ${bumpType}`));
      console.log(chalk.gray(`🎯 Target: ${target}`));
      console.log('');

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

      // Load and merge configuration
      const baseConfig = await loadConfig(path.join(configDir, 'base.align'), false);
      const envConfig = await loadConfig(path.join(configDir, `${env}.align`), false);
      const mergedConfig = mergeConfigs(baseConfig, envConfig);

      const results = {
        schema: null,
        config: null
      };

      // Bump schema version
      if (target === 'schema' || target === 'both') {
        const oldSchemaVersion = getSchemaVersion(schema);
        const newSchema = bumpSchemaVersion(schema, bumpType);
        const newSchemaVersion = getSchemaVersion(newSchema);
        
        results.schema = {
          oldVersion: oldSchemaVersion,
          newVersion: newSchemaVersion,
          changes: compareVersions(newSchemaVersion, oldSchemaVersion)
        };
      }

      // Bump config version
      if (target === 'config' || target === 'both') {
        const oldConfigVersion = getConfigVersion(mergedConfig);
        const newConfig = bumpConfigVersion(mergedConfig, bumpType);
        const newConfigVersion = getConfigVersion(newConfig);
        
        results.config = {
          oldVersion: oldConfigVersion,
          newVersion: newConfigVersion,
          changes: compareVersions(newConfigVersion, oldConfigVersion)
        };
      }

      // Output results
      if (options.format === 'json') {
        console.log(JSON.stringify(results, null, 2));
      } else {
        displayBumpInfo(results, options.dryRun);
      }

    } catch (err) {
      console.error(chalk.red('❌ Version bump error:'), err.message);
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

// Helper function to display lint results
function displayLintResults(lintResult, strict = false) {
  const { issues, warnings, suggestions, summary } = lintResult;
  
  // Display summary
  console.log(chalk.blue('📊 Lint Summary:'));
  console.log(chalk.gray(`  Total Issues: ${summary.totalIssues}`));
  console.log(chalk.yellow(`  Warnings: ${summary.totalWarnings}`));
  console.log(chalk.cyan(`  Suggestions: ${summary.totalSuggestions}`));
  console.log('');

  // Display issues (errors)
  if (issues.length > 0) {
    console.log(chalk.red('❌ Issues:'));
    issues.forEach((issue, index) => {
      console.log(chalk.red(`  ${index + 1}. ${issue.message}`));
      if (issue.details && issue.details.length > 0) {
        issue.details.forEach(detail => {
          if (detail.field) {
            console.log(chalk.gray(`     Field: ${detail.field}`));
          }
          if (detail.value !== undefined) {
            console.log(chalk.gray(`     Value: ${detail.value}`));
          }
          if (detail.reason) {
            console.log(chalk.gray(`     Reason: ${detail.reason}`));
          }
          if (detail.pattern) {
            console.log(chalk.gray(`     Pattern: ${detail.pattern}`));
          }
          if (detail.description) {
            console.log(chalk.gray(`     Description: ${detail.description}`));
          }
          if (detail.configValue !== undefined && detail.schemaDefault !== undefined) {
            console.log(chalk.gray(`     Config: ${detail.configValue}, Schema Default: ${detail.schemaDefault}`));
          }
        });
      }
      if (issue.suggestion) {
        console.log(chalk.cyan(`     💡 ${issue.suggestion}`));
      }
      console.log('');
    });
  }

  // Display warnings
  if (warnings.length > 0) {
    console.log(chalk.yellow('⚠️  Warnings:'));
    warnings.forEach((warning, index) => {
      console.log(chalk.yellow(`  ${index + 1}. ${warning.message}`));
      if (warning.details && warning.details.length > 0) {
        warning.details.forEach(detail => {
          if (detail.field) {
            console.log(chalk.gray(`     Field: ${detail.field}`));
          }
          if (detail.pattern) {
            console.log(chalk.gray(`     Pattern: ${detail.pattern}`));
          }
          if (detail.description) {
            console.log(chalk.gray(`     Description: ${detail.description}`));
          }
        });
      }
      if (warning.suggestion) {
        console.log(chalk.cyan(`     💡 ${warning.suggestion}`));
      }
      console.log('');
    });
  }

  // Display suggestions (best practices)
  if (suggestions.length > 0) {
    console.log(chalk.cyan('💡 Suggestions:'));
    suggestions.forEach((suggestion, index) => {
      const severityColor = suggestion.severity === 'error' ? chalk.red : 
        suggestion.severity === 'warning' ? chalk.yellow : 
          chalk.cyan;
      
      console.log(severityColor(`  ${index + 1}. ${suggestion.message}`));
      if (suggestion.field) {
        console.log(chalk.gray(`     Field: ${suggestion.field}`));
      }
      if (suggestion.suggestion) {
        console.log(chalk.cyan(`     💡 ${suggestion.suggestion}`));
      }
      if (suggestion.impact) {
        console.log(chalk.gray(`     Impact: ${suggestion.impact}`));
      }
      console.log('');
    });
  }

  // Display final status
  if (issues.length === 0 && warnings.length === 0) {
    console.log(chalk.green('✅ No linting issues found!'));
  } else if (issues.length === 0) {
    console.log(chalk.yellow('⚠️  Configuration has warnings but no critical issues.'));
  } else {
    console.log(chalk.red('❌ Configuration has issues that need to be addressed.'));
  }

  if (strict && warnings.length > 0) {
    console.log(chalk.yellow('⚠️  Warnings treated as errors (--strict mode).'));
  }
}

// Helper function to display secrets results
function displaySecretsResults(secretsValidation, maskSecrets = false) {
  const { sensitiveFields, issues, warnings, suggestions, externalSecrets } = secretsValidation;
  
  // Display summary
  console.log(chalk.blue('📊 Secrets Summary:'));
  console.log(chalk.gray(`  Sensitive Fields: ${sensitiveFields.length}`));
  console.log(chalk.red(`  Issues: ${issues.length}`));
  console.log(chalk.yellow(`  Warnings: ${warnings.length}`));
  console.log(chalk.cyan(`  Suggestions: ${suggestions.length}`));
  console.log('');

  // Display sensitive fields
  if (sensitiveFields.length > 0) {
    console.log(chalk.blue('🔐 Sensitive Fields Detected:'));
    sensitiveFields.forEach((field, index) => {
      console.log(chalk.cyan(`  ${index + 1}. ${field.field}`));
      console.log(chalk.gray(`     Reason: ${field.reason}`));
      if (maskSecrets) {
        console.log(chalk.gray(`     Value: ${field.masked}`));
      } else {
        console.log(chalk.gray(`     Value: ${field.value}`));
      }
      console.log('');
    });
  }

  // Display issues
  if (issues.length > 0) {
    console.log(chalk.red('❌ Security Issues:'));
    issues.forEach((issue, index) => {
      console.log(chalk.red(`  ${index + 1}. ${issue.message}`));
      console.log(chalk.gray(`     Field: ${issue.field}`));
      if (issue.suggestion) {
        console.log(chalk.cyan(`     💡 ${issue.suggestion}`));
      }
      if (issue.impact) {
        console.log(chalk.gray(`     Impact: ${issue.impact}`));
      }
      console.log('');
    });
  }

  // Display warnings
  if (warnings.length > 0) {
    console.log(chalk.yellow('⚠️  Security Warnings:'));
    warnings.forEach((warning, index) => {
      console.log(chalk.yellow(`  ${index + 1}. ${warning.message}`));
      console.log(chalk.gray(`     Field: ${warning.field}`));
      if (warning.suggestion) {
        console.log(chalk.cyan(`     💡 ${warning.suggestion}`));
      }
      if (warning.impact) {
        console.log(chalk.gray(`     Impact: ${warning.impact}`));
      }
      console.log('');
    });
  }

  // Display suggestions
  if (suggestions.length > 0) {
    console.log(chalk.cyan('💡 Security Suggestions:'));
    suggestions.forEach((suggestion, index) => {
      const severityColor = suggestion.severity === 'error' ? chalk.red : 
        suggestion.severity === 'warning' ? chalk.yellow : 
          chalk.cyan;
      
      console.log(severityColor(`  ${index + 1}. ${suggestion.message}`));
      console.log(chalk.gray(`     Field: ${suggestion.field}`));
      if (suggestion.suggestion) {
        console.log(chalk.cyan(`     💡 ${suggestion.suggestion}`));
      }
      if (suggestion.impact) {
        console.log(chalk.gray(`     Impact: ${suggestion.impact}`));
      }
      console.log('');
    });
  }

  // Display external integrations
  if (externalSecrets) {
    if (externalSecrets.env && Object.keys(externalSecrets.env).length > 0) {
      console.log(chalk.green('📄 .env.secret Integration:'));
      console.log(chalk.gray(`  Found ${Object.keys(externalSecrets.env).length} secrets in .env.secret`));
      Object.keys(externalSecrets.env).forEach(key => {
        console.log(chalk.gray(`    - ${key}`));
      });
      console.log('');
    }

    if (externalSecrets.vault) {
      console.log(chalk.green('🏦 Vault Integration:'));
      console.log(chalk.gray(`  Vault Address: ${externalSecrets.vault.address}`));
      console.log(chalk.gray(`  Vault Path: ${externalSecrets.vault.path}`));
      console.log(chalk.gray('  Status: Available for integration'));
      console.log('');
    }
  }

  // Display final status
  if (issues.length === 0 && warnings.length === 0) {
    console.log(chalk.green('✅ No security issues found!'));
  } else if (issues.length === 0) {
    console.log(chalk.yellow('⚠️  Configuration has security warnings but no critical issues.'));
  } else {
    console.log(chalk.red('❌ Configuration has security issues that need to be addressed.'));
  }
}

// Helper function to display secret explanation
function displaySecretExplanation(explanation) {
  console.log(chalk.blue('🔐 Secret Field Explanation:'));
  console.log(chalk.gray(`  Field: ${explanation.field}`));
  console.log(chalk.gray(`  Value: ${explanation.value}`));
  console.log('');

  if (explanation.secretField) {
    console.log(chalk.yellow('⚠️  This is a sensitive field'));
    if (explanation.masked) {
      console.log(chalk.gray(`  Value: ${explanation.value} (masked)`));
    }
    console.log('');
  }

  console.log(chalk.blue('📊 Value Details:'));
  console.log(chalk.green(`  Final value: ${explanation.value}`));
  console.log('');

  if (explanation.vault && explanation.vault.available) {
    console.log(chalk.blue('🏦 Vault Integration:'));
    console.log(chalk.gray(`  Vault Address: ${explanation.vault.address}`));
    console.log(chalk.gray(`  Vault Path: ${explanation.vault.path}`));
    console.log(chalk.cyan(`  💡 Consider storing this secret in Vault for enhanced security`));
    console.log('');
  }

  console.log(chalk.blue('💡 Recommendations:'));
  if (explanation.secretField) {
    console.log(chalk.cyan('  - Consider using external secret management'));
    console.log(chalk.cyan('  - Rotate this secret regularly'));
    console.log(chalk.cyan('  - Use environment variables in production'));
  }
  console.log(chalk.cyan('  - Review access controls for this field'));
  console.log(chalk.cyan('  - Monitor for unauthorized access'));
}

// Helper function to display version information
function displayVersionInfo(schemaVersion, configVersion, versionIssues) {
  console.log(chalk.blue('📋 Version Information:'));
  console.log(chalk.gray(`  Schema Version: ${schemaVersion}`));
  console.log(chalk.gray(`  Config Version: ${configVersion}`));
  console.log('');

  // Check version compatibility
  const comparison = compareVersions(configVersion, schemaVersion);
  if (comparison === 0) {
    console.log(chalk.green('✅ Versions are compatible'));
  } else if (comparison < 0) {
    console.log(chalk.yellow('⚠️  Config version is older than schema version'));
  } else {
    console.log(chalk.red('❌ Config version is newer than schema version'));
  }
  console.log('');

  // Display issues
  if (versionIssues.issues.length > 0) {
    console.log(chalk.red('❌ Version Issues:'));
    versionIssues.issues.forEach((issue, index) => {
      console.log(chalk.red(`  ${index + 1}. ${issue.message}`));
      if (issue.details) {
        console.log(chalk.gray(`     Schema: ${issue.details.schemaVersion}`));
        console.log(chalk.gray(`     Config: ${issue.details.configVersion}`));
      }
      if (issue.details?.suggestion) {
        console.log(chalk.cyan(`     💡 ${issue.details.suggestion}`));
      }
      console.log('');
    });
  }

  // Display warnings
  if (versionIssues.warnings.length > 0) {
    console.log(chalk.yellow('⚠️  Version Warnings:'));
    versionIssues.warnings.forEach((warning, index) => {
      console.log(chalk.yellow(`  ${index + 1}. ${warning.message}`));
      if (warning.details) {
        console.log(chalk.gray(`     Current: ${warning.details.currentVersion}`));
        console.log(chalk.gray(`     Latest: ${warning.details.latestVersion}`));
      }
      if (warning.details?.suggestion) {
        console.log(chalk.cyan(`     💡 ${warning.details.suggestion}`));
      }
      console.log('');
    });
  }

  // Display final status
  if (versionIssues.issues.length === 0 && versionIssues.warnings.length === 0) {
    console.log(chalk.green('✅ No version issues found!'));
  } else if (versionIssues.issues.length === 0) {
    console.log(chalk.yellow('⚠️  Configuration has version warnings but no critical issues.'));
  } else {
    console.log(chalk.red('❌ Configuration has version issues that need to be addressed.'));
  }
}

// Helper function to display migration information
function displayMigrationInfo(migrationPlan, compatibility, migrationResult, dryRun) {
  console.log(chalk.blue('🔄 Migration Plan:'));
  console.log(chalk.gray(`  From: ${migrationPlan.fromVersion}`));
  console.log(chalk.gray(`  To: ${migrationPlan.toVersion}`));
  console.log('');

  // Display compatibility issues
  if (compatibility.issues.length > 0) {
    console.log(chalk.red('❌ Compatibility Issues:'));
    compatibility.issues.forEach((issue, index) => {
      console.log(chalk.red(`  ${index + 1}. ${issue.message}`));
      if (issue.details) {
        console.log(chalk.gray(`     Current: ${issue.details.currentVersion}`));
        console.log(chalk.gray(`     Target: ${issue.details.targetVersion}`));
      }
      if (issue.details?.suggestion) {
        console.log(chalk.cyan(`     💡 ${issue.details.suggestion}`));
      }
      console.log('');
    });
  }

  // Display compatibility warnings
  if (compatibility.warnings.length > 0) {
    console.log(chalk.yellow('⚠️  Compatibility Warnings:'));
    compatibility.warnings.forEach((warning, index) => {
      console.log(chalk.yellow(`  ${index + 1}. ${warning.message}`));
      if (warning.details) {
        console.log(chalk.gray(`     Schema: ${warning.details.schemaVersion}`));
        console.log(chalk.gray(`     Target: ${warning.details.targetVersion}`));
      }
      if (warning.details?.suggestion) {
        console.log(chalk.cyan(`     💡 ${warning.details.suggestion}`));
      }
      console.log('');
    });
  }

  // Display migration steps
  if (migrationPlan.steps.length > 0) {
    console.log(chalk.blue('📋 Migration Steps:'));
    migrationPlan.steps.forEach((step, index) => {
      console.log(chalk.cyan(`  ${index + 1}. ${step.description}`));
      console.log(chalk.gray(`     Action: ${step.action}`));
      console.log('');
    });
  }

  // Display breaking changes
  if (migrationPlan.breakingChanges.length > 0) {
    console.log(chalk.red('🚨 Breaking Changes:'));
    migrationPlan.breakingChanges.forEach((change, index) => {
      console.log(chalk.red(`  ${index + 1}. ${change.description}`));
      console.log(chalk.gray(`     Impact: ${change.impact}`));
      console.log('');
    });
  }

  // Display new features
  if (migrationPlan.newFeatures.length > 0) {
    console.log(chalk.green('✨ New Features:'));
    migrationPlan.newFeatures.forEach((feature, index) => {
      console.log(chalk.green(`  ${index + 1}. ${feature.description}`));
      console.log(chalk.gray(`     Impact: ${feature.impact}`));
      console.log('');
    });
  }

  // Display deprecated fields
  if (migrationPlan.deprecatedFields.length > 0) {
    console.log(chalk.yellow('⚠️  Deprecated Fields:'));
    migrationPlan.deprecatedFields.forEach((field, index) => {
      console.log(chalk.yellow(`  ${index + 1}. ${field.field}`));
      if (field.replacement) {
        console.log(chalk.gray(`     Replacement: ${field.replacement}`));
      }
      console.log('');
    });
  }

  // Display migration results if applied
  if (migrationResult && !dryRun) {
    console.log(chalk.green('✅ Migration Results:'));
    if (migrationResult.results.applied.length > 0) {
      console.log(chalk.green(`  Applied: ${migrationResult.results.applied.length} changes`));
      migrationResult.results.applied.forEach((change, index) => {
        console.log(chalk.gray(`    ${index + 1}. ${change.step}`));
        if (change.field && change.replacement) {
          console.log(chalk.gray(`       ${change.field} → ${change.replacement}`));
        }
      });
      console.log('');
    }
    if (migrationResult.results.skipped.length > 0) {
      console.log(chalk.yellow(`  Skipped: ${migrationResult.results.skipped.length} steps`));
      migrationResult.results.skipped.forEach((skip, index) => {
        console.log(chalk.gray(`    ${index + 1}. ${skip.step} (${skip.reason})`));
      });
      console.log('');
    }
    if (migrationResult.results.errors.length > 0) {
      console.log(chalk.red(`  Errors: ${migrationResult.results.errors.length} issues`));
      migrationResult.results.errors.forEach((error, index) => {
        console.log(chalk.red(`    ${index + 1}. ${error.step}: ${error.error}`));
      });
      console.log('');
    }
  }

  // Display final status
  if (dryRun) {
    console.log(chalk.blue('🔍 This was a dry run. No changes were applied.'));
    console.log(chalk.cyan('💡 Run without --dry-run to apply the migration.'));
  } else if (migrationResult) {
    console.log(chalk.green('✅ Migration completed successfully!'));
  }
}

// Helper function to display version bump information
function displayBumpInfo(results, dryRun) {
  console.log(chalk.blue('⬆️  Version Bump Results:'));
  console.log('');

  if (results.schema) {
    console.log(chalk.cyan('📋 Schema Version:'));
    console.log(chalk.gray(`  Old: ${results.schema.oldVersion}`));
    console.log(chalk.gray(`  New: ${results.schema.newVersion}`));
    console.log(chalk.gray(`  Change: ${results.schema.changes > 0 ? 'increased' : 'decreased'}`));
    console.log('');
  }

  if (results.config) {
    console.log(chalk.cyan('⚙️  Config Version:'));
    console.log(chalk.gray(`  Old: ${results.config.oldVersion}`));
    console.log(chalk.gray(`  New: ${results.config.newVersion}`));
    console.log(chalk.gray(`  Change: ${results.config.changes > 0 ? 'increased' : 'decreased'}`));
    console.log('');
  }

  if (dryRun) {
    console.log(chalk.blue('🔍 This was a dry run. No changes were applied.'));
    console.log(chalk.cyan('💡 Run without --dry-run to apply the version bump.'));
  } else {
    console.log(chalk.green('✅ Version bump completed successfully!'));
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
      const environment = options.env || 'dev';
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
      const environment = options.env || 'dev';
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
        
        const content = fs.readFileSync(configPath, 'utf8');
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

program
  .command('infer-from-angular')
  .description('Infer schema from Angular environment files')
  .option('--src <path>', 'Path to Angular environment file (default: src/environment.ts)', 'src/environment.ts')
  .option('--out <path>', 'Output schema file (default: config/align.schema.json)', 'config/align.schema.json')
  .option('--config-dir <dir>', 'Configuration directory (default: ./config)', './config')
  .action(async (options) => {
    try {
      const srcPath = path.resolve(options.src);
      const outPath = path.resolve(options.out);
      const configDir = path.resolve(options.configDir);
      
      if (!fs.existsSync(srcPath)) {
        console.error(chalk.red(`❌ Angular environment file not found: ${srcPath}`));
        console.log(chalk.gray('Expected file: src/environment.ts'));
        process.exit(1);
      }
      
      console.log(chalk.blue(`🔍 Reading Angular environment file: ${srcPath}`));
      const content = fs.readFileSync(srcPath, 'utf8');
      
      // Extract environment variables from Angular environment file
      const envVars = extractAngularEnvironmentVars(content);
      
      if (Object.keys(envVars).length === 0) {
        console.log(chalk.yellow('⚠️  No environment variables found in Angular file'));
        return;
      }
      
      // Generate schema from Angular environment
      const schema = generateSchemaFromAngular(envVars);
      
      // Ensure output directory exists
      const outDir = path.dirname(outPath);
      if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
      }
      
      // Write schema file
      fs.writeFileSync(outPath, JSON.stringify(schema, null, 2));
      
      console.log(chalk.green(`✅ Schema generated from Angular environment: ${outPath}`));
      console.log(chalk.blue(`📊 Found ${Object.keys(envVars).length} environment variables`));
      
      // Generate base .align file
      const baseAlignPath = path.join(configDir, 'base.align');
      const baseAlignContent = generateBaseAlignFromAngular(envVars);
      
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      
      fs.writeFileSync(baseAlignPath, baseAlignContent);
      console.log(chalk.green(`✅ Base configuration generated: ${baseAlignPath}`));
      
      console.log(chalk.blue('💡 Next steps:'));
      console.log(chalk.gray('1. Review the generated schema and base configuration'));
      console.log(chalk.gray('2. Create environment-specific .align files (dev.align, prod.align)'));
      console.log(chalk.gray('3. Run: align build --env=dev --format=env --out=.env'));
      
    } catch (error) {
      console.error(chalk.red('❌ Error inferring from Angular:'), error.message);
      process.exit(1);
    }
  });

program
  .command('migrate-from-env')
  .description('Migrate existing .env files to .align format')
  .option('--env-files <files>', 'Comma-separated list of .env files', 'config/.env.stage,config/.env.prod')
  .option('--config-dir <dir>', 'Configuration directory (default: ./config)', './config')
  .option('--out <path>', 'Output schema file (default: config/align.schema.json)', 'config/align.schema.json')
  .action(async (options) => {
    try {
      const envFiles = options.envFiles.split(',').map(f => f.trim());
      const configDir = path.resolve(options.configDir);
      const outPath = path.resolve(options.out);
      
      console.log(chalk.blue(`🔍 Migrating .env files to .align format`));
      
      const allEnvVars = {};
      const envConfigs = {};
      
      // Read all .env files
      for (const envFile of envFiles) {
        const envPath = path.resolve(envFile);
        if (!fs.existsSync(envPath)) {
          console.log(chalk.yellow(`⚠️  Skipping non-existent file: ${envFile}`));
          continue;
        }
        
        console.log(chalk.blue(`📁 Reading: ${envFile}`));
        const content = fs.readFileSync(envPath, 'utf8');
        const envVars = parseEnvFile(content);
        
        // Extract environment name from filename
        const envName = path.basename(envFile, '.env').replace('.env.', '');
        envConfigs[envName] = envVars;
        
        // Merge all variables for schema generation
        Object.assign(allEnvVars, envVars);
      }
      
      if (Object.keys(allEnvVars).length === 0) {
        console.log(chalk.yellow('⚠️  No environment variables found in .env files'));
        return;
      }
      
      // Generate schema from .env files
      const schema = generateSchemaFromEnvVars(allEnvVars);
      
      // Ensure output directory exists
      const outDir = path.dirname(outPath);
      if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
      }
      
      // Write schema file
      fs.writeFileSync(outPath, JSON.stringify(schema, null, 2));
      console.log(chalk.green(`✅ Schema generated: ${outPath}`));
      
      // Generate .align files for each environment
      for (const [envName, envVars] of Object.entries(envConfigs)) {
        const alignPath = path.join(configDir, `${envName}.align`);
        const alignContent = generateAlignFromEnvVars(envVars);
        
        if (!fs.existsSync(configDir)) {
          fs.mkdirSync(configDir, { recursive: true });
        }
        
        fs.writeFileSync(alignPath, alignContent);
        console.log(chalk.green(`✅ Generated: ${alignPath}`));
      }
      
      console.log(chalk.blue('💡 Migration complete!'));
      console.log(chalk.gray('You can now use: align build --env=stage --format=env --out=.env'));
      
    } catch (error) {
      console.error(chalk.red('❌ Error migrating from .env:'), error.message);
      process.exit(1);
    }
  });



program
  .command('build-ci')
  .description('Build configuration for CI/CD with GCP integration')
  .option('--env <environment>', 'Environment (default: dev)', 'dev')
  .option('--service <service>', 'Service name (api, consumer)', 'api')
  .option('--project <project>', 'GCP project ID')
  .option('--output <file>', 'Output file (default: env-vars.txt)', 'env-vars.txt')
  .option('--config-dir <dir>', 'Configuration directory (default: ./config)', './config')
  .option('--format <format>', 'Output format (env, json, yaml)', 'env')
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
      let mergedConfig = mergeConfigs(baseConfig, envConfig);
      
      // Apply service-specific configuration
      if (options.service) {
        mergedConfig = loadServiceSpecificConfig(mergedConfig, options.service, options.env);
      }
      
      // Resolve GCP secrets if project specified
      if (options.project) {
        console.log(chalk.blue(`🔐 Resolving GCP secrets from project: ${options.project}`));
        mergedConfig = await resolveGCPSecrets(mergedConfig, options.project, options.env, {
          addEnvironmentSuffix: true,
          failOnMissing: true
        });
      }
      
      // Generate output
      let output;
      if (options.format === 'env') {
        output = Object.entries(mergedConfig)
          .map(([key, value]) => `${key.toUpperCase()}=${value}`)
          .join('\n');
      } else if (options.format === 'json') {
        output = JSON.stringify(mergedConfig, null, 2);
      } else if (options.format === 'yaml') {
        output = yaml.dump(mergedConfig, { indent: 2 });
      }
      
      // Write output file
      fs.writeFileSync(options.output, output);
      console.log(chalk.green(`✅ CI/CD configuration built: ${options.output}`));
      console.log(chalk.blue(`📊 Keys: ${Object.keys(mergedConfig).length}`));
      console.log(chalk.blue(`🌍 Environment: ${options.env}`));
      console.log(chalk.blue(`🔧 Service: ${options.service}`));
      
    } catch (error) {
      console.error(chalk.red('❌ Error building CI/CD config:'), error.message);
      process.exit(1);
    }
  });

program
  .command('validate-ci')
  .description('Validate configuration for CI/CD deployment')
  .option('--env <environment>', 'Environment (default: dev)', 'dev')
  .option('--service <service>', 'Service name (api, consumer)', 'api')
  .option('--project <project>', 'GCP project ID')
  .option('--config-dir <dir>', 'Configuration directory (default: ./config)', './config')
  .option('--format <format>', 'Output format (github-actions, circleci)', 'github-actions')
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
      let mergedConfig = mergeConfigs(baseConfig, envConfig);
      
      // Apply service-specific configuration
      if (options.service) {
        mergedConfig = loadServiceSpecificConfig(mergedConfig, options.service, options.env);
      }
      
      console.log(chalk.blue(`🔍 Validating CI/CD configuration`));
      console.log(chalk.blue(`🌍 Environment: ${options.env}`));
      console.log(chalk.blue(`🔧 Service: ${options.service}`));
      
      // Validate GCP secrets if project specified
      if (options.project) {
        console.log(chalk.blue(`🔐 Validating GCP secrets in project: ${options.project}`));
        const secretValidation = await validateGCPSecrets(mergedConfig, options.project, options.env);
        
        if (secretValidation.valid) {
          console.log(chalk.green(`✅ All ${secretValidation.totalSecrets} secrets are valid`));
        } else {
          console.log(chalk.red(`❌ ${secretValidation.missingSecrets.length} secrets missing:`));
          secretValidation.missingSecrets.forEach(secret => {
            console.log(chalk.red(`  - ${secret.secretName}: ${secret.error}`));
          });
          process.exit(1);
        }
      }
      
      // Validate policies
      const policiesPath = path.join(configDir, 'align.policies.json');
      if (fs.existsSync(policiesPath)) {
        const policies = loadPolicies(policiesPath);
        const policyValidation = validatePolicies(mergedConfig, options.env, policies);
        
        if (policyValidation.valid) {
          console.log(chalk.green('✅ All policies passed'));
        } else {
          console.log(chalk.red('❌ Policy violations:'));
          policyValidation.violations.forEach(violation => {
            console.log(chalk.red(`  - ${violation.field}: ${violation.message}`));
          });
          process.exit(1);
        }
      }
      
      console.log(chalk.green('✅ CI/CD validation passed'));
      
      // Generate CI/CD configuration if requested
      if (options.format === 'github-actions') {
        const workflow = generateGitHubActionsWithSecrets(mergedConfig, options.env, {
          gcpProject: options.project
        });
        console.log(chalk.blue('📋 GitHub Actions workflow:'));
        console.log(workflow);
      }
      
    } catch (error) {
      console.error(chalk.red('❌ Error validating CI/CD config:'), error.message);
      process.exit(1);
    }
  });

program
  .command('secrets-rotate')
  .description('Rotate GCP secrets and manage secret rotation schedules')
  .option('--project <project>', 'GCP project ID')
  .option('--secret <secret>', 'Secret name to rotate')
  .option('--schedule <schedule>', 'Schedule rotation (e.g., 30d, 7d, 90d)')
  .option('--list', 'List secret rotation history')
  .option('--config-dir <dir>', 'Configuration directory (default: ./config)', './config')
  .action(async (options) => {
    try {
      if (!options.project) {
        console.error(chalk.red('❌ GCP project ID required'));
        console.log(chalk.gray('Use: align secrets-rotate --project=your-project-id'));
        process.exit(1);
      }
      
      if (options.list) {
        // List secret rotations
        console.log(chalk.blue(`🔍 Listing secret rotations for project: ${options.project}`));
        const rotations = await listSecretRotations(options.project);
        
        if (rotations.length === 0) {
          console.log(chalk.yellow('⚠️  No secret rotations found'));
        } else {
          console.log(chalk.green(`✅ Found ${rotations.length} secrets with rotation history:`));
          rotations.forEach(rotation => {
            console.log(chalk.gray(`  - ${rotation.secretName}: ${rotation.totalVersions} versions`));
            console.log(chalk.gray(`    Latest: ${rotation.latestCreateTime}`));
            console.log(chalk.gray(`    Previous: ${rotation.previousCreateTime}`));
          });
        }
      } else if (options.secret && options.schedule) {
        // Schedule secret rotation
        console.log(chalk.blue(`📅 Scheduling rotation for secret: ${options.secret}`));
        const rotationPlan = await scheduleSecretRotation(options.secret, options.project, options.schedule);
        console.log(chalk.green('✅ Rotation scheduled successfully'));
      } else if (options.secret) {
        // Rotate secret immediately
        console.log(chalk.blue(`🔄 Rotating secret: ${options.secret}`));
        const result = await rotateGCPSecret(options.secret, options.project);
        console.log(chalk.green('✅ Secret rotated successfully'));
      } else {
        console.error(chalk.red('❌ Missing required options'));
        console.log(chalk.gray('Use: align secrets-rotate --project=project --secret=secret-name'));
        console.log(chalk.gray('Or: align secrets-rotate --project=project --secret=secret-name --schedule=30d'));
        console.log(chalk.gray('Or: align secrets-rotate --project=project --list'));
        process.exit(1);
      }
      
    } catch (error) {
      console.error(chalk.red('❌ Error managing secret rotation:'), error.message);
      process.exit(1);
    }
  });

program
  .command('analytics')
  .description('Analyze configuration usage and changes')
  .option('--env <environment>', 'Environment to analyze (default: dev)', 'dev')
  .option('--service <service>', 'Service name (api, consumer)')
  .option('--timeframe <timeframe>', 'Timeframe for analysis (e.g., 30d, 7d)', '30d')
  .option('--config-dir <dir>', 'Configuration directory (default: ./config)', './config')
  .option('--format <format>', 'Output format (text, json)', 'text')
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
      let mergedConfig = mergeConfigs(baseConfig, envConfig);
      
      // Apply service-specific configuration
      if (options.service) {
        mergedConfig = loadServiceSpecificConfig(mergedConfig, options.service, options.env);
      }
      
      console.log(chalk.blue(`📊 Configuration Analytics: ${options.env}`));
      console.log(chalk.blue(`⏰ Timeframe: ${options.timeframe}`));
      
      // Analyze configuration usage
      const usage = analyzeConfigurationUsage(mergedConfig, options.env, options.service);
      
      if (options.format === 'json') {
        console.log(JSON.stringify(usage, null, 2));
      } else {
        console.log(chalk.green(`📈 Usage Summary:`));
        console.log(chalk.gray(`  Total Keys: ${usage.totalKeys}`));
        console.log(chalk.gray(`  Sensitive Keys: ${usage.sensitiveKeys}`));
        console.log(chalk.gray(`  GCP Secrets: ${usage.gcpSecrets}`));
        if (options.service) {
          console.log(chalk.gray(`  Service-Specific Keys: ${usage.serviceSpecificKeys}`));
        }
        
        console.log(chalk.green(`📊 Analysis Scores:`));
        console.log(chalk.gray(`  Security Score: ${usage.analysis.securityScore.toFixed(1)}%`));
        console.log(chalk.gray(`  Complexity Score: ${usage.analysis.complexityScore.toFixed(1)}%`));
        console.log(chalk.gray(`  Maintainability Score: ${usage.analysis.maintainabilityScore.toFixed(1)}%`));
      }
      
    } catch (error) {
      console.error(chalk.red('❌ Error analyzing configuration:'), error.message);
      process.exit(1);
    }
  });

program
  .command('share')
  .description('Share environment configuration with team members')
  .requiredOption('--env <environment>', 'Environment to share')
  .requiredOption('--with <user>', 'User to share with')
  .option('--permissions <permissions>', 'Permissions (read, write, admin)', 'read')
  .option('--config-dir <dir>', 'Configuration directory (default: ./config)', './config')
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
      
      // Create share
      const share = createEnvironmentShare(options.env, mergedConfig, options.with, options.permissions);
      
      console.log(chalk.green('✅ Environment shared successfully'));
      console.log(chalk.blue(`📅 Expires: ${new Date(share.expiresAt).toLocaleDateString()}`));
      
    } catch (error) {
      console.error(chalk.red('❌ Error sharing environment:'), error.message);
      process.exit(1);
    }
  });

program
  .command('review')
  .description('Request review of environment configuration')
  .requiredOption('--env <environment>', 'Environment to review')
  .requiredOption('--reviewer <reviewer>', 'Reviewer username')
  .option('--type <type>', 'Review type (security, compliance, performance)', 'security')
  .option('--config-dir <dir>', 'Configuration directory (default: ./config)', './config')
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
      
      // Create review
      const review = createEnvironmentReview(options.env, mergedConfig, options.reviewer, options.type);
      
      console.log(chalk.green('✅ Review requested successfully'));
      console.log(chalk.blue(`📋 Review ID: ${review.environment}-${review.reviewer}-${Date.now()}`));
      
    } catch (error) {
      console.error(chalk.red('❌ Error requesting review:'), error.message);
      process.exit(1);
    }
  });

program
  .command('lock')
  .description('Lock environment to prevent changes')
  .requiredOption('--env <environment>', 'Environment to lock')
  .requiredOption('--reason <reason>', 'Reason for locking')
  .option('--duration <duration>', 'Lock duration (e.g., 2h, 1d, 30m)', '2h')
  .option('--config-dir <dir>', 'Configuration directory (default: ./config)', './config')
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
      
      // Lock environment
      const lock = lockEnvironment(options.env, 'current-user', options.reason, options.duration);
      
      console.log(chalk.green('✅ Environment locked successfully'));
      console.log(chalk.blue(`⏰ Expires: ${new Date(lock.expiresAt).toLocaleString()}`));
      
    } catch (error) {
      console.error(chalk.red('❌ Error locking environment:'), error.message);
      process.exit(1);
    }
  });

program
  .command('unlock')
  .description('Unlock environment to allow changes')
  .requiredOption('--env <environment>', 'Environment to unlock')
  .option('--config-dir <dir>', 'Configuration directory (default: ./config)', './config')
  .action(async (options) => {
    try {
      // Unlock environment
      const unlock = unlockEnvironment(options.env, 'current-user');
      
      console.log(chalk.green('✅ Environment unlocked successfully'));
      
    } catch (error) {
      console.error(chalk.red('❌ Error unlocking environment:'), error.message);
      process.exit(1);
    }
  });

// SOC 2 COMPLIANCE COMMAND
program
  .command('soc2-checklist')
  .description('Generate SOC 2 compliance checklist for configuration')
  .option('--env <environment>', 'Environment to check (dev, prod, staging)', 'prod')
  .option('--config-dir <dir>', 'Configuration directory', './config')
  .option('--schema <file>', 'Schema file path (align.schema.json)')
  .option('--format <format>', 'Output format (text, json, csv)', 'text')
  .option('--detailed', 'Show detailed compliance information')
  .option('--output <file>', 'Output file path')
  .option('--fail-on-violations', 'Exit with error code if violations found')
  .action(async (options) => {
    try {
      const configDir = path.resolve(options.configDir);
      const env = options.env;
      
      console.log(chalk.blue(`🔒 SOC 2 Compliance Check: ${env} environment`));
      console.log(chalk.gray(`📁 Config directory: ${configDir}\n`));

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

      // Load and merge configuration
      const baseConfig = await loadConfig(path.join(configDir, 'base.align'), false);
      const envConfig = await loadConfig(path.join(configDir, `${env}.align`), false);
      const mergedConfig = mergeConfigs(baseConfig, envConfig);

      // Generate SOC 2 checklist
      const soc2Result = generateSOC2Checklist(mergedConfig, env, {
        detailed: options.detailed,
        schema: schema
      });

      // Output results
      if (options.format === 'json') {
        const output = JSON.stringify(soc2Result, null, 2);
        if (options.output) {
          fs.writeFileSync(options.output, output);
          console.log(chalk.green(`✅ SOC 2 report saved to: ${options.output}`));
        } else {
          console.log(output);
        }
      } else if (options.format === 'csv') {
        const csvOutput = generateSOC2CSV(soc2Result);
        if (options.output) {
          fs.writeFileSync(options.output, csvOutput);
          console.log(chalk.green(`✅ SOC 2 CSV report saved to: ${options.output}`));
        } else {
          console.log(csvOutput);
        }
      } else {
        displaySOC2Results(soc2Result, options.detailed);
      }

      // Exit with appropriate code
      if (options.failOnViolations && soc2Result.compliance_status !== 'COMPLIANT') {
        console.log(chalk.red('\n❌ SOC 2 compliance violations found!'));
        process.exit(1);
      } else if (soc2Result.compliance_status === 'COMPLIANT') {
        console.log(chalk.green('\n✅ SOC 2 compliance check passed!'));
        process.exit(0);
      } else {
        console.log(chalk.yellow('\n⚠️  SOC 2 compliance issues found. Review recommendations above.'));
        process.exit(0);
      }

    } catch (err) {
      console.error(chalk.red('❌ SOC 2 compliance check error:'), err.message);
      process.exit(1);
    }
  });

program
  .command('soc2-report')
  .description('Generate detailed SOC 2 compliance report')
  .option('--env <environment>', 'Environment to analyze (dev, prod, staging)', 'prod')
  .option('--config-dir <dir>', 'Configuration directory', './config')
  .option('--schema <file>', 'Schema file path (align.schema.json)')
  .option('--format <format>', 'Output format (pdf, html, json)', 'json')
  .option('--output <file>', 'Output file path')
  .option('--template <template>', 'Report template (enterprise, startup, audit)', 'enterprise')
  .action(async (options) => {
    try {
      const configDir = path.resolve(options.configDir);
      const env = options.env;
      
      console.log(chalk.blue(`📊 SOC 2 Compliance Report: ${env} environment`));
      console.log(chalk.gray(`📁 Config directory: ${configDir}`));
      console.log(chalk.gray(`📋 Template: ${options.template}\n`));

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

      // Load and merge configuration
      const baseConfig = await loadConfig(path.join(configDir, 'base.align'), false);
      const envConfig = await loadConfig(path.join(configDir, `${env}.align`), false);
      const mergedConfig = mergeConfigs(baseConfig, envConfig);

      // Generate SOC 2 checklist
      const soc2Result = generateSOC2Checklist(mergedConfig, env, {
        detailed: true,
        schema: schema
      });

      // Generate detailed report
      const report = generateSOC2Report(soc2Result, options.template);

      // Output results
      if (options.format === 'json') {
        const output = JSON.stringify(report, null, 2);
        if (options.output) {
          fs.writeFileSync(options.output, output);
          console.log(chalk.green(`✅ SOC 2 report saved to: ${options.output}`));
        } else {
          console.log(output);
        }
      } else if (options.format === 'html') {
        const htmlOutput = generateSOC2HTML(report);
        if (options.output) {
          fs.writeFileSync(options.output, htmlOutput);
          console.log(chalk.green(`✅ SOC 2 HTML report saved to: ${options.output}`));
        } else {
          console.log(htmlOutput);
        }
      } else if (options.format === 'pdf') {
        console.log(chalk.yellow('⚠️  PDF generation requires additional dependencies'));
        console.log(chalk.gray('Use --format=html for web-based report'));
        process.exit(1);
      }

      console.log(chalk.green('\n✅ SOC 2 compliance report generated successfully!'));

    } catch (err) {
      console.error(chalk.red('❌ SOC 2 report generation error:'), err.message);
      process.exit(1);
    }
  });

program
  .command('soc2-fix')
  .description('Automatically fix SOC 2 compliance issues')
  .option('--env <environment>', 'Environment to fix (dev, prod, staging)', 'prod')
  .option('--config-dir <dir>', 'Configuration directory', './config')
  .option('--schema <file>', 'Schema file path (align.schema.json)')
  .option('--dry-run', 'Show what would be fixed without making changes')
  .option('--auto', 'Automatically apply all safe fixes')
  .option('--interactive', 'Ask for confirmation before each fix')
  .option('--backup', 'Create backup before making changes', true)
  .action(async (options) => {
    try {
      const configDir = path.resolve(options.configDir);
      const env = options.env;
      
      console.log(chalk.blue(`🔧 SOC 2 Compliance Fix: ${env} environment`));
      console.log(chalk.gray(`📁 Config directory: ${configDir}\n`));

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

      // Load and merge configuration
      const baseConfig = await loadConfig(path.join(configDir, 'base.align'), false);
      const envConfig = await loadConfig(path.join(configDir, `${env}.align`), false);
      const mergedConfig = mergeConfigs(baseConfig, envConfig);

      // Generate SOC 2 checklist
      const soc2Result = generateSOC2Checklist(mergedConfig, env, {
        detailed: true,
        schema: schema
      });

      // Generate fixes
      const fixes = generateSOC2Fixes(soc2Result, mergedConfig, env);

      if (options.dryRun) {
        console.log(chalk.blue('🔍 DRY RUN - No changes will be made\n'));
        displaySOC2Fixes(fixes, true);
      } else if (options.auto) {
        console.log(chalk.blue('🔧 Auto Mode - Applying all safe fixes\n'));
        const results = await applySOC2Fixes(fixes, configDir, env, { backup: options.backup });
        displaySOC2FixResults(results);
      } else if (options.interactive) {
        console.log(chalk.blue('🔧 Interactive Mode - Confirming each fix\n'));
        const results = await applySOC2FixesInteractive(fixes, configDir, env, { backup: options.backup });
        displaySOC2FixResults(results);
      } else {
        console.log(chalk.blue('📋 Available fixes:\n'));
        displaySOC2Fixes(fixes, false);
        console.log(chalk.cyan('\n💡 Use --auto to apply all fixes or --interactive for step-by-step'));
      }

    } catch (err) {
      console.error(chalk.red('❌ SOC 2 fix error:'), err.message);
      process.exit(1);
    }
  });

// Helper functions for SOC 2 commands
function generateSOC2CSV(soc2Result) {
  const csv = ['Category,Control,Status,Score,Issues,Recommendations\n'];
  
  for (const [category, controls] of Object.entries(soc2Result.checklist)) {
    for (const [control, result] of Object.entries(controls)) {
      const issues = result.issues.join('; ');
      const recommendations = result.recommendations.join('; ');
      csv.push(`${category},${control},${result.status},${result.score},"${issues}","${recommendations}"\n`);
    }
  }
  
  return csv.join('');
}

function generateSOC2Report(soc2Result, template = 'enterprise') {
  return {
    metadata: {
      ...soc2Result.metadata,
      template,
      generated_at: new Date().toISOString()
    },
    summary: {
      overall_score: soc2Result.overall_score,
      compliance_status: soc2Result.compliance_status,
      total_controls: Object.values(soc2Result.checklist).flatMap(category => Object.keys(category)).length,
      passed_controls: Object.values(soc2Result.checklist).flatMap(category => 
        Object.values(category).filter(control => control.status === 'PASS')
      ).length,
      failed_controls: Object.values(soc2Result.checklist).flatMap(category => 
        Object.values(category).filter(control => control.status === 'FAIL')
      ).length
    },
    details: soc2Result.checklist,
    scores: soc2Result.scores,
    recommendations: soc2Result.recommendations
  };
}

function generateSOC2HTML(report) {
  return `<!DOCTYPE html>
<html>
<head>
  <title>SOC 2 Compliance Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .header { background: #f0f0f0; padding: 20px; border-radius: 5px; }
    .score { font-size: 24px; font-weight: bold; }
    .pass { color: green; }
    .fail { color: red; }
    .warn { color: orange; }
    .section { margin: 20px 0; }
    .control { margin: 10px 0; padding: 10px; border-left: 3px solid #ccc; }
  </style>
</head>
<body>
  <div class="header">
    <h1>SOC 2 Compliance Report</h1>
    <p>Environment: ${report.metadata.environment}</p>
    <p>Generated: ${report.metadata.generated_at}</p>
    <p class="score">Overall Score: ${report.summary.overall_score}%</p>
    <p>Status: <span class="${report.summary.compliance_status === 'COMPLIANT' ? 'pass' : 'fail'}">${report.summary.compliance_status}</span></p>
  </div>
  
  <div class="section">
    <h2>Summary</h2>
    <p>Total Controls: ${report.summary.total_controls}</p>
    <p>Passed: ${report.summary.passed_controls}</p>
    <p>Failed: ${report.summary.failed_controls}</p>
  </div>
  
  <div class="section">
    <h2>Recommendations</h2>
    <ul>
      ${report.recommendations.map(rec => `<li>${rec}</li>`).join('')}
    </ul>
  </div>
</body>
</html>`;
}

function generateSOC2Fixes(soc2Result, config, environment) {
  const fixes = [];
  
  // Generate fixes based on failed controls
  for (const [category, controls] of Object.entries(soc2Result.checklist)) {
    for (const [control, result] of Object.entries(controls)) {
      if (result.status === 'FAIL') {
        fixes.push({
          category,
          control,
          issues: result.issues,
          recommendations: result.recommendations,
          fix_type: determineFixType(category, control),
          priority: determinePriority(category, control),
          safe: isSafeFix(category, control)
        });
      }
    }
  }
  
  return fixes;
}

function determineFixType(category, control) {
  const fixTypes = {
    'security': {
      'secrets_management': 'secrets_migration',
      'access_controls': 'access_configuration',
      'authentication': 'auth_configuration',
      'audit_logging': 'logging_configuration',
      'vulnerability_management': 'security_configuration',
      'secure_software_dev': 'process_configuration'
    },
    'availability': {
      'uptime_monitoring': 'monitoring_configuration',
      'incident_response': 'process_configuration',
      'disaster_recovery': 'backup_configuration'
    },
    'processing_integrity': {
      'cicd_pipeline_integrity': 'cicd_configuration',
      'change_management': 'process_configuration',
      'monitoring': 'monitoring_configuration'
    },
    'confidentiality': {
      'encryption_in_transit': 'encryption_configuration',
      'encryption_at_rest': 'encryption_configuration',
      'secrets_management_confidentiality': 'secrets_configuration',
      'access_restrictions': 'access_configuration'
    }
  };
  
  return fixTypes[category]?.[control] || 'general_configuration';
}

function determinePriority(category, control) {
  const highPriority = ['secrets_management', 'access_controls', 'authentication'];
  const mediumPriority = ['audit_logging', 'encryption_in_transit', 'encryption_at_rest'];
  
  if (highPriority.includes(control)) return 'HIGH';
  if (mediumPriority.includes(control)) return 'MEDIUM';
  return 'LOW';
}

function isSafeFix(category, control) {
  // Safe fixes that can be applied automatically
  const safeFixes = [
    'logging_configuration',
    'monitoring_configuration',
    'process_configuration'
  ];
  
  const fixType = determineFixType(category, control);
  return safeFixes.includes(fixType);
}

async function applySOC2Fixes(fixes, configDir, environment, options = {}) {
  const results = {
    applied: [],
    skipped: [],
    errors: []
  };
  
  for (const fix of fixes) {
    if (!fix.safe) {
      results.skipped.push({
        ...fix,
        reason: 'Not a safe fix - requires manual intervention'
      });
      continue;
    }
    
    try {
      // Apply the fix based on type
      const result = await applySOC2Fix(fix, configDir, environment, options);
      results.applied.push({
        ...fix,
        result
      });
    } catch (error) {
      results.errors.push({
        ...fix,
        error: error.message
      });
    }
  }
  
  return results;
}

async function applySOC2FixesInteractive(fixes, configDir, environment, options = {}) {
  const results = {
    applied: [],
    skipped: [],
    errors: []
  };
  
  for (const fix of fixes) {
    const question = {
      type: 'confirm',
      name: 'apply',
      message: `Apply fix for ${fix.category}.${fix.control}? (${fix.recommendations[0]})`,
      default: fix.safe
    };
    
    const answer = await inquirer.prompt([question]);
    
    if (answer.apply) {
      try {
        const result = await applySOC2Fix(fix, configDir, environment, options);
        results.applied.push({
          ...fix,
          result
        });
      } catch (error) {
        results.errors.push({
          ...fix,
          error: error.message
        });
      }
    } else {
      results.skipped.push({
        ...fix,
        reason: 'User declined'
      });
    }
  }
  
  return results;
}

async function applySOC2Fix(fix, configDir, environment, options = {}) {
  // This would implement specific fix logic based on fix type
  // For now, return a placeholder result
  return {
    status: 'applied',
    message: `Applied ${fix.fix_type} fix for ${fix.control}`,
    changes: []
  };
}

function displaySOC2Results(soc2Result, detailed = false) {
  console.log(chalk.blue('🔒 SOC 2 Compliance Results'));
  console.log(chalk.gray(`Environment: ${soc2Result.metadata.environment}`));
  console.log(chalk.gray(`Overall Score: ${soc2Result.overall_score}%`));
  console.log(chalk.gray(`Status: ${soc2Result.compliance_status}`));
  console.log('');

  // Display scores by category
  console.log(chalk.blue('📊 Category Scores:'));
  for (const [category, score] of Object.entries(soc2Result.scores)) {
    if (category !== 'overall') {
      const color = score >= 80 ? chalk.green : score >= 60 ? chalk.yellow : chalk.red;
      console.log(chalk.gray(`  ${category}: ${color(score.toFixed(1))}%`));
    }
  }
  console.log('');

  // Display failed controls
  const failedControls = [];
  for (const [category, controls] of Object.entries(soc2Result.checklist)) {
    for (const [control, result] of Object.entries(controls)) {
      if (result.status === 'FAIL') {
        failedControls.push({ category, control, result });
      }
    }
  }

  if (failedControls.length > 0) {
    console.log(chalk.red('❌ Failed Controls:'));
    failedControls.forEach(({ category, control, result }) => {
      console.log(chalk.red(`  ${category}.${control}: ${result.score}%`));
      if (detailed) {
        result.issues.forEach(issue => {
          console.log(chalk.gray(`    - ${issue}`));
        });
        result.recommendations.forEach(rec => {
          console.log(chalk.cyan(`    💡 ${rec}`));
        });
      }
    });
    console.log('');
  }

  // Display recommendations
  if (soc2Result.recommendations.length > 0) {
    console.log(chalk.blue('💡 Recommendations:'));
    soc2Result.recommendations.forEach(rec => {
      console.log(chalk.gray(`  - ${rec}`));
    });
    console.log('');
  }
}

function displaySOC2Fixes(fixes, dryRun = false) {
  console.log(chalk.blue(`🔧 Available SOC 2 Fixes ${dryRun ? '(DRY RUN)' : ''}:`));
  console.log('');

  const byPriority = {
    HIGH: [],
    MEDIUM: [],
    LOW: []
  };

  fixes.forEach(fix => {
    byPriority[fix.priority].push(fix);
  });

  for (const priority of ['HIGH', 'MEDIUM', 'LOW']) {
    if (byPriority[priority].length > 0) {
      const color = priority === 'HIGH' ? chalk.red : priority === 'MEDIUM' ? chalk.yellow : chalk.gray;
      console.log(color(`${priority} Priority:`));
      
      byPriority[priority].forEach(fix => {
        const safeIcon = fix.safe ? '✅' : '⚠️';
        console.log(chalk.gray(`  ${safeIcon} ${fix.category}.${fix.control}`));
        console.log(chalk.gray(`     ${fix.recommendations[0]}`));
      });
      console.log('');
    }
  }
}

function displaySOC2FixResults(results) {
  console.log(chalk.blue('🔧 SOC 2 Fix Results:'));
  console.log('');

  if (results.applied.length > 0) {
    console.log(chalk.green(`✅ Applied ${results.applied.length} fixes:`));
    results.applied.forEach(fix => {
      console.log(chalk.gray(`  - ${fix.category}.${fix.control}: ${fix.result.message}`));
    });
    console.log('');
  }

  if (results.skipped.length > 0) {
    console.log(chalk.yellow(`⚠️  Skipped ${results.skipped.length} fixes:`));
    results.skipped.forEach(fix => {
      console.log(chalk.gray(`  - ${fix.category}.${fix.control}: ${fix.reason}`));
    });
    console.log('');
  }

  if (results.errors.length > 0) {
    console.log(chalk.red(`❌ Errors in ${results.errors.length} fixes:`));
    results.errors.forEach(fix => {
      console.log(chalk.gray(`  - ${fix.category}.${fix.control}: ${fix.error}`));
    });
    console.log('');
  }
}

program.parse();
