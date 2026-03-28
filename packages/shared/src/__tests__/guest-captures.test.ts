import { describe, it, expect } from 'vitest';
import {
  parseGuestCaptures,
  serializeGuestCaptures,
  addGuestCapture,
  getNextGuestId,
  guestCaptureToItem,
} from '../utils/guest-captures';
import type { GuestCapture } from '../utils/guest-captures';

const makeCapture = (id: number): GuestCapture => ({
  id,
  imageBase64: 'data:image/jpeg;base64,abc',
  title: `Test ${id}`,
  summary: 'summary',
  category: 'place',
  confidence: 0.9,
  tags: ['tag1'],
  places: [{ name: 'Place' }],
  createdAt: '2026-03-28T00:00:00Z',
});

describe('parseGuestCaptures', () => {
  it('returns empty array for null', () => {
    expect(parseGuestCaptures(null)).toEqual([]);
  });

  it('returns empty array for invalid JSON', () => {
    expect(parseGuestCaptures('not json')).toEqual([]);
  });

  it('returns empty array for non-array JSON', () => {
    expect(parseGuestCaptures('{"foo":"bar"}')).toEqual([]);
  });

  it('parses valid JSON array', () => {
    const captures = [makeCapture(-1)];
    const result = parseGuestCaptures(JSON.stringify(captures));
    expect(result).toEqual(captures);
  });
});

describe('serializeGuestCaptures', () => {
  it('serializes captures to JSON string', () => {
    const captures = [makeCapture(-1)];
    const result = serializeGuestCaptures(captures);
    expect(JSON.parse(result)).toEqual(captures);
  });
});

describe('getNextGuestId', () => {
  it('returns -1 for empty array', () => {
    expect(getNextGuestId([])).toBe(-1);
  });

  it('returns next negative id', () => {
    expect(getNextGuestId([makeCapture(-1)])).toBe(-2);
  });

  it('returns min id - 1 for multiple captures', () => {
    expect(getNextGuestId([makeCapture(-1), makeCapture(-3)])).toBe(-4);
  });
});

describe('addGuestCapture', () => {
  it('adds capture to empty list', () => {
    const result = addGuestCapture([], makeCapture(-1), 3);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(-1);
  });

  it('prepends new capture', () => {
    const existing = [makeCapture(-1)];
    const result = addGuestCapture(existing, makeCapture(-2), 3);
    expect(result[0].id).toBe(-2);
    expect(result[1].id).toBe(-1);
  });

  it('throws when at max capacity', () => {
    const full = [makeCapture(-1), makeCapture(-2), makeCapture(-3)];
    expect(() => addGuestCapture(full, makeCapture(-4), 3)).toThrow('Guest capture limit reached');
  });
});

describe('guestCaptureToItem', () => {
  it('converts GuestCapture to CaptureItem', () => {
    const gc = makeCapture(-1);
    const item = guestCaptureToItem(gc);

    expect(item.id).toBe(-1);
    expect(item.imageUrl).toBe('data:image/jpeg;base64,abc');
    expect(item.title).toBe('Test -1');
    expect(item.category).toBe('place');
    expect(item.userId).toBeNull();
    expect(item.reclassifiedAt).toBeNull();
    expect(item.deletedAt).toBeNull();
  });
});
