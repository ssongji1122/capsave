import type { CaptureItem } from './database';
import type { SessionLike } from './session-captures';

export const OFFLINE_CACHE_MESSAGE = '오프라인 사본을 보여 주고 있습니다. 연결 후 다시 시도해 주세요.';
export const CAPTURE_LOAD_ERROR_MESSAGE = '보관함을 불러오지 못했습니다. 연결을 확인해 주세요.';

interface CaptureSyncDeps {
  loadCache: (session: SessionLike | null) => Promise<CaptureItem[]>;
  loadServer: (session: SessionLike | null) => Promise<CaptureItem[]>;
  onCaptures: (captures: CaptureItem[], source: 'cache' | 'server') => void;
  onSyncError: (message: string | null) => void;
}

export async function syncCapturesForSession(
  session: SessionLike | null,
  deps: CaptureSyncDeps
): Promise<void> {
  let cachedCaptures: CaptureItem[] = [];

  try {
    cachedCaptures = await deps.loadCache(session);
  } catch {
    cachedCaptures = [];
  }

  if (cachedCaptures.length > 0) {
    deps.onCaptures(cachedCaptures, 'cache');
  }

  try {
    const serverCaptures = await deps.loadServer(session);
    deps.onCaptures(serverCaptures, 'server');
    deps.onSyncError(null);
  } catch {
    deps.onSyncError(
      cachedCaptures.length > 0 ? OFFLINE_CACHE_MESSAGE : CAPTURE_LOAD_ERROR_MESSAGE
    );
  }
}
