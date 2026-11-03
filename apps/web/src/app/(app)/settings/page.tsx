'use client';

import { useState } from 'react';
import { getMapLinks, MapProvider } from '@scrave/shared';
import { useUserPreferences } from '@/contexts/UserPreferencesContext';

const NAV_OPTIONS = getMapLinks('preview', null);
const PROVIDER_DOT_CLASS: Record<MapProvider, string> = {
  tmap: 'bg-error',
  naver: 'bg-place-accent',
  google: 'bg-text-accent',
  kakao: 'bg-warning',
};

export default function SettingsPage() {
  const {
    preferences,
    setPreferredNavApp,
    isLoading,
    savingProvider,
    error,
    reload,
  } = useUserPreferences();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSelect = async (provider: MapProvider, label: string) => {
    if (provider === preferences.preferredNavApp || savingProvider) return;
    setSuccessMessage(null);
    const saved = await setPreferredNavApp(provider);
    if (saved) setSuccessMessage(`기본 지도 앱을 ${label}로 저장했습니다.`);
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-extrabold text-text-primary">설정</h1>

      {/* Navigation preference */}
      <section className="mt-8">
        <h2 className="text-lg font-bold text-text-primary">기본 내비게이션 앱</h2>
        <p className="text-sm text-text-secondary mt-1">
          장소에서 지도 앱을 열 때 선택한 앱을 목록 맨 위에 표시합니다.
        </p>

        {isLoading && (
          <p className="mt-4 text-sm text-text-secondary" role="status">
            저장된 설정을 불러오는 중입니다.
          </p>
        )}

        <div className="mt-4 space-y-2" role="radiogroup" aria-label="기본 내비게이션 앱">
          {NAV_OPTIONS.map((option) => {
            const isSelected = preferences.preferredNavApp === option.provider;
            const isSaving = savingProvider === option.provider;
            const isDisabled = isLoading || savingProvider !== null;
            return (
              <button
                key={option.provider}
                type="button"
                role="radio"
                aria-checked={isSelected}
                aria-label={option.label}
                onClick={() => handleSelect(option.provider, option.label)}
                disabled={isDisabled}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors ${
                  isSelected
                    ? 'border-place-accent bg-place-surface text-place-accent'
                    : 'border-border bg-surface text-text-secondary hover:border-border-light hover:text-text-primary'
                }`}
              >
                <span
                  className={`w-2.5 h-2.5 rounded-full ${PROVIDER_DOT_CLASS[option.provider]}`}
                  aria-hidden="true"
                />
                <span className="font-semibold text-sm">{option.label}</span>
                {isSaving && (
                  <span className="ml-auto text-xs font-medium text-text-secondary">저장 중</span>
                )}
                {isSelected && !isSaving && (
                  <span className="ml-auto text-xs font-medium text-place-accent">선택됨</span>
                )}
              </button>
            );
          })}
        </div>

        {error && (
          <div role="alert" className="mt-4 rounded-xl border border-error px-4 py-3 text-sm text-error">
            <p>{error}</p>
            <button
              type="button"
              className="mt-2 min-h-11 font-semibold text-primary"
              onClick={() => { void reload(); }}
            >
              다시 불러오기
            </button>
          </div>
        )}

        {successMessage && (
          <p role="status" className="mt-4 text-sm text-place-accent">
            {successMessage}
          </p>
        )}
      </section>
    </div>
  );
}
