import {
  extractCaptureActions as extractSharedCaptureActions,
  savedImagePath,
  type CaptureItem,
  type CaptureActionItem,
} from '@scrave/shared';

export { buildGoogleCalendarUrl, isTravelPackCandidate } from '@scrave/shared';
export type { CaptureActionKind, CaptureActionItem } from '@scrave/shared';

export function extractCaptureActions(item: CaptureItem): CaptureActionItem[] {
  return extractSharedCaptureActions({
    ...item,
    links: item.links.filter(link => !savedImagePath(link)),
  });
}
