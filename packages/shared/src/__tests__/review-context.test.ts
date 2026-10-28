import { expect, it } from 'vitest';
import { buildCaptureReviewTopic } from '../utils/review-context';
const ticket={category:'place' as const,title:'서울-세부 왕복 항공권',summary:'',extractedText:'7C2113 7C2114 인천 1 터미널 세부 2 터미널',tags:[],links:[],places:[{name:'인천국제공항',date:'2026-11-05 20:20'},{name:'세부 막탄 국제공항',date:'2026-11-06 00:10'},{name:'세부 막탄 국제공항',date:'2026-11-12 01:20'},{name:'인천국제공항',date:'2026-11-12 06:55'}]};
it('uses departure and arrival needs instead of an airport-wide review',()=>{
 expect(buildCaptureReviewTopic(ticket,0).query).toContain('출국');
 expect(buildCaptureReviewTopic(ticket,1).query).toContain('심야 도착');
 expect(buildCaptureReviewTopic(ticket,2).query).toContain('출국');
 expect(buildCaptureReviewTopic(ticket,3).query).toContain('입국');
 expect(buildCaptureReviewTopic(ticket,1).reason).toContain('도착');
});
it('keeps ordinary place reviews specific to the extracted place',()=>{
 expect(buildCaptureReviewTopic({...ticket,title:'카페',extractedText:'',places:[{name:'오브젝트 성수'}]},0).query).toBe('오브젝트 성수');
});
