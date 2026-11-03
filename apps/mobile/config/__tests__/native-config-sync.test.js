const fs = require('node:fs');
const path = require('node:path');

const mobileRoot = path.resolve(__dirname, '../..');

function readMobileFile(relativePath) {
  return fs.readFileSync(path.join(mobileRoot, relativePath), 'utf8');
}

describe('checked-in iOS configuration', () => {
  it('keeps the native interface style aligned with the light Expo design', () => {
    const appConfig = readMobileFile('app.config.ts');
    const infoPlist = readMobileFile('ios/Scrave/Info.plist');

    expect(appConfig).toMatch(/userInterfaceStyle:\s*'light'/);
    expect(infoPlist).toMatch(
      /<key>UIUserInterfaceStyle<\/key>\s*<string>Light<\/string>/
    );
  });
});
