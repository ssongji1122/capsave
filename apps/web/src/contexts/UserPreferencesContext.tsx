'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { isMapProvider, type MapProvider } from '@scrave/shared';
import { createClient } from '@/lib/supabase/browser';

interface UserPreferences {
  preferredNavApp: MapProvider;
}

interface UserPreferencesContextValue {
  preferences: UserPreferences;
  setPreferredNavApp: (provider: MapProvider) => Promise<boolean>;
  isLoading: boolean;
  savingProvider: MapProvider | null;
  error: string | null;
  reload: () => Promise<void>;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  preferredNavApp: 'tmap',
};
const LOAD_ERROR = '저장된 설정을 불러오지 못했습니다. 현재 T map을 먼저 표시합니다.';
const SAVE_ERROR = '설정을 저장하지 못했습니다. 연결을 확인하고 다시 시도해 주세요.';

const UserPreferencesContext = createContext<UserPreferencesContextValue | null>(null);

export function UserPreferencesProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [isLoading, setIsLoading] = useState(true);
  const [savingProvider, setSavingProvider] = useState<MapProvider | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [client] = useState(() => createClient());

  const reload = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data: { user } } = await client.auth.getUser();
      if (!user) {
        setPreferences(DEFAULT_PREFERENCES);
        return;
      }

      const { data, error: loadError } = await client
        .from('user_preferences')
        .select('preferred_nav_app')
        .eq('user_id', user.id)
        .maybeSingle();

      if (loadError) throw loadError;

      const storedProvider = data?.preferred_nav_app;
      if (storedProvider == null) {
        setPreferences(DEFAULT_PREFERENCES);
      } else if (isMapProvider(storedProvider)) {
        setPreferences({ preferredNavApp: storedProvider });
      } else {
        setPreferences(DEFAULT_PREFERENCES);
        setError(LOAD_ERROR);
      }
    } catch {
      setPreferences(DEFAULT_PREFERENCES);
      setError(LOAD_ERROR);
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const setPreferredNavApp = useCallback(async (provider: MapProvider) => {
    setSavingProvider(provider);
    setError(null);

    try {
      const { data: { user } } = await client.auth.getUser();
      if (!user) {
        setError(SAVE_ERROR);
        return false;
      }

      const { error: saveError } = await client
        .from('user_preferences')
        .upsert({ user_id: user.id, preferred_nav_app: provider }, { onConflict: 'user_id' });
      if (saveError) throw saveError;

      setPreferences((prev) => ({ ...prev, preferredNavApp: provider }));
      return true;
    } catch {
      setError(SAVE_ERROR);
      return false;
    } finally {
      setSavingProvider(null);
    }
  }, [client]);

  return (
    <UserPreferencesContext.Provider
      value={{
        preferences,
        setPreferredNavApp,
        isLoading,
        savingProvider,
        error,
        reload,
      }}
    >
      {children}
    </UserPreferencesContext.Provider>
  );
}

export function useUserPreferences() {
  const context = useContext(UserPreferencesContext);
  if (!context) {
    throw new Error('useUserPreferences must be used within a UserPreferencesProvider');
  }
  return context;
}
