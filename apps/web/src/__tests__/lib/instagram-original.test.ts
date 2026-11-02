// @vitest-environment node
import { expect, it, vi } from 'vitest';
import { parseInstagramOriginal, originalMatchesCapture, findInstagramOriginal, readBoundedResponse } from '@/lib/instagram-original';
const capture={sourceAccountId:'seoulpick._',title:'낙산공원 가을 명소',extractedText:'서울 무료 명소 낙산공원 가을',summary:'서울 무료 명소',links:[],places:[{name:'낙산공원'}]};
const html='<a data-log-event="captionProfileClick">seoulpick._</a><div class="Caption">서울 무료 명소 낙산공원 가을<div class="CaptionComments">'+JSON.stringify({is_video:false,display_url:'https://scontent.cdninstagram.com/one.jpg'})+JSON.stringify({is_video:false,display_url:'https://scontent.cdninstagram.com/two.jpg'});
it('extracts ordered image previews only from trusted Instagram CDN hosts',()=>{
 const post=parseInstagramOriginal('https://instagram.com/p/Abcd/',html+JSON.stringify({is_video:false,display_url:'http://127.0.0.1/private.jpg'}));
 expect(post.images).toHaveLength(2);expect(post.author).toBe('seoulpick._');expect(originalMatchesCapture(capture,post)).toBe(true);
});
it('does not confirm account alone or generic café words, and rejects unrelated caption',()=>{
 const post=parseInstagramOriginal('https://instagram.com/p/Abcd/',html);
 expect(originalMatchesCapture({...capture,title:'다른 곳',summary:'',extractedText:'다른 곳',places:[]},post)).toBe(false);
 expect(originalMatchesCapture({...capture,sourceAccountId:'other'},post)).toBe(false);
 expect(originalMatchesCapture({...capture,title:'카페 여행',summary:'',extractedText:'카페 여행',places:[]},{...post,caption:'카페 여행'})).toBe(false);
});
it('finds a known exact post through owned references without searching the web',async()=>{
 const inspect=vi.fn().mockResolvedValue(parseInstagramOriginal('https://instagram.com/p/Abcd/',html));const search=vi.fn();
 const result=await findInstagramOriginal(capture,[{...capture,links:['https://instagram.com/p/Abcd/']}],search,inspect);
 expect(result?.images).toHaveLength(2);expect(search).not.toHaveBeenCalled();expect(inspect).toHaveBeenCalledTimes(1);
});
it('bounds response bytes even without a content-length and rejects oversized bodies',async()=>{
 await expect(readBoundedResponse(new Response('123456'),4)).rejects.toThrow();
});
it('never confirms a search result without caption matching',async()=>{
 const search=vi.fn().mockResolvedValue([{url:'https://instagram.com/p/Other/',title:'서울 무료 명소 낙산공원'}]);
 const inspect=vi.fn().mockResolvedValue({...parseInstagramOriginal('https://instagram.com/p/Other/',html),caption:'부산 바다 야경'});
 expect(await findInstagramOriginal(capture,[],search,inspect)).toBeNull();expect(search).toHaveBeenCalledTimes(1);
});
it('decodes Instagram double-escaped slashes and query ampersands before fetching CDN originals',()=>{
 const encoded=JSON.stringify({is_video:false,display_url:'https:\\/\\/scontent.cdninstagram.com\\/one.jpg?a=1\\u0026b=2'});
 const post=parseInstagramOriginal('https://instagram.com/p/Abcd/',encoded);
 expect(post.images[0].url).toBe('https://scontent.cdninstagram.com/one.jpg?a=1&b=2');
});
