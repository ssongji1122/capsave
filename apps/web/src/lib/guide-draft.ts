// Builds a guide draft from a user's own place captures.
// Spec: docs/specs/2026-09-26_capture-to-guide_v1.md (sections 4 and 5).
// The model only orders saved places and writes relative visit windows;
// it never adds places, links, opening hours or prices.

import {
  buildGuidePrompt,
  isUrlSafe,
  type CaptureItem,
  type GuideCoordinates,
  type GuidePlace,
  type GuidePlaceCategory,
  type GuideReference,
  type PlaceReviewResult,
  type PublicGuide,
} from '@scrave/shared';
import { formatPlaceCount } from '@/lib/public-guides';

export const MIN_GUIDE_CAPTURES = 2;
export const MAX_GUIDE_CAPTURES = 10;
export const MAX_GUIDE_PLACES = 12;
export const MAX_GUIDE_NIGHTS = 7;
export const GUIDE_DRAFT_CURATOR = 'Scrave 사용자 노트';

const DEFAULT_EYEBROW = 'MY GUIDE';
const UNKNOWN_COUNTRY_CODE = 'ZZ';
const SAME_PLACE_METERS = 50;
const EARTH_RADIUS_METERS = 6_371_000;
const SLUG_PREFIX = 'my-guide-';
const SLUG_RANDOM_LENGTH = 10;
const SLUG_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

const CATEGORIES: GuidePlaceCategory[] = ['culture', 'beach', 'food', 'stay', 'activity'];
const EYEBROW_PATTERN = /^[A-Z0-9 ·&,.'-]{1,40}$/;
const COUNTRY_CODE_PATTERN = /^[A-Z]{2}$/;
const CLOCK_TIME_PATTERN = /\b\d{1,2}:\d{2}\b/;
const PRICE_PATTERN =
  /\d[\d,.]*\s*(만\s*)?(원|달러|루피아|엔|바트|유로)|[₩$€¥]|\b(IDR|USD|KRW|Rp)\b/;
const PHONE_PATTERN = /\d{2,4}-\d{3,4}-\d{4}/;

const TEXT_LIMITS = {
  title: 40,
  description: 140,
  routeTitle: 40,
  scene: 40,
  visitWindow: 40,
  practicalNote: 200,
};

const ENGLISH_COUNTS = [
  '', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN', 'ELEVEN', 'TWELVE',
];

const FALLBACK_VISIT_WINDOW = '시간대는 직접 정해 주세요';
const FALLBACK_PRACTICAL_NOTE = '운영 시간과 휴무일은 방문 직전 공식 안내에서 다시 확인하세요.';

export interface GuideCandidate {
  id: string;
  name: string;
  address: string;
  coordinates: GuideCoordinates;
  links: string[];
  captureNote: string;
  sourceCaptureIds: number[];
}

export interface UnresolvedPlace {
  name: string;
  captureId: number;
}

export interface GuidePlanStep {
  id: string;
  day: number;
  category: GuidePlaceCategory;
  scene: string;
  visitWindow: string;
  practicalNote: string;
}

export interface GuidePlan {
  title: string;
  description: string;
  eyebrow: string;
  routeTitle: string;
  countryCode: string | null;
  order: GuidePlanStep[];
}

export type GuideDraftInput =
  | { valid: true; captureIds: number[]; nights: number }
  | { valid: false; error: string };

export type GuideDraftResult =
  | { status: 'ok'; guide: PublicGuide; fallback: boolean; unresolved: UnresolvedPlace[] }
  | { status: 'not-enough-places'; unresolved: UnresolvedPlace[] }
  | { status: 'too-many-places' }
  | { status: 'limited' };

export interface CreateGuideDraftOptions {
  nights: number;
  slug: string;
  now: Date;
  callModel: ((prompt: string) => Promise<string | null>) | null;
  // Runs once the places are usable and before any model call; false stops the draft.
  beforeGenerate?: () => Promise<boolean>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function validateGuideDraftInput(body: unknown): GuideDraftInput {
  if (!isRecord(body)) return { valid: false, error: 'Invalid body' };

  const { captureIds, nights = 0 } = body;
  if (
    !Array.isArray(captureIds) ||
    captureIds.length < MIN_GUIDE_CAPTURES ||
    captureIds.length > MAX_GUIDE_CAPTURES ||
    !captureIds.every((id) => Number.isInteger(id) && (id as number) > 0) ||
    new Set(captureIds).size !== captureIds.length
  ) {
    return { valid: false, error: `Choose ${MIN_GUIDE_CAPTURES} to ${MAX_GUIDE_CAPTURES} captures` };
  }

  if (!Number.isInteger(nights) || (nights as number) < 0 || (nights as number) > MAX_GUIDE_NIGHTS) {
    return { valid: false, error: 'Invalid nights' };
  }

  return { valid: true, captureIds: captureIds as number[], nights: nights as number };
}

function distanceMeters(a: GuideCoordinates, b: GuideCoordinates): number {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRadians(b.latitude - a.latitude);
  const dLng = toRadians(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(a.latitude)) * Math.cos(toRadians(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(h));
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function collectGuideCandidates(captures: CaptureItem[]): {
  candidates: GuideCandidate[];
  unresolved: UnresolvedPlace[];
  tooMany: boolean;
} {
  const candidates: GuideCandidate[] = [];
  const unresolved: UnresolvedPlace[] = [];

  for (const item of captures) {
    if (item.category !== 'place') continue;

    for (const place of item.places) {
      const name = place.name?.trim();
      if (!name) continue;

      if (typeof place.lat !== 'number' || typeof place.lng !== 'number') {
        unresolved.push({ name, captureId: item.id });
        continue;
      }

      const coordinates = { latitude: place.lat, longitude: place.lng };
      const existing = candidates.find(
        (other) =>
          normalizeName(other.name) === normalizeName(name) ||
          distanceMeters(other.coordinates, coordinates) <= SAME_PLACE_METERS
      );

      if (existing) {
        if (!existing.sourceCaptureIds.includes(item.id)) existing.sourceCaptureIds.push(item.id);
        for (const link of place.links ?? []) {
          if (!existing.links.includes(link)) existing.links.push(link);
        }
        continue;
      }

      candidates.push({
        id: `p${candidates.length + 1}`,
        name,
        address: place.address?.trim() ?? '',
        coordinates,
        links: [...(place.links ?? [])],
        captureNote: item.summary.trim(),
        sourceCaptureIds: [item.id],
      });
    }
  }

  return { candidates, unresolved, tooMany: candidates.length > MAX_GUIDE_PLACES };
}

export function orderByNearestNeighbor(candidates: GuideCandidate[]): GuideCandidate[] {
  if (candidates.length === 0) return [];

  const remaining = candidates.slice(1);
  const ordered = [candidates[0]!];

  while (remaining.length > 0) {
    const last = ordered[ordered.length - 1]!;
    let nearestIndex = 0;
    for (let index = 1; index < remaining.length; index += 1) {
      if (
        distanceMeters(last.coordinates, remaining[index]!.coordinates) <
        distanceMeters(last.coordinates, remaining[nearestIndex]!.coordinates)
      ) {
        nearestIndex = index;
      }
    }
    ordered.push(remaining.splice(nearestIndex, 1)[0]!);
  }

  return ordered;
}

function readText(value: unknown, limit: number): string | null {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  return text && text.length <= limit ? text : null;
}

function hasForbiddenFact(text: string): boolean {
  return CLOCK_TIME_PATTERN.test(text) || PRICE_PATTERN.test(text) || PHONE_PATTERN.test(text);
}

function stripCodeFence(text: string): string {
  const match = /^```(?:json)?\s*([\s\S]*?)\s*```$/.exec(text.trim());
  return match ? match[1]! : text.trim();
}

export function parseGuideDraftResponse(text: string, candidateIds: string[]): GuidePlan | null {
  let data: unknown;
  try {
    data = JSON.parse(stripCodeFence(text));
  } catch {
    return null;
  }
  if (!isRecord(data) || !Array.isArray(data.order)) return null;

  const title = readText(data.title, TEXT_LIMITS.title);
  const description = readText(data.description, TEXT_LIMITS.description);
  const routeTitle = readText(data.routeTitle, TEXT_LIMITS.routeTitle);
  if (!title || !description || !routeTitle) return null;

  const expected = new Set(candidateIds);
  const seen = new Set<string>();
  const order: GuidePlanStep[] = [];

  for (const entry of data.order) {
    if (!isRecord(entry) || typeof entry.id !== 'string') return null;
    if (!expected.has(entry.id) || seen.has(entry.id)) return null;
    seen.add(entry.id);

    const category = entry.category as GuidePlaceCategory;
    const scene = readText(entry.scene, TEXT_LIMITS.scene);
    const visitWindow = readText(entry.visitWindow, TEXT_LIMITS.visitWindow);
    const practicalNote = readText(entry.practicalNote, TEXT_LIMITS.practicalNote);
    const day = Number.isInteger(entry.day) ? (entry.day as number) : 1;

    if (!CATEGORIES.includes(category) || !scene || !visitWindow || !practicalNote) return null;
    if ([scene, visitWindow, practicalNote].some(hasForbiddenFact)) return null;
    if (day < 1 || day > MAX_GUIDE_NIGHTS + 1) return null;

    order.push({ id: entry.id, day, category, scene, visitWindow, practicalNote });
  }

  if (seen.size !== expected.size) return null;

  const eyebrow = typeof data.eyebrow === 'string' ? data.eyebrow.trim() : '';
  const countryCode = typeof data.countryCode === 'string' ? data.countryCode.trim() : '';

  return {
    title,
    description,
    routeTitle,
    eyebrow: EYEBROW_PATTERN.test(eyebrow) ? eyebrow : DEFAULT_EYEBROW,
    countryCode: COUNTRY_CODE_PATTERN.test(countryCode) ? countryCode : null,
    order,
  };
}

export function buildFallbackPlan(candidates: GuideCandidate[]): GuidePlan {
  return {
    title: `저장한 장소 ${formatPlaceCount(candidates.length)}`,
    description: '저장한 캡처의 장소를 가까운 순서로 이었습니다. 순서와 시간대는 직접 고쳐 주세요.',
    eyebrow: DEFAULT_EYEBROW,
    routeTitle: '가까운 순서로 이은 동선',
    countryCode: null,
    order: orderByNearestNeighbor(candidates).map((candidate, index) => ({
      id: candidate.id,
      day: 1,
      category: 'activity',
      scene: `${String(index + 1).padStart(2, '0')} · 저장한 장소`,
      visitWindow: FALLBACK_VISIT_WINDOW,
      practicalNote: FALLBACK_PRACTICAL_NOTE,
    })),
  };
}

export function guessCountryCode(coordinates: GuideCoordinates[]): string {
  const inKorea = coordinates.filter(
    ({ latitude, longitude }) =>
      latitude >= 33 && latitude <= 39 && longitude >= 124 && longitude <= 132
  );
  return inKorea.length * 2 > coordinates.length ? 'KR' : UNKNOWN_COUNTRY_CODE;
}

function toEditorialReference(url: string, checkedAt: string): GuideReference | null {
  if (!isUrlSafe(url)) return null;
  let host: string;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
    host = parsed.hostname.replace(/^www\./, '');
  } catch {
    return null;
  }

  return {
    kind: 'editorial',
    label: '캡처에 있던 링크',
    publisher: host,
    url,
    checkedAt,
    note: '저장한 캡처에 들어 있던 링크입니다. 내용은 직접 확인하세요.',
    preview: { title: host, description: '저장한 캡처에 들어 있던 링크입니다.' },
  };
}

function countWord(count: number): string {
  return ENGLISH_COUNTS[count] ?? String(count);
}

export function assembleGuideDraft(
  candidates: GuideCandidate[],
  plan: GuidePlan,
  { slug, nights, now }: { slug: string; nights: number; now: Date },
): PublicGuide {
  const checkedAt = now.toISOString().slice(0, 10);
  const byId = new Map(candidates.map((candidate) => [candidate.id, candidate]));

  const places: GuidePlace[] = plan.order.flatMap((step, index) => {
    const candidate = byId.get(step.id);
    if (!candidate) return [];
    return [{
      id: candidate.id,
      sequence: index + 1,
      name: candidate.name,
      localName: candidate.name,
      category: step.category,
      address: candidate.address,
      coordinates: candidate.coordinates,
      scene: step.scene,
      summary: candidate.captureNote,
      visitWindow: step.visitWindow,
      practicalNote: step.practicalNote,
      references: candidate.links
        .map((link) => toEditorialReference(link, checkedAt))
        .filter((reference): reference is GuideReference => reference !== null),
      sourceCaptureIds: [...candidate.sourceCaptureIds],
    }];
  });

  const coordinates = places.map((place) => place.coordinates);
  const center = {
    latitude: coordinates.reduce((sum, c) => sum + c.latitude, 0) / coordinates.length,
    longitude: coordinates.reduce((sum, c) => sum + c.longitude, 0) / coordinates.length,
  };
  const tripLabel = nights === 0 ? 'ONE DAY' : `${nights} ${nights === 1 ? 'NIGHT' : 'NIGHTS'}`;

  return {
    slug,
    status: 'draft',
    title: plan.title,
    eyebrow: plan.eyebrow,
    description: plan.description,
    location: places[0]?.address || plan.eyebrow,
    countryCode: plan.countryCode ?? guessCountryCode(coordinates),
    center,
    updatedAt: checkedAt,
    curator: GUIDE_DRAFT_CURATOR,
    routeEyebrow: `${tripLabel} · ${countWord(places.length)} PLACES`,
    routeTitle: plan.routeTitle,
    mapLabel: plan.eyebrow,
    connectRoute: nights === 0,
    shareTitleLines: [plan.title],
    places,
  };
}

export async function createGuideDraft(
  captures: CaptureItem[],
  { nights, slug, now, callModel, beforeGenerate }: CreateGuideDraftOptions,
): Promise<GuideDraftResult> {
  const { candidates, unresolved, tooMany } = collectGuideCandidates(captures);
  if (tooMany) return { status: 'too-many-places' };
  if (candidates.length < 2) return { status: 'not-enough-places', unresolved };
  if (beforeGenerate && !(await beforeGenerate())) return { status: 'limited' };

  const ids = candidates.map(({ id }) => id);
  let plan: GuidePlan | null = null;

  if (callModel) {
    const prompt = buildGuidePrompt({
      nights,
      places: candidates.map((candidate) => ({
        id: candidate.id,
        name: candidate.name,
        address: candidate.address,
        lat: candidate.coordinates.latitude,
        lng: candidate.coordinates.longitude,
        captureNote: candidate.captureNote,
      })),
    });

    for (let attempt = 0; attempt < 2 && !plan; attempt += 1) {
      try {
        const text = await callModel(prompt);
        plan = text ? parseGuideDraftResponse(text, ids) : null;
      } catch (error) {
        console.error('[guide-draft] model call failed:', error);
        break;
      }
    }
  }

  const fallback = plan === null;
  const guide = assembleGuideDraft(candidates, plan ?? buildFallbackPlan(candidates), {
    slug,
    nights,
    now,
  });
  return { status: 'ok', guide, fallback, unresolved };
}

export function toGuideReferences(result: PlaceReviewResult, checkedAt: string): GuideReference[] {
  const reviews: GuideReference[] = result.naver.posts.map((post) => ({
    kind: 'review',
    label: '골라 둔 후기',
    publisher: post.blogger,
    url: post.url,
    checkedAt,
    note: post.reasons.join(' · ') || '네이버 블로그 후기',
    preview: { title: post.title, description: post.excerpt },
  }));

  const videos: GuideReference[] = result.youtube.videos.map((video) => ({
    kind: 'video',
    label: '골라 둔 영상',
    publisher: video.channelTitle,
    url: video.url,
    checkedAt,
    note: `${video.published} 게시 · ${video.length}`,
    preview: {
      title: video.title,
      description: `${video.channelTitle}의 영상입니다.`,
      imageUrl: video.thumbnailUrl,
      imageAlt: `${video.title} 영상 미리보기`,
    },
  }));

  return [...reviews, ...videos];
}

type RandomBytes = (length: number) => Uint8Array;

const defaultRandomBytes: RandomBytes = (length) =>
  globalThis.crypto.getRandomValues(new Uint8Array(length));

export function buildGuideSlug(randomBytes: RandomBytes = defaultRandomBytes): string {
  const bytes = randomBytes(SLUG_RANDOM_LENGTH);
  const suffix = Array.from(bytes, (byte) => SLUG_ALPHABET[byte % SLUG_ALPHABET.length]).join('');
  return `${SLUG_PREFIX}${suffix}`;
}
