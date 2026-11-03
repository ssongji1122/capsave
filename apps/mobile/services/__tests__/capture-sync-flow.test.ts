import type { CaptureItem } from '../database';
import {
  CAPTURE_LOAD_ERROR_MESSAGE,
  OFFLINE_CACHE_MESSAGE,
  syncCapturesForSession,
} from '../capture-sync-flow';

const cachedCapture = { id: 1, title: 'Cached capture' } as CaptureItem;
const serverCapture = { id: 2, title: 'Server capture' } as CaptureItem;

describe('syncCapturesForSession', () => {
  it('shows an owned cache before a delayed server response and then replaces it', async () => {
    let resolveServer!: (captures: CaptureItem[]) => void;
    const loadServer = jest.fn(() => new Promise<CaptureItem[]>((resolve) => {
      resolveServer = resolve;
    }));
    const onCaptures = jest.fn();
    const syncPromise = syncCapturesForSession({ user: { id: 'user-1' } }, {
      loadCache: jest.fn().mockResolvedValue([cachedCapture]),
      loadServer,
      onCaptures,
      onSyncError: jest.fn(),
    });

    await Promise.resolve();
    await Promise.resolve();
    expect(onCaptures).toHaveBeenCalledWith([cachedCapture], 'cache');
    expect(loadServer).toHaveBeenCalledTimes(1);

    resolveServer([serverCapture]);
    await syncPromise;
    expect(onCaptures).toHaveBeenLastCalledWith([serverCapture], 'server');
  });

  it('keeps the cache and explains offline state when the server fails', async () => {
    const onCaptures = jest.fn();
    const onSyncError = jest.fn();

    await syncCapturesForSession({ user: { id: 'user-1' } }, {
      loadCache: jest.fn().mockResolvedValue([cachedCapture]),
      loadServer: jest.fn().mockRejectedValue(new Error('offline')),
      onCaptures,
      onSyncError,
    });

    expect(onCaptures).toHaveBeenCalledTimes(1);
    expect(onSyncError).toHaveBeenCalledWith(OFFLINE_CACHE_MESSAGE);
  });

  it('shows a load error instead of an empty-state claim when no cache is available', async () => {
    const onSyncError = jest.fn();

    await syncCapturesForSession({ user: { id: 'user-1' } }, {
      loadCache: jest.fn().mockResolvedValue([]),
      loadServer: jest.fn().mockRejectedValue(new Error('offline')),
      onCaptures: jest.fn(),
      onSyncError,
    });

    expect(onSyncError).toHaveBeenCalledWith(CAPTURE_LOAD_ERROR_MESSAGE);
  });

  it('clears a previous sync notice after a successful server response', async () => {
    const onSyncError = jest.fn();

    await syncCapturesForSession({ user: { id: 'user-1' } }, {
      loadCache: jest.fn().mockResolvedValue([]),
      loadServer: jest.fn().mockResolvedValue([serverCapture]),
      onCaptures: jest.fn(),
      onSyncError,
    });

    expect(onSyncError).toHaveBeenLastCalledWith(null);
  });
});
