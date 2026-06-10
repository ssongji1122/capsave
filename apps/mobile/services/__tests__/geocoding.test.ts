import { geocodePlace } from '../geocoding';

let warnSpy: jest.SpyInstance;
let errorSpy: jest.SpyInstance;
let fetchMock: jest.SpyInstance;

beforeEach(() => {
  warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  fetchMock = jest.spyOn(global, 'fetch');
});

afterEach(() => {
  warnSpy.mockRestore();
  errorSpy.mockRestore();
  fetchMock.mockRestore();
});

describe('geocodePlace', () => {
  it('warns and returns null when API key is missing', async () => {
    const result = await geocodePlace('카페 연남', undefined, '');
    expect(result).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringMatching(/kakao.*api key/i)
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('logs error and returns null on fetch failure', async () => {
    fetchMock.mockRejectedValueOnce(new Error('network error'));
    const result = await geocodePlace('카페 연남', undefined, 'test-key');
    expect(result).toBeNull();
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringMatching(/geocod/i),
      expect.any(Error)
    );
  });

  it('returns coords on success', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        documents: [{ x: '126.923', y: '37.557' }],
      }),
    } as Response);
    const result = await geocodePlace('카페 연남', undefined, 'test-key');
    expect(result).toEqual({ lat: 37.557, lng: 126.923 });
  });

  it('returns null when fetch response is not ok', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false } as Response);
    const result = await geocodePlace('미존재 장소', undefined, 'test-key');
    expect(result).toBeNull();
  });
});
