import { ALLOWED_UPLOAD_MIME_TYPES, MAX_UPLOAD_SIZE } from '@/lib/constants';

export const UPLOAD_SIZE_ERROR = '파일 크기가 5MB를 초과합니다.';
export const UPLOAD_TYPE_ERROR = '지원하지 않는 파일 형식입니다. jpeg, png, webp만 가능합니다.';
export const UPLOAD_EMPTY_ERROR = '빈 파일은 업로드할 수 없습니다.';

type UploadValidationResult =
  | { valid: true }
  | { valid: false; error: string };

export function validateUploadFile(file: File): UploadValidationResult {
  if (file.size === 0) {
    return { valid: false, error: UPLOAD_EMPTY_ERROR };
  }

  if (file.size > MAX_UPLOAD_SIZE) {
    return { valid: false, error: UPLOAD_SIZE_ERROR };
  }

  if (!ALLOWED_UPLOAD_MIME_TYPES.includes(file.type as typeof ALLOWED_UPLOAD_MIME_TYPES[number])) {
    return { valid: false, error: UPLOAD_TYPE_ERROR };
  }

  return { valid: true };
}
