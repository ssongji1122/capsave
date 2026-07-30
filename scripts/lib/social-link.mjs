const INSTAGRAM_HOSTS = new Set(['instagram.com', 'www.instagram.com']);
const DEFAULT_SELECTED_INDEX = 1;

const ROUTE_RULES = [
  {
    kind: 'place',
    label: '여행·장소 자산',
    destination: 'map-archive',
    keywords: [
      '맛집',
      '카페',
      '여행',
      '관광',
      '숙소',
      '호텔',
      '해변',
      '주소',
      '위치',
      'restaurant',
      'cafe',
      'travel',
      'hotel',
    ],
  },
  {
    kind: 'marketing_reference',
    label: '마케팅 참고자료',
    destination: 'marketing-library',
    keywords: [
      '마케팅',
      '마케터',
      '캠페인',
      '광고',
      '바이럴',
      '콘텐츠',
      '채널',
      '전략',
      'marketing',
      'campaign',
    ],
  },
  {
    kind: 'branding_reference',
    label: '브랜딩 참고자료',
    destination: 'branding-library',
    keywords: [
      '브랜드',
      '브랜딩',
      '리브랜딩',
      '아이덴티티',
      '로고',
      '패키지',
      'branding',
      'identity',
    ],
  },
  {
    kind: 'learning_reference',
    label: '학습 참고자료',
    destination: 'study-library',
    keywords: [
      '공부',
      '학습',
      '강의',
      '튜토리얼',
      '개념',
      '사용법',
      '교육',
      'learning',
      'tutorial',
    ],
  },
  {
    kind: 'lesson_candidate',
    label: '수업자료 후보',
    destination: 'lesson-review-queue',
    keywords: ['수업자료', '커리큘럼', '워크숍', '실습', 'lesson', 'curriculum'],
  },
];

const FALLBACK_ROUTE = {
  kind: 'general_reference',
  label: '일반 참고자료',
  destination: 'reference-inbox',
};

function decodeHtmlEntities(value) {
  return value
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&nbsp;', ' ');
}

function stripHtml(value) {
  return decodeHtmlEntities(
    value
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<[^>]+>/g, '')
  )
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n');
}

function decodeEscapedJsonString(value) {
  let decoded = value;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      decoded = JSON.parse(`"${decoded.replaceAll('"', '\\"')}"`);
    } catch {
      break;
    }
  }

  return decoded.replaceAll('\\/', '/');
}

function getStableMediaKey(url) {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

function extractInstagramMedia(html) {
  const normalizedJson = html.replace(/\\"/g, '"');
  const mediaPattern =
    /"is_video":(true|false),"display_url":"((?:\\.|[^"\\])*)"/g;
  const media = [];
  const seen = new Set();

  for (const match of normalizedJson.matchAll(mediaPattern)) {
    const url = decodeEscapedJsonString(match[2]);
    const stableKey = getStableMediaKey(url);
    if (!url.startsWith('https://') || seen.has(stableKey)) continue;

    seen.add(stableKey);
    media.push({
      index: media.length + 1,
      kind: match[1] === 'true' ? 'video-preview' : 'image',
      url,
    });
  }

  return media;
}

function inferRoute(text) {
  const normalized = text.toLocaleLowerCase('ko-KR');
  const ranked = ROUTE_RULES.map((rule, ruleIndex) => {
    const matchedKeywords = rule.keywords.filter((keyword) =>
      normalized.includes(keyword)
    );
    return {
      ...rule,
      matchedKeywords,
      score: matchedKeywords.length,
      ruleIndex,
    };
  })
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score || left.ruleIndex - right.ruleIndex);

  const best = ranked[0];
  if (!best) {
    return {
      ...FALLBACK_ROUTE,
      matchedKeywords: [],
    };
  }

  return {
    kind: best.kind,
    label: best.label,
    destination: best.destination,
    matchedKeywords: best.matchedKeywords,
  };
}

export function normalizeInstagramPostUrl(value) {
  let url;

  try {
    url = new URL(value);
  } catch {
    throw new Error('지원하지 않는 링크입니다.');
  }

  const match = url.pathname.match(/^\/(p|reel)\/([A-Za-z0-9_-]+)\/?$/);
  if (!INSTAGRAM_HOSTS.has(url.hostname) || !match) {
    throw new Error('지원하지 않는 링크입니다.');
  }

  const requestedIndex = Number.parseInt(url.searchParams.get('img_index') ?? '', 10);
  const selectedIndex =
    Number.isInteger(requestedIndex) && requestedIndex > 0
      ? requestedIndex
      : DEFAULT_SELECTED_INDEX;
  const mediaKind = match[1];
  const shortcode = match[2];
  const canonicalUrl = `https://www.instagram.com/${mediaKind}/${shortcode}/`;

  return {
    platform: 'instagram',
    shortcode,
    mediaKind,
    selectedIndex,
    canonicalUrl,
    embedUrl: `${canonicalUrl}embed/captioned/`,
  };
}

export function inspectInstagramEmbed(sourceUrl, html) {
  const normalized = normalizeInstagramPostUrl(sourceUrl);
  const authorMatch = html.match(
    /data-log-event="captionProfileClick"[^>]*>([^<]+)<\/a>/i
  );
  const captionMatch = html.match(
    /<div class="Caption">([\s\S]*?)<div class="CaptionComments">/i
  );
  const author = authorMatch ? stripHtml(authorMatch[1]) : '';
  const caption = captionMatch ? stripHtml(captionMatch[1]) : '';
  const media = extractInstagramMedia(html);
  const selectedMedia = media[normalized.selectedIndex - 1] ?? null;
  const route = inferRoute(`${author}\n${caption}`);

  if (!caption && media.length === 0) {
    throw new Error('인스타그램 게시물 내용을 찾지 못했습니다.');
  }

  return {
    source: {
      platform: normalized.platform,
      originalUrl: sourceUrl,
      canonicalUrl: normalized.canonicalUrl,
      selectedIndex: normalized.selectedIndex,
      shortcode: normalized.shortcode,
    },
    author,
    caption,
    media,
    selectedMedia,
    route,
    promotion: {
      status: 'captured',
      suggestedTarget: route.destination,
      requiresVerification: true,
      reason:
        '원문과 미디어를 먼저 보존하고, 분류에 맞는 검증을 통과한 뒤 승격합니다.',
    },
  };
}

export async function inspectSocialLink(sourceUrl, fetchImpl = fetch) {
  const normalized = normalizeInstagramPostUrl(sourceUrl);
  const response = await fetchImpl(normalized.embedUrl, {
    headers: {
      'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.7',
      'User-Agent':
        'Mozilla/5.0 (compatible; ScraveLinkInspector/1.0; +https://scrave.vercel.app)',
    },
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new Error(`원본 게시물을 불러오지 못했습니다. HTTP ${response.status}`);
  }

  return inspectInstagramEmbed(sourceUrl, await response.text());
}
