import { createCaptureMetaStore } from '../capture-meta-store';
import { EMPTY_CAPTURE_META } from '../../../../packages/shared/src/utils/capture-intent';
describe('native metadata durability', () => {
  it('serializes concurrent updates and reloads notes and completion', async () => {
    let disk: string | null = null;
    const file = { read: async () => disk, write: async (value:string) => {disk=value;} };
    const store = createCaptureMetaStore(file);
    await store.load();
    await Promise.all([
      store.update(7, m => ({...m,note:'다음 작업에 참고'})),
      store.update(7, m => ({...m,completedActions:[...m.completedActions,'phone:02-123-4567']})),
    ]);
    const reopened = createCaptureMetaStore(file);
    expect((await reopened.load())[7]).toMatchObject({note:'다음 작업에 참고',completedActions:['phone:02-123-4567']});
    expect((await reopened.update(8,m=>({...m,pinnedToTravelPack:true})))[7].note).toBe('다음 작업에 참고');
  });
  it('rejects broken data without writing over it and reports write failure', async () => {
    const write = jest.fn().mockRejectedValue(new Error('disk full'));
    const store = createCaptureMetaStore({read:async()=>'{broken',write});
    await expect(store.load()).rejects.toThrow();
    expect(write).not.toHaveBeenCalled();
    const clean = createCaptureMetaStore({read:async()=>null,write});
    await expect(clean.update(1,()=>({...EMPTY_CAPTURE_META,note:'메모'}))).rejects.toThrow('disk full');
    expect(await clean.load()).toEqual({});
  });
  it('keeps account files independent and validates stored metadata', async () => {
    const one = createCaptureMetaStore({read:async()=>JSON.stringify({'scrave.capture-meta.v1.1':JSON.stringify({version:1,meta:{note:4,reasons:['bad']}})}),write:async()=>{}});
    expect((await one.load())[1]).toMatchObject(EMPTY_CAPTURE_META);
    const other = createCaptureMetaStore({read:async()=>null,write:async()=>{}});
    expect(await other.load()).toEqual({});
  });
});
