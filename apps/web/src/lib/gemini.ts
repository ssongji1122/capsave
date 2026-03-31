interface GeminiPart {
  text?: string;
  thought?: boolean;
  [key: string]: unknown;
}

interface GeminiCandidate {
  content?: {
    parts?: GeminiPart[];
  };
}

export function extractGeminiText(candidates: GeminiCandidate[] | undefined | null): string | null {
  if (!candidates || candidates.length === 0) return null;

  const parts = candidates[0]?.content?.parts;
  if (!parts || parts.length === 0) return null;

  const textPart = parts.find((p) => p.text && !p.thought);
  return textPart?.text ?? null;
}
