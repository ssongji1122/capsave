'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/browser';

export function OAuthButtons() {
  const [loading, setLoading] = useState<string | null>(null);
  const supabase = createClient();

  const handleOAuth = async (provider: 'kakao' | 'google') => {
    setLoading(provider);
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        ...(provider === 'kakao' && { scopes: 'profile_nickname profile_image' }),
      },
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <button
        onClick={() => handleOAuth('kakao')}
        disabled={loading !== null}
        className="w-full py-3 rounded-xl font-bold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        style={{ backgroundColor: '#FEE500', color: '#191919' }}
      >
        {loading === 'kakao' ? (
          '연결 중...'
        ) : (
          <>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M9 1C4.58 1 1 3.79 1 7.21c0 2.17 1.45 4.08 3.63 5.18l-.93 3.41c-.08.3.26.54.52.37l4.07-2.68c.23.02.47.03.71.03 4.42 0 8-2.79 8-6.22S13.42 1 9 1z" fill="#191919"/>
            </svg>
            카카오로 시작하기
          </>
        )}
      </button>

      <button
        onClick={() => handleOAuth('google')}
        disabled={loading !== null}
        className="w-full py-3 rounded-xl font-bold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2 bg-white text-gray-800 border border-gray-300 hover:bg-gray-50"
      >
        {loading === 'google' ? (
          '연결 중...'
        ) : (
          <>
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
              <path d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            Google로 시작하기
          </>
        )}
      </button>
    </div>
  );
}
