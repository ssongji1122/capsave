import type { CaptureItem } from '@scrave/shared';

function isCaptureForUser(capture: CaptureItem, userId?: string): boolean {
  return !userId || capture.userId === userId;
}

export function applyRealtimeCaptureInsert(
  captures: CaptureItem[],
  newCapture: CaptureItem,
  userId?: string
): CaptureItem[] {
  if (!isCaptureForUser(newCapture, userId)) return captures;
  if (newCapture.deletedAt) return captures;
  if (captures.some((capture) => capture.id === newCapture.id)) return captures;
  return [newCapture, ...captures];
}

export function applyRealtimeCaptureUpdate(
  captures: CaptureItem[],
  updatedCapture: CaptureItem,
  userId?: string
): CaptureItem[] {
  if (!isCaptureForUser(updatedCapture, userId)) return captures;
  if (updatedCapture.deletedAt) {
    return captures.filter((capture) => capture.id !== updatedCapture.id);
  }

  return captures.map((capture) => (
    capture.id === updatedCapture.id ? updatedCapture : capture
  ));
}

export function applyRealtimeCaptureDelete(
  captures: CaptureItem[],
  deletedId: number
): CaptureItem[] {
  return captures.filter((capture) => capture.id !== deletedId);
}
