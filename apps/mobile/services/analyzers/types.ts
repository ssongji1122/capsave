export type CaptureCategory = 'place' | 'text';
export type SourceApp = 'instagram' | 'threads' | 'naver' | 'google' | 'youtube' | 'other';

export interface AnalysisResult {
  category: CaptureCategory;
  title: string;
  summary: string;
  placeName?: string;
  address?: string;
  extractedText: string;
  links: string[];
  tags: string[];
  source: SourceApp;
}

export interface ImageAnalyzer {
  analyze(imageUri: string): Promise<AnalysisResult>;
}
