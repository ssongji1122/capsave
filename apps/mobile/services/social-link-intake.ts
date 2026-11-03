import type { AnalysisResult } from '@scrave/shared';
import { getSupabaseClient } from './supabase';
import { buildStoragePath } from './upload-flow';

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export interface MobileInstagramPost {
  url: string;
  author: string;
  caption: string;
  selectedIndex: number;
  images: Array<{ url: string; kind: 'image' | 'video-preview' }>;
}

export interface MobileSocialLinkCapture {
  imageUrl: string;
  imageKind: 'image' | 'video-preview';
  selected: boolean;
  analysis: AnalysisResult;
}

export interface MobileSocialLinkResult {
  post: MobileInstagramPost;
  captures: MobileSocialLinkCapture[];
}

interface MobileSocialLinkApiOptions {
  serverUrl: string;
  getToken: () => Promise<string | null>;
  fetchImpl?: FetchLike;
}

const LOGIN_REQUIRED = '로그인한 뒤 링크를 저장할 수 있습니다.';
const INSPECT_FAILED = '공개 게시물을 불러오지 못했습니다. 주소와 공개 상태를 확인해 주세요.';
const DOWNLOAD_FAILED = '공개 미디어를 내려받지 못했습니다. 다시 검사해 주세요.';
const MAX_LINK_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

async function apiError(response: Response, fallback: string) {
  try {
    const body = await response.json() as { error?: unknown };
    return typeof body.error === 'string' ? body.error : fallback;
  } catch {
    return fallback;
  }
}

export async function inspectMobileSocialLink(
  url: string,
  { serverUrl, getToken, fetchImpl = fetch }: MobileSocialLinkApiOptions,
): Promise<MobileSocialLinkResult> {
  const token = await getToken();
  if (!token) throw new Error(LOGIN_REQUIRED);
  const response = await fetchImpl(`${serverUrl.replace(/\/$/, '')}/api/social-link`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ url }),
  });
  if (response.status === 401) throw new Error(LOGIN_REQUIRED);
  if (!response.ok) throw new Error(await apiError(response, INSPECT_FAILED));
  return await response.json() as MobileSocialLinkResult;
}

interface MobileSocialLinkUploadOptions extends MobileSocialLinkApiOptions {
  uploadBytes?: (path: string, bytes: Uint8Array, contentType: string) => Promise<void>;
  now?: () => number;
  randomSuffix?: () => string;
}

async function uploadBytesToStorage(path: string, bytes: Uint8Array, contentType: string) {
  const { error } = await getSupabaseClient().storage.from('captures').upload(path, bytes, {
    contentType,
    upsert: false,
  });
  if (error) throw new Error('원본 이미지 업로드에 실패했습니다.');
}

export async function uploadMobileSocialLinkImage(
  imageUrl: string,
  userId: string,
  {
    serverUrl,
    getToken,
    fetchImpl = fetch,
    uploadBytes = uploadBytesToStorage,
    now = Date.now,
    randomSuffix,
  }: MobileSocialLinkUploadOptions,
) {
  const token = await getToken();
  if (!token) throw new Error(LOGIN_REQUIRED);
  const response = await fetchImpl(
    `${serverUrl.replace(/\/$/, '')}/api/social-link?src=${encodeURIComponent(imageUrl)}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (response.status === 401) throw new Error(LOGIN_REQUIRED);
  if (!response.ok) throw new Error(await apiError(response, DOWNLOAD_FAILED));
  const contentType = response.headers.get('content-type')?.split(';')[0].trim() ?? '';
  const extension = IMAGE_TYPES[contentType];
  if (!extension) throw new Error('지원하지 않는 원본 이미지 형식입니다.');
  const buffer = await response.arrayBuffer();
  if (!buffer.byteLength || buffer.byteLength > MAX_LINK_IMAGE_BYTES) {
    throw new Error('원본 이미지는 5MB 이하만 저장할 수 있습니다.');
  }
  const bytes = new Uint8Array(buffer);
  const path = buildStoragePath(userId, now, randomSuffix, extension);
  await uploadBytes(path, bytes, contentType);
  return path;
}

interface SaveMobileSocialLinkDependencies {
  upload: (capture: MobileSocialLinkCapture) => Promise<string>;
  save: (analysis: AnalysisResult, path: string) => Promise<unknown>;
  cleanup: (path: string) => Promise<unknown>;
}

export class MobileSocialLinkSaveError extends Error {
  completed: number;

  constructor(message: string, completed: number) {
    super(message);
    this.name = 'MobileSocialLinkSaveError';
    this.completed = completed;
  }
}

export async function saveMobileSocialLinkCaptures(
  captures: MobileSocialLinkCapture[],
  completed: number,
  deps: SaveMobileSocialLinkDependencies,
) {
  let progress = completed;
  try {
    for (; progress < captures.length; progress += 1) {
      const capture = captures[captures.length - 1 - progress];
      const path = await deps.upload(capture);
      try {
        await deps.save(capture.analysis, path);
      } catch (error) {
        try {
          await deps.cleanup(path);
        } catch {
          // Preserve the row save failure when compensating cleanup is unavailable.
        }
        throw error;
      }
    }
    return progress;
  } catch (error) {
    throw new MobileSocialLinkSaveError(
      error instanceof Error ? error.message : '저장하지 못했습니다.',
      progress,
    );
  }
}
