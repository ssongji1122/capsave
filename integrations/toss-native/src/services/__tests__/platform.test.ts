import {fetchAlbumItems,openURL,setClipboardText} from '@apps-in-toss/framework';
import {pickPhoto,executeAction,openSource} from '../platform';
jest.mock('@apps-in-toss/framework',()=>({fetchAlbumItems:jest.fn(),openURL:jest.fn(),setClipboardText:jest.fn(),Storage:{getItem:jest.fn(),setItem:jest.fn()}}));
beforeEach(()=>jest.clearAllMocks());
it('requests a single retained photo instead of a temporary file reference',async()=>{
 (fetchAlbumItems as jest.Mock).mockResolvedValue([{id:'one',type:'PHOTO',dataUri:'/9j/dGVzdA=='}]);
 expect((await pickPhoto())?.id).toBe('one');
 expect(fetchAlbumItems).toHaveBeenCalledWith({types:['PHOTO'],maxCount:1,maxWidth:2048,base64:true});
 (fetchAlbumItems as jest.Mock).mockResolvedValue([]);expect(await pickPhoto()).toBeNull();
});
it('copies through Toss and passes bridge rejection back to the UI',async()=>{
 const action={id:'code:1',label:'예약번호',kind:'reservation_code' as const,value:'AB12345'};
 await executeAction(action);expect(setClipboardText).toHaveBeenCalledWith('AB12345');expect(openURL).not.toHaveBeenCalled();
 (setClipboardText as unknown as jest.Mock).mockRejectedValueOnce(new Error('permission'));
 await expect(executeAction(action)).rejects.toThrow('permission');
});
it('opens safe web and phone links and rejects executable links',async()=>{
 await openSource('https://example.com/trip');expect(openURL).toHaveBeenCalledWith('https://example.com/trip');
 await executeAction({id:'phone:1',label:'전화',kind:'phone',value:'02-123-4567',href:'tel:021234567'});
 expect(openURL).toHaveBeenCalledWith('tel:021234567');
 await expect(openSource('javascript:alert(1)')).rejects.toThrow();
 await expect(executeAction({id:'link:1',label:'링크',kind:'link',value:'x',href:'file:///private'})).rejects.toThrow();
 expect(openURL).toHaveBeenCalledTimes(2);
});
