const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

config.resolver.assetExts = [...(config.resolver.assetExts || []), 'wasm'];

config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  '@expo/metro-runtime': path.dirname(require.resolve('@expo/metro-runtime/package.json', {
    paths: [path.dirname(require.resolve('expo-router/package.json'))],
  })),
};

module.exports = config;
