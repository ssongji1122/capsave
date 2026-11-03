import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { buildStoragePath } from './upload-flow';
import { resolveSupabaseConfiguration } from './supabase-config';
import { createResilientAuthStorage } from './auth-storage';

export const supabaseConfiguration = resolveSupabaseConfiguration(
  Constants.expoConfig?.extra ?? {},
  {
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  }
);

const SecureStoreAdapter = createResilientAuthStorage({
  getItem: (key) => SecureStore.getItemAsync(key),
  setItem: (key, value) => SecureStore.setItemAsync(key, value),
  removeItem: (key) => SecureStore.deleteItemAsync(key),
}, () => {
  console.warn('[auth] 보안 저장소를 사용할 수 없어 현재 실행에서만 세션을 유지합니다.');
});

let supabaseClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (supabaseConfiguration.status === 'missing') {
    throw new Error(`Supabase configuration is missing: ${supabaseConfiguration.missingKeys.join(', ')}`);
  }

  supabaseClient ??= createClient(supabaseConfiguration.url, supabaseConfiguration.anonKey, {
    auth: {
      storage: SecureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });

  return supabaseClient;
}

/**
 * 로컬 이미지 URI를 Supabase Storage에 업로드하고 path를 반환한다.
 * path 형식: '{userId}/{timestamp}_{random}.jpg'
 */
export async function uploadImageToStorage(
  localUri: string,
  userId: string
): Promise<string> {
  const path = buildStoragePath(userId);

  const response = await fetch(localUri);
  const blob = await response.blob();

  const { error } = await getSupabaseClient().storage
    .from('captures')
    .upload(path, blob, {
      contentType: 'image/jpeg',
      upsert: false,
    });

  if (error) {
    throw new Error(`이미지 업로드 실패: ${error.message}`);
  }

  return path;
}

export async function deleteImageFromStorage(path: string): Promise<void> {
  if (!path) return;

  const { error } = await getSupabaseClient().storage
    .from('captures')
    .remove([path]);

  if (error) {
    throw new Error(`이미지 삭제 실패: ${error.message}`);
  }
}
