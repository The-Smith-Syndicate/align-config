#!/usr/bin/env node
const Align = require('../../lib.js');
const fs = require('fs');
const path = require('path');

// Initialize Align with the Docker Compose config directory
const align = new Align('./config');

// Generate Docker Compose files for different environments
const environments = ['dev', 'prod'];

environments.forEach(env => {
  try {
    console.log(`\n🔧 Generating Docker Compose for ${env} environment...`);
    
    // Load configuration
    const config = align.load(env);
    
    // Generate Docker Compose YAML
    const composeYaml = generateDockerCompose(config);
    
    // Create output directory
    const outputDir = `./manifests`;
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Write Docker Compose file
    fs.writeFileSync(`${outputDir}/docker-compose.${env}.yml`, composeYaml);
    
    console.log(`✅ Generated docker-compose.${env}.yml`);
    
  } catch (error) {
    console.error(`❌ Error generating Docker Compose for ${env}:`, error.message);
  }
});

function generateDockerCompose(config) {
  return `version: '${config.version}'

services:
  app:
    image: ${config.app_image}
    container_name: ${config.app_name}-app
    ports:
      - "${config.app_port}:${config.app_port}"
    environment:
      - NODE_ENV=${config.app_environment}
      - DB_HOST=db
      - DB_PORT=${config.db_port}
      - DB_NAME=${config.db_name}
      - DB_USER=${config.db_user}
      - DB_PASSWORD=${config.db_password}
      - REDIS_HOST=redis
      - REDIS_PORT=${config.redis_port}
    volumes:
      - ${config.app_data_volume}:/app/data
    depends_on:
      - db
      - redis
    networks:
      - ${config.network_name}
    restart: unless-stopped

  db:
    image: ${config.db_image}
    container_name: ${config.app_name}-db
    ports:
      - "${config.db_port}:5432"
    environment:
      - POSTGRES_DB=${config.db_name}
      - POSTGRES_USER=${config.db_user}
      - POSTGRES_PASSWORD=${config.db_password}
    volumes:
      - ${config.db_data_volume}:/var/lib/postgresql/data
    networks:
      - ${config.network_name}
    restart: unless-stopped

  redis:
    image: ${config.redis_image}
    container_name: ${config.app_name}-redis
    ports:
      - "${config.redis_port}:6379"
    volumes:
      - ${config.redis_data_volume}:/data
    networks:
      - ${config.network_name}
    restart: unless-stopped

  nginx:
    image: ${config.nginx_image}
    container_name: ${config.app_name}-nginx
    ports:
      - "${config.nginx_port}:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - app
    networks:
      - ${config.network_name}
    restart: unless-stopped

volumes:
  app-data:
    driver: local
  db-data:
    driver: local
  redis-data:
    driver: local

networks:
  ${config.network_name}:
    driver: ${config.network_driver}`;
}

console.log('\n🎯 Docker Compose generation complete!');
console.log('📁 Check the examples/docker-compose/manifests/ directory for generated files.'); 