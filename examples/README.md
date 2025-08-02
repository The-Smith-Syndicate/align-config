# Align Advanced Examples

This directory contains advanced examples demonstrating how to use Align for real-world scenarios.

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
- **Security auditing**: Check for sensitive data and compliance
- **Environment deployment**: Separate dev and prod deployments
- **Dry-run testing**: Simulate changes before applying
- **Artifact management**: Store configurations as build artifacts

### Pipeline Stages
1. **Validate Config**: Check all `.align` files
2. **Security Audit**: Verify security settings
3. **Deploy Dev**: Deploy to development environment
4. **Deploy Prod**: Deploy to production environment

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

## 🎯 Key Benefits

### **1. Environment Consistency**
- Same configuration structure across all environments
- Clear override patterns for environment-specific settings
- Validation ensures consistency

### **2. Security by Design**
- Security settings are explicit and validated
- Compliance requirements are built into the configuration
- Audit trails for all configuration changes

### **3. DevOps Integration**
- Seamless integration with CI/CD pipelines
- Automated configuration validation
- Environment-specific deployments

### **4. Infrastructure as Code**
- Configuration-driven infrastructure generation
- Version-controlled configuration management
- Reproducible deployments

## 🚀 Getting Started

### 1. Choose Your Example
```bash
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
node generate-k8s.js      # For Kubernetes
node generate-compose.js  # For Docker Compose
node security-audit.js    # For security compliance
```

### 4. Deploy
Use the generated files in your deployment process:
```bash
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

## 📚 Best Practices

### **1. Configuration Organization**
- Keep base configuration minimal and common
- Use environment files for environment-specific settings
- Document all configuration options

### **2. Security**
- Never commit secrets to configuration files
- Use environment variables for sensitive data
- Validate security settings in CI/CD

### **3. Validation**
- Always validate configurations before deployment
- Use schema validation for complex requirements
- Test configuration changes in lower environments first

### **4. Documentation**
- Document all configuration options
- Provide examples for common use cases
- Keep documentation updated with configuration changes 