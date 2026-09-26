// Review and video picking rules ported from the studio.soluta Scrave tool
// (projects/scrave/preferences.json). Titles are never used to judge AI voices;
// only channel statistics and description templates are.

export const NAVER_REVIEW_RULES = {
  sponsorWords: ['협찬', '원고료', '소정의', '제공받아', '제공 받아', '지원받아', '체험단', '업체로부터'],
  preferWithinYears: 2,
  bonusWords: {
    내돈내산: ['내돈내산', '직접 결제', '직접 예약'],
    가격: ['만원', '만 원', '원에', '루피아', 'IDR', '1박'],
    '커플·부부': ['남친', '남자친구', '신혼', '커플', '둘이', '남편', '와이프'],
    '시설·환경': ['수영장', '풀빌라', '객실', '오션뷰', '뷰', '조식', '스파', '해변', '정원'],
    '아쉬운 점': ['아쉬', '단점', '불편'],
  } as Record<string, string[]>,
  strongBonus: ['내돈내산', '아쉬운 점'],
  keep: 3,
};

export const YOUTUBE_VIDEO_RULES = {
  preferWithinMonths: 24,
  minSeconds: 90,
  maxSeconds: 3600,
  massChannel: { minVideos: 800, subsPerVideoBelow: 2, subsFloor: 3000 },
  affiliateTemplate: ['Star Category', 'Hotel category', 'Hotel Address', 'agoda.com/partners', 'Booking details'],
  keep: 3,
};

const GENERIC_PLACE_WORDS = new Set([
  'the', 'and', 'by', 'of', 'at', 'bali', 'resort', 'hotel', 'spa', 'villa', 'villas',
  'cafe', 'restaurant', 'beach', 'club', 'bar',
  '발리', '리조트', '호텔', '스파', '빌라', '카페', '레스토랑', '식당', '해변', '비치', '클럽',
]);

const KOREAN = /[가-힣]/;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface NaverBlogItem {
  title: string;
  description: string;
  link: string;
  bloggername: string;
  postdate: string;
}

export interface CuratedNaverPost {
  title: string;
  url: string;
  blogger: string;
  date: string | null;
  excerpt: string;
  score: number;
  reasons: string[];
}

export interface ChannelStats {
  videoCount: number;
  subscriberCount: number | null;
}

export interface YoutubeVideoInput {
  id: string;
  title: string;
  channelTitle: string;
  description: string;
  publishedAt: string;
  duration: string;
  viewCount: number;
  channel: ChannelStats;
}

export interface CuratedVideo {
  id: string;
  title: string;
  channelTitle: string;
  published: string;
  length: string;
  viewCount: number;
  score: number;
  url: string;
  thumbnailUrl: string;
}

export interface DroppedVideo {
  id: string;
  title: string;
  channelTitle: string;
  url: string;
  reasons: string[];
}

export function getPlaceMatchKeys(name: string): string[] {
  const full = name.trim().toLowerCase();
  const brand = full
    .split(/[\s,·&()\-–]+/)
    .find((word) => word.length >= 2 && !GENERIC_PLACE_WORDS.has(word));
  return brand && brand !== full ? [full, brand] : [full];
}

function matchesPlace(text: string, keys: string[]): boolean {
  const lower = text.toLowerCase();
  return keys.some((key) => lower.includes(key));
}

function cleanNaverText(value: string): string {
  return value
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .trim();
}

function parsePostDate(value: string): Date | null {
  const match = /^(\d{4})(\d{2})(\d{2})$/.exec(value);
  return match ? new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))) : null;
}

export function screenNaverPost(
  item: NaverBlogItem,
  keys: string[],
  today: Date,
): CuratedNaverPost | null {
  const title = cleanNaverText(item.title);
  const excerpt = cleanNaverText(item.description);
  const text = `${title} ${excerpt}`;

  if (!matchesPlace(text, keys)) return null;
  if (NAVER_REVIEW_RULES.sponsorWords.some((word) => text.includes(word))) return null;

  const postedAt = parsePostDate(item.postdate);
  let score = 0;
  const reasons: string[] = [];

  if (postedAt) {
    const years = (today.getTime() - postedAt.getTime()) / DAY_MS / 365;
    if (years <= 1) {
      score += 3;
      reasons.push(`${postedAt.getUTCFullYear()}년 ${postedAt.getUTCMonth() + 1}월 작성`);
    } else if (years <= NAVER_REVIEW_RULES.preferWithinYears) {
      score += 1;
      reasons.push(`${postedAt.getUTCFullYear()}년 작성`);
    } else {
      score -= 2;
    }
  }

  for (const [label, words] of Object.entries(NAVER_REVIEW_RULES.bonusWords)) {
    if (words.some((word) => text.includes(word))) {
      score += NAVER_REVIEW_RULES.strongBonus.includes(label) ? 2 : 1;
      reasons.push(label);
    }
  }

  if (matchesPlace(title, keys)) score += 2;

  return {
    title,
    url: item.link,
    blogger: item.bloggername,
    date: postedAt ? postedAt.toISOString().slice(0, 10) : null,
    excerpt,
    score,
    reasons,
  };
}

export function parseIsoDuration(value: string): number {
  const match = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(value);
  if (!match) return 0;
  const [days, hours, minutes, seconds] = match.slice(1).map((part) => Number(part ?? 0));
  return days * 86400 + hours * 3600 + minutes * 60 + seconds;
}

function formatLength(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return hours ? `${hours}:${String(minutes).padStart(2, '0')}:${seconds}` : `${minutes}:${seconds}`;
}

export function getVoiceFlags(description: string, channel: ChannelStats): string[] {
  const flags: string[] = [];
  const { minVideos, subsPerVideoBelow, subsFloor } = YOUTUBE_VIDEO_RULES.massChannel;
  const { videoCount, subscriberCount } = channel;

  if (
    subscriberCount !== null &&
    videoCount >= minVideos &&
    subscriberCount < Math.max(subsFloor, videoCount * subsPerVideoBelow)
  ) {
    flags.push(
      `대량 생산 채널(영상 ${videoCount.toLocaleString('en-US')}개·구독 ${subscriberCount.toLocaleString('en-US')}명)`
    );
  }

  const lowerDescription = description.toLowerCase();
  if (YOUTUBE_VIDEO_RULES.affiliateTemplate.some((word) => lowerDescription.includes(word.toLowerCase()))) {
    flags.push('제휴 예약 템플릿 설명란');
  }

  return flags;
}

// A video is face-heavy when people fill the frame in two of its three scenes (25/50/75%).
export function isFaceHeavy(sceneHasPeople: boolean[]): boolean {
  return sceneHasPeople.filter(Boolean).length >= 2;
}

export function getYoutubeWatchUrl(id: string): string {
  return `https://www.youtube.com/watch?v=${id}`;
}

export function rankVideoCandidates(
  videos: YoutubeVideoInput[],
  keys: string[],
  now: Date,
): { candidates: CuratedVideo[]; dropped: DroppedVideo[] } {
  const candidates: CuratedVideo[] = [];
  const dropped: DroppedVideo[] = [];

  for (const video of videos) {
    if (!matchesPlace(video.title, keys)) continue;

    const seconds = parseIsoDuration(video.duration);
    if (seconds < YOUTUBE_VIDEO_RULES.minSeconds || seconds > YOUTUBE_VIDEO_RULES.maxSeconds) continue;

    const url = getYoutubeWatchUrl(video.id);
    const flags = getVoiceFlags(video.description, video.channel);
    if (flags.length > 0) {
      dropped.push({ id: video.id, title: video.title, channelTitle: video.channelTitle, url, reasons: flags });
      continue;
    }

    const months = (now.getTime() - new Date(video.publishedAt).getTime()) / DAY_MS / 30.4;
    let score = months <= 12 ? 3 : months <= YOUTUBE_VIDEO_RULES.preferWithinMonths ? 1 : -2;
    if (KOREAN.test(video.title)) score += 2;
    if (video.viewCount >= 2000) score += 1;

    candidates.push({
      id: video.id,
      title: video.title,
      channelTitle: video.channelTitle,
      published: video.publishedAt.slice(0, 10),
      length: formatLength(seconds),
      viewCount: video.viewCount,
      score,
      url,
      thumbnailUrl: `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`,
    });
  }

  candidates.sort((a, b) => b.score - a.score);
  return { candidates, dropped };
}
