'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { FileText, ImagePlus, LockKeyhole, MapPin } from 'lucide-react';
import { OAuthButtons } from '@/components/auth/OAuthButtons';
import { getAuthCallbackNextPath } from '@/lib/auth-redirect';

export default function LoginForm() {
  const searchParams = useSearchParams();
  const nextPath = getAuthCallbackNextPath(searchParams.get('next'));

  return (
    <div className="min-h-screen bg-background px-4 py-8 text-text-primary sm:px-6">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-5xl items-center gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="hidden lg:block">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary-border bg-primary-surface">
              <ImagePlus size={21} className="text-primary" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-primary">Scrave</h1>
              <p className="text-xs text-text-tertiary" style={{ fontFamily: 'var(--font-label)' }}>CAPTURE ARCHIVE</p>
            </div>
          </div>
          <h2 className="max-w-sm text-3xl font-extrabold leading-tight text-text-primary">
            내 캡처 보관함으로 들어가기
          </h2>
          <div className="mt-8 space-y-3">
            <div className="flex items-center gap-3 rounded-3xl border border-place-border bg-place-surface p-4">
              <MapPin size={20} className="text-place-accent" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold text-text-primary">장소</p>
                <p className="text-xs text-text-tertiary">맛집, 카페, 여행지</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-3xl border border-text-border bg-text-surface p-4">
              <FileText size={20} className="text-text-accent" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold text-text-primary">텍스트</p>
                <p className="text-xs text-text-tertiary">링크, 메모, 긴 글</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-3xl border border-primary-border bg-primary-surface p-4">
              <LockKeyhole size={20} className="text-primary" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold text-text-primary">동기화</p>
                <p className="text-xs text-text-tertiary">저장한 캡처 유지</p>
              </div>
            </div>
          </div>
        </section>

        <div className="w-full max-w-md justify-self-center rounded-3xl border border-border bg-surface p-5 sm:p-6">
          <div className="mb-7 text-center lg:hidden">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-primary-border bg-primary-surface">
              <ImagePlus size={22} className="text-primary" aria-hidden="true" />
            </div>
            <h1 className="text-3xl font-extrabold text-primary">Scrave</h1>
            <p className="text-sm text-text-secondary">AI 캡처 오거나이저</p>
          </div>

          <div className="mb-6 hidden lg:block">
            <p className="text-xs font-semibold text-primary" style={{ fontFamily: 'var(--font-label)' }}>SIGN IN</p>
            <h2 className="mt-1 text-2xl font-bold text-text-primary">로그인</h2>
          </div>

          <OAuthButtons nextPath={nextPath} />

          <p className="text-text-tertiary text-center text-xs mt-6">
            소셜 계정으로 로그인하면 자동으로 계정이 생성됩니다.
          </p>

          <Link
            href="/"
            className="mt-3 block w-full text-center text-sm text-text-tertiary transition-colors hover:text-primary"
          >
            ← 체험하기
          </Link>
        </div>
      </div>
    </div>
  );
}
