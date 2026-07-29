import { describe, expect, it } from 'vitest';
import {
  ULUWATU_GUIDE,
  findPublicGuide,
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
        expect(reference.preview.imageUrl).toMatch(/^https:\/\//);
        expect(reference.preview.imageAlt.length).toBeGreaterThan(10);
        expect(reference.preview.title.length).toBeGreaterThan(5);
      }
    }
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

    expect(isGuideReferencePreviewImageUrl(reference.preview.imageUrl)).toBe(true);
    expect(isGuideReferencePreviewImageUrl('https://example.com/image.jpg')).toBe(false);
    expect(getGuideReferencePreviewImagePath(reference)).toBe(
      `/api/guide-preview-image?src=${encodeURIComponent(reference.preview.imageUrl)}`
    );
  });

  it('selects a verified source image for every place card', () => {
    for (const place of ULUWATU_GUIDE.places) {
      const reference = getGuidePlaceImageReference(place);

      expect(['government', 'official']).toContain(reference.kind);
      expect(reference.preview.imageUrl).toMatch(/^https:\/\//);
      expect(reference.preview.imageAlt.length).toBeGreaterThan(10);
    }
  });
});
