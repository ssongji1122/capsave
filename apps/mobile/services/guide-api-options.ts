import { getSupabaseClient } from './supabase';
import type { MobileGuideApiOptions } from './guides';
import { getMobileServerUrl } from './server-url';

export const guideApiOptions: MobileGuideApiOptions = {
  serverUrl: getMobileServerUrl(),
  getToken: async () => {
    const {data}=await getSupabaseClient().auth.getSession();
    return data.session?.access_token ?? null;
  },
};
