'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, MapPinPlus, Map as MapIcon } from 'lucide-react';
import { MAX_FREE_CAPTURES } from '@scrave/shared';
import { getRealUserId } from '@/lib/auth-user';
import {
  GUIDE_SAVE_QUERY,
  getGuideSaveLoginPath,
  saveGuideToArchive,
} from '@/lib/guide-save';
import type { PublicGuide } from '@/lib/public-guides';
import { createClient } from '@/lib/supabase/browser';

interface SaveGuideButtonProps {
  guide: PublicGuide;
  className?: string;
  statusClassName?: string;
}

type SaveState =
  | { status: 'checking' }
  | { status: 'signed-out' }
  | { status: 'ready' }
  | { status: 'saving' }
  | { status: 'saved'; captureId: number }
  | { status: 'limit' }
  | { status: 'error' };

const LABEL = '내 지도에 저장';

function consumeSaveQuery(): boolean {
  const params = new URLSearchParams(window.location.search);
  const [key, value] = GUIDE_SAVE_QUERY.split('=');
  if (params.get(key) !== value) return false;

  params.delete(key);
  const search = params.toString();
  window.history.replaceState(
    window.history.state,
    '',
    `${window.location.pathname}${search ? `?${search}` : ''}${window.location.hash}`
  );
  return true;
}

export function SaveGuideButton({
  guide,
  className,
  statusClassName,
}: SaveGuideButtonProps) {
  const [client] = useState(() => createClient());
  const [userId, setUserId] = useState<string | null>(null);
  const [state, setState] = useState<SaveState>({ status: 'checking' });

  const save = useCallback(
    async (id: string) => {
      setState({ status: 'saving' });
      try {
        const result = await saveGuideToArchive(client, guide, id);
        setState(
          result.status === 'limit'
            ? { status: 'limit' }
            : { status: 'saved', captureId: result.captureId }
        );
      } catch (error) {
        console.error('[SaveGuideButton] save failed:', error);
        setState({ status: 'error' });
      }
    },
    [client, guide]
  );

  useEffect(() => {
    let cancelled = false;
    client.auth.getUser().then(({ data }: { data: { user: { id?: string | null } | null } }) => {
      if (cancelled) return;
      const id = getRealUserId(data.user);
      setUserId(id);
      if (!id) {
        setState({ status: 'signed-out' });
        return;
      }
      if (consumeSaveQuery()) {
        void save(id);
        return;
      }
      setState({ status: 'ready' });
    });
    return () => {
      cancelled = true;
    };
  }, [client, save]);

  if (state.status === 'saved') {
    return (
      <a href={`/map?capture=${state.captureId}`} className={className}>
        <Check size={16} aria-hidden="true" />
        저장됨 · 지도에서 보기
      </a>
    );
  }

  if (state.status === 'signed-out') {
    return (
      <a href={getGuideSaveLoginPath(guide.slug)} className={className}>
        <MapPinPlus size={16} aria-hidden="true" />
        {LABEL}
      </a>
    );
  }

  return (
    <>
      <button
        type="button"
        className={className}
        disabled={state.status === 'checking' || state.status === 'saving'}
        onClick={() => userId && save(userId)}
      >
        {state.status === 'saving' ? (
          <MapIcon size={16} aria-hidden="true" />
        ) : (
          <MapPinPlus size={16} aria-hidden="true" />
        )}
        {state.status === 'saving' ? '저장 중' : state.status === 'error' ? '다시 저장' : LABEL}
      </button>
      {(state.status === 'limit' || state.status === 'error') && (
        <span role="status" className={statusClassName}>
          {state.status === 'limit'
            ? `무료 플랜 저장 한도(${MAX_FREE_CAPTURES}개)가 찼습니다. 오래된 캡처를 정리한 뒤 다시 눌러 주세요.`
            : '저장하지 못했습니다. 잠시 뒤 다시 눌러 주세요.'}
        </span>
      )}
    </>
  );
}
