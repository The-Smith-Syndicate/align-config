#!/usr/bin/env node
const Align = require('../../lib.js');
const fs = require('fs');
const path = require('path');

// Initialize Align with the Kubernetes config directory
const align = new Align('./config');

// Generate Kubernetes manifests for different environments
const environments = ['dev', 'prod'];

environments.forEach(env => {
  try {
    console.log(`\n🔧 Generating Kubernetes manifests for ${env} environment...`);
    
    // Load configuration
    const config = align.load(env);
    
    // Generate deployment manifest
    const deployment = generateDeployment(config);
    const service = generateService(config);
    const ingress = generateIngress(config);
    
    // Create output directory
    const outputDir = `./manifests/${env}`;
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Write manifests
    fs.writeFileSync(`${outputDir}/deployment.yaml`, deployment);
    fs.writeFileSync(`${outputDir}/service.yaml`, service);
    fs.writeFileSync(`${outputDir}/ingress.yaml`, ingress);
    
    console.log(`✅ Generated manifests in ${outputDir}/`);
    
  } catch (error) {
    console.error(`❌ Error generating manifests for ${env}:`, error.message);
  }
});

function generateDeployment(config) {
  return `apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${config.app_name}
  namespace: ${config.namespace}
spec:
  replicas: ${config.replicas}
  selector:
    matchLabels:
      app: ${config.app_name}
  template:
    metadata:
      labels:
        app: ${config.app_name}
    spec:
      securityContext:
        runAsUser: ${config.security_context_run_as_user}
        runAsGroup: ${config.security_context_run_as_group}
        fsGroup: ${config.security_context_fs_group}
      containers:
      - name: ${config.app_name}
        image: ${config.image}
        ports:
        - containerPort: ${config.target_port}
        resources:
          limits:
            cpu: ${config.resources_cpu_limit}
            memory: ${config.resources_memory_limit}
          requests:
            cpu: ${config.resources_cpu_request}
            memory: ${config.resources_memory_request}
        livenessProbe:
          httpGet:
            path: ${config.liveness_path}
            port: ${config.health_check_port}
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: ${config.readiness_path}
            port: ${config.health_check_port}
          initialDelaySeconds: 5
          periodSeconds: 5
        env:
        - name: LOG_LEVEL
          value: "${config.log_level}"
        - name: DEBUG_ENABLED
          value: "${config.debug_enabled || false}"
        - name: MONITORING_ENABLED
          value: "${config.monitoring_enabled || false}"
${config.persistent_volume_enabled ? generateVolumeMounts(config) : ''}
${config.persistent_volume_enabled ? generateVolumes(config) : ''}`;
}

function generateService(config) {
  return `apiVersion: v1
kind: Service
metadata:
  name: ${config.app_name}-service
  namespace: ${config.namespace}
spec:
  type: ${config.service_type}
  ports:
  - port: ${config.service_port}
    targetPort: ${config.target_port}
    protocol: TCP
  selector:
    app: ${config.app_name}`;
}

function generateIngress(config) {
  return `apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ${config.app_name}-ingress
  namespace: ${config.namespace}
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  rules:
  - host: ${config.app_name}.${config.namespace}.svc.cluster.local
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: ${config.app_name}-service
            port:
              number: ${config.service_port}`;
}

function generateVolumeMounts(config) {
  return `        volumeMounts:
        - name: ${config.app_name}-storage
          mountPath: /data`;
}

function generateVolumes(config) {
  return `      volumes:
      - name: ${config.app_name}-storage
        persistentVolumeClaim:
          claimName: ${config.app_name}-pvc`;
}

console.log('\n🎯 Kubernetes manifest generation complete!');
console.log('📁 Check the examples/kubernetes/manifests/ directory for generated files.'); 