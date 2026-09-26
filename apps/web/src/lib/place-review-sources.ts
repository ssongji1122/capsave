import {
  AI_MODEL_ENDPOINT,
  type PlaceReviewResult,
  type PlaceReviewVideo,
} from '@scrave/shared';
import { extractGeminiText } from '@/lib/gemini';
import {
  NAVER_REVIEW_RULES,
  YOUTUBE_VIDEO_RULES,
  getPlaceMatchKeys,
  isFaceHeavy,
  rankVideoCandidates,
  screenNaverPost,
  type CuratedNaverPost,
  type CuratedVideo,
  type DroppedVideo,
  type NaverBlogItem,
  type YoutubeVideoInput,
} from '@/lib/review-curation';

export type { PlaceReviewResult, PlaceReviewVideo };

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export interface PlaceReviewKeys {
  naverClientId?: string;
  naverClientSecret?: string;
  youtubeApiKey?: string;
  geminiApiKey?: string;
}

const NAVER_BLOG_API = 'https://openapi.naver.com/v1/search/blog.json';
const YOUTUBE_API = 'https://www.googleapis.com/youtube/v3/';
const SEARCH_CACHE_SECONDS = 60 * 60 * 24;
const YOUTUBE_SEARCH_RESULTS = 15;
const SCENE_FRAMES = ['hq1', 'hq2', 'hq3'];

const SCENE_PROMPT = [
  '각 영상마다 영상의 25%, 50%, 75% 지점 장면 세 장이 순서대로 붙어 있습니다.',
  '장면마다 사람 얼굴이나 사람이 화면 대부분을 차지하면 true, 풍경·시설·객실·음식처럼 장소가 주로 보이면 false로 판단합니다.',
  '장면마다 보이는 것을 한국어 두세 단어로 적습니다.',
  'JSON 배열 하나로만 답합니다: [{"id": "영상 id", "people": [true, false, false], "scenes": ["수영장", "객실", "사람 얼굴"]}]',
].join('\n');

function cachedGet(fetchImpl: FetchLike, url: string, headers?: Record<string, string>) {
  return fetchImpl(url, { headers, next: { revalidate: SEARCH_CACHE_SECONDS } } as RequestInit);
}

async function readJson<T>(response: Response, source: string): Promise<T> {
  if (!response.ok) throw new Error(`${source} returned ${response.status}`);
  return (await response.json()) as T;
}

function getNaverSearchUrl(name: string): string {
  const params = new URLSearchParams({ ssc: 'tab.blog.all', query: `${name} 내돈내산`, nso: 'so:r,p:1y' });
  return `https://search.naver.com/search.naver?${params.toString()}`;
}

function getYoutubeSearchUrl(name: string): string {
  return `https://www.youtube.com/results?${new URLSearchParams({ search_query: name }).toString()}`;
}

async function collectNaverPosts(
  name: string,
  keys: PlaceReviewKeys,
  fetchImpl: FetchLike,
  now: Date,
): Promise<CuratedNaverPost[]> {
  const params = new URLSearchParams({ query: `${name} 후기`, display: '30', sort: 'sim' });
  const data = await readJson<{ items?: NaverBlogItem[] }>(
    await cachedGet(fetchImpl, `${NAVER_BLOG_API}?${params.toString()}`, {
      'X-Naver-Client-Id': keys.naverClientId ?? '',
      'X-Naver-Client-Secret': keys.naverClientSecret ?? '',
    }),
    'Naver search',
  );

  const matchKeys = getPlaceMatchKeys(name);
  return (data.items ?? [])
    .map((item) => screenNaverPost(item, matchKeys, now))
    .filter((post): post is CuratedNaverPost => post !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, NAVER_REVIEW_RULES.keep);
}

interface YoutubeSearchItem { id?: { videoId?: string } }
interface YoutubeVideoItem {
  id: string;
  snippet: { title: string; channelId: string; channelTitle: string; description?: string; publishedAt: string };
  contentDetails: { duration: string };
  statistics?: { viewCount?: string };
}
interface YoutubeChannelItem {
  id: string;
  statistics: { videoCount?: string; subscriberCount?: string; hiddenSubscriberCount?: boolean };
}

async function fetchYoutubeVideos(
  name: string,
  apiKey: string,
  fetchImpl: FetchLike,
): Promise<YoutubeVideoInput[]> {
  const search = await readJson<{ items?: YoutubeSearchItem[] }>(
    await cachedGet(
      fetchImpl,
      `${YOUTUBE_API}search?${new URLSearchParams({
        part: 'snippet', q: name, type: 'video', maxResults: String(YOUTUBE_SEARCH_RESULTS), key: apiKey,
      }).toString()}`,
    ),
    'YouTube search',
  );
  const ids = [...new Set((search.items ?? []).map((item) => item.id?.videoId).filter(Boolean))] as string[];
  if (ids.length === 0) return [];

  const videos = await readJson<{ items?: YoutubeVideoItem[] }>(
    await cachedGet(
      fetchImpl,
      `${YOUTUBE_API}videos?${new URLSearchParams({
        part: 'snippet,contentDetails,statistics', id: ids.join(','), key: apiKey,
      }).toString()}`,
    ),
    'YouTube videos',
  );
  const items = videos.items ?? [];
  const channelIds = [...new Set(items.map((item) => item.snippet.channelId))];

  const channels = await readJson<{ items?: YoutubeChannelItem[] }>(
    await cachedGet(
      fetchImpl,
      `${YOUTUBE_API}channels?${new URLSearchParams({
        part: 'statistics', id: channelIds.join(','), key: apiKey,
      }).toString()}`,
    ),
    'YouTube channels',
  );
  const channelStats = new Map(
    (channels.items ?? []).map((channel) => [
      channel.id,
      {
        videoCount: Number(channel.statistics.videoCount ?? 0),
        subscriberCount: channel.statistics.hiddenSubscriberCount
          ? null
          : Number(channel.statistics.subscriberCount ?? 0),
      },
    ]),
  );

  return items.map((item) => ({
    id: item.id,
    title: item.snippet.title,
    channelTitle: item.snippet.channelTitle,
    description: item.snippet.description ?? '',
    publishedAt: item.snippet.publishedAt,
    duration: item.contentDetails.duration,
    viewCount: Number(item.statistics?.viewCount ?? 0),
    channel: channelStats.get(item.snippet.channelId) ?? { videoCount: 0, subscriberCount: null },
  }));
}

interface SceneJudgement {
  people: boolean[];
  scenes: string[];
}

async function fetchFrame(fetchImpl: FetchLike, videoId: string, frame: string): Promise<string> {
  const response = await cachedGet(fetchImpl, `https://i.ytimg.com/vi/${videoId}/${frame}.jpg`);
  if (!response.ok) throw new Error(`Frame ${videoId}/${frame} returned ${response.status}`);
  return Buffer.from(await response.arrayBuffer()).toString('base64');
}

function parseSceneJudgements(text: string): Map<string, SceneJudgement> {
  const match = /\[[\s\S]*\]/.exec(text);
  if (!match) throw new Error('Scene check returned no JSON array');
  const rows = JSON.parse(match[0]) as { id?: unknown; people?: unknown; scenes?: unknown }[];

  const judgements = new Map<string, SceneJudgement>();
  for (const row of rows) {
    if (typeof row.id !== 'string' || !Array.isArray(row.people)) continue;
    judgements.set(row.id, {
      people: row.people.map((value) => value === true),
      scenes: Array.isArray(row.scenes) ? row.scenes.filter((scene): scene is string => typeof scene === 'string') : [],
    });
  }
  return judgements;
}

async function checkScenes(
  videos: CuratedVideo[],
  geminiApiKey: string,
  fetchImpl: FetchLike,
): Promise<Map<string, SceneJudgement>> {
  const parts: object[] = [{ text: SCENE_PROMPT }];
  for (const video of videos) {
    const frames = await Promise.all(SCENE_FRAMES.map((frame) => fetchFrame(fetchImpl, video.id, frame)));
    parts.push({ text: `영상 ${video.id}` });
    for (const data of frames) parts.push({ inlineData: { mimeType: 'image/jpeg', data } });
  }

  const response = await fetchImpl(`${AI_MODEL_ENDPOINT}?key=${geminiApiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 2048,
        responseMimeType: 'application/json',
        thinkingConfig: { thinkingBudget: 0 },
      },
    }),
  });
  const data = await readJson<{ candidates?: Parameters<typeof extractGeminiText>[0] }>(response, 'Scene check');
  const text = extractGeminiText(data.candidates);
  if (!text) throw new Error('Scene check returned no text');
  return parseSceneJudgements(text);
}

async function collectYoutubeVideos(
  name: string,
  keys: PlaceReviewKeys,
  fetchImpl: FetchLike,
  now: Date,
): Promise<{ videos: PlaceReviewVideo[]; dropped: DroppedVideo[] }> {
  const inputs = await fetchYoutubeVideos(name, keys.youtubeApiKey ?? '', fetchImpl);
  const { candidates, dropped } = rankVideoCandidates(inputs, getPlaceMatchKeys(name), now);
  const shortlist = candidates.slice(0, YOUTUBE_VIDEO_RULES.keep + 3);

  let judgements: Map<string, SceneJudgement> | null = null;
  if (keys.geminiApiKey && shortlist.length > 0) {
    try {
      judgements = await checkScenes(shortlist, keys.geminiApiKey, fetchImpl);
    } catch (error) {
      console.warn('[place-reviews] scene check failed:', error);
    }
  }

  const videos: PlaceReviewVideo[] = [];
  for (const video of shortlist) {
    const judgement = judgements?.get(video.id);
    if (judgement && isFaceHeavy(judgement.people)) {
      dropped.push({
        id: video.id,
        title: video.title,
        channelTitle: video.channelTitle,
        url: video.url,
        reasons: ['사람 얼굴 위주 장면'],
      });
      continue;
    }
    videos.push(
      judgement
        ? { ...video, sceneCheck: 'checked', scenes: judgement.scenes }
        : { ...video, sceneCheck: 'unchecked' },
    );
  }

  return { videos: videos.slice(0, YOUTUBE_VIDEO_RULES.keep), dropped };
}

export async function collectPlaceReviews(
  name: string,
  keys: PlaceReviewKeys,
  { fetchImpl = fetch as FetchLike, now = new Date() }: { fetchImpl?: FetchLike; now?: Date } = {},
): Promise<PlaceReviewResult> {
  const hasNaver = Boolean(keys.naverClientId && keys.naverClientSecret);
  const hasYoutube = Boolean(keys.youtubeApiKey);

  const [naver, youtube] = await Promise.allSettled([
    hasNaver ? collectNaverPosts(name, keys, fetchImpl, now) : Promise.resolve([]),
    hasYoutube
      ? collectYoutubeVideos(name, keys, fetchImpl, now)
      : Promise.resolve({ videos: [], dropped: [] }),
  ]);

  if (naver.status === 'rejected') console.error('[place-reviews] Naver failed:', naver.reason);
  if (youtube.status === 'rejected') console.error('[place-reviews] YouTube failed:', youtube.reason);

  return {
    naver: {
      status: !hasNaver ? 'no-key' : naver.status === 'fulfilled' ? 'ok' : 'error',
      posts: naver.status === 'fulfilled' ? naver.value : [],
      searchUrl: getNaverSearchUrl(name),
    },
    youtube: {
      status: !hasYoutube ? 'no-key' : youtube.status === 'fulfilled' ? 'ok' : 'error',
      videos: youtube.status === 'fulfilled' ? youtube.value.videos : [],
      dropped: youtube.status === 'fulfilled' ? youtube.value.dropped : [],
      searchUrl: getYoutubeSearchUrl(name),
    },
  };
}
