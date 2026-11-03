import { getPreferredMapLinks, openMap, openUrl, sortByPreferredProvider } from '../map-linker';

const mockCanOpenURL = jest.fn();
const mockOpenURL = jest.fn();
const mockAlert = jest.fn();

jest.mock('react-native', () => ({
  Linking: {
    canOpenURL: (...args: unknown[]) => mockCanOpenURL(...args),
    openURL: (...args: unknown[]) => mockOpenURL(...args),
  },
  Alert: {
    alert: (...args: unknown[]) => mockAlert(...args),
  },
  Platform: { OS: 'ios' },
}));

jest.mock('@scrave/shared', () => ({
  isUrlSafe: (url: string) => url.startsWith('https://') || url.startsWith('kakaomap://'),
  MOBILE_DEEP_LINK_SCHEMES: ['kakaomap'],
  getMobileMapLinks: () => [
    { provider: 'tmap', label: 'T map', appUrl: 'tmap://search', webUrl: 'https://tmap.life' },
    { provider: 'naver', label: '네이버 지도', appUrl: 'nmap://search', webUrl: 'https://map.naver.com' },
    { provider: 'google', label: 'Google Maps', appUrl: 'geo:0,0', webUrl: 'https://maps.google.com' },
    {
      provider: 'kakao',
      label: '카카오맵',
      appUrl: 'kakaomap://look?p=37,127',
      iosAppUrl: 'kakaomap://look?p=37,127',
      webUrl: 'https://map.kakao.com',
    },
  ],
}));

let errorSpy: jest.SpyInstance;

beforeEach(() => {
  errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  mockCanOpenURL.mockReset();
  mockOpenURL.mockReset();
  mockAlert.mockReset();
});

afterEach(() => {
  errorSpy.mockRestore();
});

describe('openMap', () => {
  it('logs error when Linking.canOpenURL throws', async () => {
    mockCanOpenURL.mockRejectedValueOnce(new Error('linking error'));
    mockOpenURL.mockResolvedValueOnce(undefined);

    await openMap('kakao', '테스트 장소');

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringMatching(/map.*link/i),
      expect.any(Error)
    );
  });
});

describe('openUrl', () => {
  it('logs error when Linking.canOpenURL throws', async () => {
    mockCanOpenURL.mockRejectedValueOnce(new Error('linking error'));

    await openUrl('https://example.com');

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringMatching(/openUrl/i),
      expect.any(Error)
    );
  });
});

describe('preferred map provider order', () => {
  it.each(['tmap', 'naver', 'google', 'kakao'] as const)(
    'puts %s first in every mobile map menu',
    (provider) => {
      expect(getPreferredMapLinks('서울시청', '서울 중구', provider)[0]?.provider).toBe(provider);
    }
  );

  it('keeps the original order when the preferred provider is unavailable', () => {
    const googleOnly = [{ provider: 'google' as const, label: 'Google Maps' }];

    expect(sortByPreferredProvider(googleOnly, 'naver')).toEqual(googleOnly);
  });
});
