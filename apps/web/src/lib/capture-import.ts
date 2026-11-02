import { parseAnalysisResult, type AnalysisResult } from '@scrave/shared';

export const MAX_IMPORT_BYTES = 50 * 1024 * 1024;
export const MAX_IMPORT_CARDS = 50;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_PATTERN = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/;
export interface ImportedCapture { image: string; analysis: AnalysisResult }
function isRecord(value: unknown): value is Record<string, unknown> { return !!value && typeof value === 'object' && !Array.isArray(value); }
export function parseCaptureImport(value: unknown): ImportedCapture[] {
  if (!isRecord(value) || value.version !== 1 || !Array.isArray(value.captures) || !value.captures.length || value.captures.length > MAX_IMPORT_CARDS) throw Error('가져올 카드 묶음을 확인하십시오.');
  return value.captures.map(entry => {
    if (!isRecord(entry) || typeof entry.image !== 'string' || !isRecord(entry.analysis)) throw Error('원본 이미지와 정리 내용이 필요합니다.');
    const match = entry.image.match(IMAGE_PATTERN);
    if (!match || match[2].length % 4 || match[2].length * 3 / 4 > MAX_IMAGE_BYTES) throw Error('이미지는 5MB 이하의 JPEG·PNG·WebP만 지원합니다.');
    const a = entry.analysis;
    if (!['place','text'].includes(String(a.category)) || typeof a.title !== 'string' || !a.title.trim() || a.title.length > 300 || typeof a.summary !== 'string' || typeof a.extractedText !== 'string' || !Array.isArray(a.tags) || a.tags.some(t=>typeof t !== 'string') || !Array.isArray(a.links) || a.links.some(l=>typeof l !== 'string') || !Array.isArray(a.places) || a.places.some(p=>!isRecord(p) || typeof p.name !== 'string' || (p.address !== undefined && typeof p.address !== 'string')) || typeof a.confidence !== 'number' || !Number.isFinite(a.confidence)) throw Error('카드 제목·내용·장소 형식을 확인하십시오.');
    return {image:entry.image,analysis:parseAnalysisResult(JSON.stringify(a))};
  });
}
interface SaveDependencies {
  upload: (file: File) => Promise<string>;
  save: (analysis: AnalysisResult, path: string) => Promise<unknown>;
  cleanup: (path: string) => Promise<unknown>;
}
/** Upload unchanged source bytes; never call a paid analysis or geocoding API. */
export async function saveImportedCapture(capture: ImportedCapture, deps: SaveDependencies) {
  const match = capture.image.match(IMAGE_PATTERN)!;
  const bytes = Uint8Array.from(atob(match[2]),c=>c.charCodeAt(0));
  const file = new File([bytes],`original.${match[1] === 'jpeg' ? 'jpg' : match[1]}`,{type:`image/${match[1]}`});
  const path = await deps.upload(file);
  try { await deps.save(capture.analysis,path); }
  catch(error) { try { await deps.cleanup(path); } catch { /* Preserve save failure if compensation is unavailable. */ } throw error; }
}
