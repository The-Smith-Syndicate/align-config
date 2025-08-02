#!/usr/bin/env node
const Align = require('../../lib.js');
const chalk = require('chalk');

// Initialize Align with the security config directory
const align = new Align('./config');

console.log(chalk.blue('🔒 Security Compliance Audit'));
console.log('=====================================\n');

// Security compliance checks
const securityChecks = [
  {
    name: 'Authentication Settings',
    checks: [
      { key: 'auth_enabled', expected: true, critical: true },
      { key: 'require_mfa', expected: true, critical: true },
      { key: 'max_login_attempts', max: 5, critical: true },
      { key: 'password_min_length', min: 12, critical: true }
    ]
  },
  {
    name: 'Encryption Settings',
    checks: [
      { key: 'ssl_enabled', expected: true, critical: true },
      { key: 'data_encryption_at_rest', expected: true, critical: true },
      { key: 'data_encryption_in_transit', expected: true, critical: true },
      { key: 'ssl_min_version', expected: 'TLSv1.2', critical: true }
    ]
  },
  {
    name: 'Network Security',
    checks: [
      { key: 'firewall_enabled', expected: true, critical: true },
      { key: 'rate_limiting_enabled', expected: true, critical: true },
      { key: 'cors_enabled', expected: false, critical: false }
    ]
  },
  {
    name: 'Logging & Monitoring',
    checks: [
      { key: 'audit_logging_enabled', expected: true, critical: true },
      { key: 'security_logging_enabled', expected: true, critical: true },
      { key: 'log_retention_days', min: 365, critical: true }
    ]
  },
  {
    name: 'Compliance Settings',
    checks: [
      { key: 'gdpr_compliance', expected: true, critical: true },
      { key: 'sox_compliance', expected: true, critical: true },
      { key: 'pci_compliance', expected: true, critical: false }
    ]
  }
];

// Run security audit for each environment
const environments = ['dev', 'prod'];
let totalIssues = 0;
let criticalIssues = 0;

environments.forEach(env => {
  console.log(chalk.yellow(`\n📋 Auditing ${env.toUpperCase()} Environment`));
  console.log('----------------------------------------');
  
  try {
    const config = align.load(env);
    let envIssues = 0;
    let envCriticalIssues = 0;
    
    securityChecks.forEach(category => {
      console.log(chalk.cyan(`\n🔍 ${category.name}:`));
      
      category.checks.forEach(check => {
        const value = config[check.key];
        let passed = false;
        let message = '';
        
        if (check.expected !== undefined) {
          passed = value === check.expected;
          message = `${check.key}: ${value} (expected: ${check.expected})`;
        } else if (check.min !== undefined) {
          passed = value >= check.min;
          message = `${check.key}: ${value} (minimum: ${check.min})`;
        } else if (check.max !== undefined) {
          passed = value <= check.max;
          message = `${check.key}: ${value} (maximum: ${check.max})`;
        }
        
        if (passed) {
          console.log(chalk.green(`  ✅ ${message}`));
        } else {
          const issueType = check.critical ? 'CRITICAL' : 'WARNING';
          const color = check.critical ? chalk.red : chalk.yellow;
          console.log(color(`  ❌ ${issueType}: ${message}`));
          envIssues++;
          if (check.critical) envCriticalIssues++;
        }
      });
    });
    
    totalIssues += envIssues;
    criticalIssues += envCriticalIssues;
    
    console.log(chalk.blue(`\n📊 ${env.toUpperCase()} Summary:`));
    console.log(`  Issues: ${envIssues}`);
    console.log(`  Critical: ${envCriticalIssues}`);
    
  } catch (error) {
    console.log(chalk.red(`❌ Error auditing ${env}: ${error.message}`));
  }
});

// Overall compliance report
console.log(chalk.blue('\n🎯 Overall Security Compliance Report'));
console.log('==========================================');
console.log(`Total Issues: ${totalIssues}`);
console.log(`Critical Issues: ${criticalIssues}`);

if (criticalIssues === 0) {
  console.log(chalk.green('\n✅ SECURITY COMPLIANCE PASSED'));
  console.log('All critical security requirements are met.');
} else {
  console.log(chalk.red('\n❌ SECURITY COMPLIANCE FAILED'));
  console.log(`${criticalIssues} critical security issues must be resolved.`);
  process.exit(1);
}

// Compliance recommendations
console.log(chalk.blue('\n💡 Security Recommendations:'));
console.log('1. Enable MFA for all user accounts');
console.log('2. Use strong encryption for data at rest and in transit');
console.log('3. Implement comprehensive audit logging');
console.log('4. Regular security configuration reviews');
console.log('5. Monitor for configuration drift'); 