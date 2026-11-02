import type { CaptureItem } from '../types/capture';
import { extractCaptureActions, isTravelPackCandidate, type ActionableCaptureInput } from './capture-actions';
export const CAPTURE_META_STORAGE_PREFIX = 'scrave.capture-meta.v1.';
export const NOTE_MAX_LENGTH = 600;
const STORAGE_VERSION = 1;
const WEEK_DAYS = 7;
const CALENDAR_ZONE = 'Asia/Seoul';
export interface CaptureMetaStorage {getItem(key: string): string | null; setItem(key: string, value: string): void;}
export const CAPTURE_REASONS = [
  { id: 'visit', label: '방문 후보', description: '나중에 가보거나 동선에 넣기 위해 보관' },
  { id: 'reservation', label: '예약·티켓 제시', description: '공항·현장에서 바로 보여줄 증빙·예약' },
  { id: 'contact', label: '연락·문의', description: '전화번호·계정으로 연락하거나 예약 문의' },
  { id: 'reference', label: '작업·디자인 참고', description: '기획·디자인·작업 레퍼런스로 활용' },
  { id: 'color', label: '색감·무드', description: '배색·질감·분위기 단서 기록' },
  { id: 'read', label: '나중에 읽기', description: '긴 글·가이드·정보 재열람' },
] as const;

export type CaptureReasonId = typeof CAPTURE_REASONS[number]['id'];
export type CaptureRevisitContext = 'none' | 'travel' | 'work' | 'week';
export type ArchiveLens = 'all' | 'travel-pack' | 'action-pending' | 'rediscover';

export const CAPTURE_REVISIT_OPTIONS: {
  id: CaptureRevisitContext;
  label: string;
}[] = [
  { id: 'none', label: '지정 안 함' },
  { id: 'travel', label: '이번 여행·외출 때' },
  { id: 'work', label: '작업 시작할 때' },
  { id: 'week', label: '일주일 뒤 다시 보기' },
];

export interface CaptureUserMeta {
  reasons: readonly CaptureReasonId[];
  note: string;
  revisit: CaptureRevisitContext;
  revisitOn: string | null;
  pinnedToTravelPack: boolean;
  completedActions: readonly string[];
  updatedAt: string | null;
}

export const EMPTY_CAPTURE_META: CaptureUserMeta = {
  reasons: [],
  note: '',
  revisit: 'none',
  revisitOn: null,
  pinnedToTravelPack: false,
  completedActions: [],
  updatedAt: null,
};

export function getCaptureReasonLabels(meta: CaptureUserMeta): string[] {
  return CAPTURE_REASONS.filter((r) => meta.reasons.includes(r.id)).map(
    (r) => r.label,
  );
}

export function getRevisitDate(
  revisit: CaptureRevisitContext,
  now: Date,
): string | null {
  if (revisit !== 'week') return null;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: CALENDAR_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const part = (type: string) =>
    Number(parts.find((value) => value.type === type)?.value);
  const date = new Date(
    Date.UTC(part('year'), part('month') - 1, part('day') + WEEK_DAYS),
  );
  return date.toISOString().slice(0, 10);
}

// --- Per-capture metadata helpers ---

export function getCaptureMeta(
  storage: Pick<CaptureMetaStorage, 'getItem'> | null | undefined,
  captureId: number,
): CaptureUserMeta {
  if (!storage) return EMPTY_CAPTURE_META;
  try {
    const raw = storage.getItem(`${CAPTURE_META_STORAGE_PREFIX}${captureId}`);
    if (!raw) return EMPTY_CAPTURE_META;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== STORAGE_VERSION || !parsed.meta) {
      return EMPTY_CAPTURE_META;
    }
    const m = parsed.meta;
    const validReasons: CaptureReasonId[] = Array.isArray(m.reasons)
      ? m.reasons.filter((r: unknown): r is CaptureReasonId =>
          CAPTURE_REASONS.some((item) => item.id === r),
        )
      : [];
    const revisit: CaptureRevisitContext = [
      'none',
      'travel',
      'work',
      'week',
    ].includes(m.revisit)
      ? m.revisit
      : 'none';
    const note =
      typeof m.note === 'string' ? m.note.slice(0, NOTE_MAX_LENGTH) : '';
    const completedActions: string[] = Array.isArray(m.completedActions)
      ? m.completedActions.filter((x: unknown): x is string => typeof x === 'string')
      : [];
    return {
      reasons: [...new Set<CaptureReasonId>(validReasons)],
      note,
      revisit,
      revisitOn: typeof m.revisitOn === 'string' ? m.revisitOn : null,
      pinnedToTravelPack: Boolean(m.pinnedToTravelPack),
      completedActions: [...new Set<string>(completedActions)],
      updatedAt: typeof m.updatedAt === 'string' ? m.updatedAt : null,
    };
  } catch {
    return EMPTY_CAPTURE_META;
  }
}

export function saveCaptureMeta(
  storage: Pick<CaptureMetaStorage, 'setItem'> | null | undefined,
  captureId: number,
  meta: CaptureUserMeta,
): boolean {
  if (!storage) return false;
  try {
    const normalized: CaptureUserMeta = {
      ...meta,
      note: meta.note.slice(0, NOTE_MAX_LENGTH),
      reasons: [...new Set(meta.reasons)],
      completedActions: [...new Set(meta.completedActions)],
      updatedAt: meta.updatedAt ?? new Date().toISOString(),
    };
    storage.setItem(
      `${CAPTURE_META_STORAGE_PREFIX}${captureId}`,
      JSON.stringify({
        version: STORAGE_VERSION,
        captureId,
        meta: normalized,
      }),
    );
    return true;
  } catch {
    return false;
  }
}

export function toggleCompletedAction(
  meta: CaptureUserMeta,
  actionId: string,
): CaptureUserMeta {
  const exists = meta.completedActions.includes(actionId);
  return {
    ...meta,
    completedActions: exists
      ? meta.completedActions.filter((id) => id !== actionId)
      : [...meta.completedActions, actionId],
    updatedAt: new Date().toISOString(),
  };
}

export function buildCaptureReferenceNote(
  capture: CaptureItem,
  meta: CaptureUserMeta,
): string {
  const reasonLabels = getCaptureReasonLabels(meta);
  const revisitLabel =
    CAPTURE_REVISIT_OPTIONS.find((o) => o.id === meta.revisit)?.label ??
    '지정 안 함';

  const lines: string[] = [
    `# ${capture.title}`,
    '',
    `- 출처 앱: ${capture.source}`,
  ];
  if (capture.sourceAccountId) {
    lines.push(`- 작성자 계정: ${capture.sourceAccountId}`);
  }
  if (capture.links.length > 0) {
    lines.push(`- 원문 링크: ${capture.links.join(', ')}`);
  }
  lines.push(`- 캡처 보관일: ${capture.createdAt.slice(0, 10)}`);
  lines.push('');
  lines.push('## 내가 남긴 저장 이유 (의도)');
  lines.push(
    `- 선택 이유: ${reasonLabels.length > 0 ? reasonLabels.join(', ') : '미지정'}`,
  );
  lines.push(`- 다시 볼 시점: ${revisitLabel}`);
  lines.push(`- 내 메모: ${meta.note.trim() || '없음'}`);
  lines.push('');
  lines.push('## AI가 관찰·추출한 단서');
  if (capture.summary) {
    lines.push(`- 요약: ${capture.summary}`);
  }
  if (capture.keyInsights && capture.keyInsights.length > 0) {
    lines.push(...capture.keyInsights.map((insight) => `- 핵심: ${insight}`));
  }
  if (capture.places.length > 0) {
    lines.push(
      ...capture.places.map(
        (p, idx) =>
          `- 장소 ${idx + 1}: ${p.name}${p.address ? ` (${p.address})` : ''}${p.date ? ` · ${p.date}` : ''}`,
      ),
    );
  }
  if (capture.extractedText) {
    lines.push('', '## 추출된 원문 텍스트', capture.extractedText);
  }
  return lines.join('\n');
}

export function filterCapturesByLens<T extends ActionableCaptureInput & {id: number}>(
  captures: readonly T[],
  metaMap: Record<number, CaptureUserMeta | undefined>,
  lens: ArchiveLens,
): T[] {
  if (lens === 'all') return [...captures];

  return captures.filter((item) => {
    const meta = metaMap[item.id] ?? EMPTY_CAPTURE_META;

    if (lens === 'travel-pack') {
      return (
        meta.pinnedToTravelPack ||
        meta.revisit === 'travel' ||
        meta.reasons.includes('reservation') ||
        isTravelPackCandidate(item)
      );
    }

    if (lens === 'action-pending') {
      const actions = extractCaptureActions(item);
      if (actions.length === 0) return false;
      return actions.some((a) => !meta.completedActions.includes(a.id));
    }

    if (lens === 'rediscover') {
      return (
        meta.revisit === 'work' ||
        meta.revisit === 'week' ||
        meta.reasons.length > 0 ||
        Boolean(meta.note.trim())
      );
    }

    return true;
  });
}
