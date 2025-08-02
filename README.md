# 🎯 Align - Configuration Language & Toolchain

[![npm version](https://img.shields.io/npm/v/align-config.svg)](https://www.npmjs.com/package/align-config)
[![npm downloads](https://img.shields.io/npm/dm/align-config.svg)](https://www.npmjs.com/package/align-config)

**Align** is a domain-specific configuration language and toolchain that makes application configuration safe, predictable, 
and unified across environments. Replace scattered `.env`, YAML, JSON, and Kubernetes overrides with a single source of 
truth: `.align` files.

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

#### Options
- `--env <environment>`: Environment name (required)
- `--out <file>`: Output file path (default: `./output/config.json`)
- `--config-dir <dir>`: Configuration directory (default: `./config`)
- `--format <format>`: Output format (json, yaml, env) (default: json)
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

### Output Formats
- ✅ **JSON** - Universal format for applications
- ✅ **YAML** - Infrastructure standard (Kubernetes, Docker)
- ✅ **Environment Variables** - Platform compatibility (Vercel, Heroku)

### Platform Integration
- ✅ **Vercel** - Generate `.env` files for deployment
- ✅ **Heroku** - Environment variable compatibility
- ✅ **Docker** - Build-time configuration
- ✅ **Kubernetes** - ConfigMap generation
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

## 📄 License

ISC License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite
6. Submit a pull request

## 📞 Support

- **Issues**: Report bugs on GitHub
- **Documentation**: Check the README and examples
- **Questions**: Open a GitHub discussion

---

**Align** - Making configuration safe, predictable, and unified across environments. 🚀 