import type {
  GuideVisibility,
  PublicGuide,
  SaveGuideInput,
  UpdateGuideInput,
} from '@scrave/shared';

const SLUG_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isValidGuideSlug(slug: unknown): slug is string {
  return (
    typeof slug === 'string' &&
    slug.length >= 12 &&
    slug.length <= 80 &&
    SLUG_REGEX.test(slug)
  );
}

export function isValidPublicGuideBody(value: unknown): value is PublicGuide {
  if (!isRecord(value)) return false;
  if (!isValidGuideSlug(value.slug)) return false;
  if (typeof value.title !== 'string' || value.title.trim().length === 0 || value.title.length > 120) {
    return false;
  }
  if (typeof value.description !== 'string' || value.description.length > 400) {
    return false;
  }
  if (!Array.isArray(value.places) || value.places.length < 2 || value.places.length > 12) {
    return false;
  }
  return value.places.every(
    (p) =>
      isRecord(p) &&
      typeof p.id === 'string' &&
      typeof p.name === 'string' &&
      p.name.trim().length > 0 &&
      isRecord(p.coordinates) &&
      typeof p.coordinates.latitude === 'number' &&
      typeof p.coordinates.longitude === 'number',
  );
}

export type ValidatedSaveGuide =
  | { valid: true; input: SaveGuideInput }
  | { valid: false; error: string };

export function validateSaveGuidePayload(body: unknown): ValidatedSaveGuide {
  if (!isRecord(body)) {
    return { valid: false, error: 'Invalid request body' };
  }
  if (!isValidPublicGuideBody(body.guide)) {
    return { valid: false, error: 'Invalid guide payload' };
  }

  const status = body.status === 'draft' ? 'draft' : 'ready';
  const visibility: GuideVisibility =
    body.visibility === 'unlisted' ? 'unlisted' : 'private';

  if (
    body.status !== undefined &&
    body.status !== 'draft' &&
    body.status !== 'ready'
  ) {
    return { valid: false, error: 'Invalid guide status' };
  }

  if (
    body.visibility !== undefined &&
    body.visibility !== 'private' &&
    body.visibility !== 'unlisted'
  ) {
    return { valid: false, error: 'Invalid guide visibility' };
  }

  const generation = isRecord(body.generation) ? body.generation : {};

  return {
    valid: true,
    input: {
      guide: body.guide,
      status,
      visibility,
      generation,
    },
  };
}

export type ValidatedUpdateGuide =
  | { valid: true; input: UpdateGuideInput }
  | { valid: false; error: string };

export function validateUpdateGuidePayload(body: unknown): ValidatedUpdateGuide {
  if (!isRecord(body)) {
    return { valid: false, error: 'Invalid request body' };
  }

  const input: UpdateGuideInput = {};

  if (body.status !== undefined) {
    if (body.status !== 'draft' && body.status !== 'ready') {
      return { valid: false, error: 'Invalid guide status' };
    }
    input.status = body.status;
  }

  if (body.visibility !== undefined) {
    if (body.visibility !== 'private' && body.visibility !== 'unlisted') {
      return { valid: false, error: 'Invalid guide visibility' };
    }
    input.visibility = body.visibility;
  }

  if (body.guide !== undefined) {
    if (!isValidPublicGuideBody(body.guide)) {
      return { valid: false, error: 'Invalid guide payload' };
    }
    input.guide = body.guide;
  }

  if (
    input.status === undefined &&
    input.visibility === undefined &&
    input.guide === undefined
  ) {
    return { valid: false, error: 'No update fields provided' };
  }

  return { valid: true, input };
}
