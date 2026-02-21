module.exports = {
  root: true,
  env: { browser: true, es2021: true, node: true },
  extends: ['plugin:react/recommended'],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  rules: {
    'no-unused-vars': [
      'error',
      {
        varsIgnorePattern: '^React$',
        argsIgnorePattern: '^_',
        ignoreRestSiblings: true,
      },
    ],
    'react/prop-types': 'off',
  },
  plugins: ['header', 'react-hooks', 'react'],
  settings: {
    react: {
      version: 'detect',
    },
  },
  overrides: [
    {
      files: ['**/*.{js,jsx}'],
    },
  ],
};
