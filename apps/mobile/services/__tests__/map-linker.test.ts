import { openMap, openUrl } from '../map-linker';

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
