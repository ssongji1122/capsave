jest.mock('expo/metro-config', () => ({ getDefaultConfig: () => ({ resolver: { assetExts: [] } }) }));
const path = require('path');
const config = require('../../metro.config');

test('resolves the installed Expo Router runtime for server rendering', () => {
  const runtime = path.dirname(require.resolve('@expo/metro-runtime/package.json', {
    paths: [path.dirname(require.resolve('expo-router/package.json'))],
  }));
  expect(config.resolver.extraNodeModules?.['@expo/metro-runtime']).toBe(runtime);
});
