import type { CaptureItem as SharedCaptureItem } from '@scrave/shared';
import {
  deleteCaptureForSession,
  getSessionVisibleCaptures,
  loadCapturesForSession,
  searchVisibleCaptures,
  toMobileCapture,
} from '../session-captures';

function makeSharedCapture(overrides: Partial<SharedCaptureItem> = {}): SharedCaptureItem {
  return {
    id: 1,
    category: 'place',
    title: 'Server place',
    summary: 'Saved from server',
    places: [{ name: 'Cafe', address: 'Seoul' }],
    extractedText: 'menu',
    links: ['https://example.com'],
    tags: ['cafe'],
    source: 'instagram',
    imageUrl: 'user-1/capture.jpg',
    createdAt: '2026-05-20T00:00:00.000Z',
    userId: 'user-1',
    confidence: 0.9,
    reclassifiedAt: null,
    deletedAt: null,
    sourceAccountId: null,
    ...overrides,
  };
}

describe('loadCapturesForSession', () => {
  it('returns no captures when there is no authenticated session', async () => {
    const deps = {
      getServerCaptures: jest.fn(),
      replaceCachedCaptures: jest.fn(),
    };

    await expect(loadCapturesForSession(null, deps)).resolves.toEqual([]);

    expect(deps.getServerCaptures).not.toHaveBeenCalled();
    expect(deps.replaceCachedCaptures).not.toHaveBeenCalled();
  });

  it('loads authenticated captures from the server and refreshes the local cache', async () => {
    const serverCapture = makeSharedCapture();
    const deps = {
      getServerCaptures: jest.fn().mockResolvedValue({ items: [serverCapture] }),
      replaceCachedCaptures: jest.fn().mockResolvedValue(undefined),
    };

    const result = await loadCapturesForSession({ user: { id: 'user-1' } }, deps);

    expect(result).toEqual([toMobileCapture(serverCapture)]);
    expect(deps.replaceCachedCaptures).toHaveBeenCalledWith(result);
  });

  it('does not keep stale local captures when the server has none for this session', async () => {
    const deps = {
      getServerCaptures: jest.fn().mockResolvedValue({ items: [] }),
      replaceCachedCaptures: jest.fn().mockResolvedValue(undefined),
    };

    const result = await loadCapturesForSession({ user: { id: 'user-2' } }, deps);

    expect(result).toEqual([]);
    expect(deps.replaceCachedCaptures).toHaveBeenCalledWith([]);
  });
});

describe('getSessionVisibleCaptures', () => {
  const capture = toMobileCapture(makeSharedCapture());

  it('hides captures when there is no authenticated session', () => {
    expect(getSessionVisibleCaptures(null, 'user-1', [capture])).toEqual([]);
  });

  it('hides captures that belong to a previous session owner', () => {
    expect(getSessionVisibleCaptures('user-2', 'user-1', [capture])).toEqual([]);
  });

  it('returns captures only when the active session owns the loaded state', () => {
    expect(getSessionVisibleCaptures('user-1', 'user-1', [capture])).toEqual([capture]);
  });
});

describe('searchVisibleCaptures', () => {
  const cafe = toMobileCapture(makeSharedCapture({
    id: 1,
    title: 'Seoul cafe',
    summary: 'Quiet coffee spot',
    places: [{ name: 'Anthracite', address: 'Hapjeong' }],
    tags: ['coffee'],
    extractedText: 'flat white',
  }));
  const article = toMobileCapture(makeSharedCapture({
    id: 2,
    category: 'text',
    title: 'TypeScript note',
    summary: 'Utility type reference',
    places: [],
    tags: ['code'],
    extractedText: 'Pick and Omit examples',
  }));

  it('searches only the currently visible capture list', () => {
    expect(searchVisibleCaptures('coffee', [cafe])).toEqual([cafe]);
    expect(searchVisibleCaptures('code', [cafe])).toEqual([]);
  });

  it('matches title, summary, extracted text, tags, and places case-insensitively', () => {
    expect(searchVisibleCaptures('typescript', [cafe, article])).toEqual([article]);
    expect(searchVisibleCaptures('quiet', [cafe, article])).toEqual([cafe]);
    expect(searchVisibleCaptures('omit', [cafe, article])).toEqual([article]);
    expect(searchVisibleCaptures('CODE', [cafe, article])).toEqual([article]);
    expect(searchVisibleCaptures('hapjeong', [cafe, article])).toEqual([cafe]);
  });

  it('returns the visible list for a blank query', () => {
    expect(searchVisibleCaptures('   ', [cafe])).toEqual([cafe]);
  });
});

describe('deleteCaptureForSession', () => {
  const session = { user: { id: 'user-1' } };

  it('returns false and keeps the local cache when authenticated server deletion fails', async () => {
    const deps = {
      deleteServerCapture: jest.fn().mockRejectedValue(new Error('network')),
      deleteLocalCapture: jest.fn().mockResolvedValue(undefined),
      alertDeleteFailure: jest.fn(),
    };

    await expect(deleteCaptureForSession(session, 1, deps)).resolves.toBe(false);

    expect(deps.deleteServerCapture).toHaveBeenCalledWith(1);
    expect(deps.deleteLocalCapture).not.toHaveBeenCalled();
    expect(deps.alertDeleteFailure).toHaveBeenCalledTimes(1);
  });

  it('returns true after deleting authenticated captures from server and local cache', async () => {
    const deps = {
      deleteServerCapture: jest.fn().mockResolvedValue(undefined),
      deleteLocalCapture: jest.fn().mockResolvedValue(undefined),
      alertDeleteFailure: jest.fn(),
    };

    await expect(deleteCaptureForSession(session, 1, deps)).resolves.toBe(true);

    expect(deps.deleteServerCapture).toHaveBeenCalledWith(1);
    expect(deps.deleteLocalCapture).toHaveBeenCalledWith(1);
    expect(deps.alertDeleteFailure).not.toHaveBeenCalled();
  });

  it('deletes guest captures from the local cache only', async () => {
    const deps = {
      deleteServerCapture: jest.fn(),
      deleteLocalCapture: jest.fn().mockResolvedValue(undefined),
      alertDeleteFailure: jest.fn(),
    };

    await expect(deleteCaptureForSession(null, 1, deps)).resolves.toBe(true);

    expect(deps.deleteServerCapture).not.toHaveBeenCalled();
    expect(deps.deleteLocalCapture).toHaveBeenCalledWith(1);
    expect(deps.alertDeleteFailure).not.toHaveBeenCalled();
  });
});
