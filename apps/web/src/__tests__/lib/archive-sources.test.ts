import { expect, it } from 'vitest';
import { parseArchiveSourceFeed } from '@/lib/archive-sources';
it('only returns relevant safe source candidates, never verified claims', () => {
 const xml='<rss><item><title>무선 이어폰 상품</title><link>https://example.com/product</link></item><item><title>무선 이어폰</title><link>javascript:bad</link></item><item><title>축구</title><link>https://noise.test</link></item></rss>';
 expect(parseArchiveSourceFeed(xml,'무선 이어폰')).toEqual([{title:'무선 이어폰 상품',url:'https://example.com/product',status:'candidate'}]);
});
it('decodes RSS XML and deduplicates results', () => {
 const xml='<item><title>A &amp; B 카페</title><link>https://example.com/?a=1&amp;b=2</link></item>'.repeat(8);
 expect(parseArchiveSourceFeed(xml,'카페')).toHaveLength(1);
});

it('rejects live-search noise matching only the broad city name in a ticket query', () => {
 const xml = '<rss><item><title>삶의 질 특별시 서울 | 서울특별시</title><link>https://www.seoul.go.kr/main/index.jsp</link></item><item><title>서울 세부 항공권 예약 안내</title><link>https://example.com/flights</link></item></rss>';
 expect(parseArchiveSourceFeed(xml, '서울-세부 왕복 항공권 예약 상세')).toEqual([{title:'서울 세부 항공권 예약 안내',url:'https://example.com/flights',status:'candidate'}]);
});
it('does not count repeated query words as independent matches', () => {
 const xml = '<item><title>서울시 안내</title><link>https://www.seoul.go.kr/</link></item>';
 expect(parseArchiveSourceFeed(xml, '서울 서울 항공권')).toEqual([]);
});
