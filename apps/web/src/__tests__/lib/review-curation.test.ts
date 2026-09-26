import { describe, expect, it } from 'vitest';
import {
  getPlaceMatchKeys,
  getVoiceFlags,
  isFaceHeavy,
  parseIsoDuration,
  rankVideoCandidates,
  screenNaverPost,
  type YoutubeVideoInput,
} from '@/lib/review-curation';

const TODAY = new Date('2026-09-26T00:00:00Z');

describe('getPlaceMatchKeys', () => {
  it('keeps the full name and its first distinctive word', () => {
    expect(getPlaceMatchKeys('Anantara Uluwatu Bali Resort')).toEqual([
      'anantara uluwatu bali resort',
      'anantara',
    ]);
    expect(getPlaceMatchKeys('The Istana')).toEqual(['the istana', 'istana']);
  });

  it('skips generic and one-letter words in Korean too', () => {
    expect(getPlaceMatchKeys('더 웅아산 클리프탑 리조트')).toEqual([
      '더 웅아산 클리프탑 리조트',
      '웅아산',
    ]);
  });

  it('does not match another hotel in the same area', () => {
    expect(
      screenNaverPost(
        {
          title: '울루와뚜 르네상스 후기',
          description: '',
          link: 'https://blog.naver.com/e/5',
          bloggername: 'e',
          postdate: '20260801',
        },
        getPlaceMatchKeys('아난타라 울루와뚜'),
        TODAY
      )
    ).toBeNull();
  });
});

describe('screenNaverPost', () => {
  const keys = getPlaceMatchKeys('아난타라 울루와뚜');

  it('drops sponsored posts', () => {
    expect(
      screenNaverPost(
        {
          title: '아난타라 울루와뚜 후기',
          description: '업체로부터 숙박을 제공받아 작성했습니다',
          link: 'https://blog.naver.com/a/1',
          bloggername: 'a',
          postdate: '20260801',
        },
        keys,
        TODAY
      )
    ).toBeNull();
  });

  it('drops posts about a different place', () => {
    expect(
      screenNaverPost(
        {
          title: '발리 쿠타 포포인츠 후기',
          description: '쿠타 해변 근처',
          link: 'https://blog.naver.com/b/2',
          bloggername: 'b',
          postdate: '20260801',
        },
        keys,
        TODAY
      )
    ).toBeNull();
  });

  it('scores recent paid-by-me posts with price, companion, and downside', () => {
    const post = screenNaverPost(
      {
        title: '<b>아난타라</b> 울루와뚜 내돈내산 후기',
        description: '남편이랑 오션뷰 스위트 1박 52만원, 계단이 많아 아쉬웠어요 &amp; 조식은 좋았어요',
        link: 'https://blog.naver.com/c/3',
        bloggername: 'c',
        postdate: '20260801',
      },
      keys,
      TODAY
    );

    expect(post).toMatchObject({
      title: '아난타라 울루와뚜 내돈내산 후기',
      url: 'https://blog.naver.com/c/3',
      blogger: 'c',
      date: '2026-08-01',
      excerpt: '남편이랑 오션뷰 스위트 1박 52만원, 계단이 많아 아쉬웠어요 & 조식은 좋았어요',
    });
    expect(post?.reasons).toEqual([
      '2026년 8월 작성',
      '내돈내산',
      '가격',
      '커플·부부',
      '시설·환경',
      '아쉬운 점',
    ]);
    expect(post?.score).toBe(3 + 2 + 1 + 1 + 1 + 2 + 2);
  });

  it('pushes posts older than two years down', () => {
    const post = screenNaverPost(
      {
        title: '아난타라 울루와뚜',
        description: '',
        link: 'https://blog.naver.com/d/4',
        bloggername: 'd',
        postdate: '20230101',
      },
      keys,
      TODAY
    );
    expect(post?.score).toBe(-2 + 2);
  });
});

describe('parseIsoDuration', () => {
  it('reads YouTube durations', () => {
    expect(parseIsoDuration('PT7M33S')).toBe(453);
    expect(parseIsoDuration('PT1H2M')).toBe(3720);
    expect(parseIsoDuration('bad')).toBe(0);
  });
});

describe('getVoiceFlags', () => {
  it('flags mass-produced channels', () => {
    expect(getVoiceFlags('', { videoCount: 1200, subscriberCount: 1500 })).toEqual([
      '대량 생산 채널(영상 1,200개·구독 1,500명)',
    ]);
  });

  it('keeps big channels with many subscribers', () => {
    expect(getVoiceFlags('', { videoCount: 1200, subscriberCount: 90000 })).toEqual([]);
  });

  it('flags affiliate booking templates in the description', () => {
    expect(getVoiceFlags('Hotel Address: Jl. Pemutih\nagoda.com/partners/x', { videoCount: 10, subscriberCount: 10 })).toEqual([
      '제휴 예약 템플릿 설명란',
    ]);
  });

  it('does not judge hidden subscriber counts', () => {
    expect(getVoiceFlags('', { videoCount: 5000, subscriberCount: null })).toEqual([]);
  });
});

describe('isFaceHeavy', () => {
  it('needs people in two of the three scenes', () => {
    expect(isFaceHeavy([true, true, false])).toBe(true);
    expect(isFaceHeavy([true, false, false])).toBe(false);
  });
});

describe('rankVideoCandidates', () => {
  const keys = getPlaceMatchKeys('Anantara Uluwatu');
  const base: YoutubeVideoInput = {
    id: 'aaaaaaaaaaa',
    title: 'Anantara Uluwatu resort tour',
    channelTitle: 'Traveler',
    description: '',
    publishedAt: '2026-03-01T00:00:00Z',
    duration: 'PT8M',
    viewCount: 5000,
    channel: { videoCount: 40, subscriberCount: 12000 },
  };

  it('drops unrelated, too short, and AI-voice channel videos with reasons', () => {
    const { candidates, dropped } = rankVideoCandidates(
      [
        base,
        { ...base, id: 'bbbbbbbbbbb', title: 'Bali food tour' },
        { ...base, id: 'ccccccccccc', duration: 'PT45S' },
        { ...base, id: 'ddddddddddd', channel: { videoCount: 2000, subscriberCount: 800 } },
      ],
      keys,
      TODAY
    );

    expect(candidates.map((video) => video.id)).toEqual(['aaaaaaaaaaa']);
    expect(dropped).toEqual([
      expect.objectContaining({
        id: 'ddddddddddd',
        reasons: ['대량 생산 채널(영상 2,000개·구독 800명)'],
      }),
    ]);
  });

  it('puts recent Korean videos first', () => {
    const { candidates } = rankVideoCandidates(
      [
        { ...base, id: 'old00000000', publishedAt: '2023-01-01T00:00:00Z' },
        { ...base, id: 'korean00000', title: '아난타라 Anantara Uluwatu 룸투어' },
        base,
      ],
      keys,
      TODAY
    );

    expect(candidates.map((video) => video.id)).toEqual([
      'korean00000',
      'aaaaaaaaaaa',
      'old00000000',
    ]);
    expect(candidates[0]).toMatchObject({ length: '8:00', published: '2026-03-01' });
  });
});
