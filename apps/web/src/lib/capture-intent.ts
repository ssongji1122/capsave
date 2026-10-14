import { FIGURE_CAPTURE, type InsightCapture } from './figure-capture';

export const INTENT_STORAGE_KEY = 'scrave.capture-intent.v1';
export const NOTE_MAX_LENGTH = 600;
const STORAGE_VERSION = 1;
const WEEK_DAYS = 7;
const CALENDAR_ZONE = 'Asia/Seoul';
export const REASONS = [
  { id: 'color', label: '색감', description: '색 조합을 참고합니다' },
  { id: 'texture', label: '질감', description: '물감의 표면을 살펴봅니다' },
  { id: 'artist', label: '작가', description: '작가의 다른 작업을 찾아봅니다' },
  { id: 'use', label: '작업 참고', description: '내 작업에 참고합니다' },
] as const;
export type Reason = typeof REASONS[number]['id'];
export type Revisit = 'none' | 'week' | 'work';
export interface CaptureIntent {
  reasons: readonly Reason[];
  note: string;
  revisit: Revisit;
  revisitOn: string | null;
  savedAt: string | null;
  usedAt: string | null;
}
export const EMPTY_INTENT: CaptureIntent = {
  reasons: [], note: '', revisit: 'none', revisitOn: null, savedAt: null, usedAt: null,
};

export function getConfirmedInterests(intent: CaptureIntent): string[] {
  return REASONS.filter(reason => intent.reasons.includes(reason.id)).map(reason => reason.label);
}

export function findCapture(capture: InsightCapture, intent: CaptureIntent, query: string): boolean {
  const haystack = [capture.displayTitle, capture.sourceAccountId, capture.extractedText,
    capture.summary, ...capture.tags, ...capture.visualTraits, intent.note, ...getConfirmedInterests(intent)]
    .join(' ').normalize('NFKC').toLocaleLowerCase();
  return query.normalize('NFKC').trim().toLocaleLowerCase().split(/\s+/).filter(Boolean)
    .every(term => haystack.includes(term));
}

export function parseSavedIntent(raw: string | null): CaptureIntent {
  try {
    const stored = JSON.parse(raw ?? 'null');
    if (!stored || stored.version !== STORAGE_VERSION || stored.captureId !== FIGURE_CAPTURE.id) return EMPTY_INTENT;
    const value = stored.intent;
    if (!value || !Array.isArray(value.reasons) || !value.reasons.every((reason: unknown) => REASONS.some(item => item.id === reason))
      || typeof value.note !== 'string' || value.note.length > NOTE_MAX_LENGTH
      || !['none', 'week', 'work'].includes(value.revisit)
      || ![value.savedAt, value.usedAt].every(date => date === null || (typeof date === 'string' && Number.isFinite(Date.parse(date))))
      || !(value.revisitOn === null || (typeof value.revisitOn === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.revisitOn)))) return EMPTY_INTENT;
    return { reasons: [...new Set<Reason>(value.reasons)], note: value.note, revisit: value.revisit,
      revisitOn: value.revisitOn, savedAt: value.savedAt, usedAt: value.usedAt };
  } catch { return EMPTY_INTENT; }
}

export function saveIntent(storage: Pick<Storage, 'setItem'>, intent: CaptureIntent): boolean {
  try {
    storage.setItem(INTENT_STORAGE_KEY, JSON.stringify({ version: STORAGE_VERSION, captureId: FIGURE_CAPTURE.id, intent }));
    return true;
  } catch { return false; }
}

export function getRevisitDate(revisit: Revisit, now: Date): string | null {
  if (revisit !== 'week') return null;
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: CALENDAR_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const part = (type: string) => Number(parts.find(value => value.type === type)?.value);
  const date = new Date(Date.UTC(part('year'), part('month') - 1, part('day') + WEEK_DAYS));
  return date.toISOString().slice(0, 10);
}

export function buildReferenceNote(capture: InsightCapture, intent: CaptureIntent): string {
  return [
    `# ${capture.displayTitle}`, '',
    `작성자 계정: ${capture.sourceAccountId}`, `계정 링크: ${capture.profileUrl}`,
    `캡처 표기: ${capture.medium} on ${capture.dimensions} linen`, '',
    '## 내가 남긴 이유', getConfirmedInterests(intent).join(', ') || '아직 선택하지 않았습니다.',
    intent.note || '추가 메모를 남기지 않았습니다.', '',
    '## 화면에서 관찰한 특징', ...capture.visualTraits.map(value => `- ${value}`), '',
    '## 캡처에서 읽은 문구', capture.extractedText, '',
    '## 출처와 확인 범위',
    '사용자가 제공한 Instagram 캡처 한 장을 분석했습니다. 원문 게시물 주소는 확인하지 않았습니다.',
    ...capture.uncertainties, '',
    '작품의 재사용 권한을 확인한 기록은 아닙니다.',
  ].join('\n');
}
