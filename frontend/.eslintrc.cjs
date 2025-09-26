module.exports = {
  extends: ['../.eslintrc.cjs'],
  parserOptions: {
    project: ['./tsconfig.json'],
  },
  settings: {
    'import/core-modules': [
      'react-native',
      'expo',
      'expo-font',
      'expo-splash-screen',
      'expo-linear-gradient',
      'react-native-linear-gradient',
      'react-native-svg',
    ],
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
