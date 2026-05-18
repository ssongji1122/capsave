'use client';

import Link from 'next/link';
import { OAuthButtons } from '@/components/auth/OAuthButtons';

export default function LoginForm() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-extrabold text-primary text-center mb-2">Scrave</h1>
        <p className="text-text-secondary text-center text-sm mb-8">AI 캡처 오거나이저</p>

        <OAuthButtons />

        <p className="text-text-tertiary text-center text-xs mt-6">
          소셜 계정으로 로그인하면 자동으로 계정이 생성됩니다.
        </p>

        <Link
          href="/"
          className="block w-full mt-8 text-center text-sm text-text-tertiary hover:text-primary transition-colors"
        >
          ← 체험하기
        </Link>
      </div>
    </div>
  );
}
