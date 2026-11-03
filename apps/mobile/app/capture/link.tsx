import React from 'react';

import { SocialLinkCapture } from '@/components/SocialLinkCapture';
import { useAuth } from '@/contexts/AuthContext';
import { useCaptures } from '@/contexts/CapturesContext';
import {
  inspectMobileSocialLink,
  saveMobileSocialLinkCaptures,
  uploadMobileSocialLinkImage,
  type MobileSocialLinkCapture,
} from '@/services/social-link-intake';
import { deleteImageFromStorage, getSupabaseClient } from '@/services/supabase';
import { getMobileServerUrl } from '@/services/server-url';

async function getToken(): Promise<string | null> {
  const { data } = await getSupabaseClient().auth.getSession();
  return data.session?.access_token ?? null;
}

export default function SocialLinkCaptureScreen() {
  const { session } = useAuth();
  const { refresh, saveCapture } = useCaptures();
  const apiOptions = { serverUrl: getMobileServerUrl(), getToken };

  const inspect = (url: string) => inspectMobileSocialLink(url, apiOptions);

  const saveAll = async (captures: MobileSocialLinkCapture[], completed: number) => {
    const userId = session?.user.id;
    if (!userId) throw new Error('로그인한 뒤 링크를 저장할 수 있습니다.');

    try {
      return await saveMobileSocialLinkCaptures(captures, completed, {
        upload: (capture) => uploadMobileSocialLinkImage(
          capture.imageUrl,
          userId,
          apiOptions,
        ),
        save: saveCapture,
        cleanup: deleteImageFromStorage,
      });
    } finally {
      await refresh();
    }
  };

  return <SocialLinkCapture inspect={inspect} saveAll={saveAll} />;
}
