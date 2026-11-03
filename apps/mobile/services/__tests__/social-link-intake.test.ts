jest.mock('../supabase', () => ({
  getSupabaseClient: () => ({
    storage: {
      from: jest.fn(),
    },
  }),
}));

import {
  inspectMobileSocialLink,
  saveMobileSocialLinkCaptures,
  uploadMobileSocialLinkImage,
} from '../social-link-intake';

const captures = [0, 1].map((index) => ({
  imageUrl: `https://scontent.cdninstagram.com/${index}.jpg`,
  imageKind: index === 0 ? 'image' as const : 'video-preview' as const,
  selected: index === 1,
  analysis: {
    category: 'place' as const,
    title: '서울 카페',
    summary: '창가가 좋은 카페',
    extractedText: '서울 카페',
    tags: ['수집됨', '검증 전', '여행·장소'],
    links: ['https://www.instagram.com/p/Abcd/'],
    places: [],
    source: 'instagram' as const,
    confidence: 0,
    sourceAccountId: 'seoulpick',
    sourceIndices: [index],
  },
}));

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

describe('mobile social link intake', () => {
  it('requires a login token before inspecting and sends Bearer auth', async () => {
    const fetchImpl = jest.fn();
    await expect(inspectMobileSocialLink('https://instagram.com/p/Abcd/', {
      serverUrl: 'https://scrave.vercel.app',
      getToken: async () => null,
      fetchImpl,
    })).rejects.toThrow('로그인한 뒤 링크를 저장할 수 있습니다.');
    expect(fetchImpl).not.toHaveBeenCalled();

    fetchImpl.mockResolvedValueOnce(jsonResponse({
      post: { url: captures[0].analysis.links[0], author: 'seoulpick', caption: '서울 카페', selectedIndex: 2, images: [] },
      captures,
    }));
    const result = await inspectMobileSocialLink('https://instagram.com/p/Abcd/?img_index=2', {
      serverUrl: 'https://scrave.vercel.app/',
      getToken: async () => 'token-abc',
      fetchImpl,
    });
    expect(result.captures).toHaveLength(2);
    expect(fetchImpl).toHaveBeenCalledWith('https://scrave.vercel.app/api/social-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer token-abc' },
      body: JSON.stringify({ url: 'https://instagram.com/p/Abcd/?img_index=2' }),
    });
  });

  it('downloads trusted media with auth and uploads the exact bytes', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => 'image/webp' },
      arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
    } as unknown as Response);
    const uploadBytes = jest.fn().mockResolvedValue(undefined);
    const path = await uploadMobileSocialLinkImage(captures[0].imageUrl, 'owner', {
      serverUrl: 'https://scrave.vercel.app',
      getToken: async () => 'token-abc',
      fetchImpl,
      uploadBytes,
      now: () => 100,
      randomSuffix: () => 'fixed',
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      `https://scrave.vercel.app/api/social-link?src=${encodeURIComponent(captures[0].imageUrl)}`,
      { headers: { Authorization: 'Bearer token-abc' } },
    );
    expect(path).toBe('owner/100_fixed.webp');
    expect(uploadBytes).toHaveBeenCalledWith('owner/100_fixed.webp', expect.any(Uint8Array), 'image/webp');
    expect(Array.from(uploadBytes.mock.calls[0][1])).toEqual([1, 2, 3]);
  });

  it('saves in reverse insertion order and resumes from completed progress', async () => {
    const order: string[] = [];
    const completed = await saveMobileSocialLinkCaptures(captures, 0, {
      upload: async (capture) => {
        order.push(`upload:${capture.analysis.sourceIndices?.[0]}`);
        return `owner/${capture.analysis.sourceIndices?.[0]}.jpg`;
      },
      save: async (analysis, path) => {
        order.push(`save:${analysis.sourceIndices?.[0]}:${path}`);
      },
      cleanup: async () => undefined,
    });
    expect(completed).toBe(2);
    expect(order).toEqual(['upload:1', 'save:1:owner/1.jpg', 'upload:0', 'save:0:owner/0.jpg']);

    const resumed: number[] = [];
    expect(await saveMobileSocialLinkCaptures(captures, 1, {
      upload: async (capture) => {
        resumed.push(capture.analysis.sourceIndices?.[0] ?? -1);
        return 'owner/retry.jpg';
      },
      save: async () => undefined,
      cleanup: async () => undefined,
    })).toBe(2);
    expect(resumed).toEqual([0]);
  });

  it('cleans up a new upload and reports completed progress when row saving fails', async () => {
    const cleanup = jest.fn().mockResolvedValue(undefined);
    await expect(saveMobileSocialLinkCaptures(captures, 0, {
      upload: async () => 'owner/new.jpg',
      save: async () => { throw new Error('row failed'); },
      cleanup,
    })).rejects.toMatchObject({ completed: 0, message: 'row failed' });
    expect(cleanup).toHaveBeenCalledWith('owner/new.jpg');
  });
});
