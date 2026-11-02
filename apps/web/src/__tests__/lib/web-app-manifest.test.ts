import { describe, expect, it } from 'vitest';
import manifest from '@/app/manifest';
import { metadata, viewport } from '@/app/layout';

describe('home screen web app', () => {
  it('opens the archive as a standalone app', () => {
    const m = manifest();
    expect(m.name).toBe('Scrave');
    expect(m.start_url).toBe('/dashboard');
    expect(m.display).toBe('standalone');
    expect(m.lang).toBe('ko');
  });

  it('uses the slate brand color on a white background', () => {
    const m = manifest();
    expect(m.theme_color).toBe('#FFFFFF');
    expect(m.background_color).toBe('#FFFFFF');
    expect(viewport.themeColor).toBe('#FFFFFF');
  });

  it('ships install icons for Android and a maskable variant', () => {
    const icons = manifest().icons ?? [];
    expect(icons.map((i) => i.sizes)).toEqual(expect.arrayContaining(['192x192', '512x512']));
    expect(icons.some((i) => i.purpose === 'maskable')).toBe(true);
  });

  it('lets iOS add the app to the home screen with its own title', () => {
    expect(metadata.appleWebApp).toMatchObject({ capable: true, title: 'Scrave' });
  });
});
