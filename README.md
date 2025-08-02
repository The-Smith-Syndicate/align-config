# 🎯 Align - Configuration Language & Toolchain

[![npm version](https://img.shields.io/npm/v/align-config.svg)](https://www.npmjs.com/package/align-config)
[![npm downloads](https://img.shields.io/npm/dm/align-config.svg)](https://www.npmjs.com/package/align-config)

**Align** is a domain-specific configuration language and toolchain that makes application configuration safe, predictable, and unified across environments. Replace scattered `.env`, YAML, JSON, and Kubernetes overrides with a single source of truth: `.align` files.

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

## 🎯 Common Use Cases

### For New Projects
1. **Start with a template** - `align init --template=nodejs-api --app-name=myapp`
2. **Customize the config** - Edit the generated `.align` files
3. **Validate your changes** - `align validate config/base.align --base`

### For Existing Projects
1. **Convert existing config** - Create `base.align` from your current config
2. **Add environment overrides** - Create `dev.align`, `prod.align` for different environments
3. **Validate everything** - `align validate config/base.align --base`

#### Migrating from .env Files
If you have existing `.env` files, convert them to `.align` format:

**Before (.env):**
```bash
# .env
DATABASE_URL=postgresql://localhost:5432/myapp
PORT=8080
DEBUG=true
JWT_SECRET=my-secret-key
```

**After (base.align):**
```align
# base.align
database_url = "postgresql://localhost:5432/myapp"
port = 8080
debug = true
jwt_secret = "my-secret-key"
```

**Benefits of conversion:**
- ✅ **Type safety** - numbers, booleans, strings are properly typed
- ✅ **Validation** - catch errors before deployment
- ✅ **Environment overrides** - `dev.align`, `prod.align` for different environments
- ✅ **Schema validation** - enforce configuration rules

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
    "build": "align build --env=production --out=./.env && next build",
    "dev": "align build --env=development --out=./.env && next dev"
  }
}
```

**Option 2: Custom Build Hook**
```javascript
// scripts/convert-align-to-env.js
const { Align } = require('align-config');

const align = new Align('./config');
const config = align.load('production');

// Convert to .env format
const envContent = Object.entries(config)
  .map(([key, value]) => `${key.toUpperCase()}=${value}`)
  .join('\n');

require('fs').writeFileSync('.env', envContent);
```

**Option 3: Vercel Dashboard**
- Build your config: `align build --env=production --out=./output/config.prod.json`
- Copy values to Vercel's environment variables dashboard
- Use Vercel's built-in environment variable management

### Docker Integration
```dockerfile
# Dockerfile
FROM node:18-alpine
COPY package*.json ./
RUN npm install
COPY . .

# Build config during image build
RUN npx align-config build --env=production --out=./.env

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

Align provides critical security advantages:
- **Configuration validation** prevents security misconfigurations
- **Audit trail** for compliance and incident response
- **Secure defaults** that can't be accidentally disabled
- **Environment isolation** for sensitive data
- **Change simulation** for safe security testing

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
- **Available templates**: 
  - `nodejs-api`: Node.js API with Express, JWT, and database
  - `python-api`: Python API with FastAPI, authentication, and validation
  - `go-api`: Go API with Gin, database, and monitoring
  - `react-app`: React frontend with build optimization and analytics
  - `nextjs-app`: Next.js with SSR, API routes, and image optimization
  - `angular-app`: Angular with AOT compilation and service workers
  - `microservices`: Distributed system with service discovery and tracing
  - `database`: Database configuration with connection pooling and backup
- **Customization**: Automatically sets app name
- **Complete setup**: Creates base, dev, and prod configs with schema

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

# Using source installation
node index.js build --env=dev --out=./output/config.dev.json
node index.js build --env=prod --format=yaml --out=./output/config.prod.yaml
```

Merges `base.align` and `<env>.align` files:
- Loads `base.align` first
- Applies `<env>.align` overrides
- Outputs merged JSON or YAML configuration

#### Options
- `--env <environment>`: Environment name (required)
- `--out <file>`: Output file path (default: `./output/config.json`)
- `--config-dir <dir>`: Configuration directory (default: `./config`)
- `--format <format>`: Output format (json, yaml) (default: json)
- `--schema <file>`: Schema file path (align.schema.json)
- `--k8s-configmap`: Generate Kubernetes ConfigMap YAML

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

Traces where a configuration value came from:
- Shows the complete override path
- Displays file paths for easy reference
- Great for understanding configuration origins

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
- **Type validation**: string, number, boolean
- **Required fields**: Ensure critical config is present
- **Range validation**: min/max for numbers
- **String validation**: minLength, maxLength, pattern
- **Default values**: Provide fallback values

## 🧪 Testing

Align includes comprehensive testing:

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Test Coverage
- **Parser tests**: Validate syntax parsing, type detection, nested blocks
- **Library tests**: Test the Node.js API integration
- **Integration tests**: Test CLI commands end-to-end
- **Coverage**: 88%+ code coverage with 80%+ threshold

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

## 📚 Library Usage

Import Align directly into your Node.js applications:

```javascript
const Align = require('align-config');

// Initialize with config directory
const align = new Align('./config');

// Load configuration for an environment
const config = align.load('prod');
console.log(config.service_name); // "web"
console.log(config.timeout); // 5000

// Validate a configuration file
const errors = align.validate('./config/base.align', true); // true = isBaseConfig
if (errors.length > 0) {
  console.error('Validation failed:', errors);
}

// Get configuration metadata
const metadata = align.getMetadata('prod');
console.log(metadata.overriddenKeys); // ['debug', 'port', ...]

// Trace configuration origin
const trace = align.explain('timeout', 'prod');
console.log(trace.source); // "overridden"
console.log(trace.finalValue); // 5000

// Compare environments
const diff = align.diff('dev', 'prod');
console.log(diff.differences.length); // Number of differences
```

## 🎯 Philosophy

Align is a **config compiler**, not an app runner. It focuses on:
- **Simplicity**: Flat key-value syntax with optional nested blocks
- **Safety**: Validation and type checking with schema support
- **Predictability**: Clear override behavior and traceability
- **Flexibility**: JSON and YAML output, library integration
- **Security**: Configuration validation and audit trails

## 🔮 Features

### ✅ Implemented
- Parse/validate flat .align files
- Merge base + env files
- Output JSON and YAML
- Track overridden keys
- Dry-run simulation
- Explain tracing
- Schema validation
- Nested block syntax
- Environment comparison (diff)
- Library API for direct import
- Configuration templates (8 templates: Node.js, Python, Go, React, Next.js, Angular, Microservices, Database)
- Kubernetes ConfigMap generation
- Comprehensive testing suite
- CI/CD pipeline with GitHub Actions

### 🟡 Future Enhancements
- AI-powered config explanation
- More complex validation rules
- Configuration templates
- Integration with CI/CD pipelines 