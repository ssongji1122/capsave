import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { isMapProvider, type MapProvider } from '@scrave/shared';
import { getSupabaseClient } from '@/services/supabase';
import { useAuth } from './AuthContext';

interface UserPreferencesContextValue {
  preferredNavApp: MapProvider;
  isLoading: boolean;
  savingProvider: MapProvider | null;
  error: string | null;
  setPreferredNavApp: (provider: MapProvider) => Promise<boolean>;
  reload: () => Promise<void>;
}

const DEFAULT_PROVIDER: MapProvider = 'tmap';
const LOAD_ERROR = '저장된 설정을 불러오지 못했습니다. 현재 T map을 먼저 표시합니다.';
const SAVE_ERROR = '설정을 저장하지 못했습니다. 연결을 확인하고 다시 시도해 주세요.';

const UserPreferencesContext = createContext<UserPreferencesContextValue | null>(null);

export function UserPreferencesProvider({ children }: { children: React.ReactNode }) {
  const [supabase] = useState(() => getSupabaseClient());
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const activeUserIdRef = useRef(userId);
  const loadRequestRef = useRef(0);
  const [preferredNavApp, setPreferredNavAppState] = useState<MapProvider>(DEFAULT_PROVIDER);
  const [isLoading, setIsLoading] = useState(Boolean(userId));
  const [savingProvider, setSavingProvider] = useState<MapProvider | null>(null);
  const [error, setError] = useState<string | null>(null);

  activeUserIdRef.current = userId;

  const reload = useCallback(async () => {
    const requestId = ++loadRequestRef.current;
    setSavingProvider(null);

    if (!userId) {
      setPreferredNavAppState(DEFAULT_PROVIDER);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: loadError } = await supabase
        .from('user_preferences')
        .select('preferred_nav_app')
        .eq('user_id', userId)
        .maybeSingle();

      if (loadError) throw loadError;
      if (requestId !== loadRequestRef.current || activeUserIdRef.current !== userId) return;

      const storedProvider = data?.preferred_nav_app;
      if (storedProvider == null) {
        setPreferredNavAppState(DEFAULT_PROVIDER);
      } else if (isMapProvider(storedProvider)) {
        setPreferredNavAppState(storedProvider);
      } else {
        setPreferredNavAppState(DEFAULT_PROVIDER);
        setError(LOAD_ERROR);
      }
    } catch {
      if (requestId === loadRequestRef.current && activeUserIdRef.current === userId) {
        setPreferredNavAppState(DEFAULT_PROVIDER);
        setError(LOAD_ERROR);
      }
    } finally {
      if (requestId === loadRequestRef.current && activeUserIdRef.current === userId) {
        setIsLoading(false);
      }
    }
  }, [supabase, userId]);

  useEffect(() => {
    void reload();
    return () => {
      loadRequestRef.current += 1;
    };
  }, [reload]);

  const setPreferredNavApp = useCallback(async (provider: MapProvider) => {
    const saveUserId = activeUserIdRef.current;
    if (!saveUserId) {
      setError(SAVE_ERROR);
      return false;
    }

    setSavingProvider(provider);
    setError(null);

    try {
      const { error: saveError } = await supabase
        .from('user_preferences')
        .upsert(
          { user_id: saveUserId, preferred_nav_app: provider },
          { onConflict: 'user_id' }
        );
      if (saveError) throw saveError;
      if (activeUserIdRef.current !== saveUserId) return false;

      setPreferredNavAppState(provider);
      return true;
    } catch {
      if (activeUserIdRef.current === saveUserId) setError(SAVE_ERROR);
      return false;
    } finally {
      if (activeUserIdRef.current === saveUserId) setSavingProvider(null);
    }
  }, [supabase]);

  return (
    <UserPreferencesContext.Provider
      value={{
        preferredNavApp,
        isLoading,
        savingProvider,
        error,
        setPreferredNavApp,
        reload,
      }}
    >
      {children}
    </UserPreferencesContext.Provider>
  );
}

export function useUserPreferences(): UserPreferencesContextValue {
  const context = useContext(UserPreferencesContext);
  if (!context) {
    throw new Error('useUserPreferences must be used within a UserPreferencesProvider');
  }
  return context;
}
