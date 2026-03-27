export type { CaptureCategory, SourceApp, AnalysisResult } from './analyzers/types';
export type { ImageAnalyzer } from './analyzers/types';

import { OpenAIAnalyzer } from './analyzers/openai-analyzer';
import { ImageAnalyzer } from './analyzers/types';

let analyzer: ImageAnalyzer | null = null;

function getAnalyzer(): ImageAnalyzer {
  if (!analyzer) {
    analyzer = new OpenAIAnalyzer();
  }
  return analyzer;
}

export async function analyzeImage(imageUri: string) {
  return getAnalyzer().analyze(imageUri);
}
