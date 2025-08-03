# Align Advanced Examples

This directory contains advanced examples demonstrating how to use Align for real-world scenarios.

## 🏆 Policy Validation Examples

### Overview
Environment-specific guardrails and business rules to prevent misconfigurations and enforce compliance.

### Structure
```
examples/policy-validation/
├── config/
│   ├── base.align      # Base configuration
│   ├── dev.align       # Development overrides
│   └── prod.align      # Production overrides
├── policies/
│   └── align.policies.json  # Environment-specific policies
└── validate-policies.js     # Policy validation script
```

### Usage
```bash
# Validate policies for production
cd examples/policy-validation
align validate-policies --env=prod --policy-file=./policies/align.policies.json

# Generate policy suggestions
align suggest-policies --env=prod

# This validates:
# - Debug mode disabled in production
# - SSL required in production
# - Proper timeouts and limits
# - Security compliance requirements
```

### Policy Types
- **Allowed Values**: Enforce specific values or arrays
- **Required Values**: Ensure critical settings are present
- **Numeric Ranges**: Enforce minimum/maximum values
- **Pattern Matching**: Validate strings against regex
- **Custom Validation**: Support for custom functions

### Features
- **Production Guardrails**: Prevent unsafe configurations
- **Compliance Enforcement**: Encode business rules as code
- **Security Validation**: Ensure SSL, secrets, and security settings
- **Performance Controls**: Enforce timeouts and connection limits
- **CI/CD Integration**: JSON output for automated validation

## 🌍 Cross-Language Export Examples

### Overview
Export Align configurations to 9+ different formats for maximum compatibility across languages and platforms.

### Structure
```
examples/cross-language/
├── config/
│   ├── base.align      # Base configuration
│   ├── dev.align       # Development overrides
│   └── prod.align      # Production overrides
├── exports/            # Generated files in various formats
└── generate-exports.js # Export generation script
```

### Usage
```bash
# Generate exports for all formats
cd examples/cross-language
node generate-exports.js

# This creates:
# - exports/config.json          # Universal JSON format
# - exports/config.yaml          # YAML for Kubernetes/Docker
# - exports/config.env           # Environment variables
# - exports/config.py            # Python settings class
# - exports/config.toml          # TOML for Rust/Go
# - exports/config.properties    # Java properties
# - exports/config.tf            # Terraform HCL
# - exports/config.ini           # INI configuration
# - exports/config.xml           # XML format
```

### Supported Formats
- **🐍 Python (.py)**: Settings class for Python applications
- **🦀 TOML (.toml)**: Configuration for Rust and Go projects
- **☕ Java (.properties)**: Properties files for Java applications
- **🏗️ Terraform (.tf)**: HCL for infrastructure as code
- **⚙️ INI (.ini)**: Traditional configuration format
- **📄 XML (.xml)**: XML configuration format
- **📋 JSON (.json)**: Universal format for applications
- **📝 YAML (.yaml)**: Infrastructure standard (K8s, Docker)
- **🔧 ENV (.env)**: Platform compatibility (Vercel, Heroku)

### Features
- **Language Agnostic**: Support for any programming language
- **Platform Integration**: Works with any deployment platform
- **Infrastructure as Code**: Generate Terraform configurations
- **Container Ready**: Docker and Kubernetes compatible
- **Cloud Native**: Works with all major cloud providers

## 📦 Library-Aware Configuration Examples

### Overview
Package schemas with namespacing to let external libraries declare their own configuration requirements.

### Structure
```
examples/library-aware/
├── config/
│   ├── base.align      # Base configuration
│   ├── dev.align       # Development overrides
│   └── prod.align      # Production overrides
├── node_modules/       # Simulated package dependencies
│   ├── express-auth/
│   │   └── align.schema.json  # Package schema
│   ├── postgres-db/
│   │   └── package.json       # Package with align field
│   └── redis-cache/
│       └── align.schema.json  # Package schema
└── demo-library-aware.js      # Demonstration script
```

### Usage
```bash
# Discover package schemas
cd examples/library-aware
align discover-packages

# Validate with package schemas
align validate --include-packages

# List all available schemas
align list-schemas

# Explain specific configuration values
align explain --key=express-auth.jwt_secret --include-packages
```

### Package Schema Examples
**express-auth/align.schema.json:**
```json
{
  "jwt_secret": {
    "type": "string",
    "required": true,
    "minLength": 32,
    "description": "JWT signing secret"
  },
  "jwt_expires_in": {
    "type": "string",
    "default": "1h",
    "description": "JWT token expiration"
  }
}
```

**postgres-db/package.json:**
```json
{
  "name": "postgres-db",
  "align": {
    "url": {
      "type": "string",
      "required": true,
      "pattern": "^postgresql://.*$"
    },
    "pool_size": {
      "type": "number",
      "min": 1,
      "max": 20,
      "default": 10
    }
  }
}
```

### Features
- **Package Discovery**: Automatically find package schemas
- **Namespacing**: `package.key` format for organization
- **Schema Merging**: Combine project and package schemas
- **Context Resolution**: Trace configuration origins
- **Validation**: Validate against all schemas

## 🐳 Kubernetes Deployment Examples

### Overview
Generate Kubernetes manifests from Align configurations with environment-specific overrides.

### Structure
```
examples/kubernetes/
├── config/
│   ├── base.align      # Base K8s configuration
│   ├── dev.align       # Development overrides
│   └── prod.align      # Production overrides
├── manifests/          # Generated K8s manifests
└── generate-k8s.js     # Generation script
```

### Usage
```bash
# Generate Kubernetes manifests
cd examples/kubernetes
node generate-k8s.js

# This creates:
# - manifests/dev/deployment.yaml
# - manifests/dev/service.yaml
# - manifests/dev/ingress.yaml
# - manifests/prod/deployment.yaml
# - manifests/prod/service.yaml
# - manifests/prod/ingress.yaml
```

### Features
- **Resource management**: CPU/memory limits and requests
- **Security contexts**: User/group configurations
- **Health checks**: Liveness and readiness probes
- **Networking**: Service types and port configurations
- **Storage**: Persistent volume configurations
- **Environment isolation**: Different settings per environment

## 🐳 Docker Compose Integration

### Overview
Generate Docker Compose files from Align configurations for multi-service applications.

### Structure
```
examples/docker-compose/
├── config/
│   ├── base.align      # Base Docker Compose config
│   ├── dev.align       # Development overrides
│   └── prod.align      # Production overrides
├── manifests/          # Generated Docker Compose files
└── generate-compose.js # Generation script
```

### Usage
```bash
# Generate Docker Compose files
cd examples/docker-compose
node generate-compose.js

# This creates:
# - manifests/docker-compose.dev.yml
# - manifests/docker-compose.prod.yml
```

### Features
- **Multi-service applications**: App, database, Redis, Nginx
- **Environment variables**: Dynamic configuration injection
- **Volume management**: Persistent data storage
- **Network configuration**: Custom networks and ports
- **Service dependencies**: Proper startup ordering

## 🔄 CI/CD Pipeline Examples

### Overview
GitHub Actions workflows that use Align for configuration management in CI/CD pipelines.

### Structure
```
examples/cicd/
└── .github/workflows/
    └── align-pipeline.yml  # Complete CI/CD pipeline
```

### Features
- **Configuration validation**: Validate all configs before deployment
- **Policy validation**: Enforce environment-specific policies
- **Security auditing**: Check for sensitive data and compliance
- **Environment deployment**: Separate dev and prod deployments
- **Dry-run testing**: Simulate changes before applying
- **Artifact management**: Store configurations as build artifacts

### Pipeline Stages
1. **Validate Config**: Check all `.align` files
2. **Validate Policies**: Enforce environment policies
3. **Security Audit**: Verify security settings
4. **Deploy Dev**: Deploy to development environment
5. **Deploy Prod**: Deploy to production environment

## 🔒 Security Compliance Examples

### Overview
Security-focused configurations with compliance auditing and validation.

### Structure
```
examples/security/
├── config/
│   ├── base.align      # Base security configuration
│   └── prod.align      # Production security overrides
└── security-audit.js   # Compliance auditing script
```

### Usage
```bash
# Run security compliance audit
cd examples/security
node security-audit.js
```

### Security Features
- **Authentication**: MFA, session management, login attempts
- **Encryption**: SSL/TLS, data encryption, cipher suites
- **Network Security**: Firewalls, rate limiting, CORS
- **Logging & Monitoring**: Audit logs, security logs, retention
- **Compliance**: GDPR, SOX, PCI compliance settings

### Compliance Checks
- ✅ Authentication settings validation
- ✅ Encryption requirements verification
- ✅ Network security configuration
- ✅ Logging and monitoring setup
- ✅ Regulatory compliance validation

## 🖥️ Interactive CLI Examples

### Overview
Guided wizards and interactive prompts for better Developer Experience.

### Structure
```
examples/interactive-cli/
├── config/
│   ├── base.align      # Base configuration
│   ├── dev.align       # Development overrides
│   └── prod.align      # Production overrides
├── setup-wizard.js     # Interactive setup demonstration
├── edit-wizard.js      # Interactive edit demonstration
└── troubleshoot-wizard.js # Interactive diagnosis demonstration
```

### Usage
```bash
# Interactive setup wizard
cd examples/interactive-cli
align setup

# Interactive configuration editor
align wizard

# Interactive troubleshooting
align troubleshoot
```

### Features
- **🛠️ Setup Wizard**: Guided configuration creation with validation
- **📝 Configuration Editor**: Interactive key-value editing with smart defaults
- **🔍 Troubleshoot Wizard**: Focused diagnosis with actionable recommendations
- **✅ Smart Validation**: Input validation with helpful error messages
- **🔄 Fallback Support**: Non-interactive mode for automation and CI/CD

### Example Flows
```bash
# Setup Wizard Flow
$ align setup
🛠️  Let's create a new Align config!

? What environment are you targeting? (Use arrow keys)
❯ dev
  prod
  staging

? Service name: (web)
? Port: (3000)
? Require authentication? (Y/n)
? Generate schema automatically? (Y/n)

✅ Configuration created successfully!
```

## 🧱 Module-Specific Configuration Examples

### Overview
Extract, validate, and export only the configuration keys needed by a specific module or package.

### Structure
```
examples/module-config/
├── config/
│   ├── base.align      # Base configuration with all modules
│   ├── dev.align       # Development overrides
│   └── prod.align      # Production overrides
├── modules/
│   ├── auth/
│   │   └── align.schema.json  # Auth module schema
│   ├── email/
│   │   └── align.schema.json  # Email module schema
│   └── database/
│       └── align.schema.json  # Database module schema
├── exports/            # Generated module-specific configs
└── demo-module-config.js # Demonstration script
```

### Usage
```bash
# List all available modules
cd examples/module-config
align list-modules

# Generate module-specific configs
align module-config --module auth --env dev
align module-config --module email --format yaml
align module-config --module database --format env

# Validate module configurations
align validate-module --module auth --env dev
```

### Example Output
```bash
# Auth module gets only its config
$ align module-config --module auth
{
  "auth_required": true,
  "rate_limit": 100,
  "jwt_secret": "your-super-secret-key"
}

# Email module gets only its config
$ align module-config --module email
{
  "email_smtp": "smtp://smtp.gmail.com:587",
  "email_from": "noreply@yourapp.com"
}

# Database module gets only its config
$ align module-config --module database
{
  "db_url": "postgres://localhost:5432/userdb"
}
```

### Features
- **🔒 Security**: Modules only see what they need (principle of least privilege)
- **🧹 Cleaner Code**: No more passing entire config objects around
- **🛡️ Validation**: Module-specific schema validation
- **📦 Modularity**: Each module declares its own config requirements
- **🧑‍💻 Better Debugging**: Clear which config each module uses

## 🧠 Schema Inference Examples

### Overview
Automatically generate schemas from existing `.align` files to jumpstart your configuration validation.

### Structure
```
examples/schema-inference/
├── config/
│   ├── base.align      # Existing configuration files
│   ├── dev.align       # Development overrides
│   └── prod.align      # Production overrides
├── inferred-schema.json # Generated schema
└── demo-inference.js   # Demonstration script
```

### Usage
```bash
# Infer schema from existing .align files
cd examples/schema-inference
align infer

# Advanced inference with options
align infer --mark-all-required --infer-patterns --infer-ranges --output yaml
```

### Example Input
```align
# config/base.align
service_name = "user-api"
port = 3000
debug = true
database_url = "postgresql://localhost:5432/db"
```

### Generated Schema
```json
{
  "type": "object",
  "properties": {
    "service_name": {
      "type": "string",
      "required": false,
      "default": "user-api"
    },
    "port": {
      "type": "number",
      "required": false,
      "default": 3000,
      "minimum": 1,
      "maximum": 65535
    },
    "debug": {
      "type": "boolean",
      "required": false,
      "default": true
    },
    "database_url": {
      "type": "string",
      "required": false,
      "default": "postgresql://localhost:5432/db",
      "pattern": "^https?://.*$"
    }
  }
}
```

### Features
- **Type Detection**: Automatically infers string, number, boolean, array types
- **Pattern Recognition**: Detects URLs, emails, and other common patterns
- **Range Inference**: Suggests min/max values for numbers
- **Multi-file Analysis**: Combines configs from multiple environments
- **Flexible Output**: JSON or YAML schema formats

## 🎯 Key Benefits

### **1. Environment Consistency**
- Same configuration structure across all environments
- Clear override patterns for environment-specific settings
- Validation ensures consistency

### **2. Security by Design**
- Security settings are explicit and validated
- Compliance requirements are built into the configuration
- Policy validation prevents unsafe configurations
- Audit trails for all configuration changes

### **3. DevOps Integration**
- Seamless integration with CI/CD pipelines
- Automated configuration validation
- Environment-specific deployments
- Cross-language compatibility

### **4. Infrastructure as Code**
- Configuration-driven infrastructure generation
- Version-controlled configuration management
- Reproducible deployments
- Package-aware configuration management

### **5. Enterprise Governance**
- Policy enforcement for compliance
- Library-aware configuration management
- Cross-language export capabilities
- Comprehensive validation and auditing

## 🚀 Getting Started

### 1. Choose Your Example
```bash
# For policy validation
cd examples/policy-validation

# For cross-language exports
cd examples/cross-language

# For library-aware configuration
cd examples/library-aware

# For interactive CLI
cd examples/interactive-cli

# For module-specific configuration
cd examples/module-config

# For schema inference
cd examples/schema-inference

# For Kubernetes deployments
cd examples/kubernetes

# For Docker Compose
cd examples/docker-compose

# For CI/CD pipelines
cd examples/cicd

# For security compliance
cd examples/security
```

### 2. Customize Configuration
Edit the `.align` files to match your requirements:
- `base.align`: Common settings across all environments
- `dev.align`: Development-specific overrides
- `prod.align`: Production-specific overrides

### 3. Generate Artifacts
Run the generation scripts to create your infrastructure files:
```bash
node validate-policies.js     # For policy validation
node generate-exports.js      # For cross-language exports
node demo-library-aware.js    # For library-aware config
node setup-wizard.js          # For interactive CLI
node demo-module-config.js    # For module-specific config
node demo-inference.js        # For schema inference
node generate-k8s.js          # For Kubernetes
node generate-compose.js      # For Docker Compose
node security-audit.js        # For security compliance
```

### 4. Deploy
Use the generated files in your deployment process:
```bash
# Policy Validation
align validate-policies --env=prod

# Cross-Language Export
align build --env=prod --format=python

# Library-Aware Config
align validate --include-packages

# Interactive CLI
align setup
align wizard
align troubleshoot

# Module-Specific Config
align module-config --module auth --env prod
align validate-module --module auth --env prod

# Schema Inference
align infer --mark-all-required

# Kubernetes
kubectl apply -f manifests/dev/

# Docker Compose
docker-compose -f manifests/docker-compose.dev.yml up

# CI/CD
# The pipeline will automatically use Align configurations
```

## 🔧 Customization

### Adding New Environments
1. Create a new `.align` file (e.g., `staging.align`)
2. Add environment-specific overrides
3. Update generation scripts to include the new environment

### Adding New Services
1. Add service configuration to `base.align`
2. Create service-specific overrides in environment files
3. Update generation scripts to handle the new service

### Custom Validation
1. Create custom schema files for your requirements
2. Add validation rules for your specific use cases
3. Integrate validation into your CI/CD pipeline

### Custom Policies
1. Create `align.policies.json` with your business rules
2. Define environment-specific policies
3. Integrate policy validation into your workflow

## 📚 Best Practices

### **1. Configuration Organization**
- Keep base configuration minimal and common
- Use environment files for environment-specific settings
- Document all configuration options
- Use namespacing for package configurations

### **2. Security**
- Never commit secrets to configuration files
- Use environment variables for sensitive data
- Validate security settings in CI/CD
- Enforce policies for production environments

### **3. Validation**
- Always validate configurations before deployment
- Use schema validation for complex requirements
- Test configuration changes in lower environments first
- Validate policies for each environment

### **4. Documentation**
- Document all configuration options
- Provide examples for common use cases
- Keep documentation updated with configuration changes
- Document policy requirements and compliance needs

### **5. Package Integration**
- Let packages declare their own configuration needs
- Use namespacing to avoid conflicts
- Validate against all package schemas
- Document package configuration requirements 