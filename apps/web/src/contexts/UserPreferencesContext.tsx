'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { MapProvider } from '@scrave/shared';
import { createClient } from '@/lib/supabase/browser';

interface UserPreferences {
  preferredNavApp: MapProvider;
}

interface UserPreferencesContextValue {
  preferences: UserPreferences;
  setPreferredNavApp: (provider: MapProvider) => Promise<void>;
  isLoading: boolean;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  preferredNavApp: 'tmap',
};

const UserPreferencesContext = createContext<UserPreferencesContextValue | null>(null);

export function UserPreferencesProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [isLoading, setIsLoading] = useState(true);
  const [client] = useState(() => createClient());

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const { data: { user } } = await client.auth.getUser();
      if (!user) { setIsLoading(false); return; }

      const { data } = await client
        .from('user_preferences')
        .select('preferred_nav_app')
        .eq('user_id', user.id)
        .single();

      if (data?.preferred_nav_app) {
        setPreferences({ preferredNavApp: data.preferred_nav_app as MapProvider });
      }
    } catch {
      // No preferences yet — use defaults
    } finally {
      setIsLoading(false);
    }
  };

  const setPreferredNavApp = useCallback(async (provider: MapProvider) => {
    const { data: { user } } = await client.auth.getUser();
    if (!user) return;

    await client
      .from('user_preferences')
      .upsert({ user_id: user.id, preferred_nav_app: provider }, { onConflict: 'user_id' });

    setPreferences((prev) => ({ ...prev, preferredNavApp: provider }));
  }, [client]);

  return (
    <UserPreferencesContext.Provider value={{ preferences, setPreferredNavApp, isLoading }}>
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
