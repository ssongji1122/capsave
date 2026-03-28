export type CaptureCategory = 'place' | 'text';
export type SourceApp = 'instagram' | 'threads' | 'naver' | 'google' | 'youtube' | 'other';

export interface PlaceInfo {
  name: string;
  address?: string;
  date?: string;
  links?: string[];
  lat?: number;
  lng?: number;
}

export interface AnalysisResult {
  category: CaptureCategory;
  title: string;
  summary: string;
  places: PlaceInfo[];
  extractedText: string;
  links: string[];
  tags: string[];
  source: SourceApp;
  confidence: number;
  sourceAccountId: string | null;
}

export interface CaptureItem {
  id: number;
  category: CaptureCategory;
  title: string;
  summary: string;
  places: PlaceInfo[];
  extractedText: string;
  links: string[];
  tags: string[];
  source: string;
  imageUrl: string;
  createdAt: string;
  userId: string | null;
  confidence: number | null;
  reclassifiedAt: string | null;
  deletedAt: string | null;
  sourceAccountId: string | null;
}

export interface CaptureRow {
  id: number;
  category: string;
  title: string;
  summary: string;
  places: PlaceInfo[];
  extracted_text: string;
  links: string[];
  tags: string[];
  source: string;
  image_url: string;
  created_at: string;
  user_id: string | null;
  confidence: number | null;
  reclassified_at: string | null;
  deleted_at: string | null;
  source_account_id: string | null;
}

export interface ImageAnalyzer {
  analyze(imageBase64: string): Promise<AnalysisResult>;
}
