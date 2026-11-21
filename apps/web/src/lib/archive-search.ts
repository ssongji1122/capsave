import { canonicalInstagramPost, type CaptureItem } from '@scrave/shared';

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


export interface CaptureSearchEvidence {
  label: string;
  excerpt: string;
}

const EVIDENCE_CONTEXT_CHARACTERS = 24;

function evidenceFields(capture: CaptureItem): { label: string; value: string }[] {
  const fields = [
    { label: '제목', value: capture.title },
    { label: '요약', value: capture.summary },
    { label: '사진에서 읽은 글', value: capture.extractedText },
    ...capture.tags.map(value => ({ label: '태그', value })),
    ...capture.places.flatMap(place => [
      { label: '장소 이름', value: place.name },
      { label: '장소 주소', value: place.address },
      { label: '장소 날짜', value: place.date },
      ...(place.links ?? []).map(value => ({ label: '장소 링크', value })),
    ]),
    ...capture.links.map(value => ({ label: '링크', value })),
    { label: '출처 종류', value: capture.source },
    ...(capture.keyInsights ?? []).map(value => ({ label: '핵심 정리', value })),
    ...(capture.relatedSearchTerms ?? []).map(value => ({ label: '연관 검색어', value })),
  ];
  return fields.filter((field): field is { label: string; value: string } => Boolean(field.value));
}

function searchGroupKey(capture: CaptureItem): string {
  const posts = [...new Set(capture.links.map(canonicalInstagramPost).filter(Boolean))];
  return posts.length === 1 ? posts[0]! : `capture:${capture.id}`;
}

function matchingExcerpt(value: string, term: string): string | null {
  const index = value.toLocaleLowerCase('ko-KR').indexOf(term);
  if (index < 0) return null;
  const characters = Array.from(value);
  // Map normalized offsets back to original characters (e.g. İ lowercases to two code units).
  const normalizedPositions = characters.flatMap((character, position) =>
    Array(character.toLocaleLowerCase('ko-KR').length).fill(position) as number[],
  );
  const matchStart = normalizedPositions[index];
  const matchEnd = normalizedPositions[index + term.length - 1] + 1;
  const start = Math.max(0, matchStart - EVIDENCE_CONTEXT_CHARACTERS);
  const end = Math.min(characters.length, matchEnd + EVIDENCE_CONTEXT_CHARACTERS);
  return `${start > 0 ? '…' : ''}${characters.slice(start, end).join('')}${end < characters.length ? '…' : ''}`;
}

/** Explain only literal matches; never remove server results or infer an unseen match. */
export function getCaptureSearchEvidence(
  capture: CaptureItem,
  query: string,
  sourceCaptures: readonly CaptureItem[] = [capture],
): CaptureSearchEvidence[] {
  const terms = [...new Set(normalizeQuery(query).split(QUERY_SPLIT_PATTERN).filter(Boolean))];
  if (!terms.length) return [];
  const group = searchGroupKey(capture);
  const sources = sourceCaptures.filter(source => searchGroupKey(source) === group);
  const fields = sources.flatMap(source => evidenceFields(source).map(field => ({
    ...field,
    label: source.id === capture.id ? field.label : `묶인 캡처의 ${field.label}`,
  })));
  const evidence: CaptureSearchEvidence[] = [];
  for (const term of terms) {
    if (evidence.some(row => row.excerpt.toLocaleLowerCase('ko-KR').includes(term))) continue;
    for (const field of fields) {
      const excerpt = matchingExcerpt(field.value, term);
      if (excerpt === null) continue;
      evidence.push({ label: field.label, excerpt });
      break;
    }
  }
  return evidence;
}
