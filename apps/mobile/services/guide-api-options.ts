import Constants from 'expo-constants';
import { supabase } from './supabase';
import type { MobileGuideApiOptions } from './guides';

export const guideApiOptions: MobileGuideApiOptions = {
  serverUrl: (Constants.expoConfig?.extra?.serverUrl as string | undefined) || process.env.EXPO_PUBLIC_API_URL || 'https://scrave.vercel.app',
  getToken: async () => {
    const {data}=await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  },
};
