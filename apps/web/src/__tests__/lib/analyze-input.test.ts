import { describe, expect, it } from 'vitest';
import {
  ANALYZE_IMAGE_BASE64_ERROR,
  ANALYZE_IMAGE_REQUIRED_ERROR,
  ANALYZE_IMAGE_SIZE_ERROR,
  BATCH_IMAGES_REQUIRED_ERROR,
  BATCH_IMAGES_TYPE_ERROR,
  BATCH_IMAGE_TYPE_ERROR,
  validateAnalyzeImageInput,
  validateBatchAnalyzeImagesInput,
} from '@/lib/analyze-input';
import { MAX_ANALYZE_IMAGE_BASE64_LENGTH, MAX_BATCH_FILES } from '@/lib/constants';

describe('validateAnalyzeImageInput', () => {
  it('rejects missing image', () => {
    expect(validateAnalyzeImageInput(undefined)).toEqual({
      valid: false,
      error: ANALYZE_IMAGE_REQUIRED_ERROR,
    });
  });

  it('rejects empty image string', () => {
    expect(validateAnalyzeImageInput('')).toEqual({
      valid: false,
      error: ANALYZE_IMAGE_REQUIRED_ERROR,
    });
  });

  it('accepts a base64 image string', () => {
    expect(validateAnalyzeImageInput('dGVzdA==')).toEqual({ valid: true });
  });

  it('rejects image payloads above the API analysis size limit', () => {
    expect(validateAnalyzeImageInput('a'.repeat(MAX_ANALYZE_IMAGE_BASE64_LENGTH + 1))).toEqual({
      valid: false,
      error: ANALYZE_IMAGE_SIZE_ERROR,
    });
  });

  it('rejects non-base64 image strings', () => {
    expect(validateAnalyzeImageInput('not-base64!')).toEqual({
      valid: false,
      error: ANALYZE_IMAGE_BASE64_ERROR,
    });
  });
});

describe('validateBatchAnalyzeImagesInput', () => {
  it('rejects non-array payloads', () => {
    expect(validateBatchAnalyzeImagesInput(undefined)).toEqual({
      valid: false,
      error: BATCH_IMAGES_TYPE_ERROR,
    });
  });

  it('rejects an empty images array', () => {
    expect(validateBatchAnalyzeImagesInput([])).toEqual({
      valid: false,
      error: BATCH_IMAGES_REQUIRED_ERROR,
    });
  });

  it('rejects too many images', () => {
    const images = Array.from({ length: MAX_BATCH_FILES + 1 }, () => 'dGVzdA==');
    expect(validateBatchAnalyzeImagesInput(images)).toEqual({
      valid: false,
      error: `한번에 최대 ${MAX_BATCH_FILES}장까지 업로드 가능합니다`,
    });
  });

  it('rejects non-string entries', () => {
    expect(validateBatchAnalyzeImagesInput(['dGVzdA==', null])).toEqual({
      valid: false,
      error: BATCH_IMAGE_TYPE_ERROR,
    });
  });

  it('rejects oversized image entries', () => {
    expect(validateBatchAnalyzeImagesInput(['dGVzdA==', 'a'.repeat(MAX_ANALYZE_IMAGE_BASE64_LENGTH + 1)])).toEqual({
      valid: false,
      error: ANALYZE_IMAGE_SIZE_ERROR,
    });
  });

  it('rejects non-base64 image entries', () => {
    expect(validateBatchAnalyzeImagesInput(['dGVzdA==', 'not-base64!'])).toEqual({
      valid: false,
      error: ANALYZE_IMAGE_BASE64_ERROR,
    });
  });

  it('accepts up to the batch limit', () => {
    const images = Array.from({ length: MAX_BATCH_FILES }, () => 'dGVzdA==');
    expect(validateBatchAnalyzeImagesInput(images)).toEqual({ valid: true });
  });
});
