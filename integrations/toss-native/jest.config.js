const path = require('path');
module.exports = require('@granite-js/react-native/jest').config({
  rootDir: __dirname,
  testMatch: ['<rootDir>/src/**/__tests__/*.test.ts?(x)'],
  moduleNameMapper: {
    '^react$': path.join(__dirname, 'node_modules/react'),
    '^react-native$': path.join(__dirname, 'node_modules/react-native'),
    '^@babel/runtime(.*)$': path.dirname(require.resolve('@babel/runtime/package.json')) + '$1',
  },
});
