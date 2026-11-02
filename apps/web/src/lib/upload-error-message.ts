export const UPLOAD_STORAGE_FAILED_MESSAGE = '이미지를 저장하지 못했습니다. 잠시 뒤 다시 시도해 주세요.';

const MEANINGLESS_MESSAGES = new Set(['<none>', 'none', 'undefined', 'null', '[object object]']);

export function toUploadErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) return UPLOAD_STORAGE_FAILED_MESSAGE;
  const message = error.message.trim();
  if (!message || MEANINGLESS_MESSAGES.has(message.toLowerCase())) {
    return UPLOAD_STORAGE_FAILED_MESSAGE;
  }
  return message;
}
