import { describe, expect, it } from 'vitest';
import { MAX_UPLOAD_SIZE } from '@/lib/constants';
import {
  UPLOAD_EMPTY_ERROR,
  UPLOAD_SIZE_ERROR,
  UPLOAD_TYPE_ERROR,
  validateUploadFile,
} from '@/lib/upload-validation';

function makeFile(name: string, type: string, size = 10): File {
  return new File([new Uint8Array(size)], name, { type });
}

describe('validateUploadFile', () => {
  it('accepts supported image MIME types', () => {
    expect(validateUploadFile(makeFile('capture.jpg', 'image/jpeg'))).toEqual({ valid: true });
    expect(validateUploadFile(makeFile('capture.png', 'image/png'))).toEqual({ valid: true });
    expect(validateUploadFile(makeFile('capture.webp', 'image/webp'))).toEqual({ valid: true });
  });

  it('rejects unsupported image MIME types', () => {
    expect(validateUploadFile(makeFile('animated.gif', 'image/gif'))).toEqual({
      valid: false,
      error: UPLOAD_TYPE_ERROR,
    });
  });

  it('rejects non-image files', () => {
    expect(validateUploadFile(makeFile('notes.txt', 'text/plain'))).toEqual({
      valid: false,
      error: UPLOAD_TYPE_ERROR,
    });
  });

  it('rejects empty image files', () => {
    expect(validateUploadFile(makeFile('empty.png', 'image/png', 0))).toEqual({
      valid: false,
      error: UPLOAD_EMPTY_ERROR,
    });
  });

  it('rejects files above the upload size limit', () => {
    expect(validateUploadFile(makeFile('large.png', 'image/png', MAX_UPLOAD_SIZE + 1))).toEqual({
      valid: false,
      error: UPLOAD_SIZE_ERROR,
    });
  });
});
