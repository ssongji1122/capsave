export type { CaptureCategory, SourceApp, AnalysisResult, PlaceInfo } from './analyzers/types';
export type { ImageAnalyzer } from './analyzers/types';

import Constants from 'expo-constants';
import { ImageAnalyzer } from './analyzers/types';

let analyzer: ImageAnalyzer | null = null;

function getAnalyzer(getToken?: () => Promise<string | null>): ImageAnalyzer {
  if (analyzer) return analyzer;

  // Feature flag: AI_PROVIDER defaults to 'gemini' (server-side).
  // Set to 'openai' for emergency rollback to client-side GPT-4o.
  const provider = Constants.expoConfig?.extra?.aiProvider ?? 'gemini';

  if (provider === 'openai') {
    const { OpenAIAnalyzer } = require('./analyzers/openai-analyzer');
    analyzer = new OpenAIAnalyzer();
  } else {
    const { ServerAnalyzer } = require('./analyzers/server-analyzer');
    analyzer = new ServerAnalyzer(getToken ?? (async () => null));
  }

  return analyzer!;
}

// Reset cached analyzer (call when switching providers or on logout)
export function resetAnalyzer() {
  analyzer = null;
}

export async function analyzeImage(
  imageUri: string,
  getToken?: () => Promise<string | null>
) {
  return getAnalyzer(getToken).analyze(imageUri);
}
