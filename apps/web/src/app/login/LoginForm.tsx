'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/browser';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { FileText, ImagePlus, LockKeyhole, MapPin } from 'lucide-react';
import { OAuthButtons } from '@/components/auth/OAuthButtons';
import { buildAuthCallbackRedirect, getAuthCallbackNextPath } from '@/lib/auth-redirect';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const nextPath = getAuthCallbackNextPath(searchParams.get('next'));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
      } else {
        router.push(nextPath);
        router.refresh();
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: buildAuthCallbackRedirect(window.location.origin, nextPath) },
      });
      if (error) {
        setError(error.message);
      } else {
        setMessage('확인 이메일을 발송했습니다. 메일함을 확인해주세요.');
      }
    }

    setLoading(false);
  };

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

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-border" />
            <span className="text-text-tertiary text-xs">또는</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input
              type="email"
              placeholder="이메일"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-text-primary placeholder:text-text-tertiary transition-colors focus:border-primary focus:outline-none"
            />
            <input
              type="password"
              placeholder="비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-text-primary placeholder:text-text-tertiary transition-colors focus:border-primary focus:outline-none"
            />

            {error && <p className="text-error text-sm">{error}</p>}
            {message && <p className="text-success text-sm">{message}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-primary py-3 font-bold text-black transition-colors hover:bg-primary-light disabled:opacity-50"
            >
              {loading ? '처리 중...' : mode === 'login' ? '로그인' : '회원가입'}
            </button>
          </form>

          <button
            onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setMessage(''); }}
            className="mt-4 w-full text-center text-sm text-text-tertiary transition-colors hover:text-text-secondary"
          >
            {mode === 'login' ? '계정이 없으신가요? 회원가입' : '이미 계정이 있으신가요? 로그인'}
          </button>

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
