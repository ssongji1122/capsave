import { ALLOWED_UPLOAD_MIME_TYPES, MAX_SELECTED_IMAGE_SIZE, MAX_UPLOAD_SIZE } from '@/lib/constants';

export const UPLOAD_SIZE_ERROR = '파일 크기가 5MB를 초과합니다.';
export const SELECTED_IMAGE_SIZE_ERROR = '파일 크기가 25MB를 초과합니다.';
export const UPLOAD_TYPE_ERROR = '지원하지 않는 파일 형식입니다. jpeg, png, webp만 가능합니다.';
export const UPLOAD_EMPTY_ERROR = '빈 파일은 업로드할 수 없습니다.';

type UploadValidationResult =
  | { valid: true }
  | { valid: false; error: string };

export function validateUploadFile(file: File): UploadValidationResult {
  return validateImageFile(file, MAX_UPLOAD_SIZE, UPLOAD_SIZE_ERROR);
}

export function validateSelectedImageFile(file: File): UploadValidationResult {
  return validateImageFile(file, MAX_SELECTED_IMAGE_SIZE, SELECTED_IMAGE_SIZE_ERROR);
}

function validateImageFile(file: File, maxSize: number, sizeError: string): UploadValidationResult {
  if (file.size === 0) {
    return { valid: false, error: UPLOAD_EMPTY_ERROR };
  }

  if (file.size > maxSize) {
    return { valid: false, error: sizeError };
  }

  if (!ALLOWED_UPLOAD_MIME_TYPES.includes(file.type as typeof ALLOWED_UPLOAD_MIME_TYPES[number])) {
    return { valid: false, error: UPLOAD_TYPE_ERROR };
  }

  return { valid: true };
}
