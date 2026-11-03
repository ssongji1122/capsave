const fs = require('node:fs');
const path = require('node:path');

const mobileRoot = path.resolve(__dirname, '../..');
const read = (relativePath) => fs.readFileSync(path.join(mobileRoot, relativePath), 'utf8');

describe('native settings route wiring', () => {
  it('registers the settings stack and exposes one 44px accessible entry from home', () => {
    const layout = read('app/_layout.tsx');
    const home = read('app/(tabs)/index.tsx');

    expect(layout).toMatch(/Stack\.Screen\s+name="settings"/);
    expect(home).toMatch(/accessibilityLabel="설정 열기"/);
    expect(home).toMatch(/settings-outline/);
    expect(home).toMatch(/router\.push\(['"]\/settings/);
    expect(home).toMatch(/settingsButton:\s*\{[^}]*minWidth:\s*44[^}]*minHeight:\s*44/s);
  });

  it('uses the same preferred-link resolver in all four native map menus', () => {
    const files = [
      'components/CaptureCard.tsx',
      'app/capture/[id].tsx',
      'components/PlaceQuickSearch.tsx',
      'components/PlacesMapView.tsx',
    ];

    for (const file of files) {
      expect(read(file)).toMatch(/getPreferredMapLinks/);
    }
  });

  it('prevents a swipe gesture from bypassing analysis draft confirmation', () => {
    const layout = read('app/_layout.tsx');

    expect(layout).toMatch(/name="capture\/analyze"[\s\S]*gestureEnabled:\s*false/);
  });
});
