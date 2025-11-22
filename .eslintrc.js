module.exports = {
  env: {
    browser: true,
    es2021: true,
    jest: true,
    node: true,
  },
  extends: [
    'airbnb-base',
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'class-methods-use-this': 'off',
    'no-underscore-dangle': 'off',
    'max-len': ['error', { code: 120 }],
    'no-plusplus': 'off',
    'no-param-reassign': 'off',
  },
  globals: {
    marked: 'readonly',
    Prism: 'readonly',
    lucide: 'readonly',
    indexedDB: 'readonly',
    IDBKeyRange: 'readonly',
  },
};
