import { listMobileGuides, loadMobileGuide } from '../guides';
const response=(body:unknown,status=200)=>({ok:status===200,status,json:async()=>body}) as Response;
it('lists saved guides with the existing bearer session',async()=>{
 const fetchImpl=jest.fn().mockResolvedValue(response({guides:[{id:'g1',title:'성수 산책'}]}));
 expect(await listMobileGuides({serverUrl:'https://scrave.vercel.app/',getToken:async()=>'test-token',fetchImpl})).toEqual([{id:'g1',title:'성수 산책'}]);
 expect(fetchImpl).toHaveBeenCalledWith('https://scrave.vercel.app/api/guides',{headers:{Authorization:'Bearer test-token'}});
});
it('does not request private guides without a session and reports missing guides',async()=>{
 const fetchImpl=jest.fn().mockResolvedValue(response({},404));
 await expect(listMobileGuides({serverUrl:'https://scrave.vercel.app',getToken:async()=>null,fetchImpl})).rejects.toThrow();
 expect(fetchImpl).not.toHaveBeenCalled();
 await expect(loadMobileGuide('g1',{serverUrl:'https://scrave.vercel.app',getToken:async()=>'test-token',fetchImpl})).rejects.toThrow('가이드를 찾을 수 없습니다.');
});
