import { describe, expect, it } from 'vitest';
import { UPLOAD_STORAGE_FAILED_MESSAGE, toUploadErrorMessage } from '@/lib/upload-error-message';

describe('toUploadErrorMessage', () => {
  it('keeps a meaningful message', () => {
    expect(toUploadErrorMessage(new Error('The object exceeded the maximum allowed size'))).toBe(
      'The object exceeded the maximum allowed size'
    );
  });

  it.each(['', '   ', '<none>', '<NONE>', 'undefined', 'null', '[object Object]'])(
    'replaces meaningless message %j with the user guidance',
    (message) => {
      expect(toUploadErrorMessage(new Error(message))).toBe(UPLOAD_STORAGE_FAILED_MESSAGE);
    }
  );

  it('uses the guidance for non-Error values', () => {
    expect(toUploadErrorMessage(undefined)).toBe(UPLOAD_STORAGE_FAILED_MESSAGE);
    expect(toUploadErrorMessage('boom')).toBe(UPLOAD_STORAGE_FAILED_MESSAGE);
  });
});
