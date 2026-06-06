export const BATCH_SAVE_CAPACITY_REASON = 'RESULT_COUNT_EXCEEDS_CAPACITY' as const;
export const BATCH_SAVE_CAPACITY_ERROR_MESSAGE = '남은 저장 가능 횟수보다 분석 결과가 많습니다';

interface BatchSaveCapacityInput {
  resultCount: number;
  maxSaveCount?: number;
}

type BatchSaveCapacityState =
  | { canSave: true; reason: null }
  | { canSave: false; reason: typeof BATCH_SAVE_CAPACITY_REASON };

export function getBatchSaveCapacityState({
  resultCount,
  maxSaveCount,
}: BatchSaveCapacityInput): BatchSaveCapacityState {
  if (maxSaveCount === undefined) {
    return { canSave: true, reason: null };
  }

  if (resultCount <= maxSaveCount) {
    return { canSave: true, reason: null };
  }

  return { canSave: false, reason: BATCH_SAVE_CAPACITY_REASON };
}
