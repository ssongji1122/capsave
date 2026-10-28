import { describe, expect, it } from 'vitest';
import {
  validateSaveGuidePayload,
  validateUpdateGuidePayload,
} from '@/lib/guide-persistence';
import { ULUWATU_CAPTURE_GUIDE } from '@/lib/public-guides';

describe('guide-persistence input validation', () => {
  it('accepts a valid PublicGuide with valid slug and 2+ places', () => {
    const validGuide = {
      ...ULUWATU_CAPTURE_GUIDE,
      slug: 'my-guide-k3v9q2m7xa',
      status: 'draft' as const,
    };

    const res = validateSaveGuidePayload({
      guide: validGuide,
      status: 'ready',
      visibility: 'private',
    });

    expect(res.valid).toBe(true);
    if (res.valid) {
      expect(res.input.status).toBe('ready');
      expect(res.input.visibility).toBe('private');
    }
  });

  it('rejects a guide with an invalid slug or fewer than 2 places', () => {
    const badSlug = validateSaveGuidePayload({
      guide: { ...ULUWATU_CAPTURE_GUIDE, slug: 'bad_slug!' },
    });
    expect(badSlug.valid).toBe(false);

    const tooFewPlaces = validateSaveGuidePayload({
      guide: {
        ...ULUWATU_CAPTURE_GUIDE,
        slug: 'my-guide-k3v9q2m7xa',
        places: ULUWATU_CAPTURE_GUIDE.places.slice(0, 1),
      },
    });
    expect(tooFewPlaces.valid).toBe(false);
  });

  it('validates PATCH payloads for visibility and status updates', () => {
    const ok = validateUpdateGuidePayload({
      visibility: 'unlisted',
      status: 'ready',
    });
    expect(ok.valid).toBe(true);

    const empty = validateUpdateGuidePayload({});
    expect(empty.valid).toBe(false);

    const badVisibility = validateUpdateGuidePayload({
      visibility: 'public',
    });
    expect(badVisibility.valid).toBe(false);
  });
});
