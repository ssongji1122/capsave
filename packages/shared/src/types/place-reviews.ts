// Response contract of POST /api/place-reviews, shared by web and mobile.

export type ReviewSourceStatus = 'ok' | 'no-key' | 'error';

export interface CuratedNaverPost {
  title: string;
  url: string;
  blogger: string;
  date: string | null;
  excerpt: string;
  score: number;
  reasons: string[];
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

export interface PlaceReviewVideo extends CuratedVideo {
  sceneCheck: 'checked' | 'unchecked';
  scenes?: string[];
}

export interface PlaceReviewResult {
  naver: { status: ReviewSourceStatus; posts: CuratedNaverPost[]; searchUrl: string };
  youtube: {
    status: ReviewSourceStatus;
    videos: PlaceReviewVideo[];
    dropped: DroppedVideo[];
    searchUrl: string;
  };
}
