import type { CaptureCategory, PlaceInfo } from '../types/capture';

/** Browsing sections are derived from existing analysis; persisted categories stay intact. */
export const ARCHIVE_SECTIONS = [
  { id: 'shopping', label: '물건' },
  { id: 'places', label: '갈 곳' },
  { id: 'questions', label: '궁금한 정보' },
  { id: 'travel', label: '여행' },
] as const;
export type ArchiveSection = typeof ARCHIVE_SECTIONS[number]['id'];
export interface ArchiveCapture {
  category: CaptureCategory;
  title: string;
  summary: string;
  extractedText: string;
  tags: string[];
  links: string[];
  places: PlaceInfo[];
  relatedSearchTerms?: string[];
}
export interface ArchiveLink {
  kind: 'source' | 'search' | 'shopping' | 'map';
  label: string;
  url: string;
}
export const TIMESTAMP_ONLY_ADDRESS = /^\d{4}[-./]\d{1,2}[-./]\d{1,2}(?:[ T]\d{1,2}:\d{2})?$/;
const TRAVEL = /여행\s*(준비|계획|일정)|항공권|탑승권|항공편|여정|터미널|체크인|호텔\s*예약|숙소\s*예약|boarding|itinerary|flight\s*\d|\b[A-Z0-9]{2}\d{3,4}\b/i;
const SHOPPING = /장바구니|구매|상품|배송|최저가|옵션|쿠팡|product|shopping|add to cart/i;
const PRIVATE_LABEL = /예약\s*번호|주문\s*번호|승객|여권|연락처|전화번호|카드번호|confirmation|booking\s*(id|ref)/i;
const MAX_QUERY_LENGTH = 100;

export function classifyArchiveCapture(capture: ArchiveCapture): ArchiveSection {
  const text = [capture.title, capture.summary, capture.extractedText, ...capture.tags].join(' ');
  if (TRAVEL.test(text)) return 'travel';
  if (SHOPPING.test(text)) return 'shopping';
  if (capture.category === 'place' || capture.places.length > 0) return 'places';
  return 'questions';
}
export function buildSourceQuery(capture: ArchiveCapture): string {
  const placeName = classifyArchiveCapture(capture) === 'places' ? capture.places[0]?.name : undefined;
  const title = (placeName || capture.title).trim();
  if (PRIVATE_LABEL.test(title)) return '';
  return title.replace(/https?:\/\/\S+|\S+@\S+|\b\d{2,4}-\d{3,4}-\d{4}\b|\b\d{6,}\b/g, '').trim().slice(0, MAX_QUERY_LENGTH);
}
export function safeArchiveUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}
export function buildArchiveLinks(capture: ArchiveCapture): ArchiveLink[] {
  const links: ArchiveLink[] = [];
  const sourceUrls = [...new Set([...capture.links, ...capture.places.flatMap(p => p.links ?? [])].map(safeArchiveUrl).filter((x): x is string => x !== null))];
  sourceUrls.forEach(url => links.push({ kind: 'source', label: '캡처에 연결된 링크 · 내용 확인 필요', url }));
  const query = buildSourceQuery(capture);
  if (query) links.push({ kind: 'search', label: '원본 출처 검색 · 확인 전', url: `https://www.google.com/search?q=${encodeURIComponent(query)}` });
  if (classifyArchiveCapture(capture) === 'shopping' && query) {
    links.push({ kind: 'shopping', label: '구매·가격 비교 검색 · 상품 일치 확인 필요', url: `https://search.shopping.naver.com/search/all?query=${encodeURIComponent(query)}` });
  }
  capture.places.forEach(place => {
    const address = place.address && !TIMESTAMP_ONLY_ADDRESS.test(place.address.trim()) ? place.address : undefined;
    const term = [place.name, address].filter(Boolean).join(' ');
    if (!term.trim()) return;
    links.push({ kind: 'map', label: `${place.name} · Google 지도 검색`, url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(term)}` });
    links.push({ kind: 'map', label: `${place.name} · 네이버 지도 검색`, url: `https://map.naver.com/p/search/${encodeURIComponent(term)}` });
  });
  return links.filter((link, index) => links.findIndex(other => other.url === link.url) === index);
}
