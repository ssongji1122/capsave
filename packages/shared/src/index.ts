// Types
export type {
  CaptureCategory,
  SourceApp,
  PlaceInfo,
  AnalysisResult,
  CaptureItem,
  CaptureRow,
  ImageAnalyzer,
  PaginatedResult,
} from './types/capture';
export type {
  ReviewSourceStatus,
  CuratedNaverPost,
  CuratedVideo,
  DroppedVideo,
  PlaceReviewVideo,
  PlaceReviewResult,
} from './types/place-reviews';
export type {
  GuideReferenceKind,
  GuidePlaceCategory,
  GuideStatus,
  GuideVisibility,
  GuideReferencePreview,
  GuideReference,
  GuideCoordinates,
  GuidePlace,
  PublicGuide,
  SavedGuideRow,
  SavedGuideRecord,
  SavedGuideSummary,
  SaveGuideInput,
  UpdateGuideInput,
} from './types/guide';

// Design tokens
export { Colors } from './tokens/colors';
export type { ColorScheme, ThemeColors } from './tokens/colors';

// Utilities
export { isUrlSafe, sanitizeUrl, MOBILE_DEEP_LINK_SCHEMES } from './utils/url-validator';
export { getMapLinks, getReviewLinks, getMobileMapLinks } from './utils/map-linker';
export type {
  MapProvider,
  MapLink,
  MapLinkOptions,
  ReviewProvider,
  ReviewLink,
  MobileMapLink,
} from './utils/map-linker';
export { safeJsonParse } from './utils/json';
export { extractBearerToken } from './utils/auth';
export { getDayBoundaries } from './utils/date';
export { countDistinctUsers } from './utils/analytics';
export { isPublicRoute, shouldRedirectToDashboard, shouldRedirectToLogin } from './utils/route-guards';
export {
  parseGuestCaptures,
  serializeGuestCaptures,
  addGuestCapture,
  getNextGuestId,
  guestCaptureToItem,
} from './utils/guest-captures';
export type { GuestCapture } from './utils/guest-captures';
export { base64ToBlob, buildMigrationPayload } from './utils/guest-migration';
export type { MigrationPayload } from './utils/guest-migration';
export { extractStoragePath, getSignedImageUrl, DEFAULT_SIGNED_URL_EXPIRY } from './utils/storage';

// AI
export { AI_MODEL, AI_MODEL_ENDPOINT } from './ai/config';
export { SYSTEM_PROMPT, BATCH_ANALYSIS_INSTRUCTION } from './ai/prompts';
export {
  parseAnalysisResult,
  parseBatchAnalysisResult,
  calibrateConfidence,
} from './ai/parse-result';
export type { ConfidenceSignals } from './ai/parse-result';
export {
  GUIDE_PROMPT_VERSION,
  GUIDE_CAPTURE_NOTE_MAX_LENGTH,
  buildGuidePrompt,
} from './ai/guide-prompt';
export type { GuidePromptPlace, GuidePromptInput } from './ai/guide-prompt';

// Supabase
export { createSupabaseClient } from './supabase/client';
export {
  MAX_FREE_CAPTURES,
  MAX_GUIDES_PER_USER,
  getAllCaptures,
  getCapturesByCategory,
  searchCaptures,
  saveCapture,
  deleteCapture,
  getCaptureById,
  updateCapturePlaces,
  reclassifyCapture,
  softDeleteCapture,
  touchUserSeen,
  countUserCaptures,
  extractGuideSourceCaptureIds,
  toShareableGuideBody,
  saveGuide,
  listMyGuides,
  getMyGuideById,
  updateGuide,
  softDeleteGuide,
  getSharedGuideBySlug,
} from './supabase/queries';
export { mapRowToCapture, mapCaptureToRow } from './supabase/mappers';

export { ARCHIVE_SECTIONS, classifyArchiveCapture, buildArchiveLinks, buildSourceQuery, safeArchiveUrl } from './utils/capture-archive';
export type { ArchiveSection, ArchiveCapture, ArchiveLink } from './utils/capture-archive';

export { buildCaptureReviewTopic, type CaptureReviewTopic } from './utils/review-context';

export { GEOCODE_CACHE_DAYS, needsGeocoding, hasFreshCoordinates, applyGeocodeResult, expireGeocodedPlaces } from "./utils/place-geocoding";
export type { PlaceGeocodeResult } from "./utils/place-geocoding";
export { findRouteCandidates, DEFAULT_MAX_EXTRA_MINUTES } from "./utils/route-candidates";
export type { LatLng, RouteCandidate, RouteCandidateCapture, RouteCandidateInput } from "./utils/route-candidates";

export { ARCHIVE_APPEARANCE } from './utils/archive-appearance';
