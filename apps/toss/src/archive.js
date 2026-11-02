export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const SECTIONS = [
  { id: 'unfiled', label: '아직 분류 전' },
  { id: 'shopping', label: '물건' },
  { id: 'places', label: '갈 곳' },
  { id: 'questions', label: '궁금한 정보' },
  { id: 'travel', label: '여행' },
];
const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];
const JPEG_SIGNATURE = [255, 216, 255];
const WEBP_HEADER_LENGTH = 12;

export async function validateImage(image) {
  if (!image.size) throw new Error('파일이 비어 있습니다. 다른 사진을 선택해 주세요.');
  if (image.size > MAX_IMAGE_BYTES) throw new Error('10MB 이하의 사진을 선택해 주세요.');
  const header = new Uint8Array(await image.slice(0, WEBP_HEADER_LENGTH).arrayBuffer());
  if (PNG_SIGNATURE.every((value, index) => header[index] === value)) return 'image/png';
  if (JPEG_SIGNATURE.every((value, index) => header[index] === value)) return 'image/jpeg';
  const ascii = new TextDecoder().decode(header);
  if (ascii.startsWith('RIFF') && ascii.slice(8, WEBP_HEADER_LENGTH) === 'WEBP') return 'image/webp';
  throw new Error('PNG, JPEG, WebP 사진을 선택해 주세요.');
}

export async function makeCapture(image) {
  const mime = await validateImage(image);
  const digest = await crypto.subtle.digest('SHA-256', await image.arrayBuffer());
  const id = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  return {
    id, image, mime, filename: image.name || '캡처', title: '', note: '',
    section: 'unfiled', createdAt: new Date().toISOString(),
  };
}

export function filterCaptures(captures, query, section) {
  const term = query.trim().toLocaleLowerCase('ko');
  return captures.filter(capture =>
    (section === 'all' || capture.section === section) &&
    [capture.title, capture.note, capture.filename].join(' ').toLocaleLowerCase('ko').includes(term)
  );
}

export async function albumImage(value) {
  if (typeof value !== 'string') throw new Error('사진을 읽지 못했습니다. 다시 선택해 주세요.');
  const encoded = value.startsWith('data:') ? value.split(',')[1] : value;
  const MAX_BASE64_LENGTH = Math.ceil(MAX_IMAGE_BYTES / 3) * 4;
  if (!encoded || encoded.length > MAX_BASE64_LENGTH || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) {
    throw new Error('사진을 읽지 못했습니다. 10MB 이하의 사진을 다시 선택해 주세요.');
  }
  let bytes;
  try { bytes = Uint8Array.from(atob(encoded), char => char.charCodeAt(0)); }
  catch { throw new Error('사진을 읽지 못했습니다. 다시 선택해 주세요.'); }
  const blob = new Blob([bytes]);
  const mime = await validateImage(blob);
  const extension = mime === 'image/jpeg' ? 'jpg' : mime.split('/')[1];
  return new File([blob], `캡처-${new Date().toISOString().slice(0, 10)}.${extension}`, { type: mime });
}
