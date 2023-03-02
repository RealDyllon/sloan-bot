module.exports = {
  env: {
    node: true,
    esnext: true,
  },
  extends: [
    'airbnb-base',
    "plugin:prettier/recommended"
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: [
    '@typescript-eslint',
    "prettier"
  ],
  rules: {
  },
};
