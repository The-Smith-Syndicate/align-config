import js from '@eslint/js';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
    rules: {
      'indent': ['error', 2],
      'quotes': ['error', 'single'],
      'semi': ['error', 'always'],
      'no-unused-vars': ['error', { 'argsIgnorePattern': '^_' }],
      'prefer-const': 'error',
      'no-var': 'error',
      'no-control-regex': 'off',
      'no-prototype-builtins': 'error',
    },
  },
  // CLI-specific rules (index.js)
  {
    files: ['index.js'],
    rules: {
      'no-console': 'off', // Allow console statements in CLI
      'no-unused-vars': ['warn', { 'argsIgnorePattern': '^_' }], // Less strict for CLI
    },
  },
  // Library-specific rules (lib.js, parser.js)
  {
    files: ['lib.js', 'parser.js'],
    rules: {
      'no-console': 'warn', // Warn about console in library code
      'no-unused-vars': ['error', { 'argsIgnorePattern': '^_' }], // Strict for library
    },
  },
  // Test-specific rules
  {
    files: ['**/*.test.js', '**/tests/**/*.js'],
    rules: {
      'no-console': 'off', // Allow console in tests
      'no-unused-vars': ['warn', { 'argsIgnorePattern': '^_' }], // Less strict for tests
    },
  },
  {
    ignores: [
      'node_modules/',
      'coverage/',
      'examples/',
      'templates/',
    ],
  },
]; 