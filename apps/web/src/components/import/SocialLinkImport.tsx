'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { AnalysisResult } from '@scrave/shared';
import {
  saveSocialLinkCapture,
  type SocialLinkCapture,
} from '@/lib/social-link-intake';
import type { InstagramOriginal } from '@/lib/instagram-original';

interface SocialLinkImportProps {
  isAuthenticated: boolean;
  isAuthReady: boolean;
  freeRemaining: number;
  persist: (analysis: AnalysisResult, path: string) => Promise<unknown>;
  refresh: () => Promise<unknown>;
}

interface InspectResponse {
  post: InstagramOriginal;
  captures: SocialLinkCapture[];
}

async function responseError(response: Response, fallback: string) {
  try {
    const body = await response.json();
    return typeof body.error === 'string' ? body.error : fallback;
  } catch {
    return fallback;
  }
}

export function SocialLinkImport({
  isAuthenticated,
  isAuthReady,
  freeRemaining,
  persist,
  refresh,
}: SocialLinkImportProps) {
  const [url, setUrl] = useState('');
  const [post, setPost] = useState<InstagramOriginal | null>(null);
  const [captures, setCaptures] = useState<SocialLinkCapture[]>([]);
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(0);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const busy = checking || saving;
  const complete = captures.length > 0 && saved === captures.length;
  const firstRoute = captures[0]?.analysis.tags[2] ?? '일반 참고자료';

  async function inspect() {
    if (busy || !isAuthenticated) return;
    setChecking(true);
    setError('');
    setMessage('원문과 이미지 묶음을 확인하는 중입니다.');
    setPost(null);
    setCaptures([]);
    setSaved(0);
    try {
      const response = await fetch('/api/social-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      if (!response.ok) {
        throw new Error(await responseError(response, '링크를 확인하지 못했습니다.'));
      }
      const result = (await response.json()) as InspectResponse;
      setPost(result.post);
      setCaptures(result.captures);
      setMessage(`원본 ${result.captures.length}장을 확인했습니다. 저장 전 내용을 살펴보세요.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '링크를 확인하지 못했습니다.');
      setMessage('');
    } finally {
      setChecking(false);
    }
  }

  async function save() {
    if (busy || complete || !isAuthenticated) return;
    const remaining = captures.length - saved;
    if (remaining > freeRemaining) {
      setError('남은 저장 한도보다 원본 이미지가 많습니다.');
      return;
    }

    setSaving(true);
    setError('');
    let completed = saved;
    try {
      for (let progress = saved; progress < captures.length; progress += 1) {
        const captureIndex = captures.length - 1 - progress;
        await saveSocialLinkCapture(captures[captureIndex], {
          download: async (sourceUrl) => {
            const response = await fetch(`/api/social-link?src=${encodeURIComponent(sourceUrl)}`);
            if (!response.ok) {
              throw new Error(await responseError(response, '원본 이미지를 내려받지 못했습니다.'));
            }
            const blob = await response.blob();
            const extension = blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : 'jpg';
            return new File([blob], `instagram-original.${extension}`, { type: blob.type });
          },
          upload: async (file) => {
            const form = new FormData();
            form.append('file', file);
            const response = await fetch('/api/upload', { method: 'POST', body: form });
            if (!response.ok) {
              throw new Error(await responseError(response, '원본 이미지 업로드에 실패했습니다.'));
            }
            const body = await response.json();
            if (typeof body.path !== 'string') throw new Error('저장 경로를 확인하지 못했습니다.');
            return body.path;
          },
          save: persist,
          cleanup: async (path) => {
            await fetch('/api/upload', {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ paths: [path] }),
            });
          },
        });
        completed = progress + 1;
        setSaved(completed);
        setMessage(`${completed} / ${captures.length} 저장 중`);
      }
      setMessage(`원본 ${captures.length}장과 본문·작성자·출처 링크를 보관함에 저장했습니다. 아직 확인 전 자료입니다.`);
    } catch (caught) {
      const prefix = completed > 0
        ? `${completed}장은 저장했고 ${captures.length - completed}장은 중단되었습니다. `
        : '';
      setError(`${prefix}${caught instanceof Error ? caught.message : '저장하지 못했습니다.'}`);
      setMessage('');
    } finally {
      await refresh();
      setSaving(false);
    }
  }

  return (
    <section aria-labelledby="social-link-heading" className="rounded-2xl border border-border bg-white p-5 sm:p-6">
      <h2 id="social-link-heading" className="text-xl font-semibold">Instagram 게시물 저장</h2>
      <p className="mt-2 text-sm leading-6 text-text-secondary">
        공개 게시물의 원문과 이미지 묶음을 순서대로 확인한 뒤 보관함에 저장합니다. 첫 분류는 확인 전 상태로 남습니다.
      </p>

      <form className="mt-5" onSubmit={(event) => { event.preventDefault(); void inspect(); }}>
        <label htmlFor="instagram-url" className="text-sm font-medium">Instagram 게시물 링크</label>
        <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto]">
          <input
            id="instagram-url"
            type="url"
            inputMode="url"
            autoComplete="url"
            required
            value={url}
            disabled={busy || !isAuthenticated}
            placeholder="https://www.instagram.com/p/.../"
            className="min-h-11 min-w-0 rounded-xl border border-border bg-surface-elevated px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
            onChange={(event) => setUrl(event.target.value)}
          />
          <button
            type="submit"
            disabled={busy || !isAuthReady || !isAuthenticated || !url.trim()}
            className="min-h-11 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {checking ? '확인 중' : '링크 확인'}
          </button>
        </div>
        <p className="mt-2 text-xs leading-5 text-text-secondary">
          현재 공개 게시물과 릴스를 지원합니다. 비공개·삭제된 게시물은 불러올 수 없습니다.
        </p>
      </form>

      {!isAuthenticated && isAuthReady && (
        <Link href="/login" className="mt-4 inline-flex min-h-11 items-center font-medium text-primary underline">
          로그인하고 저장하기
        </Link>
      )}

      {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
      {message && <p role="status" aria-live="polite" className="mt-4 text-sm">{message}</p>}

      {post && captures.length > 0 && (
        <div className="mt-6 border-t border-border pt-5">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full border border-border px-3 py-1.5 font-medium">수집됨 · 확인 전</span>
            <span className="rounded-full bg-surface-elevated px-3 py-1.5">첫 분류 · {firstRoute}</span>
          </div>
          <p className="mt-4 font-semibold">{post.author ? `@${post.author}` : '작성자 확인 불가'}</p>
          <p className="mt-1 text-xs text-text-secondary">
            원본 {captures.length}장 · 출처 링크 1개
          </p>
          {post.caption && (
            <details className="mt-4 rounded-xl bg-surface-elevated p-4">
              <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium">본문 전체 보기</summary>
              <p className="whitespace-pre-wrap break-words text-sm leading-6 text-text-secondary">{post.caption}</p>
            </details>
          )}
          <ol className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3">
            {captures.map((capture, index) => (
              <li key={`${capture.imageUrl}-${index}`} className="min-w-0">
                <div className="relative overflow-hidden rounded-xl bg-surface-elevated">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={capture.imageUrl}
                    alt={`${index + 1}번째 Instagram 원본`}
                    referrerPolicy="no-referrer"
                    className="aspect-square w-full object-contain"
                  />
                </div>
                <p className="mt-2 text-xs font-medium">
                  {index + 1} / {captures.length}{capture.selected ? ' · 선택한 이미지' : ''}
                </p>
                {capture.imageKind === 'video-preview' && (
                  <p className="mt-1 text-xs text-text-secondary">영상 미리보기</p>
                )}
              </li>
            ))}
          </ol>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={busy || complete}
              onClick={() => void save()}
              className="min-h-11 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              {saving
                ? `${saved} / ${captures.length} 저장 중`
                : complete
                  ? '저장 완료'
                  : saved > 0
                    ? `남은 ${captures.length - saved}장 다시 저장`
                    : `원본 ${captures.length}장 계정에 저장`}
            </button>
            {complete && (
              <Link href="/dashboard" className="inline-flex min-h-11 items-center font-medium text-primary underline">
                보관함에서 보기
              </Link>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
