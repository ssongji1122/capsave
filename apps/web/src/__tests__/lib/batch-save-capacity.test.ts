import { describe, expect, it } from 'vitest';
import { getBatchSaveCapacityState } from '@/lib/batch-save-capacity';

describe('getBatchSaveCapacityState', () => {
  it('allows saving when there is no explicit max count', () => {
    expect(getBatchSaveCapacityState({ resultCount: 5 })).toEqual({
      canSave: true,
      reason: null,
    });
  });

  it('allows saving when result count fits remaining slots', () => {
    expect(getBatchSaveCapacityState({ resultCount: 2, maxSaveCount: 2 })).toEqual({
      canSave: true,
      reason: null,
    });
  });

  it('blocks saving when result count exceeds remaining slots', () => {
    expect(getBatchSaveCapacityState({ resultCount: 2, maxSaveCount: 1 })).toEqual({
      canSave: false,
      reason: 'RESULT_COUNT_EXCEEDS_CAPACITY',
    });
  });

  it('blocks saving zero or negative capacity when there are results', () => {
    expect(getBatchSaveCapacityState({ resultCount: 1, maxSaveCount: 0 })).toEqual({
      canSave: false,
      reason: 'RESULT_COUNT_EXCEEDS_CAPACITY',
    });
  });
});
