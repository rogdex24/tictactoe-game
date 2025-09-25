module.exports = {
  extends: ['../.eslintrc.cjs'],
  parserOptions: {
    project: ['./tsconfig.json'],
  },
  settings: {
    'import/core-modules': ['react-native'],
  },
  overrides: [
    {
      files: ['babel.config.js', 'jest.config.js'],
      parserOptions: {
        project: null,
      },
    },
  ],
  rules: {
    'react/prop-types': 'off',
  },
};
