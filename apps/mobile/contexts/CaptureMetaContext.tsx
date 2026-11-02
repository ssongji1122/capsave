import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { File, Paths } from 'expo-file-system';
import { createCaptureMetaStore, type CaptureMetaMap } from '@/services/capture-meta-store';
import { type CaptureUserMeta } from '../../../packages/shared/src/utils/capture-intent';
import { useAuth } from './AuthContext';

type Change = (current: CaptureUserMeta) => CaptureUserMeta;
const Context = createContext<{
  metaMap: CaptureMetaMap;
  ready: boolean;
  error: string | null;
  updateMeta: (id: number, change: Change) => Promise<void>;
} | null>(null);

export function CaptureMetaProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const owner = session?.user.id ?? null;
  const store = useMemo(() => {
    if (!owner) return null;
    const file = new File(Paths.document, `capture-notes-${encodeURIComponent(owner)}.json`);
    return createCaptureMetaStore({
      read: async () => file.exists ? file.text() : null,
      write: async value => { file.write(value); },
    });
  }, [owner]);
  const [loaded, setLoaded] = useState<{ store: typeof store; metaMap: CaptureMetaMap }>({store:null,metaMap:{}});
  const [failure, setFailure] = useState<{ store: typeof store; message: string } | null>(null);
  useEffect(() => {
    let current = true;
    if (store) store.load().then(metaMap => {
      if (current) setLoaded({ store, metaMap });
    }).catch(() => {
      if (current) setFailure({store,message:'기기의 메모를 읽지 못했습니다. 앱을 다시 열어 주십시오.'});
    });
    return () => { current = false; };
  }, [store]);
  const ready = Boolean(store && loaded.store === store);
  return <Context.Provider value={{
    metaMap: ready ? loaded.metaMap : {}, ready,
    error: failure?.store === store ? failure.message : null,
    updateMeta: async (id, change) => {
      if (!store || !ready) throw new Error('메모를 불러온 뒤 다시 시도해 주십시오.');
      const metaMap = await store.update(id, change);
      setLoaded(previous => previous.store === store ? {store,metaMap} : previous);
    },
  }}>{children}</Context.Provider>;
}
export function useCaptureMeta() {
  const value = useContext(Context);
  if (!value) throw new Error('CaptureMetaProvider가 필요합니다.');
  return value;
}
