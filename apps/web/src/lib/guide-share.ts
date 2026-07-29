export interface GuideShareInput {
  title: string;
  description: string;
  url: string;
}

export interface GuideSharePayload {
  title: string;
  text: string;
  url: string;
}

const SHAREABLE_PROTOCOLS = new Set(['http:', 'https:']);

export function buildGuideSharePayload(input: GuideShareInput): GuideSharePayload {
  const url = new URL(input.url);

  if (!SHAREABLE_PROTOCOLS.has(url.protocol)) {
    throw new Error('GUIDE_SHARE_URL_INVALID');
  }

  return {
    title: input.title,
    text: input.description,
    url: url.toString(),
  };
}
