const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

config.resolver.assetExts = [...(config.resolver.assetExts || []), 'wasm'];

module.exports = config;
