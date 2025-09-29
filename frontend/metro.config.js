const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname, {
  // Enable CSS support for web
  isCSSEnabled: true,
});

// Configure web platform support
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Extend asset extensions for better web support
config.resolver.assetExts.push(
  // Fonts
  'ttf',
  'otf',
  'woff',
  'woff2',
  'eot',
  // Images
  'svg',
  'gif',
  'webp',
  'ico',
  // Audio/Video
  'mp3',
  'mp4',
  'mov',
  'avi',
  'webm',
  // Documents
  'pdf',
);

// Configure source extensions for web
config.resolver.sourceExts = [
  ...config.resolver.sourceExts,
  'web.js',
  'web.jsx',
  'web.ts',
  'web.tsx',
];

// Configure module resolution for web
config.resolver.alias = {
  'react-native$': 'react-native-web',
  'react-native/Libraries/Utilities/Platform': 'react-native-web/dist/exports/Platform',
  'react-native/Libraries/Image/AssetRegistry': 'react-native-web/dist/modules/AssetRegistry',
  'react-native/Libraries/EventEmitter/RCTDeviceEventEmitter':
    'react-native-web/dist/vendor/react-native/NativeEventEmitter',
};

// Configure SVG transformer
config.resolver.assetExts = config.resolver.assetExts.filter((ext) => ext !== 'svg');
config.resolver.sourceExts.push('svg');

// Configure transformer for different file types
config.transformer = {
  ...config.transformer,
  unstable_allowRequireContext: true,
  assetPlugins: ['expo-asset/tools/hashAssetFiles'],
  babelTransformerPath: require.resolve('react-native-svg-transformer'),
};

// Ignore unnecessary files for web builds
config.resolver.blockList = [/.*\.native\.js$/, /.*\.ios\.js$/, /.*\.android\.js$/];

// Configure web-specific optimizations
if (process.env.NODE_ENV === 'production') {
  // Enable tree shaking for production builds
  config.transformer.minifierConfig = {
    keep_fnames: true,
    mangle: {
      keep_fnames: true,
    },
  };
}

module.exports = config;
