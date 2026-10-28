import type { CaptureItem } from '@scrave/shared';
import { mergeArchiveCaptures } from '@/lib/archive-search';

interface ProtectedCategoryPageInput {
  dbCaptures: CaptureItem[];
  guestCaptures: CaptureItem[];
  isAuthReady: boolean;
  isLoading: boolean;
}

export function getProtectedCategoryPageModel({
  dbCaptures,
  guestCaptures,
  isAuthReady,
  isLoading,
}: ProtectedCategoryPageInput) {
  const captures = mergeArchiveCaptures(dbCaptures, guestCaptures);

  return {
    captures,
    isLoading: captures.length === 0 && (!isAuthReady || isLoading),
  };
}

export function removeCaptureFromCategoryPage(
  captures: CaptureItem[],
  deletedId: number,
): CaptureItem[] {
  return captures.filter((capture) => capture.id !== deletedId);
}
