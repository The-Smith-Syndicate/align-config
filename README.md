# 🎯 Align - Configuration Language & Toolchain

[![npm version](https://img.shields.io/npm/v/align-config.svg)](https://www.npmjs.com/package/align-config)
[![npm downloads](https://img.shields.io/npm/dm/align-config.svg)](https://www.npmjs.com/package/align-config)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)
[![Node.js CI](https://img.shields.io/badge/Node.js-CI-brightgreen.svg)](https://github.com/thesmithsyndicate/align-config/actions)

**Align** is a domain-specific configuration language and toolchain that makes application configuration safe, predictable, 
and unified across environments. Replace scattered `.env`, YAML, JSON, and Kubernetes overrides with a single source of 
truth: `.align` files. **Perfect for Angular apps, AWS Lambda, and enterprise CI/CD pipelines.**

**📦 [Available on npm](https://www.npmjs.com/package/align-config) • 🏷️ Version 1.0.5**

## 📋 Table of Contents

- [🚀 Quick Start](#-quick-start)
- [🎯 What Problem Does Align Solve?](#-what-problem-does-align-solve)
- [🎯 How Align Works](#-how-align-works)
- [🔮 Features](#-features)
- [📁 Project Structure](#-project-structure)
- [🚀 Installation](#-installation)
- [🧪 Testing](#-testing)
- [📖 Usage](#-usage)
- [🔍 Diagnose Mode](#-diagnose-mode)
- [📦 Library-Aware Configuration](#-library-aware-configuration)
- [🔧 Risk-Aware Repair](#-risk-aware-repair)
- [🌍 Cross-Language Export](#-cross-language-export)
- [🏆 Policy Validation](#-policy-validation)
- [🧠 Schema Inference](#-schema-inference)
- [🖥️ Interactive CLI](#️-interactive-cli)
- [🧱 Module-Specific Configuration](#-module-specific-configuration)
- [📄 License](#-license)
- [🤝 Contributing](#-contributing)
- [📞 Support](#-support)

## 🚀 Quick Start

**Get started in 30 seconds:**

```bash
# 1. Install Align
npm install -g align-config

# 2. Create a new project with a template
align init --template=nodejs-api --app-name=myapp

# 3. Validate your configuration
align validate config/base.align --base

# 4. Build your configuration
align build --env=dev --out=./output/config.dev.json

# 5. Analyze your configuration
align analyze --config-dir=./config --env=dev
```

**That's it!** You now have a working configuration system. 🎉

### 🏢 **Enterprise Integration:**

**Perfect for Angular + AWS Lambda setups:**

```bash
# Migrate from existing .env files
align migrate-from-env --env-files=config/.env.stage,config/.env.prod

# Generate from Angular environment.ts
align infer-from-angular --src=src/environment.ts

# Build Docker-compatible .env files
align build --env=prod --format=env --out=.env

# Replace CI/CD commands
# Instead of: cp config/.env.prod .env
# Use: align build --env=prod --format=env --out=.env
```

## 🎯 What Problem Does Align Solve?

### ❌ The Problem with .env Files:
- **No validation** - typos break production
- **No type safety** - everything is a string
- **Manual environment management** - copy/paste between dev/prod
- **No insights** - no way to catch security or performance issues
- **Scattered configs** - .env, config.json, docker-compose.yml all over the place

### ✅ The Align Solution:
- **Type-safe configuration** - numbers are numbers, booleans are booleans
- **Built-in validation** - catch errors before deployment
- **Environment management** - clear dev/staging/prod separation
- **Security analysis** - find weak secrets, missing SSL, etc.
- **Performance insights** - identify caching, timeout, and optimization issues
- **Single source of truth** - all configs in one organized system

## 🏢 **Enterprise Features**

### **Angular + AWS Lambda Integration:**
- ✅ **Exact .env format compatibility** - Works with existing Docker builds
- ✅ **Boolean type support** - `ENABLE_SIGNUP=true` converts properly
- ✅ **Multi-environment support** - `dev-alpha`, `dev-bravo`, `qa`, `prod`
- ✅ **CI/CD integration** - One-line replacement for file copying
- ✅ **Angular environment migration** - Import from `src/environment.ts`
- ✅ **Backward compatibility** - Gradual migration without breaking changes

### **SOC2 Compliance Benefits:**
- ✅ **Secret detection & masking** - Never expose sensitive data
- ✅ **Policy enforcement** - Ensure security requirements
- ✅ **Configuration validation** - Prevent misconfigurations
- ✅ **Audit trail** - Track all configuration changes
- ✅ **Environment separation** - Prevent dev configs in production

## 🎯 How Align Works

### Step 1: Create Your Configuration
```bash
# Initialize with a template
align init --template=nodejs-api --app-name=myapp
```

**This creates:**
```
myapp/
├── config/
│   ├── base.align          # Shared settings
│   ├── dev.align           # Development overrides
│   ├── prod.align          # Production overrides
│   └── align.schema.json   # Validation rules
└── output/                 # Generated configs go here
```

### Step 2: Customize Your Settings
**Edit the generated files:**

```align
# config/base.align (shared across all environments)
app_name = "myapp"
port = 3000
database_url = "postgresql://localhost:5432/myapp"
jwt_secret = "your-super-secret-key-that-is-at-least-32-characters-long"
```

```align
# config/dev.align (development overrides)
debug = true
log_level = "debug"
database_url = "postgresql://localhost:5432/myapp_dev"
```

```align
# config/prod.align (production overrides)
debug = false
log_level = "error"
database_url = "postgresql://prod-db:5432/myapp_prod"
```

### Step 3: Validate Your Configuration
```bash
# Check for errors before deployment
align validate config/base.align --base
```

**This catches:**
- Missing required fields
- Invalid data types
- Schema violations
- Security issues

### Step 4: Build Your Configuration
```bash
# Generate config for development
align build --env=dev --out=./output/config.dev.json

# Generate config for production
align build --env=prod --out=./output/config.prod.json
```

**This creates:**
```json
// output/config.dev.json
{
  "app_name": "myapp",
  "port": 3000,
  "debug": true,
  "database_url": "postgresql://localhost:5432/myapp_dev",
  "jwt_secret": "your-super-secret-key-that-is-at-least-32-characters-long"
}
```

### Step 5: Use in Your Application
```javascript
// Instead of process.env everywhere
const config = require('./output/config.dev.json');

// Type-safe and validated!
const port = config.port;        // 3000 (number, not string!)
const debug = config.debug;       // true (boolean, not string!)
const dbUrl = config.database_url; // Already validated
```

### Step 6: Deploy with Confidence
```bash
# For Vercel/Heroku (generates .env file)
align build --env=prod --format=env --out=./.env

# For Docker (JSON config)
align build --env=prod --out=./config.json

# For Kubernetes (ConfigMap)
align build --env=prod --k8s-configmap --out=./configmap.yaml
```

## 🎯 Common Use Cases

### For New Projects
1. **Start with a template** - `align init --template=nodejs-api --app-name=myapp`
2. **Customize the config** - Edit the generated `.align` files
3. **Validate your changes** - `align validate config/base.align --base`

### For Existing Projects
1. **Convert existing config** - Create `base.align` from your current config
2. **Add environment overrides** - Create `dev.align`, `prod.align` for different environments
3. **Validate everything** - `align validate config/base.align --base`

### For Teams
1. **Add schema validation** - Create `align.schema.json` to enforce standards
2. **Use dry-run** - `align dry-run --env=prod --key=timeout --value=5000` to test changes
3. **Analyze configurations** - `align analyze --config-dir=./config --env=prod` for security/performance insights

### For Production
1. **Build production config** - `align build --env=prod --out=./output/config.prod.json`
2. **Generate Kubernetes ConfigMaps** - `align build --env=prod --k8s-configmap`
3. **Compare environments** - `align diff --env1=dev --env2=prod` to verify changes

## 🚀 Deployment Integration

### Vercel Integration
For platforms that expect `.env` files (like Vercel), convert `.align` to `.env`:

**Option 1: Build Script Integration**
```json
{
  "scripts": {
    "build": "align build --env=production --format=env --out=./.env && next build",
    "dev": "align build --env=development --format=env --out=./.env && next dev"
  }
}
```

**Option 2: Direct .env Output**
```bash
# Generate .env file directly
align build --env=production --format=env --out=./.env
```

### Docker Integration
```dockerfile
# Dockerfile
FROM node:18-alpine
COPY package*.json ./
RUN npm install
COPY . .

# Build config during image build
RUN npx align-config build --env=production --format=env --out=./.env

CMD ["npm", "start"]
```

### Kubernetes Integration
```bash
# Generate ConfigMap from .align files
align build --env=production --k8s-configmap --out=./k8s/configmap.yaml

# Apply to cluster
kubectl apply -f ./k8s/configmap.yaml
```

## 🎯 Purpose

**Align** is a domain-specific configuration language and toolchain that makes application configuration safe, predictable, and unified across environments. 

### **The Problem**
Most applications use scattered configuration files:
- `.env` files (environment variables)
- `config.json` (application config)
- `docker-compose.yml` (container config)
- Kubernetes ConfigMaps (deployment config)

This leads to:
- ❌ **Inconsistent formats** across environments
- ❌ **No validation** of configuration values
- ❌ **Hard to trace** where values come from
- ❌ **Difficult to manage** across teams

### **The Solution**
Replace all scattered config files with **`.align` files**:
- ✅ **Single format** for all configuration
- ✅ **Built-in validation** and type checking
- ✅ **Clear override paths** and traceability
- ✅ **Environment-specific** configurations
- ✅ **Schema-driven** validation rules

**Align replaces `.env` files with a more powerful, type-safe alternative.**

## 🔒 Security Benefits

### **Built-in Security Analysis**
```bash
align analyze --env=prod
```

**Finds security issues like:**
- Weak JWT secrets
- HTTP in production (should be HTTPS)
- Missing rate limiting
- Insecure database connections
- Debug mode in production

### **Validation Prevents Security Mistakes**
```json
{
  "jwt_secret": {
    "type": "string",
    "required": true,
    "minLength": 32,
    "pattern": "^[a-zA-Z0-9!@#$%^&*()_+\\-=\\[\\]{};':\"\\\\|,.<>\\/?]{32,}$"
  }
}
```

**Catches:**
- Short secrets
- Weak patterns
- Missing required security fields

## 📁 File Structure

```
/my-app/
├── config/
│   ├── base.align           # Base configuration
│   ├── dev.align            # Development overrides
│   ├── prod.align           # Production overrides
│   ├── align.schema.json    # Schema validation rules
├── output/
│   └── config.dev.json      # Generated config
```

### File Naming Conventions

**Required files:**
- `base.align` - Base configuration (always loaded first)
- `<env>.align` - Environment-specific overrides (e.g., `dev.align`, `prod.align`)

**Optional files:**
- `align.schema.json` - Schema validation rules
- `output/` - Directory for generated configurations

**File naming rules:**
- Use lowercase with underscores: `service_name`, `database_url`
- Environment names: `dev`, `prod`, `staging`, `test`
- Schema file must be named exactly: `align.schema.json`

## 📖 Configuration Format

### Basic Syntax
```align
service_name = "web"
timeout = 3000
auth_required = true
debug = false
port = 8080
database_url = "postgresql://localhost:5432/myapp"
cors_origins = ["http://localhost:3000", "https://myapp.com"]
```

### Nested Block Syntax
```align
service_name = "web"

service "auth" {
  port = 4000
  retries = 3
  timeout = 5000
}

service "api" {
  port = 8080
  cors_enabled = true
  rate_limit = 1000
}

database "main" {
  url = "postgresql://localhost:5432/myapp"
  pool_size = 10
  ssl = true
}
```

### Supported Types
- **Strings**: `"value"` or `value` (quotes optional)
- **Numbers**: `3000`, `3.14`
- **Booleans**: `true`, `false`
- **Arrays**: `["item1", "item2"]` or `[1, 2, 3]`
- **Comments**: `# comment` or `// comment`

## 🛠️ CLI Commands

**Note**: After installing with `npm install -g align-config`, you can use `align` instead of `node index.js`.

### Initialize from Template
```bash
# Using npm installation
align init --template=nodejs-api --app-name=myapp

# Using source installation
node index.js init --template=nodejs-api --app-name=myapp

# Available templates:
align init --template=nodejs-api --app-name=myapp
align init --template=python-api --app-name=myapp
align init --template=go-api --app-name=myapp
align init --template=react-app --app-name=myapp
align init --template=nextjs-app --app-name=myapp
align init --template=angular-app --app-name=myapp
align init --template=microservices --app-name=myapp
align init --template=database --app-name=myapp
```

#### Template Guide
Choose the template that matches your project type:

- **`nodejs-api`** - Node.js/Express REST APIs
- **`python-api`** - Python/FastAPI/Flask applications  
- **`go-api`** - Go microservices and APIs
- **`react-app`** - React frontend applications
- **`nextjs-app`** - Next.js full-stack applications
- **`angular-app`** - Angular frontend applications
- **`microservices`** - Distributed systems with multiple services
- **`database`** - Database-focused applications (PostgreSQL, Redis, etc.)

Creates a new configuration from a template:
- Copies template files to your config directory
- Replaces `app_name` placeholders with your app name
- Sets up validation schema
- Provides best practices for your project type

### Validate Configuration
```bash
# Using npm installation
align validate config/base.align --base
align validate config/dev.align
align validate config/base.align --schema config/align.schema.json

# Using source installation
node index.js validate config/base.align --base
node index.js validate config/dev.align
node index.js validate config/base.align --schema config/align.schema.json
```

Validates a `.align` file for:
- Required fields (when using `--base` flag)
- Type correctness (strings, numbers, booleans)
- Schema validation (when using `--schema`)
- Syntax errors

**Note**: Use `--base` flag only for base configuration files that should contain required fields like `service_name`.

### Build Configuration
```bash
# Using npm installation
align build --env=dev --out=./output/config.dev.json
align build --env=prod --format=yaml --out=./output/config.prod.yaml
align build --env=prod --format=env --out=./.env

# Using source installation
node index.js build --env=dev --out=./output/config.dev.json
node index.js build --env=prod --format=yaml --out=./output/config.prod.yaml
node index.js build --env=prod --format=env --out=./.env
```

Merges `base.align` and `<env>.align` files:
- Loads `base.align` first
- Applies `<env>.align` overrides
- Outputs merged JSON, YAML, or .env configuration

#### Output Formats

**JSON (default):**
```json
{
  "app_name": "myapp",
  "port": 3000,
  "debug": true,
  "database_url": "postgresql://localhost:5432/myapp_dev"
}
```

**YAML:**
```yaml
app_name: myapp
port: 3000
debug: true
database_url: postgresql://localhost:5432/myapp_dev
```

**Environment Variables (.env):**
```bash
APP_NAME="myapp"
PORT=3000
DEBUG=true
DATABASE_URL="postgresql://localhost:5432/myapp_dev"
```

**With Inline Comments (--comments flag):**
```bash
# Build with comments from schema descriptions
align build --env=dev --format=yaml --comments --out=./output/config.dev.yaml
align build --env=prod --format=jsonc --comments --out=./output/config.prod.jsonc
```

**YAML with Comments:**
```yaml
# Generated by Align - Cross-Language Configuration
# YAML format with inline descriptions

# Application name
app_name: "myapp"

# Server port
port: 3000

# Enable debug mode
debug: true

# Database connection URL
database_url: "postgresql://localhost:5432/myapp_dev"
```

**JSONC (JSON with Comments):**
```json
{
  // Application name
  "app_name": "myapp",
  // Server port
  "port": 3000,
  // Enable debug mode
  "debug": true,
  // Database connection URL
  "database_url": "postgresql://localhost:5432/myapp_dev"
}
```

**Note:** Standard JSON doesn't support comments. Use `--format=jsonc` for JSON with comments, or `--format=json` for valid JSON without comments.

### 🏢 **Enterprise Integration**

**Migrate from existing .env files:**
```bash
# Convert existing .env files to .align format
align migrate-from-env --env-files=config/.env.stage,config/.env.prod

# This creates:
# - config/align.schema.json (schema from your variables)
# - config/stage.align (converted from .env.stage)
# - config/prod.align (converted from .env.prod)
```

**Generate from Angular environment.ts:**
```bash
# Extract environment variables from Angular
align infer-from-angular --src=src/environment.ts

# This creates:
# - config/align.schema.json (schema from Angular environment)
# - config/base.align (default values from Angular)
```

**Build Docker-compatible .env files:**
```bash
# Generate exact .env format for Docker builds
align build --env=prod --format=env --out=.env

# Output format (no quotes, Docker-compatible):
# APP_NAME=myapp
# PORT=3000
# DEBUG=true
# ENABLE_SIGNUP=true
# ENABLE_DARK_MODE=false
```

**Replace CI/CD commands:**
```bash
# Instead of: cp config/.env.prod .env
# Use: align build --env=prod --format=env --out=.env

# GitHub Actions example:
# - name: Generate .env file
#   run: align build --env=${{ github.ref_name }} --format=env --out=.env

# CircleCI example:
# - run: align build --env=$CIRCLE_BRANCH --format=env --out=.env
```

**🐍 Python (.py):**
```python
# Generated by Align - Cross-Language Configuration
class Settings:
    """Configuration settings generated from .align files"""
    
    APP_NAME = "myapp"
    PORT = 3000
    DEBUG = True
    DATABASE_URL = "postgresql://localhost:5432/myapp_dev"
    
    @classmethod
    def get(cls, key, default=None):
        """Get configuration value with optional default"""
        return getattr(cls, key.upper().replace('-', '_'), default)
```

**🦀 TOML (.toml) - Rust/Go:**
```toml
# Generated by Align - Cross-Language Configuration
app_name = "myapp"
port = 3000
debug = true
database_url = "postgresql://localhost:5432/myapp_dev"
```

**☕ Java Properties (.properties):**
```properties
# Generated by Align - Cross-Language Configuration
app.name=myapp
port=3000
debug=true
database.url=postgresql://localhost:5432/myapp_dev
```

**🏗️ Terraform HCL (.tf):**
```hcl
# Generated by Align - Cross-Language Configuration
resource "local_file" "align_config" {
  filename = "config.json"
  content = jsonencode({
    app_name = "myapp",
    port = 3000,
    debug = true,
    database_url = "postgresql://localhost:5432/myapp_dev"
  })
}
```

**⚙️ INI (.ini):**
```ini
# Generated by Align - Cross-Language Configuration
[config]
app_name = myapp
port = 3000
debug = true
database_url = postgresql://localhost:5432/myapp_dev
```

**📄 XML (.xml):**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!-- Generated by Align - Cross-Language Configuration -->
<config>
  <app_name>myapp</app_name>
  <port>3000</port>
  <debug>true</debug>
  <database_url>postgresql://localhost:5432/myapp_dev</database_url>
</config>
```

### 💬 Inline Comments & Descriptions

**Include schema descriptions as comments in your output files** - Make your generated configurations self-documenting by including field descriptions from your schema as inline comments.

#### Usage
```bash
# Build with comments from schema descriptions
align build --env=dev --format=yaml --comments --out=./output/config.dev.yaml
align build --env=prod --format=jsonc --comments --out=./output/config.prod.jsonc
```

#### Requirements
- **Schema file required**: The `--comments` flag requires a schema file (`align.schema.json`) with field descriptions
- **All formats supported**: Works with JSON, JSONC, YAML, Python, TOML, Properties, HCL, INI, XML, and .env formats
- **Automatic detection**: Comments are only added for fields that have descriptions in the schema

#### Benefits
- **Self-documenting configs**: Generated files include context about what each field does
- **Team onboarding**: New developers can understand configs without reading source files
- **Compliance**: Many enterprise environments require documented configuration
- **Debugging**: Comments help understand what values mean in production

#### Example Schema with Descriptions
```json
{
  "timeout": {
    "type": "number",
    "description": "Timeout in ms for network calls"
  },
  "debug": {
    "type": "boolean", 
    "description": "Enable debug mode for development"
  }
}
```

**Generated YAML with Comments:**
```yaml
# Generated by Align - Cross-Language Configuration
# YAML format with inline descriptions

# Timeout in ms for network calls
timeout: 3000

# Enable debug mode for development
debug: true
```

**Generated JSON with Comments:**
```json
{
  // Timeout in ms for network calls
  "timeout": 3000,
  // Enable debug mode for development
  "debug": true
}
```

#### Options
- `--env <environment>`: Environment name (required)
- `--out <file>`: Output file path (default: `./output/config.json`)
- `--config-dir <dir>`: Configuration directory (default: `./config`)
- `--format <format>`: Output format (json, jsonc, yaml, env, python, toml, properties, hcl, ini, xml) (default: json)
- `--schema <file>`: Schema file path (align.schema.json)
- `--comments`: Include field descriptions as comments in output (requires schema)
- `--k8s-configmap`: Generate Kubernetes ConfigMap YAML

### Lint Configuration
```bash
# Using npm installation
align lint --env=dev
align lint --env=prod --strict
align lint --env=dev --fix

# Using source installation
node index.js lint --env=dev
node index.js lint --env=prod --strict
node index.js lint --env=dev --fix
```

Lints configuration for best practices, unused fields, and potential issues:

- **Detect unused fields** - Find configuration keys not defined in schema
- **Warn on overly permissive patterns** - Identify insecure regex patterns
- **Highlight conflicting defaults** - Find mismatches between config and schema defaults
- **Suggest best practices** - Security, performance, and configuration recommendations

#### Options
- `--env <environment>`: Environment to lint (dev, prod, staging) (default: dev)
- `--config-dir <dir>`: Configuration directory (default: ./config)
- `--schema <file>`: Schema file path (align.schema.json)
- `--format <format>`: Output format (text, json) (default: text)
- `--strict`: Treat warnings as errors
- `--fix`: Automatically fix fixable issues

#### Example Output
```bash
$ align lint --env=dev
🔍 Linting Configuration: dev environment
📁 Config directory: ./config

📋 Using schema: ./config/align.schema.json
📊 Lint Summary:
  Total Issues: 1
  Warnings: 1
  Suggestions: 4

❌ Issues:
  1. Conflicting default values detected
     Field: port
     Reason: Value conflict between config and schema default
     Config: 3001, Schema Default: 3000
     💡 Resolve conflicts by using consistent default values

⚠️  Warnings:
  1. Overly permissive patterns detected
     Field: database_url
     Pattern: ^.*$
     Description: Matches any string
     💡 Consider using more restrictive patterns for better security

💡 Suggestions:
  1. JWT secret is too short
     Field: jwt_secret
     💡 Use a secret with at least 32 characters
     Impact: Weak secrets can be easily compromised
```

#### Automatic Fixes
```bash
# Apply automatic fixes
align lint --env=dev --fix

# Output shows what was fixed
✅ Fixed 3 issues:
  - port: 3001 → 3000
  - jwt_secret: weak-secret → strong-secret-here
  - cors_origins: * → http://localhost:3000,http://localhost:8080

⚠️  1 issues require manual fixes:
  - database_url: Pattern restrictions require manual review

💾 Fixed configuration saved to files.
```

**What gets fixed automatically:**
- **Conflicting defaults** - Apply schema defaults to resolve conflicts
- **Weak secrets** - Generate strong JWT secrets
- **Overly permissive CORS** - Replace wildcards with specific origins
- **Performance issues** - Adjust timeout values to recommended ranges
- **Log levels** - Set appropriate levels for environment

**What requires manual review:**
- **Unused fields** - Require manual cleanup
- **Pattern restrictions** - Need manual pattern updates
- **Security policies** - Require business logic review

## 🔐 Secrets Management

**Secure handling of sensitive configuration fields** - Automatically detect, mask, and validate secrets with optional integration with external secret management systems.

### Secrets Configuration
```bash
# Using npm installation
align secrets --env=dev --mask
align secrets --env=prod --env-secrets --vault
align explain-secret --key=jwt_secret --mask

# Using source installation
node index.js secrets --env=dev --mask
node index.js secrets --env=prod --env-secrets --vault
node index.js explain-secret --key=jwt_secret --mask
```

Manages and validates sensitive configuration fields with automatic detection and masking:

- **Detect sensitive fields** - Automatically identify API keys, secrets, passwords, tokens
- **Mask sensitive values** - Hide sensitive data in output with partial masking
- **Validate secret strength** - Check for weak, default, or placeholder secrets
- **Environment validation** - Ensure production secrets are appropriate
- **External integrations** - Support for .env.secret files and Vault integration
- **Security recommendations** - Suggest improvements for secret management

#### Options
- `--env <environment>`: Environment to analyze (dev, prod, staging) (default: dev)
- `--config-dir <dir>`: Configuration directory (default: ./config)
- `--schema <file>`: Schema file path (align.schema.json)
- `--format <format>`: Output format (text, json) (default: text)
- `--mask`: Mask sensitive values in output
- `--env-secrets`: Check integration with .env.secret file
- `--vault`: Check Vault integration
- `--vault-address <address>`: Vault server address (default: http://localhost:8200)
- `--vault-token <token>`: Vault authentication token
- `--vault-path <path>`: Vault secrets path (default: secret)

#### Example Output
```bash
$ align secrets --env=prod --mask
🔐 Secrets Management: prod environment
📁 Config directory: ./config

📊 Secrets Summary:
  Sensitive Fields: 3
  Issues: 1
  Warnings: 2
  Suggestions: 4

🔐 Sensitive Fields Detected:
  1. jwt_secret
     Reason: matches sensitive field pattern
     Value: st**********et

  2. api_key
     Reason: matches sensitive field pattern
     Value: sk**********ey

  3. database_password
     Reason: matches sensitive field pattern
     Value: pa**********rd

❌ Security Issues:
  1. Secret is too short
     Field: jwt_secret
     💡 Use secrets with at least 16 characters
     Impact: Short secrets are easily compromised

⚠️  Security Warnings:
  1. Secret may be too simple
     Field: api_key
     💡 Use secrets with special characters and mixed case
     Impact: Simple secrets are easier to crack

  2. Development secret in production
     Field: database_password
     💡 Use production-appropriate secrets
     Impact: Development secrets may not be secure for production

💡 Security Suggestions:
  1. Secret available in .env.secret
     Field: jwt_secret
     💡 Use jwt_secret from .env.secret instead of inline value
     Impact: External secret management is more secure

🏦 Vault Integration:
  Vault Address: http://localhost:8200
  Vault Path: secret
  Status: Available for integration

❌ Configuration has security issues that need to be addressed.
```

#### Schema Integration
Mark fields as sensitive in your schema for automatic detection:

```json
{
  "properties": {
    "jwt_secret": {
      "type": "string",
      "description": "JWT signing secret",
      "sensitive": true,
      "minLength": 32
    },
    "api_key": {
      "type": "string", 
      "description": "External API key",
      "sensitive": true,
      "pattern": "^sk_[a-zA-Z0-9]{32,}$"
    }
  }
}
```

#### External Secret Management
**`.env.secret` Integration:**
```bash
# Create .env.secret file
JWT_SECRET=your-super-secret-jwt-key-here
API_KEY=sk_live_1234567890abcdef
DATABASE_PASSWORD=secure-db-password

# Use with align secrets
align secrets --env-secrets
```

**Vault Integration:**
```bash
# Check Vault integration
align secrets --vault --vault-address=https://vault.company.com

# Mock Vault operations (real implementation would use Vault API)
[MOCK] Getting secret jwt_secret from Vault at https://vault.company.com
[MOCK] Setting secret api_key in Vault at https://vault.company.com
```

## 🚀 CI/CD Helper

**Auto-generate CI/CD configuration for various platforms** - Generate ready-to-use CI/CD pipelines that integrate Align configuration validation, building, and security scanning.

### CI/CD Configuration
```bash
# Using npm installation
align ci --platform github
align ci --platform gitlab --environments dev,staging,prod
align ci --platform jenkins --security-scanning --parallel-builds

# Using source installation
node index.js ci --platform github
node index.js ci --platform gitlab --environments dev,staging,prod
node index.js ci --platform jenkins --security-scanning --parallel-builds
```

Generates CI/CD configuration files for popular platforms with built-in Align integration:

- **GitHub Actions** - Complete workflow with validation, building, and deployment
- **GitLab CI** - Multi-stage pipeline with environment-specific builds
- **Jenkins** - Declarative pipeline with parallel builds and security scanning
- **CircleCI** - Orb-based configuration with artifact management
- **Azure DevOps** - Multi-stage pipeline with artifact publishing

#### Supported Platforms
- **GitHub Actions** (`github`, `github-actions`)
- **GitLab CI** (`gitlab`, `gitlab-ci`)
- **Jenkins** (`jenkins`)
- **CircleCI** (`circleci`, `circle`)
- **Azure DevOps** (`azure`, `azure-devops`)

#### Options
- `--platform <platform>`: CI/CD platform (github, gitlab, jenkins, circleci, azure) (default: github)
- `--config-dir <dir>`: Configuration directory (default: ./config)
- `--env <environment>`: Environment to analyze for generation (default: dev)
- `--output <file>`: Output file path (auto-detected by platform)
- `--environments <list>`: Comma-separated list of environments (default: dev,prod)
- `--workflow-name <name>`: Workflow name (GitHub Actions) (default: align-config)
- `--security-scanning`: Include security scanning jobs (default: true)
- `--cache-dependencies`: Enable dependency caching (default: true)
- `--matrix-strategy`: Use matrix strategy for builds (GitHub Actions) (default: true)
- `--deployment-strategy <strategy>`: Deployment strategy (manual, auto, none) (default: manual)
- `--parallel-builds`: Enable parallel builds (Jenkins) (default: true)
- `--format <format>`: Output format (yaml, json) (default: yaml)

#### Example Output
```bash
$ align ci --platform github --environments dev,prod
🚀 CI/CD Configuration Generator: github
📁 Config directory: ./config
🌍 Environment: dev

✅ CI/CD configuration generated successfully!
📄 Output: .github/workflows/align-config.yml
🏗️  Platform: github
🌍 Environments: dev, prod
🔐 Security scanning included
💾 Dependency caching enabled
📊 Matrix strategy enabled

💡 Next steps:
  1. Review the generated .github/workflows/align-config.yml
  2. Customize the configuration as needed
  3. Commit and push to trigger CI/CD
  4. Monitor the pipeline execution
```

#### Generated GitHub Actions Workflow
```yaml
name: align-config
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      - name: Install dependencies
        run: npm ci
      - name: Validate configuration
        run: align validate config/base.align
      - name: Lint configuration
        run: align lint --env=dev --strict

  build-dev:
    runs-on: ubuntu-latest
    needs: validate
    strategy:
      matrix:
        format: [json, yaml, env]
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      - name: Install dependencies
        run: npm ci
      - name: Build dev configuration
        run: align build --env=dev --format=${{ matrix.format }} --out=./dist/config.dev.${{ matrix.format }}
      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: config-dev-${{ matrix.format }}
          path: ./dist/config.dev.*

  build-prod:
    runs-on: ubuntu-latest
    needs: validate
    strategy:
      matrix:
        format: [json, yaml, env]
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      - name: Install dependencies
        run: npm ci
      - name: Build prod configuration
        run: align build --env=prod --format=${{ matrix.format }} --out=./dist/config.prod.${{ matrix.format }}
      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: config-prod-${{ matrix.format }}
          path: ./dist/config.prod.*

  security:
    runs-on: ubuntu-latest
    needs: validate
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm ci
      - name: Security scan
        run: align secrets --env=prod --mask --format=json > security-report.json
      - name: Upload security report
        uses: actions/upload-artifact@v4
        with:
          name: security-report
          path: security-report.json

  deploy-dev:
    runs-on: ubuntu-latest
    needs: build-dev
    environment: dev
    steps:
      - name: Download artifacts
        uses: actions/download-artifact@v4
        with:
          name: config-dev-*
      - name: Deploy to dev
        run: echo "Deploying configuration to dev environment"

  deploy-prod:
    runs-on: ubuntu-latest
    needs: build-prod
    if: github.ref == 'refs/heads/main'
    environment: prod
    steps:
      - name: Download artifacts
        uses: actions/download-artifact@v4
        with:
          name: config-prod-*
      - name: Deploy to prod
        run: echo "Deploying configuration to prod environment"
```

#### Platform-Specific Features

**GitHub Actions:**
- Matrix strategy for multiple output formats
- Environment-specific deployments
- Security scanning with artifact upload
- Dependency caching for faster builds

**GitLab CI:**
- Multi-stage pipeline (validate, build, deploy)
- Environment-specific deployments
- Security scanning with reports
- Artifact management with expiration

**Jenkins:**
- Declarative pipeline syntax
- Parallel builds for multiple environments
- Security scanning integration
- Artifact archiving

**CircleCI:**
- Orb-based configuration
- Docker-based execution
- Artifact storage
- Workflow orchestration

**Azure DevOps:**
- Multi-stage pipeline
- Task-based execution
- Artifact publishing
- Environment management

## 📋 Versioning Support

**Schema and configuration versioning with migration helpers** - Track versions of schemas and configurations, detect compatibility issues, and safely migrate between versions.

### Version Management
```bash
# Using npm installation
align version --env=dev
align migrate --to-version=2.0.0 --dry-run
align bump --type=minor --target=schema

# Using source installation
node index.js version --env=dev
node index.js migrate --to-version=2.0.0 --dry-run
node index.js bump --type=minor --target=schema
```

Manages schema and configuration versions with comprehensive migration support:

- **Version tracking** - Track versions of schemas and configurations
- **Compatibility checking** - Detect version mismatches and compatibility issues
- **Migration planning** - Generate step-by-step migration plans
- **Safe migrations** - Apply migrations with backup and rollback support
- **Version bumping** - Increment major, minor, or patch versions
- **Deprecated field handling** - Automatically migrate deprecated fields

#### Commands

**`align version`** - Check version information and compatibility:
- `--env <environment>`: Environment to analyze (default: dev)
- `--config-dir <dir>`: Configuration directory (default: ./config)
- `--schema <file>`: Schema file path (align.schema.json)
- `--format <format>`: Output format (text, json) (default: text)

**`align migrate`** - Migrate configuration to a new version:
- `--to-version <version>`: Target version for migration
- `--dry-run`: Show migration plan without applying changes
- `--backup`: Create backup before migration (default: true)
- `--env <environment>`: Environment to migrate (default: dev)
- `--format <format>`: Output format (text, json) (default: text)

**`align bump`** - Bump version of schema or configuration:
- `--type <type>`: Bump type (major, minor, patch) (default: patch)
- `--target <target>`: Target to bump (schema, config, both) (default: both)
- `--dry-run`: Show what would be changed without applying
- `--env <environment>`: Environment to bump (default: dev)
- `--format <format>`: Output format (text, json) (default: text)

#### Example Output
```bash
$ align version --env=prod
📋 Version Management: prod environment
📁 Config directory: ./config

📋 Version Information:
  Schema Version: 2.1.0
  Config Version: 1.5.2

⚠️  Config version is older than schema version

⚠️  Version Warnings:
  1. Configuration is outdated
     Current: 1.5.2
     Latest: 2.1.0
     💡 Run align migrate to update configuration

❌ Configuration has version issues that need to be addressed.
```

#### Migration Example
```bash
$ align migrate --to-version=2.1.0 --dry-run
🔄 Migration: dev environment
📁 Config directory: ./config
🎯 Target version: 2.1.0

🔄 Migration Plan:
  From: 1.5.2
  To: 2.1.0

🚨 Breaking Changes:
  1. Major version change from 1.5.2 to 2.1.0
     Impact: Breaking changes may require manual intervention

✨ New Features:
  1. New features available in version 2.1.0
     Impact: New optional fields may be available

⚠️  Deprecated Fields:
  1. old_field_name
     Replacement: new_field_name

📋 Migration Steps:
  1. Backup current configuration
     Action: Create backup of current config files
  2. Validate current configuration
     Action: Run align validate to check current state
  3. Update schema to latest version
     Action: Update align.schema.json to latest version
  4. Migrate deprecated field 'old_field_name'
     Action: Replace 'old_field_name' with 'new_field_name'
  5. Validate migrated configuration
     Action: Run align validate to ensure migration was successful

🔍 This was a dry run. No changes were applied.
💡 Run without --dry-run to apply the migration.
```

#### Schema Versioning
Add version information to your schema:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "version": "2.1.0",
  "alignVersion": "1.0.0",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z",
  "type": "object",
  "properties": {
    "app_name": {
      "type": "string",
      "description": "Application name"
    },
    "new_field_name": {
      "type": "string",
      "description": "New field (replaces old_field_name)"
    }
  },
  "deprecated": {
    "old_field_name": {
      "replacement": "new_field_name",
      "since": "2.0.0",
      "message": "Use new_field_name instead"
    }
  }
}
```

#### Configuration Versioning
Configurations automatically include version metadata:

```json
{
  "app_name": "myapp",
  "port": 3000,
  "new_field_name": "value",
  "_metadata": {
    "version": "2.1.0",
    "schemaVersion": "2.1.0",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z",
    "generatedBy": "align-config"
  }
}
```

#### Version Bumping
```bash
# Bump patch version (1.0.0 → 1.0.1)
align bump --type=patch

# Bump minor version (1.0.0 → 1.1.0)
align bump --type=minor

# Bump major version (1.0.0 → 2.0.0)
align bump --type=major

# Bump only schema version
align bump --type=minor --target=schema

# Bump only config version
align bump --type=patch --target=config
```

## 🏆 Policy Validation

**Environment-specific guardrails and business rules** - Prevent misconfigurations like `debug = true` in production and encode team policies into your configuration system.

### 🚀 Why Policy Validation Matters

- **🔒 Prevent Production Disasters** - Catch unsafe configs before deployment
- **📋 Encode Business Rules** - Turn team policies into enforceable rules
- **🏢 Enterprise Trust** - Add governance and compliance to your configs
- **⚡ Real-World Validation** - Make `validate` far more powerful and applicable

### 📋 Policy Types

**Allowed Values:**
```json
{
  "production": {
    "debug": { "allowed": false },
    "log_level": { "allowed": ["error", "warn"] }
  }
}
```

**Required Values:**
```json
{
  "production": {
    "ssl": { "required": true },
    "jwt_secret": { "required": true }
  }
}
```

**Numeric Ranges:**
```json
{
  "production": {
    "timeout": { "min": 5000 },
    "max_connections": { "max": 100 }
  }
}
```

**Pattern Matching:**
```json
{
  "production": {
    "database_url": { "pattern": "^postgresql://.*$" },
    "jwt_secret": { "pattern": "^.{32,}$" }
  }
}
```

### 🛠️ Usage

**Validate Policies:**
```bash
# Validate production config against policies
align validate-policies --env=prod

# Use custom policy file
align validate-policies --env=prod --policy-file=./custom.policies.json

# JSON output for CI/CD
align validate-policies --env=prod --format=json
```

**Generate Policy Suggestions:**
```bash
# Get suggestions for current config
align suggest-policies --env=prod

# Analyze specific environment
align suggest-policies --env=staging
```

### 📄 Policy File Format

Create `align.policies.json` in your project root:

```json
{
  "production": {
    "debug": {
      "allowed": false,
      "message": "Debug mode should not be enabled in production"
    },
    "log_level": {
      "allowed": ["error", "warn"],
      "message": "Production should use error or warn log level"
    },
    "ssl": {
      "required": true,
      "message": "SSL must be enabled in production"
    },
    "timeout": {
      "min": 5000,
      "message": "Production timeouts should be at least 5 seconds"
    }
  },
  "staging": {
    "debug": {
      "allowed": false,
      "message": "Debug mode should not be enabled in staging"
    },
    "log_level": {
      "allowed": ["info", "warn"],
      "message": "Staging should use info or warn log level"
    }
  },
  "development": {
    "debug": {
      "allowed": true,
      "message": "Debug mode is recommended for development"
    },
    "log_level": {
      "allowed": ["debug", "info"],
      "message": "Development should use debug or info log level"
    }
  }
}
```

### 🎯 Example Output

**Policy Violations:**
```
🔒 Policy Validation for production:
❌ 3 policy violations found:

1. debug = true
   Environment: production
   Rule: allowed_value
   Message: Debug mode should not be enabled in production

2. log_level = debug
   Environment: production
   Rule: allowed_values
   Message: Production should use error or warn log level

3. ssl = false
   Environment: production
   Rule: required
   Message: SSL must be enabled in production
```

**Policy Suggestions:**
```
💡 Policy Suggestions for production:

1. debug (critical)
   Rule: allowed
   Suggested: false
   Message: Debug mode should be disabled in production

2. log_level (warning)
   Rule: allowed
   Suggested: ["error", "warn"]
   Message: Production should use error or warn log level
```

### 🔧 Integration

**CI/CD Pipeline:**
```yaml
# GitHub Actions
- name: Validate Policies
  run: |
    align validate-policies --env=prod --format=json > policy-results.json
    if [ $(jq '.valid' policy-results.json) != "true" ]; then
      echo "Policy violations found!"
      exit 1
    fi
```

**Pre-commit Hook:**
```bash
#!/bin/bash
# .git/hooks/pre-commit
align validate-policies --env=dev
if [ $? -ne 0 ]; then
  echo "Policy violations found. Commit blocked."
  exit 1
fi
```

### 🏆 Benefits

- **🚫 Prevent Misconfigurations** - Catch unsafe settings before deployment
- **📋 Enforce Team Standards** - Turn policies into code
- **🔒 Security Compliance** - Ensure SSL, secrets, and security settings
- **⚡ Performance Guardrails** - Enforce minimum timeouts and limits
- **🏢 Enterprise Governance** - Add audit trails and compliance checks

## 🧠 Schema Inference

**Make onboarding fast** - Automatically generate schemas from existing `.align` files instead of writing them from scratch.

### 🚀 Why Schema Inference Matters

- **🚀 Faster Onboarding** - Devs can just write a `.align` file and run `align infer` to generate a schema
- **🔁 Schema Evolution** - Useful in messy environments where schemas were never formally defined
- **🛠️ Bootstrap Legacy Configs** - Great for converting `.env` or `config.json` into a typed schema

### 🛠️ Usage

**Basic Inference:**
```bash
# Infer schema from existing .align files
align infer --config-dir=./config --out=./align.schema.json

# Using source installation
node index.js infer --config-dir=./config --out=./align.schema.json
```

**Advanced Options:**
```bash
# Mark all fields as required
align infer --mark-all-required

# Infer patterns for URLs and emails (default: true)
align infer --infer-patterns

# Infer min/max ranges for numbers
align infer --infer-ranges

# Output in YAML format
align infer --format=yaml
```

### 🎯 Example

**Input `.align` file:**
```ini
service_name = "api"
timeout = 3000
auth_required = true
database_url = "postgresql://localhost:5432/db"
```

**Generated schema:**
```json
{
  "service_name": {
    "type": "string",
    "required": false,
    "description": "Inferred from service_name",
    "default": "api"
  },
  "timeout": {
    "type": "number",
    "required": false,
    "description": "Inferred from timeout",
    "default": 3000
  },
  "auth_required": {
    "type": "boolean",
    "required": false,
    "description": "Inferred from auth_required",
    "default": true
  },
  "database_url": {
    "type": "string",
    "required": false,
    "description": "Inferred from database_url",
    "default": "postgresql://localhost:5432/db",
    "pattern": "^https?://.*$"
  }
}
```

### 🎯 Example Output

**Inference Summary:**
```
🧠 Inferring schema from .align files...
📁 Config directory: ./config
📄 Output file: ./align.schema.json

✅ Schema inferred and saved to: ./align.schema.json

📊 Inference Summary:
  Total fields: 38
  Required fields: 0
  String fields: 14
  Number fields: 17
  Boolean fields: 6
  Array fields: 1
  Pattern fields: 4

💡 Next Steps:
  1. Review the generated schema
  2. Adjust required fields and validation rules
  3. Add descriptions and documentation
  4. Run "align validate" to test the schema
```

### 🔧 Features

- **Type Inference** - Automatically detects string, number, boolean, and array types
- **Pattern Detection** - Identifies URLs and email patterns
- **Range Inference** - Suggests min/max values for numbers
- **Multi-Environment** - Analyzes base + all environment files
- **Metadata Tracking** - Includes generation timestamp and options
- **Flexible Output** - JSON or YAML format

### 🎯 Perfect For

- **🚀 Quick Start** - Get started with Align without writing schemas
- **🔧 Legacy Migration** - Convert existing configs to typed schemas
- **📋 Prototype Development** - Rapid iteration with automatic schema generation
- **🏢 Team Adoption** - Lower barrier to entry for new teams

## 🖥️ Interactive CLI

**Transform your CLI experience** with guided wizards and interactive prompts for better Developer Experience.

### 🚀 Why Interactive CLI Matters

- **🚀 Easier Onboarding** - New users get guided setup instead of manual file editing
- **🔧 Fewer Errors** - Validation and smart defaults prevent configuration mistakes
- **📝 Guided Experience** - Step-by-step wizards for complex operations
- **🔄 Better UX** - Interactive feedback and clear next steps

### 🛠️ Usage

**Interactive Setup Wizard:**
```bash
# Start interactive setup
align setup

# Non-interactive mode (fallback)
align setup --interactive false --template nodejs-api --app-name myapp
```

**Interactive Configuration Wizard:**
```bash
# Start interactive editor
align wizard

# Non-interactive mode
align wizard --interactive false --env dev --key port --value 3000
```

**Interactive Troubleshoot Wizard:**
```bash
# Start interactive diagnosis
align troubleshoot

# Non-interactive mode
align troubleshoot --interactive false --config-dir ./config --detailed
```

### 🎯 Setup Wizard Example

**Interactive Flow:**
```bash
$ align setup
🛠️  Let's create a new Align config!

? What environment are you targeting? (Use arrow keys)
❯ dev
  prod
  staging

? Service name: (web)
? Port: (3000)
? Timeout (ms): (3000)
? Require authentication? (Y/n)
? Log level: (Use arrow keys)
❯ info
  debug
  warn
  error

? Database URL (optional):
? Generate schema automatically? (Y/n)

✅ Configuration created successfully!
📁 Config directory: ./config
📄 Base config: ./config/base.align
📄 Environment config: ./config/dev.align
📋 Schema: ./config/align.schema.json

💡 Next steps:
  1. Review and customize the generated config
  2. Run "align validate" to check your config
  3. Run "align build" to generate output files
```

### 🎯 Configuration Wizard Example

**Interactive Flow:**
```bash
$ align wizard
📝 Interactive Configuration Editor

? Which environment to edit? (Use arrow keys)
❯ dev
  prod
  staging

? What would you like to do? (Use arrow keys)
❯ Edit existing key
  Add new key
  Remove key
  View current config

? Which key to edit? (Use arrow keys)
❯ port
  timeout
  debug

? Value for port: (3000)
✅ Updated port = 3000 in dev.align
```

### 🎯 Troubleshoot Wizard Example

**Interactive Flow:**
```bash
$ align troubleshoot
🔍 Interactive Configuration Diagnosis

? What issue are you experiencing? (Use arrow keys)
❯ All of the above
  Configuration errors
  Security warnings
  Performance issues

? Which environment to analyze? (Use arrow keys)
❯ dev
  prod
  staging

? Show detailed analysis? (Y/n)

🔍 Analyzing configuration...

📊 Analysis Results:
❌ 2 critical issues found:
  1. Weak JWT Secret
  2. Missing required field: database_url

⚠️  1 warnings found:
  1. Port 3000 is commonly used

💡 Recommendations:
  1. Security: Generate a strong JWT secret
  2. Configuration: Add database_url to dev.align
  3. Best Practice: Consider using a different port
```

### 🔧 Features

- **🛠️ Setup Wizard** - Guided configuration creation with validation
- **📝 Configuration Editor** - Interactive key-value editing with smart defaults
- **🔍 Troubleshoot Wizard** - Focused diagnosis with actionable recommendations
- **✅ Smart Validation** - Input validation with helpful error messages
- **🔄 Fallback Support** - Non-interactive mode for automation and CI/CD

### 🎯 Perfect For

- **New Align users** getting started
- **Quick configuration changes** without manual file editing
- **Troubleshooting configuration issues** with guided diagnosis
- **Team onboarding and training** with interactive experience
- **CI/CD environments** using non-interactive mode

### Dry Run (Simulate Changes)
```bash
# Using npm installation
align dry-run --env=prod --key=auth_required --value=false

# Using source installation
node index.js dry-run --env=prod --key=auth_required --value=false
```

Simulates configuration changes without applying them:
- Shows what would change
- Indicates which file would be affected
- Perfect for testing changes before making them

### Explain (Trace Configuration)
```bash
# Using npm installation
align explain --key=timeout --env=prod

# Using source installation
node index.js explain --key=timeout --env=prod
```

**Debug configuration values with step-by-step trace:**
- Shows complete override path from base to environment
- Marks active values with ✅ indicator
- Displays inheritance vs override context
- Great for debugging configuration issues

#### Example Trace Output
```bash
$ align explain --key=port --env=prod
🔍 Config Trace for key: "port" in env: "prod"

1. base.align         → port = 8000
2. prod.align      → port = 80 ✅ ACTIVE VALUE

💡 Override detected: Value changed from 8000 to 80
```

**Perfect for:**
- **Debugging**: Why is this value what it is?
- **Auditing**: Track configuration changes
- **Troubleshooting**: Find accidental overrides
- **Documentation**: Understand configuration flow

### Diff (Compare Environments)
```bash
# Using npm installation
align diff --env1=dev --env2=prod

# Using source installation
node index.js diff --env1=dev --env2=prod
```

Compares configurations between two environments:
- Shows differences between environments
- Highlights added, removed, and changed keys
- Useful for understanding environment variations

### Smart Analysis
```bash
# Using npm installation
align analyze --config-dir=./config --env=prod
align analyze --config-dir=./config --env=prod --detailed
align analyze --config-dir=./config --env=prod --format=json

# Using source installation
node index.js analyze --config-dir=./config --env=prod
node index.js analyze --config-dir=./config --env=prod --detailed
node index.js analyze --config-dir=./config --env=prod --format=json
```

Comprehensive configuration analysis with:
- **Security Analysis**: JWT secrets, SSL/TLS, CORS, rate limiting
- **Performance Analysis**: Database pooling, caching, timeouts, build optimizations
- **Best Practices**: Health checks, monitoring, logging, error tracking
- **Environment-Specific**: Development vs production recommendations
- **Detailed Reports**: Impact assessment and fix suggestions
- **JSON Output**: Machine-readable analysis results

#### Example Analysis Output
```bash
$ node index.js analyze --config-dir=./config --env=prod --detailed
🔍 Smart Analysis: prod environment
📁 Config directory: C:\dev\align-config\config

📊 Analysis Summary:
  Total Issues: 11
  Security Issues: 2
  Performance Issues: 3
  Best Practice Issues: 6
  Good Practices: 1

🚨 Critical Security Issues:
  1. Insecure HTTP on Port 80
     Production environment using HTTP without SSL
     Impact: Critical security vulnerability - data transmitted in plain text
     Fix: Configure SSL certificate and redirect HTTP to HTTPS
     Recommendation: Enable SSL/TLS for production

⚠️  Security Warnings:
  1. No JWT Secret Configured
     JWT authentication may not work properly
     Impact: Authentication may fail
     Recommendation: Add a strong JWT secret

⚡ Performance Issues:
  1. No Caching Configured
     Caching not enabled in production
     Impact: Poor performance, unnecessary database queries
     Fix: Configure Redis or in-memory caching
     Recommendation: Enable caching for better performance

📋 Missing Best Practices:
  1. No Health Checks
     Health check endpoint not configured
     Impact: Difficult to monitor application health
     Fix: Enable health_check_enabled and configure health_check_path
     Recommendation: Add health check endpoint for monitoring

✅ Good Practices Found:
  1. Strong JWT secret configured
```

### 🔍 Diagnose Mode

Scan your existing configuration files and get a comprehensive analysis of issues and migration paths to Align.

```bash
# Using npm installation
align diagnose --config-dir=./config --project-dir=.
align diagnose --detailed --format=json

# Using source installation
node index.js diagnose --config-dir=./config --project-dir=.
node index.js diagnose --detailed --format=json
```

**What it does:**
- 🔍 **Scans scattered configs**: .env, config.json, docker-compose.yml, etc.
- 📊 **Outputs config map + issues**: Comprehensive analysis of your current setup
- 🛣️ **Suggests migration paths**: Step-by-step guide to migrate to Align
- 🔧 **Identifies problems**: Security issues, type safety, scattered configuration

**Options:**
- `--config-dir <dir>`: Configuration directory to analyze (default: `./config`)
- `--project-dir <dir>`: Project root directory to scan (default: `.`)
- `--detailed`: Show detailed analysis with file paths
- `--format <format>`: Output format (text, json) (default: text)
- `--generate-plan`: Generate migration plan for align repair

**Example Output:**
```bash
$ align diagnose --detailed
🔍 Diagnosing configuration environment...
📁 Project directory: /path/to/project
📁 Config directory: /path/to/project/config

🚨 Critical Issues:
  1. Scattered Configuration
     Found 5 different config files across project
     Impact: Hard to manage, inconsistent formats
     Fix: Consolidate into .align files

⚠️  Warnings:
  1. Type Safety Issues
     Found quoted numbers in .env files
     Impact: Potential runtime errors
     Fix: Use proper types in .align files

📋 Recommendations:
  1. Run align repair
     Automatically fix type safety issues
     Command: align repair --auto

📈 Summary:
  5 configuration files found
  23 configuration keys analyzed
  2 environments detected
  3 deployment platforms found
```

### 📦 Library-Aware Configuration

Let packages declare their own schemas and use namespaced configuration with full context resolution.

#### Discover Package Schemas
```bash
# Using npm installation
align discover-packages --project-dir=.

# Using source installation
node index.js discover-packages --project-dir=.
```

**What it does:**
- 🔍 **Scans node_modules**: Automatically discovers package schemas
- 📋 **Lists available schemas**: Shows what packages provide configuration
- 🏷️ **Supports two formats**: `align.schema.json` files or `package.json` "align" field

**Example Output:**
```bash
$ align discover-packages
📦 Package Schemas Found:
  express-auth:
    - jwt_secret
    - timeout
    - max_retries
    - session_duration
    - enable_refresh

  postgres-db:
    - url
    - max_pool
    - timeout
    - ssl
    - migrations

  redis-cache:
    - url
    - ttl
    - max_memory
    - enable_clustering
    - retry_attempts
```

#### Namespaced Configuration
```align
# config/base.align
app_name = "myapp"

# Package-provided schemas automatically available
express-auth.jwt_secret = "super-secret-key"
express-auth.timeout = 30000
express-auth.max_retries = 3

postgres-db.url = "postgresql://localhost:5432/myapp"
postgres-db.max_pool = 25
postgres-db.ssl = true

redis-cache.url = "redis://localhost:6379"
redis-cache.ttl = 3600
redis-cache.max_memory = "100mb"
```

#### Explain Configuration Context
```bash
# Using npm installation
align explain --key=express-auth.timeout --env=prod --include-packages

# Using source installation
node index.js explain --key=express-auth.timeout --env=prod --include-packages
```

**What it shows:**
- 📊 **Final value**: The resolved configuration value
- 📦 **Package source**: Which package provided the schema
- 🏷️ **Namespace**: Package namespace (e.g., express-auth)
- 🔍 **Validation rules**: Type, required, default, etc.
- 📁 **Override path**: Where the value came from

**Example Output:**
```bash
$ align explain --key=express-auth.timeout --env=prod --include-packages
🔍 EXPLAIN: Tracing configuration key
Key: express-auth.timeout
Environment: prod

📊 Final value: 45000
📦 Source: package:express-auth
📦 Package: express-auth
🏷️  Namespace: express-auth

🔍 Validation:
  Type: number
  Required: false
  Default: 30000

📁 Base config: 30000
♻️  Environment override: 45000
```

#### List Available Schemas
```bash
# Using npm installation
align list-schemas --config-dir=./config --project-dir=.

# Using source installation
node index.js list-schemas --config-dir=./config --project-dir=.
```

**What it shows:**
- 📁 **Project schemas**: Your own configuration schemas
- 📦 **Package schemas**: All available package schemas
- 🔍 **Complete overview**: Everything available for validation

**Example Output:**
```bash
$ align list-schemas
📋 Available Schemas:
📁 Project Schema:
  - app_name
  - port
  - debug
  - database_url

📦 Package Schemas:
  express-auth:
    - jwt_secret
    - timeout
    - max_retries
    - session_duration
    - enable_refresh

  postgres-db:
    - url
    - max_pool
    - timeout
    - ssl
    - migrations
```

#### Package Schema Formats

**Option A: Dedicated Schema File**
```
node_modules/express-auth/align.schema.json
```
```json
{
  "jwt_secret": {
    "type": "string",
    "required": true,
    "minLength": 32
  },
  "timeout": {
    "type": "number",
    "default": 30000,
    "min": 1000
  }
}
```

**Option B: Package.json Integration**
```json
{
  "name": "express-auth",
  "version": "1.0.0",
  "align": {
    "jwt_secret": {
      "type": "string",
      "required": true,
      "minLength": 32
    },
    "timeout": {
      "type": "number",
      "default": 30000
    }
  }
}
```

### 🔧 Risk-Aware Repair

Safely migrate existing configuration to Align with comprehensive safety features.

```bash
# Using npm installation
align repair --config-dir=./config --project-dir=.
align repair --interactive --backup
align repair --dry-run --safe-only

# Using source installation
node index.js repair --config-dir=./config --project-dir=.
node index.js repair --interactive --backup
node index.js repair --dry-run --safe-only
```

**Safety Features:**
- 🔒 **Opt-in only**: Never runs automatically, always requires explicit flags
- 👀 **Preview mode**: `--dry-run` shows what would change without applying
- 💾 **Backup creation**: `--backup` creates automatic backups before changes
- 🔄 **Rollback support**: Easy undo with `--rollback --backup-dir`
- 🛡️ **Safe-only mode**: `--safe-only` only applies low-risk changes
- ❓ **Interactive mode**: `--interactive` asks for confirmation on each change

**Options:**
- `--config-dir <dir>`: Configuration directory to analyze (default: `./config`)
- `--project-dir <dir>`: Project root directory to scan (default: `.`)
- `--backup`: Create backup before making changes
- `--dry-run`: Show what would change without making changes
- `--interactive`: Ask for confirmation before each change
- `--auto`: Automatically apply all safe fixes
- `--analyze-only`: Show detailed migration plan without changes
- `--rollback`: Restore from backup (use with --backup-dir)
- `--backup-dir <dir>`: Backup directory for rollback
- `--fix-types`: Only fix type safety issues
- `--consolidate-configs`: Only consolidate scattered configs
- `--fix-security`: Only fix security issues
- `--detailed`: Show detailed information about changes

**Example Workflow:**
```bash
# 1. Analyze current state
$ align diagnose --detailed
🚨 Found 3 scattered config files
⚠️  Found 5 type safety issues

# 2. Preview changes (safe)
$ align repair --dry-run --safe-only
📋 Would fix 5 type safety issues
📁 Would consolidate 3 config files
💡 No risky changes detected

# 3. Apply with backup
$ align repair --auto --backup
📦 Backup created: ./backup/2024-01-15-10-30-45
🔧 Applied 5 type safety fixes
📁 Consolidated 3 config files
✅ Repair completed successfully!

# 4. Rollback if needed
$ align repair --rollback --backup-dir=./backup/2024-01-15-10-30-45
🔄 Restored from backup
✅ Rollback completed successfully!
```

**What it fixes:**
- 🔧 **Type safety issues**: Quoted numbers, invalid booleans, etc.
- 📁 **Scattered configuration**: Consolidates .env, config.json, etc.
- 🔒 **Security issues**: Weak secrets, HTTP in production, etc.
- 📋 **Environment structure**: Creates proper dev/prod separation
- 🏷️ **Naming conventions**: Standardizes key names and formats

## ⚠️ Error Handling & Exit Codes

Align uses standard exit codes for automation and CI/CD:

- **`0`** - Success (validation passed, build completed, etc.)
- **`1`** - General error (file not found, invalid syntax, etc.)
- **`2`** - Validation error (missing required fields, type errors, etc.)

### Common Error Scenarios

**File not found:**
```bash
$ align validate config/missing.align
❌ Error: Configuration file not found: config/missing.align
```

**Validation failed:**
```bash
$ align validate config/base.align --base
❌ Validation failed: Missing required key: service_name
```

**Invalid syntax:**
```bash
$ align validate config/invalid.align
❌ Invalid syntax on line 2: missing '='
```

**Type error:**
```bash
$ align validate config/type-error.align --schema config/schema.json
❌ Validation failed: port must be a number, got "abc"
```

## 📋 Schema Validation

Create `align.schema.json` to define validation rules:

```json
{
  "service_name": {
    "type": "string",
    "required": true,
    "minLength": 1,
    "maxLength": 50
  },
  "timeout": {
    "type": "number",
    "required": false,
    "min": 100,
    "max": 30000,
    "default": 3000
  },
  "auth_required": {
    "type": "boolean",
    "required": false,
    "default": true
  },
  "port": {
    "type": "number",
    "required": false,
    "min": 1,
    "max": 65535,
    "default": 8080
  },
  "database_url": {
    "type": "string",
    "required": false,
    "pattern": "^[a-zA-Z]+://.*$"
  },
  "cors_origins": {
    "type": "array",
    "items": {
      "type": "string"
    },
    "required": false
  }
}
```

#### When to Use Schema Validation
Schema validation is useful for:
- **Team projects** - Ensure consistent configuration across developers
- **Production deployments** - Catch configuration errors before deployment
- **Complex applications** - Validate required fields and data types
- **Compliance requirements** - Enforce security and configuration standards

**For simple projects**, you can skip schema validation and use basic validation instead.

### Schema Features

**Type Validation:**
```json
{
  "port": { "type": "number" },
  "debug": { "type": "boolean" },
  "name": { "type": "string" }
}
```

**Required Fields:**
```json
{
  "service_name": {
    "type": "string",
    "required": true
  }
}
```

**Value Ranges:**
```json
{
  "port": {
    "type": "number",
    "min": 1,
    "max": 65535
  }
}
```

**String Patterns:**
```json
{
  "email": {
    "type": "string",
    "pattern": "^[^@]+@[^@]+\\.[^@]+$"
  }
}
```

**Array Validation:**
```json
{
  "cors_origins": {
    "type": "array",
    "items": { "type": "string" },
    "minLength": 1
  }
}
```

## 📚 Library Usage

Use Align programmatically in your Node.js applications:

```javascript
const { Align } = require('align-config');

// Initialize Align
const align = new Align('./config');

// Load configuration
const config = align.load('dev');
console.log(config.service_name); // "web"
console.log(config.timeout); // 5000

// Get metadata about the configuration
const metadata = align.getMetadata('dev');
console.log(metadata.environment); // "dev"
console.log(metadata.overriddenKeys); // ['debug', 'port', ...]

// Trace where a value came from
const trace = align.explain('timeout', 'dev');
console.log(trace.source); // "overridden"
console.log(trace.finalValue); // 5000

// Compare environments
const diff = align.diff('dev', 'prod');
console.log(diff.differences.length); // Number of differences
```

## 🧪 Testing

Align includes comprehensive testing:

### Run Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Test Coverage
- **Unit tests** - Parser, validator, merger
- **Integration tests** - End-to-end CLI functionality
- **Schema validation** - Type checking and rules
- **Error handling** - Invalid inputs and edge cases

## 🔄 CI/CD Pipeline

Align uses GitHub Actions for continuous integration:

### Automated Testing
- **Multi-node testing**: Node.js 16.x, 18.x, 20.x
- **Unit tests**: Jest with comprehensive coverage
- **Integration tests**: End-to-end CLI testing
- **Code coverage**: Automated reporting

### Automated Publishing
- **npm publishing**: Automatic on GitHub releases
- **Version management**: Semantic versioning
- **Release notes**: Automated from GitHub releases

## 🔍 Examples

### Validate a base config file
```bash
$ node index.js validate config/base.align --base
✅ Validation passed: config is valid!
Found 6 configuration keys
```

### Build with YAML output
```bash
$ node index.js build --env=dev --format=yaml --out=./output/config.dev.yaml
📁 Loading base config: C:\dev\align-config\config\base.align
📁 Loading environment config: C:\dev\align-config\config\dev.align
🔄 Merging configurations...
✅ Configuration built successfully!
📄 Output: C:\dev\align-config\output/config.dev.yaml
📊 Keys: 7
📋 Format: YAML
🔄 Overridden keys: debug, port, database_url, log_level
```

### Build with YAML output and comments
```bash
$ node index.js build --env=dev --format=yaml --comments --out=./output/config.dev.yaml
📋 Using schema: C:\dev\align-config\config\align.schema.json
📁 Loading base config: C:\dev\align-config\config\base.align
📁 Loading environment config: C:\dev\align-config\config\dev.align
🔄 Merging configurations...
✅ Configuration built successfully!
📄 Output: C:\dev\align-config\output/config.dev.yaml
📊 Keys: 7
📋 Format: YAML
💬 Comments: Included from schema descriptions
🔄 Overridden keys: debug, port, database_url, log_level
```

### Build with .env output
```bash
$ node index.js build --env=dev --format=env --out=./output/config.dev.env
📁 Loading base config: C:\dev\align-config\config\base.align
📁 Loading environment config: C:\dev\align-config\config\dev.align
🔄 Merging configurations...
✅ Configuration built successfully!
📄 Output: C:\dev\align-config\output/config.dev.env
📊 Keys: 7
📋 Format: ENV
🔄 Overridden keys: debug, port, database_url, log_level
```

### Build with .env output and comments
```bash
$ node index.js build --env=dev --format=env --comments --out=./output/config.dev.env
📋 Using schema: C:\dev\align-config\config\align.schema.json
📁 Loading base config: C:\dev\align-config\config\base.align
📁 Loading environment config: C:\dev\align-config\config\dev.align
🔄 Merging configurations...
✅ Configuration built successfully!
📄 Output: C:\dev\align-config\output/config.dev.env
📊 Keys: 7
📋 Format: ENV
💬 Comments: Included from schema descriptions
🔄 Overridden keys: debug, port, database_url, log_level
```

### Build with Kubernetes ConfigMap
```bash
$ node index.js build --env=dev --k8s-configmap --out=./output/config.dev.yaml
📁 Loading base config: C:\dev\align-config\config\base.align
📁 Loading environment config: C:\dev\align-config\config\dev.align
🔄 Merging configurations...
✅ Configuration built successfully!
📄 Output: C:\dev\align-config\output/config.dev.yaml
📄 ConfigMap: C:\dev\align-config\output/config.dev.configmap.yaml
📊 Keys: 25
📋 Format: JSON
🔄 Overridden keys: port, log_level, log_format, database_url, database_pool_size, cors_origins, rate_limit_max, metrics_enabled, redis_url, cache_ttl
```

### Dry run simulation
```bash
$ node index.js dry-run --env=prod --key=auth_required --value=false
🔍 DRY RUN: Simulating configuration change
Environment: prod
Key: auth_required
New value: false

🔄 Would change: auth_required
  From: true
  To:   false
📁 Would override base.align value
```

### Explain configuration origin
```bash
$ node index.js explain --key=timeout --env=prod
🔍 EXPLAIN: Tracing configuration key
Key: timeout
Environment: prod

📊 Final value: 5000

🧱 Defined in: base.align = 3000
♻️  Overridden by: prod.align = 5000
📁 File: C:\dev\align-config\config\prod.align
```

### Compare environments
```bash
$ node index.js diff --env1=dev --env2=prod
🔍 DIFF: Comparing dev vs prod

🔄 timeout:
  dev: 3000
  prod: 5000
🔄 debug:
  dev: true
  prod: false
🔄 port:
  dev: 3000
  prod: 80
🔄 database_url:
  dev: "postgresql://localhost:5432/myapp_dev"
  prod: "postgresql://prod-db:5432/myapp_prod"
🔄 log_level:
  dev: "debug"
  prod: "error"
```

## 🔮 Features

### Core Features
- ✅ **Configuration Language** - Custom `.align` syntax
- ✅ **Type Safety** - Numbers, booleans, strings, arrays
- ✅ **Environment Management** - Base + environment overrides
- ✅ **Validation** - Schema-driven validation rules
- ✅ **Analysis** - Security and performance insights
- ✅ **Templates** - 8 project templates with best practices

### 🏢 **Enterprise Features**
- ✅ **Angular Integration** - Import from `src/environment.ts`
- ✅ **.env Migration** - Convert existing `.env` files to `.align`
- ✅ **Docker Compatibility** - Generate exact `.env` format for builds
- ✅ **CI/CD Integration** - One-line replacement for file copying
- ✅ **Boolean Type Support** - `ENABLE_SIGNUP=true` converts properly
- ✅ **Multi-Environment Support** - `dev-alpha`, `dev-bravo`, `qa`, `prod`
- ✅ **SOC2 Compliance** - Secret detection, policy enforcement, audit trails

### Advanced Features
- ✅ **🔍 Diagnose Mode** - Scan scattered configs and suggest migrations
- ✅ **📦 Library-Aware Config** - Package schemas with namespacing
- ✅ **🔧 Risk-Aware Repair** - Safe automated fixes with rollback
- ✅ **🌍 Cross-Language Export** - 9+ output formats (Python, TOML, Java, etc.)
- ✅ **🏆 Policy Validation** - Environment-specific guardrails and business rules
- ✅ **💬 Inline Comments** - Schema descriptions in output files
- ✅ **🔍 Config Linting** - Validation and automatic fixes
- ✅ **🔐 Secrets Management** - Security validation and masking
- ✅ **🚀 CI/CD Helper** - Multi-platform pipeline generation
- ✅ **📋 Versioning Support** - Schema and config versioning with migration helpers

### Output Formats
- ✅ **JSON** - Universal format for applications
- ✅ **YAML** - Infrastructure standard (Kubernetes, Docker)
- ✅ **Environment Variables** - Platform compatibility (Vercel, Heroku)

### Platform Integration
- ✅ **Vercel** - Generate `.env` files for deployment
- ✅ **Heroku** - Environment variable compatibility
- ✅ **Docker** - Build-time configuration
- ✅ **Kubernetes** - ConfigMap generation
- ✅ **Angular** - Import from `environment.ts` files
- ✅ **AWS Lambda** - Environment variable management
- ✅ **CircleCI/GitHub Actions** - CI/CD pipeline integration
- ✅ **Any Platform** - JSON/YAML/.env output

### Developer Experience
- ✅ **CLI Tool** - Easy command-line interface
- ✅ **Library API** - Programmatic usage in Node.js
- ✅ **Templates** - Quick project setup
- ✅ **Validation** - Catch errors before deployment
- ✅ **Analysis** - Security and performance insights

### Team Features
- ✅ **Schema Validation** - Enforce team standards
- ✅ **Environment Management** - Clear dev/staging/prod separation
- ✅ **Traceability** - See where config values come from
- ✅ **Dry Run** - Test changes before applying
- ✅ **Diff Tool** - Compare environments

## 📁 Project Structure

```
align-config/
├── index.js              # CLI entry point
├── parser.js             # Core parsing and validation logic
├── lib.js                # Library API for programmatic usage
├── config/               # Example configuration files
├── templates/            # Project templates (8 templates)
├── examples/             # Usage examples and demos
├── tests/                # Test files
└── output/               # Generated configuration outputs
```

## 🚀 Installation

### Option 1: Install from npm (Recommended)
```bash
# Install globally for CLI access
npm install -g align-config

# Use the align command
align --help
```

### Option 2: Install from source
```bash
# Clone the repository
git clone <repository-url>
cd align-config

# Install dependencies
npm install

# Run directly with node
node index.js --help
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## 📄 License

ISC License - see [LICENSE](LICENSE) file for details.

## 🤝 Contributing

We welcome contributions! Here's how to get started:

### Development Setup
```bash
# Clone the repository
git clone <repository-url>
cd align-config

# Install dependencies
npm install

# Run tests to ensure everything works
npm test
```

### Making Changes
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Make your changes
4. Add tests for new functionality
5. Run the test suite: `npm test`
6. Ensure all tests pass
7. Submit a pull request

### Code Style
- Follow existing code style and patterns
- Add comments for complex logic
- Include tests for new features
- Update documentation as needed

## 📞 Support

- **🐛 Issues**: Report bugs on [GitHub Issues](https://github.com/thesmithsyndicate/align-config/issues)
- **📚 Documentation**: Check the README and [examples](./examples/) directory
- **💬 Questions**: Open a [GitHub Discussion](https://github.com/thesmithsyndicate/align-config/discussions)
- **📧 Email**: For private support, contact [contact@thesmithsyndicate.com]

## 🏆 Acknowledgments

Thanks to all contributors and the open source community for making this project possible!

---

**Align** - Making configuration safe, predictable, and unified across environments. 🚀 

## 🧱 Module-Specific Configuration

**Overview:**

Module-Specific Configuration lets you extract, validate, and export only the configuration keys needed by a specific module or package. This is perfect for microservices, plugin architectures, or any codebase where different parts of the system should only see the config they actually use.

**Why it matters:**
- 🔒 **Security**: Modules only see what they need (principle of least privilege)
- 🧹 **Cleaner Code**: No more passing entire config objects around
- 🛡️ **Validation**: Module-specific schema validation
- 📦 **Modularity**: Each module declares its own config requirements
- 🧑‍💻 **Better Debugging**: Clear which config each module uses

**How it works:**
- Place a schema for each module in `config/modules/<module>/align.schema.json` (or use package schemas)
- Use the CLI to extract, validate, or list module configs

### 🛠️ Usage

```bash
# List all modules with schemas
yarn align list-modules

# Output only the config for a module (JSON, YAML, or ENV)
yarn align module-config --module auth --env dev --format json
yarn align module-config --module email --format yaml
yarn align module-config --module database --format env

# Validate a module's config
yarn align validate-module --module auth --env dev
```

### 🎯 Example Scenario
Suppose you have this config:
```json
{
  "service_name": "user-api",
  "db_url": "postgres://...",
  "auth_required": true,
  "rate_limit": 100,
  "email_smtp": "smtp://...",
  "email_from": "noreply@yourapp.com"
}
```
- The **auth** module only needs: `auth_required`, `rate_limit`
- The **email** module only needs: `email_smtp`, `email_from`
- The **db** layer only needs: `db_url`

**Extract just what each module needs:**
```bash
yarn align module-config --module auth
# { "auth_required": true, "rate_limit": 100 }

yarn align module-config --module email
# { "email_smtp": "smtp://...", "email_from": "noreply@yourapp.com" }

yarn align module-config --module database
# { "db_url": "postgres://..." }
```

### 🧩 How to define a module schema
Create a file like `config/modules/auth/align.schema.json`:
```json
{
  "type": "object",
  "properties": {
    "auth_required": { "type": "boolean" },
    "rate_limit": { "type": "number" }
  },
  "required": ["auth_required", "rate_limit"]
}
```

### 🏆 Benefits
- **Security**: Only expose what's needed
- **Validation**: Each module can have its own schema
- **Export**: Output in JSON, YAML, or ENV for any module
- **CI/CD**: Validate module configs in pipelines
- **Microservices**: Perfect for service isolation

### 💡 Pro Tip
You can use this for both local modules and package schemas (from `node_modules`).

--- 