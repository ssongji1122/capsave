import type { CaptureItem as SharedCaptureItem, PaginatedResult } from '@scrave/shared';
import type { CaptureItem as MobileCaptureItem, CaptureCategory } from './database';

export interface SessionLike {
  user: {
    id: string;
  };
}

interface LoadCapturesDeps {
  getServerCaptures: () => Promise<Pick<PaginatedResult, 'items'>>;
  replaceCachedCaptures: (captures: MobileCaptureItem[]) => Promise<void>;
}

interface DeleteCaptureForSessionDeps {
  deleteServerCapture: (id: number) => Promise<void>;
  deleteLocalCapture: (id: number) => Promise<void>;
  alertDeleteFailure: () => void;
}

export function toMobileCapture(item: SharedCaptureItem): MobileCaptureItem {
  return {
    id: item.id,
    category: item.category as CaptureCategory,
    title: item.title,
    summary: item.summary,
    places: item.places,
    extractedText: item.extractedText,
    links: item.links,
    tags: item.tags,
    source: item.source,
    imageUri: item.imageUrl,
    confidence: item.confidence,
    sourceAccountId: item.sourceAccountId,
    createdAt: item.createdAt,
  };
}

export async function loadCapturesForSession(
  session: SessionLike | null,
  deps: LoadCapturesDeps
): Promise<MobileCaptureItem[]> {
  if (!session) {
    return [];
  }

  const { items } = await deps.getServerCaptures();
  const mobileItems = items.map(toMobileCapture);
  await deps.replaceCachedCaptures(mobileItems);
  return mobileItems;
}

export async function deleteCaptureForSession(
  session: SessionLike | null,
  id: number,
  deps: DeleteCaptureForSessionDeps
): Promise<boolean> {
  if (session) {
    try {
      await deps.deleteServerCapture(id);
    } catch {
      deps.alertDeleteFailure();
      return false;
    }
  }

  await deps.deleteLocalCapture(id);
  return true;
}

export function getSessionVisibleCaptures(
  activeSessionUserId: string | null,
  capturesOwnerId: string | null,
  captures: MobileCaptureItem[]
): MobileCaptureItem[] {
  if (!activeSessionUserId || capturesOwnerId !== activeSessionUserId) {
    return [];
  }

  return captures;
}

export function searchVisibleCaptures(
  query: string,
  visibleCaptures: MobileCaptureItem[]
): MobileCaptureItem[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return visibleCaptures;
  }

  return visibleCaptures.filter((capture) => {
    const searchableText = [
      capture.title,
      capture.summary,
      capture.extractedText,
      capture.tags.join(' '),
      capture.places
        .map((place) => [
          place.name,
          place.address,
          place.date,
          ...(place.links ?? []),
        ].filter(Boolean).join(' '))
        .join(' '),
    ].join(' ').toLowerCase();

    return searchableText.includes(normalizedQuery);
  });
}
