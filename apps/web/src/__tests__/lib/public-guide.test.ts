import { describe, expect, it } from 'vitest';
import {
  PUBLIC_GUIDES,
  ULUWATU_CAPTURE_GUIDE,
  ULUWATU_GUIDE,
  findPublicGuide,
  formatPlaceCount,
  getGuideMapLinks,
  getGuidePlaceImageReference,
  getGuideReferencePreviewImagePath,
  isGuideReferencePreviewImageUrl,
} from '@/lib/public-guides';

describe('ULUWATU_GUIDE', () => {
  it('contains three real, coordinate-backed places', () => {
    expect(ULUWATU_GUIDE.places).toHaveLength(3);
    expect(new Set(ULUWATU_GUIDE.places.map((place) => place.id)).size).toBe(3);

    for (const place of ULUWATU_GUIDE.places) {
      expect(place.coordinates.latitude).toBeLessThan(0);
      expect(place.coordinates.longitude).toBeGreaterThan(100);
      expect(place.address.length).toBeGreaterThan(10);
    }
  });

  it('separates verification evidence from editorial and video references', () => {
    for (const place of ULUWATU_GUIDE.places) {
      expect(
        place.references.some((reference) =>
          ['government', 'official'].includes(reference.kind)
        )
      ).toBe(true);

      for (const reference of place.references) {
        expect(reference.url).toMatch(/^https:\/\//);
        expect(reference.checkedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        if (reference.preview.imageUrl) {
          expect(reference.preview.imageUrl).toMatch(/^https:\/\//);
          expect(reference.preview.imageAlt?.length).toBeGreaterThan(10);
        } else {
          expect(reference.preview.imageAlt).toBeUndefined();
        }
        expect(reference.preview.title.length).toBeGreaterThan(5);
      }
    }
  });

  it('keeps preview images off sources the server-side proxy cannot fetch', () => {
    // 2026-09: the old disparda WordPress uploads path is 404 and
    // stephmylifetravel.com answers server requests with a bot-check page.
    const unreachableImageSources = [
      'disparda.baliprov.go.id/wp-content/',
      'stephmylifetravel.com',
    ];
    const imageUrls = ULUWATU_GUIDE.places.flatMap((place) =>
      place.references.flatMap((reference) =>
        reference.preview.imageUrl ? [reference.preview.imageUrl] : []
      )
    );

    for (const imageUrl of imageUrls) {
      for (const source of unreachableImageSources) {
        expect(imageUrl).not.toContain(source);
      }
    }
  });

  it('points the Uluwatu Temple tourism-office card at the migrated page and photo', () => {
    const temple = ULUWATU_GUIDE.places.find((place) => place.id === 'uluwatu-temple');
    const reference = temple?.references.find((item) => item.kind === 'government');

    expect(reference?.url).toBe('https://disparda.baliprov.go.id/uluwatu-clip');
    expect(reference?.preview.imageUrl).toBe(
      'https://cloud-ng.baliprov.go.id/disparda/2020/04/uluwatu2.jpg'
    );
  });

  it('finds only the published guide by slug', () => {
    expect(findPublicGuide('uluwatu-afterglow')).toBe(ULUWATU_GUIDE);
    expect(findPublicGuide('missing-guide')).toBeNull();
  });

  it('uses the verified international map provider without dead Korean links', () => {
    for (const place of ULUWATU_GUIDE.places) {
      const links = getGuideMapLinks(place);
      expect(links).toHaveLength(1);
      expect(links[0]?.provider).toBe('google');
      expect(links[0]?.webUrl).toContain('google.com/maps');
    }
  });

  it('builds allowlisted preview image proxy paths', () => {
    const reference = ULUWATU_GUIDE.places[0]?.references[0];

    expect(reference).toBeDefined();
    if (!reference) {
      throw new Error('Missing guide reference fixture');
    }

    expect(isGuideReferencePreviewImageUrl(reference.preview.imageUrl ?? '')).toBe(true);
    expect(isGuideReferencePreviewImageUrl('https://example.com/image.jpg')).toBe(false);
    expect(getGuideReferencePreviewImagePath(reference)).toBe(
      `/api/guide-preview-image?src=${encodeURIComponent(reference.preview.imageUrl ?? '')}`
    );
  });

  it('selects a verified source image for every place card', () => {
    for (const place of ULUWATU_GUIDE.places) {
      const reference = getGuidePlaceImageReference(place);

      if (!reference) {
        throw new Error(`Missing verified image reference for ${place.id}`);
      }
      expect(['government', 'official']).toContain(reference.kind);
      expect(reference.preview.imageUrl).toMatch(/^https:\/\//);
      expect(reference.preview.imageAlt?.length).toBeGreaterThan(10);
    }
  });
});

describe('ULUWATU_CAPTURE_GUIDE', () => {
  it('turns the four Bali captures and three stay candidates into seven places', () => {
    expect(ULUWATU_CAPTURE_GUIDE.places).toHaveLength(7);
    expect(ULUWATU_CAPTURE_GUIDE.places.map((place) => place.sequence)).toEqual([
      1, 2, 3, 4, 5, 6, 7,
    ]);
    expect(
      ULUWATU_CAPTURE_GUIDE.places.filter((place) => place.category === 'stay')
    ).toHaveLength(4);
  });

  it('is published next to the original guide', () => {
    expect(PUBLIC_GUIDES).toEqual([ULUWATU_GUIDE, ULUWATU_CAPTURE_GUIDE]);
    expect(findPublicGuide('uluwatu-cliff-captures')).toBe(ULUWATU_CAPTURE_GUIDE);
  });

  it('allowlists preview images from every published guide', () => {
    const reference = ULUWATU_CAPTURE_GUIDE.places
      .flatMap((place) => place.references)
      .find((item) => item.preview.imageUrl);

    expect(reference?.preview.imageUrl).toBeDefined();
    expect(isGuideReferencePreviewImageUrl(reference?.preview.imageUrl ?? '')).toBe(true);
  });

  it('draws no route line because stays and sights alternate across the peninsula', () => {
    expect(ULUWATU_GUIDE.connectRoute).toBe(true);
    expect(ULUWATU_CAPTURE_GUIDE.connectRoute).toBe(false);
  });

  it('names where each opening-hours line came from', () => {
    for (const place of ULUWATU_CAPTURE_GUIDE.places) {
      if (place.hours) {
        expect(place.hoursLabel).toMatch(/표기/);
      }
    }
  });

  it('falls back to no place photo when no official source image exists', () => {
    const istana = ULUWATU_CAPTURE_GUIDE.places.find(({ id }) => id === 'istana-sound-bath');
    const oneeighty = ULUWATU_CAPTURE_GUIDE.places.find(({ id }) => id === 'oneeighty');

    expect(istana && getGuidePlaceImageReference(istana)).toBeNull();
    expect(oneeighty && getGuidePlaceImageReference(oneeighty)?.kind).toBe('official');
  });

  it('keeps blog reviews and videos as references, never as the place photo', () => {
    for (const place of ULUWATU_CAPTURE_GUIDE.places) {
      const reference = getGuidePlaceImageReference(place);
      if (reference) {
        expect(['government', 'official']).toContain(reference.kind);
      }
    }

    const reviews = ULUWATU_CAPTURE_GUIDE.places.flatMap((place) =>
      place.references.filter(({ kind }) => kind === 'review')
    );
    expect(reviews.length).toBeGreaterThan(0);
    for (const review of reviews) {
      expect(review.url).toMatch(/^https:\/\/blog\.naver\.com\//);
    }
  });

  it('returns no proxy path for references without a preview image', () => {
    const review = ULUWATU_CAPTURE_GUIDE.places
      .flatMap((place) => place.references)
      .find(({ kind }) => kind === 'review');

    expect(review && getGuideReferencePreviewImagePath(review)).toBeNull();
  });
});

describe('every published guide', () => {
  it('backs each place with an official source and real coordinates', () => {
    for (const guide of PUBLIC_GUIDES) {
      for (const place of guide.places) {
        expect(place.coordinates.latitude).toBeLessThan(0);
        expect(place.coordinates.longitude).toBeGreaterThan(100);
        expect(place.address.length).toBeGreaterThan(10);
        expect(
          place.references.some(({ kind }) => ['government', 'official'].includes(kind))
        ).toBe(true);

        for (const reference of place.references) {
          expect(reference.url).toMatch(/^https:\/\//);
          expect(reference.checkedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
          expect(Boolean(reference.preview.imageUrl)).toBe(
            Boolean(reference.preview.imageAlt)
          );
        }
      }
    }
  });

  it('carries its own route and share copy', () => {
    for (const guide of PUBLIC_GUIDES) {
      expect(guide.routeEyebrow.length).toBeGreaterThan(3);
      expect(guide.routeTitle.length).toBeGreaterThan(3);
      expect(guide.mapLabel.length).toBeGreaterThan(3);
      expect(guide.shareTitleLines.join(' ')).toBe(guide.title);
    }
  });
});

describe('formatPlaceCount', () => {
  it('uses native Korean counters for small counts', () => {
    expect(formatPlaceCount(3)).toBe('세 곳');
    expect(formatPlaceCount(7)).toBe('일곱 곳');
  });

  it('falls back to digits above ten', () => {
    expect(formatPlaceCount(12)).toBe('12곳');
  });
});
