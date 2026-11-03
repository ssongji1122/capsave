import { DEFAULT_SCRAVE_SERVER_URL, resolveMobileServerUrl } from '../server-url';

describe('resolveMobileServerUrl', () => {
  it('uses and normalizes the configured Expo URL', () => {
    expect(resolveMobileServerUrl(
      { serverUrl: ' https://preview.example.com/ ' },
      { EXPO_PUBLIC_API_URL: 'https://environment.example.com' }
    )).toBe('https://preview.example.com');
  });

  it('falls back to the public environment URL', () => {
    expect(resolveMobileServerUrl({}, {
      EXPO_PUBLIC_API_URL: 'https://environment.example.com/',
    })).toBe('https://environment.example.com');
  });

  it('uses the existing Scrave production URL when no override exists', () => {
    expect(resolveMobileServerUrl({}, {})).toBe(DEFAULT_SCRAVE_SERVER_URL);
    expect(DEFAULT_SCRAVE_SERVER_URL).toBe('https://scrave.vercel.app');
  });
});
