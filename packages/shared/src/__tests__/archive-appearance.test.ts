import { describe, expect, it } from 'vitest';
import { ARCHIVE_APPEARANCE } from '../utils/archive-appearance';
import { ARCHIVE_SECTIONS } from '../utils/capture-archive';
describe('archive appearance contract', () => {
 it('provides a distinct shape for every browsing section on both platforms', () => {
  expect(Object.keys(ARCHIVE_APPEARANCE).sort()).toEqual(ARCHIVE_SECTIONS.map(s=>s.id).sort());
  expect(new Set(Object.values(ARCHIVE_APPEARANCE).map(s=>s.shape)).size).toBe(4);
 });
});
