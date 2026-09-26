'use client';

import { useState, type MouseEvent } from 'react';
import { ExternalLink, MessageSquareText, PlayCircle, RotateCw, Sparkles } from 'lucide-react';
import type { PlaceReviewResult } from '@/lib/place-review-sources';

interface PlaceReviewsProps {
  placeName: string;
}

type LoadState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'loaded'; result: PlaceReviewResult }
  | { status: 'error' };

const cache = new Map<string, PlaceReviewResult>();

export function clearPlaceReviewCache() {
  cache.clear();
}

const stop = (event: MouseEvent) => event.stopPropagation();

function SourceNote({
  status,
  sourceLabel,
  keyLabel,
  emptyText,
  searchUrl,
  isEmpty,
}: {
  status: PlaceReviewResult['naver']['status'];
  sourceLabel: string;
  keyLabel: string;
  emptyText: string;
  searchUrl: string;
  isEmpty: boolean;
}) {
  const message =
    status === 'no-key'
      ? `${keyLabel} 키가 아직 없어 골라 드리지 못했습니다.`
      : status === 'error'
        ? `${sourceLabel}을 불러오지 못했습니다.`
        : isEmpty
          ? emptyText
          : null;

  return (
    <div className="flex items-center justify-between gap-2 mt-1.5">
      {message ? <p className="text-[11px] text-text-tertiary">{message}</p> : <span />}
      <a
        href={searchUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={stop}
        className="flex-shrink-0 inline-flex items-center gap-1 text-[11px] text-text-accent hover:underline"
      >
        {sourceLabel === '네이버 후기' ? '네이버에서 직접 보기' : '유튜브에서 직접 보기'}
        <ExternalLink size={11} aria-hidden="true" />
      </a>
    </div>
  );
}

function ReviewResult({ result }: { result: PlaceReviewResult }) {
  const { naver, youtube } = result;

  return (
    <div className="mt-2 flex flex-col gap-3">
      <section aria-label="네이버 후기">
        <p className="flex items-center gap-1 text-[11px] font-semibold text-place-accent" style={{ fontFamily: 'var(--font-label)' }}>
          <MessageSquareText size={12} aria-hidden="true" />
          네이버 후기 · 협찬 글 제외
        </p>
        <ul className="mt-1 flex flex-col">
          {naver.posts.map((post) => (
            <li key={post.url} className="py-2 border-b border-border last:border-b-0">
              <a
                href={post.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={stop}
                className="text-xs font-semibold text-text-primary hover:text-text-accent"
              >
                {post.title}
              </a>
              <p className="text-[11px] text-text-tertiary font-mono mt-0.5">
                {[post.blogger, post.date].filter(Boolean).join(' · ')}
              </p>
              {post.excerpt && (
                <p className="text-[11px] text-text-secondary leading-4 mt-1 line-clamp-2">{post.excerpt}</p>
              )}
              <div className="flex flex-wrap gap-1 mt-1">
                {post.reasons.map((reason) => (
                  <span
                    key={reason}
                    className="px-1.5 py-0.5 rounded-full border border-[rgba(52,211,153,0.20)] bg-place-surface text-[10px] text-place-accent"
                  >
                    {reason}
                  </span>
                ))}
              </div>
            </li>
          ))}
        </ul>
        <SourceNote
          status={naver.status}
          sourceLabel="네이버 후기"
          keyLabel="네이버 검색 API"
          emptyText="기준을 통과한 후기가 없습니다."
          searchUrl={naver.searchUrl}
          isEmpty={naver.posts.length === 0}
        />
      </section>

      <section aria-label="유튜브 영상">
        <p className="flex items-center gap-1 text-[11px] font-semibold text-place-accent" style={{ fontFamily: 'var(--font-label)' }}>
          <PlayCircle size={12} aria-hidden="true" />
          유튜브 · AI 음성 채널과 얼굴 위주 영상 제외
        </p>
        <ul className="mt-1 flex flex-col">
          {youtube.videos.map((video) => (
            <li key={video.id} className="flex gap-2.5 py-2 border-b border-border last:border-b-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={video.thumbnailUrl}
                alt=""
                loading="lazy"
                className="w-24 aspect-video object-cover rounded-lg border border-border flex-shrink-0"
              />
              <div className="min-w-0">
                <a
                  href={video.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={stop}
                  className="text-xs font-semibold text-text-primary hover:text-text-accent line-clamp-2"
                >
                  {video.title}
                </a>
                <p className="text-[11px] text-text-tertiary font-mono mt-0.5">
                  {video.channelTitle} · {video.length} · {video.published}
                </p>
                <p className="flex items-center gap-1 text-[10px] text-ai-accent mt-0.5">
                  <Sparkles size={10} aria-hidden="true" />
                  {video.sceneCheck === 'checked' && video.scenes?.length
                    ? `장면 ${video.scenes.join(' · ')}`
                    : '장면 확인 안 됨'}
                </p>
              </div>
            </li>
          ))}
        </ul>
        {youtube.dropped.length > 0 && (
          <details className="mt-1" onClick={stop}>
            <summary className="text-[11px] text-text-tertiary cursor-pointer">
              뺀 영상 {youtube.dropped.length}개
            </summary>
            <ul className="mt-1 flex flex-col gap-1">
              {youtube.dropped.map((video) => (
                <li key={video.id} className="text-[11px] text-text-tertiary">
                  <a href={video.url} target="_blank" rel="noopener noreferrer" className="hover:text-text-secondary">
                    {video.title}
                  </a>
                  {' · '}
                  {video.reasons.join(', ')}
                </li>
              ))}
            </ul>
          </details>
        )}
        <SourceNote
          status={youtube.status}
          sourceLabel="유튜브 영상"
          keyLabel="YouTube API"
          emptyText="기준을 통과한 영상이 없습니다."
          searchUrl={youtube.searchUrl}
          isEmpty={youtube.videos.length === 0}
        />
      </section>
    </div>
  );
}

export function PlaceReviews({ placeName }: PlaceReviewsProps) {
  const [state, setState] = useState<LoadState>(() => {
    const cached = cache.get(placeName);
    return cached ? { status: 'loaded', result: cached } : { status: 'idle' };
  });

  const load = async (event: MouseEvent) => {
    event.stopPropagation();
    setState({ status: 'loading' });
    try {
      const response = await fetch('/api/place-reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: placeName }),
      });
      if (!response.ok) throw new Error(`place-reviews ${response.status}`);
      const result = (await response.json()) as PlaceReviewResult;
      cache.set(placeName, result);
      setState({ status: 'loaded', result });
    } catch (error) {
      console.error('[PlaceReviews] load failed:', error);
      setState({ status: 'error' });
    }
  };

  if (state.status === 'loaded') {
    return <ReviewResult result={state.result} />;
  }

  return (
    <button
      type="button"
      onClick={load}
      disabled={state.status === 'loading'}
      className="mt-1.5 inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-ai-surface border border-[rgba(167,139,250,0.20)] text-[10px] font-semibold text-ai-accent disabled:opacity-60 hover:bg-[rgba(167,139,250,0.15)] transition-colors"
    >
      {state.status === 'error' ? <RotateCw size={11} aria-hidden="true" /> : <Sparkles size={11} aria-hidden="true" />}
      {state.status === 'loading'
        ? '후기·영상 고르는 중'
        : state.status === 'error'
          ? '다시 불러오기'
          : '골라 둔 후기·영상'}
    </button>
  );
}
