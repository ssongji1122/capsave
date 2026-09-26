// Guide document shape shared by the static public guides (web) and
// guides drafted from a user's own captures (web and mobile).

export type GuideReferenceKind =
  | 'government'
  | 'official'
  | 'editorial'
  | 'review'
  | 'video';
export type GuidePlaceCategory = 'culture' | 'beach' | 'food' | 'stay' | 'activity';
export type GuideStatus = 'draft' | 'published';

export interface GuideReferencePreview {
  title: string;
  description: string;
  imageUrl?: string;
  imageAlt?: string;
}

export interface GuideReference {
  kind: GuideReferenceKind;
  label: string;
  publisher: string;
  url: string;
  checkedAt: string;
  note: string;
  preview: GuideReferencePreview;
}

export interface GuideCoordinates {
  latitude: number;
  longitude: number;
}

export interface GuidePlace {
  id: string;
  sequence: number;
  name: string;
  localName: string;
  category: GuidePlaceCategory;
  address: string;
  coordinates: GuideCoordinates;
  scene: string;
  summary: string;
  visitWindow: string;
  practicalNote: string;
  hours?: string[];
  hoursLabel?: string;
  references: GuideReference[];
  // Captures this place came from. Kept only on the owner's copy of a guide.
  sourceCaptureIds?: number[];
}

export interface PublicGuide {
  slug: string;
  status: GuideStatus;
  title: string;
  eyebrow: string;
  description: string;
  location: string;
  countryCode: string;
  center: GuideCoordinates;
  updatedAt: string;
  curator: string;
  routeEyebrow: string;
  routeTitle: string;
  mapLabel: string;
  connectRoute: boolean;
  shareTitleLines: string[];
  places: GuidePlace[];
}
