const { getDefaultConfig } = require('@expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add additional file extensions
config.resolver.sourceExts = [
  'js',
  'jsx',
  'json',
  'ts',
  'tsx',
  'cjs',
  'mjs'
];

config.resolver.blockList = [
  /node_modules\/dotenv\/lib\/main\.js$/,
];

// Ensure the entry point is properly resolved
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === '../index') {
    return {
      filePath: require.resolve('./index.js'),
      type: 'sourceFile',
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config; 