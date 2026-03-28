'use client';

import { getMapLinks, MapProvider } from '@capsave/shared';
import { useUserPreferences } from '@/contexts/UserPreferencesContext';

const NAV_OPTIONS = getMapLinks('preview', null);

export default function SettingsPage() {
  const { preferences, setPreferredNavApp, isLoading } = useUserPreferences();

  const handleSelect = async (provider: MapProvider) => {
    await setPreferredNavApp(provider);
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-extrabold text-text-primary">설정</h1>

      {/* Navigation preference */}
      <section className="mt-8">
        <h2 className="text-lg font-bold text-text-primary">기본 내비게이션 앱</h2>
        <p className="text-sm text-text-secondary mt-1">
          장소 팝업에서 가장 크게 표시될 내비게이션 앱을 선택하세요.
        </p>

        <div className="mt-4 space-y-2">
          {NAV_OPTIONS.map((option) => {
            const isSelected = preferences.preferredNavApp === option.provider;
            return (
              <button
                key={option.provider}
                onClick={() => handleSelect(option.provider)}
                disabled={isLoading}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors ${
                  isSelected
                    ? 'border-place-accent bg-place-surface text-place-accent'
                    : 'border-border bg-surface text-text-secondary hover:border-border-light hover:text-text-primary'
                }`}
              >
                <span className="text-xl">{option.emoji}</span>
                <span className="font-semibold text-sm">{option.label}</span>
                {isSelected && (
                  <span className="ml-auto text-xs font-medium text-place-accent">선택됨</span>
                )}
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
