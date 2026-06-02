import type { CaptureItem } from '@scrave/shared';

interface ProtectedCategoryPageInput {
  dbCaptures: CaptureItem[];
  guestCaptures: CaptureItem[];
  isAuthReady: boolean;
  isLoading: boolean;
}

export function getProtectedCategoryPageModel({
  dbCaptures,
  isAuthReady,
  isLoading,
}: ProtectedCategoryPageInput) {
  return {
    captures: dbCaptures,
    isLoading: !isAuthReady || isLoading,
  };
}

export function removeCaptureFromCategoryPage(
  captures: CaptureItem[],
  deletedId: number,
): CaptureItem[] {
  return captures.filter((capture) => capture.id !== deletedId);
}
