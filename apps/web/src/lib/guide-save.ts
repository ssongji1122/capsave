import type { SupabaseClient } from '@supabase/supabase-js';
import {
  MAX_FREE_CAPTURES,
  countUserCaptures,
  saveCapture,
  type AnalysisResult,
} from '@scrave/shared';
import { buildLoginRedirectPath } from '@/lib/auth-redirect';
import { getGuideMapLinks, type PublicGuide } from '@/lib/public-guides';
import { SITE_ORIGIN } from '@/lib/site-config';

const GUIDE_TAG_PREFIX = 'guide:';
export const GUIDE_SAVE_QUERY = 'save=1';

export type GuideSaveResult =
  | { status: 'saved' | 'already'; captureId: number }
  | { status: 'limit' };

export function getGuideCaptureTag(slug: string): string {
  return `${GUIDE_TAG_PREFIX}${slug}`;
}

export function getGuideCaptureImageUrl(guide: PublicGuide): string {
  return `${SITE_ORIGIN}/g/${guide.slug}/opengraph-image`;
}

export function getGuideSaveLoginPath(slug: string): string {
  return buildLoginRedirectPath(`/g/${slug}`, `?${GUIDE_SAVE_QUERY}`);
}

export function buildGuideCaptureAnalysis(guide: PublicGuide): AnalysisResult {
  return {
    category: 'place',
    title: guide.title,
    summary: guide.description,
    places: guide.places.map((place) => {
      const officialReference = place.references.find(({ kind }) =>
        ['government', 'official'].includes(kind)
      );
      const mapLink = getGuideMapLinks(place)[0];

      return {
        name: place.localName,
        address: place.address,
        lat: place.coordinates.latitude,
        lng: place.coordinates.longitude,
        links: [mapLink?.webUrl, officialReference?.url].filter(
          (link): link is string => Boolean(link)
        ),
      };
    }),
    extractedText: guide.places
      .map(
        (place) =>
          `${String(place.sequence).padStart(2, '0')} ${place.localName} · ${place.visitWindow}\n${place.practicalNote}`
      )
      .join('\n\n'),
    links: [`${SITE_ORIGIN}/g/${guide.slug}`],
    tags: [getGuideCaptureTag(guide.slug)],
    source: 'other',
    confidence: 1,
    sourceAccountId: null,
  };
}

async function findSavedGuideCapture(
  client: SupabaseClient,
  userId: string,
  slug: string,
): Promise<number | null> {
  const { data, error } = await client
    .from('captures')
    .select('id')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .contains('tags', [getGuideCaptureTag(slug)])
    .limit(1);

  if (error) throw error;
  return (data as { id: number }[] | null)?.[0]?.id ?? null;
}

export async function saveGuideToArchive(
  client: SupabaseClient,
  guide: PublicGuide,
  userId: string,
): Promise<GuideSaveResult> {
  const existingId = await findSavedGuideCapture(client, userId, guide.slug);
  if (existingId !== null) {
    return { status: 'already', captureId: existingId };
  }

  if ((await countUserCaptures(client, userId)) >= MAX_FREE_CAPTURES) {
    return { status: 'limit' };
  }

  const capture = await saveCapture(
    client,
    buildGuideCaptureAnalysis(guide),
    getGuideCaptureImageUrl(guide),
    userId,
  );
  return { status: 'saved', captureId: capture.id };
}
