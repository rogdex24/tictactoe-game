module.exports = function (api) {
  api.cache(true);

  const isProduction = process.env.NODE_ENV === 'production';

  const plugins = [];

  // Remove console.log statements in production builds
  if (isProduction) {
    plugins.push([
      'transform-remove-console',
      {
        exclude: ['error', 'warn', 'info'], // Keep console.error, console.warn, console.info
      },
    ]);
  }

  return {
    presets: ['babel-preset-expo'],
    plugins,
  };
};
