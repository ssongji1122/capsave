import type { CaptureItem } from '@scrave/shared';

export type CaptureActionKind =
  | 'phone'
  | 'reservation_code'
  | 'date'
  | 'address'
  | 'link';

export interface CaptureActionItem {
  id: string;
  kind: CaptureActionKind;
  label: string;
  value: string;
  href?: string;
}

const PHONE_REGEX =
  /\b(?:01[016789]|02|0[3-6][1-5]|050\d|070|15\d{2}|16\d{2}|18\d{2})-\d{3,4}-\d{4}\b|\b(?:15\d{2}|16\d{2}|18\d{2})-\d{4}\b/g;

const RESERVATION_LABEL_REGEX =
  /(?:예약\s*번호|예약\s*코드|확인\s*번호|승인\s*번호|티켓\s*번호|바우처\s*번호|Confirmation(?:\s*(?:No|Number|#))?|Booking(?:\s*(?:Ref|ID|#))?|PNR)\s*[:#-]?\s*([A-Z0-9]{5,14})/gi;

const FLIGHT_CODE_REGEX =
  /(?:편명|항공편|Flight)\s*[:#-]?\s*([A-Z]{2}\d{2,4})\b/gi;

const ISO_DATE_REGEX = /\b(20\d{2})[-.](0[1-9]|1[0-2])[-.](0[1-9]|[12]\d|3[01])\b/g;

const TRAVEL_KEYWORDS = [
  '항공',
  '탑승권',
  '비행기',
  '체크인',
  '숙소',
  '호텔',
  '리조트',
  '비자',
  '여권',
  '바우처',
  '예약',
  '렌터카',
  '우도',
  '제주',
  '여행',
  '일정',
  '공항',
  '게이트',
  '터미널',
];

function addNextDay(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  return next.toISOString().slice(0, 10).replace(/-/g, '');
}

export function buildGoogleCalendarUrl(
  title: string,
  isoDate: string,
  details?: string,
): string {
  const start = isoDate.replace(/-/g, '');
  const end = addNextDay(isoDate);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title.trim() || 'Scrave 일정',
    dates: `${start}/${end}`,
  });
  if (details && details.trim()) {
    params.set('details', details.trim());
  }
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function extractCaptureActions(item: CaptureItem): CaptureActionItem[] {
  const actions: CaptureActionItem[] = [];
  const seen = new Set<string>();
  const textPool = [item.extractedText, item.summary, item.title]
    .filter(Boolean)
    .join('\n');

  const pushUnique = (action: CaptureActionItem) => {
    if (seen.has(action.id)) return;
    seen.add(action.id);
    actions.push(action);
  };

  // 1. Phone numbers
  for (const match of textPool.matchAll(PHONE_REGEX)) {
    const raw = match[0];
    const digits = raw.replace(/[^0-9+]/g, '');
    pushUnique({
      id: `phone:${raw}`,
      kind: 'phone',
      label: `전화 · ${raw}`,
      value: raw,
      href: `tel:${digits}`,
    });
  }

  // 2. Reservation / Confirmation codes & Flight numbers
  for (const match of textPool.matchAll(RESERVATION_LABEL_REGEX)) {
    const code = match[1]?.toUpperCase();
    if (code && !/^\d{4}$/.test(code)) {
      pushUnique({
        id: `reservation_code:${code}`,
        kind: 'reservation_code',
        label: `예약·확인번호 · ${code}`,
        value: code,
      });
    }
  }

  for (const match of textPool.matchAll(FLIGHT_CODE_REGEX)) {
    const code = match[1]?.toUpperCase();
    if (code) {
      pushUnique({
        id: `reservation_code:${code}`,
        kind: 'reservation_code',
        label: `항공편 · ${code}`,
        value: code,
      });
    }
  }

  // 3. Dates (from places first, then text)
  for (const place of item.places) {
    if (place.date && /^\d{4}-\d{2}-\d{2}$/.test(place.date)) {
      pushUnique({
        id: `date:${place.date}`,
        kind: 'date',
        label: `일정 · ${place.date}`,
        value: place.date,
        href: buildGoogleCalendarUrl(
          `${item.title} (${place.name})`,
          place.date,
          place.address || item.summary,
        ),
      });
    }
  }

  for (const match of textPool.matchAll(ISO_DATE_REGEX)) {
    const iso = `${match[1]}-${match[2]}-${match[3]}`;
    pushUnique({
      id: `date:${iso}`,
      kind: 'date',
      label: `일정 · ${iso}`,
      value: iso,
      href: buildGoogleCalendarUrl(item.title, iso, item.summary || item.extractedText.slice(0, 160)),
    });
  }

  // 4. Addresses from places
  for (const place of item.places) {
    if (place.address && place.address.trim()) {
      const addr = place.address.trim();
      pushUnique({
        id: `address:${addr}`,
        kind: 'address',
        label: `주소 · ${place.name}`,
        value: addr,
      });
    }
  }

  // 5. Original links
  for (const link of item.links) {
    if (link && link.trim()) {
      const clean = link.trim();
      pushUnique({
        id: `link:${clean}`,
        kind: 'link',
        label: '원문 링크 열기',
        value: clean,
        href: clean,
      });
    }
  }

  return actions;
}

export function isTravelPackCandidate(item: CaptureItem): boolean {
  const actions = extractCaptureActions(item);
  if (actions.some((a) => a.kind === 'reservation_code')) {
    return true;
  }
  if (item.places.some((p) => Boolean(p.date))) {
    return true;
  }
  const haystack = [
    item.title,
    item.summary,
    item.extractedText,
    ...item.tags,
    ...item.places.map((p) => `${p.name} ${p.address ?? ''}`),
  ]
    .join(' ')
    .toLocaleLowerCase();

  return TRAVEL_KEYWORDS.some((kw) => haystack.includes(kw));
}
