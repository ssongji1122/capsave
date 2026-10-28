import type { CaptureItem } from '@scrave/shared';

const QUERY_SPLIT_PATTERN = /\s+/;

function normalizeQuery(value: string): string {
  return value.trim().toLocaleLowerCase('ko-KR');
}

function getCaptureSearchText(capture: CaptureItem): string {
  const placeText = capture.places
    .flatMap((place) => [place.name, place.address, place.date, ...(place.links ?? [])])
    .filter((value): value is string => Boolean(value));
  const fields = [
    capture.title,
    capture.summary,
    capture.extractedText,
    capture.source,
    ...capture.links,
    ...capture.tags,
    ...(capture.keyInsights ?? []),
    ...(capture.relatedSearchTerms ?? []),
    ...placeText,
  ];

  return normalizeQuery(fields.join(' '));
}

export function mergeArchiveCaptures(
  dbCaptures: readonly CaptureItem[],
  guestCaptures: readonly CaptureItem[],
): CaptureItem[] {
  return [...guestCaptures, ...dbCaptures].sort(
    (first, second) => new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime(),
  );
}

export function filterCapturesByArchiveQuery(
  captures: readonly CaptureItem[],
  query: string,
): CaptureItem[] {
  const normalizedQuery = normalizeQuery(query);
  if (!normalizedQuery) return [...captures];

  const terms = normalizedQuery.split(QUERY_SPLIT_PATTERN).filter(Boolean);
  return captures.filter((capture) => {
    const searchable = getCaptureSearchText(capture);
    return terms.every((term) => searchable.includes(term));
  });
}
