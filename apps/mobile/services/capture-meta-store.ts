import {
  CAPTURE_META_STORAGE_PREFIX, EMPTY_CAPTURE_META, getCaptureMeta, saveCaptureMeta,
  type CaptureUserMeta,
} from '../../../packages/shared/src/utils/capture-intent';

export interface CaptureMetaFile {
  read(): Promise<string | null>;
  write(value: string): Promise<void>;
}
export type CaptureMetaMap = Record<number, CaptureUserMeta>;

export function createCaptureMetaStore(file: CaptureMetaFile) {
  let entries: Record<string, string> | undefined;
  let queue: Promise<unknown> = Promise.resolve();
  const snapshot = (): CaptureMetaMap => Object.fromEntries(
    Object.keys(entries ?? {}).filter(key => key.startsWith(CAPTURE_META_STORAGE_PREFIX))
      .map(key => Number(key.slice(CAPTURE_META_STORAGE_PREFIX.length)))
      .filter(id => Number.isSafeInteger(id) && id > 0)
      .map(id => [id, getCaptureMeta({ getItem: key => entries?.[key] ?? null }, id)]),
  );
  const load = async (): Promise<CaptureMetaMap> => {
    if (!entries) {
      const raw = await file.read();
      const parsed: unknown = raw === null ? {} : JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) ||
          !Object.values(parsed).every(value => typeof value === 'string')) {
        throw new Error('저장된 메모 파일을 읽지 못했습니다.');
      }
      entries = parsed as Record<string, string>;
    }
    return snapshot();
  };
  return {
    load,
    update(id: number, change: (current: CaptureUserMeta) => CaptureUserMeta): Promise<CaptureMetaMap> {
      const operation = queue.then(async () => {
        const previous = await load();
        const next = { ...entries };
        const storage = { setItem: (key: string, value: string) => { next[key] = value; } };
        if (!saveCaptureMeta(storage, id, change(previous[id] ?? EMPTY_CAPTURE_META))) {
          throw new Error('메모를 저장하지 못했습니다.');
        }
        await file.write(JSON.stringify(next));
        entries = next;
        return snapshot();
      });
      queue = operation.catch(() => undefined);
      return operation;
    },
  };
}
