import type { CaptureItem } from '@scrave/shared';
import { FIGURE_CAPTURE, type InsightCapture } from './figure-capture';
import { extractCaptureActions, isTravelPackCandidate } from './capture-actions';

export const INTENT_STORAGE_KEY = 'scrave.capture-intent.v1';
export const CAPTURE_META_STORAGE_PREFIX = 'scrave.capture-meta.v1.';
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
  reasons: [],
  note: '',
  revisit: 'none',
  revisitOn: null,
  savedAt: null,
  usedAt: null,
};

// --- General CaptureItem Intent & Action Meta (Archive-wide) ---

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

export function getConfirmedInterests(intent: CaptureIntent): string[] {
  return REASONS.filter((reason) => intent.reasons.includes(reason.id)).map(
    (reason) => reason.label,
  );
}

export function getCaptureReasonLabels(meta: CaptureUserMeta): string[] {
  return CAPTURE_REASONS.filter((r) => meta.reasons.includes(r.id)).map(
    (r) => r.label,
  );
}

export function findCapture(
  capture: InsightCapture,
  intent: CaptureIntent,
  query: string,
): boolean {
  const haystack = [
    capture.displayTitle,
    capture.sourceAccountId,
    capture.extractedText,
    capture.summary,
    ...capture.tags,
    ...capture.visualTraits,
    intent.note,
    ...getConfirmedInterests(intent),
  ]
    .join(' ')
    .normalize('NFKC')
    .toLocaleLowerCase();
  return query
    .normalize('NFKC')
    .trim()
    .toLocaleLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => haystack.includes(term));
}

export function parseSavedIntent(raw: string | null): CaptureIntent {
  try {
    const stored = JSON.parse(raw ?? 'null');
    if (
      !stored ||
      stored.version !== STORAGE_VERSION ||
      stored.captureId !== FIGURE_CAPTURE.id
    ) {
      return EMPTY_INTENT;
    }
    const value = stored.intent;
    if (
      !value ||
      !Array.isArray(value.reasons) ||
      !value.reasons.every((reason: unknown) =>
        REASONS.some((item) => item.id === reason),
      ) ||
      typeof value.note !== 'string' ||
      value.note.length > NOTE_MAX_LENGTH ||
      !['none', 'week', 'work'].includes(value.revisit) ||
      ![value.savedAt, value.usedAt].every(
        (date) =>
          date === null ||
          (typeof date === 'string' && Number.isFinite(Date.parse(date))),
      ) ||
      !(
        value.revisitOn === null ||
        (typeof value.revisitOn === 'string' &&
          /^\d{4}-\d{2}-\d{2}$/.test(value.revisitOn))
      )
    ) {
      return EMPTY_INTENT;
    }
    return {
      reasons: [...new Set<Reason>(value.reasons)],
      note: value.note,
      revisit: value.revisit,
      revisitOn: value.revisitOn,
      savedAt: value.savedAt,
      usedAt: value.usedAt,
    };
  } catch {
    return EMPTY_INTENT;
  }
}

export function saveIntent(
  storage: Pick<Storage, 'setItem'>,
  intent: CaptureIntent,
): boolean {
  try {
    storage.setItem(
      INTENT_STORAGE_KEY,
      JSON.stringify({
        version: STORAGE_VERSION,
        captureId: FIGURE_CAPTURE.id,
        intent,
      }),
    );
    return true;
  } catch {
    return false;
  }
}

export function getRevisitDate(
  revisit: Revisit | CaptureRevisitContext,
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

export function buildReferenceNote(
  capture: InsightCapture,
  intent: CaptureIntent,
): string {
  return [
    `# ${capture.displayTitle}`,
    '',
    `작성자 계정: ${capture.sourceAccountId}`,
    `계정 링크: ${capture.profileUrl}`,
    `캡처 표기: ${capture.medium} on ${capture.dimensions} linen`,
    '',
    '## 내가 남긴 이유',
    getConfirmedInterests(intent).join(', ') || '아직 선택하지 않았습니다.',
    intent.note || '추가 메모를 남기지 않았습니다.',
    '',
    '## 화면에서 관찰한 특징',
    ...capture.visualTraits.map((value) => `- ${value}`),
    '',
    '## 캡처에서 읽은 문구',
    capture.extractedText,
    '',
    '## 출처와 확인 범위',
    '사용자가 제공한 Instagram 캡처 한 장을 분석했습니다. 원문 게시물 주소는 확인하지 않았습니다.',
    ...capture.uncertainties,
    '',
    '작품의 재사용 권한을 확인한 기록은 아닙니다.',
  ].join('\n');
}

// --- Per-capture metadata helpers ---

export function getCaptureMeta(
  storage: Pick<Storage, 'getItem'> | null | undefined,
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
  storage: Pick<Storage, 'setItem'> | null | undefined,
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

export function filterCapturesByLens(
  captures: readonly CaptureItem[],
  metaMap: Record<number, CaptureUserMeta | undefined>,
  lens: ArchiveLens,
): CaptureItem[] {
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
