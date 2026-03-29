import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { Session, User } from '@supabase/supabase-js';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import { supabase } from '../services/supabase';

WebBrowser.maybeCompleteAuthSession();

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  devSkipLogin: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const googleWebClientId = Constants.expoConfig?.extra?.googleClientId ?? process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;
  const googleIosClientId = Constants.expoConfig?.extra?.googleIosClientId ?? process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

  const [, response, promptAsync] = Google.useIdTokenAuthRequest({
    iosClientId: googleIosClientId,
    clientId: googleWebClientId,
  });

  // Restore session on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Handle Google OAuth response
  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      supabase.auth.signInWithIdToken({
        provider: 'google',
        token: id_token,
      }).catch((err) => {
        Alert.alert('로그인 실패', err.message);
      });
    }
  }, [response]);

  const signInWithGoogle = useCallback(async () => {
    try {
      await promptAsync();
    } catch (err) {
      Alert.alert('로그인 오류', '다시 시도해주세요.');
    }
  }, [promptAsync]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
  }, []);

  const devSkipLogin = useCallback(() => {
    if (!__DEV__) return;
    setSession({ user: { id: 'dev-user', email: 'dev@test.com' } } as unknown as Session);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        isLoading,
        signInWithGoogle,
        signOut,
        devSkipLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
