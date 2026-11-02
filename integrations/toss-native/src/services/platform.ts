import {fetchAlbumItems,Storage,openURL,setClipboardText} from '@apps-in-toss/framework';
import type {CaptureActionItem} from '../../../../packages/shared/src/utils/capture-actions';
import {safeArchiveUrl} from '../../../../packages/shared/src/utils/capture-archive';
import {createArchiveStore,type SelectedPhoto} from './archive-store';
const ALBUM_PREVIEW_MAX_WIDTH=2048;
export const archiveStore=createArchiveStore(Storage);
export async function pickPhoto():Promise<SelectedPhoto|null> {
  const photos=await fetchAlbumItems({types:['PHOTO'],maxCount:1,maxWidth:ALBUM_PREVIEW_MAX_WIDTH,base64:true});
  return photos[0] ?? null;
}
export async function openSource(url:string):Promise<void> {
  const safe=safeArchiveUrl(url);
  if (!safe) throw new Error('이 링크는 열 수 없습니다.');
  await openURL(safe);
}
export async function executeAction(action:CaptureActionItem):Promise<void> {
  if (action.kind==='phone' && action.href && /^tel:\+?[\d-]+$/.test(action.href)) await openURL(action.href);
  else if(action.href) await openSource(action.href);
  else await setClipboardText(action.value);
}
