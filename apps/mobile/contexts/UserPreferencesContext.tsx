import React, { createContext, useContext, useEffect, useState } from 'react';
import type { MapProvider } from '@scrave/shared';
import { supabase } from '@/services/supabase';
import { useAuth } from './AuthContext';

interface UserPreferences {
  preferredNavApp: MapProvider;
}

const DEFAULT: UserPreferences = { preferredNavApp: 'tmap' };

const UserPreferencesContext = createContext<UserPreferences>(DEFAULT);

export function UserPreferencesProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const [prefs, setPrefs] = useState<UserPreferences>(DEFAULT);

  useEffect(() => {
    if (!session) {
      setPrefs(DEFAULT);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase
          .from('user_preferences')
          .select('preferred_nav_app')
          .eq('user_id', session.user.id)
          .maybeSingle();
        if (cancelled || !data?.preferred_nav_app) return;
        setPrefs({ preferredNavApp: data.preferred_nav_app as MapProvider });
      } catch {
        // Network or table missing — keep defaults so map ActionSheet still works.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.user.id]);

  return (
    <UserPreferencesContext.Provider value={prefs}>
      {children}
    </UserPreferencesContext.Provider>
  );
}

export function useUserPreferences(): UserPreferences {
  return useContext(UserPreferencesContext);
}
