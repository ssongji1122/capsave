import type {
  AnalysisResult,
  CaptureCategory,
  PlaceInfo,
} from '../types/capture';

export type AnalysisDraftError = {
  field: 'title' | 'places';
  message: string;
};

export type EditablePlaceField = 'name' | 'address' | 'date';

const EMPTY_PLACE: PlaceInfo = { name: '', address: '', date: '' };

export function validateAnalysisDraft(result: AnalysisResult): AnalysisDraftError | null {
  if (!result.title.trim()) {
    return { field: 'title', message: '제목을 입력해 주세요.' };
  }

  if (
    result.category === 'place' &&
    !result.places.some((place) => place.name.trim().length > 0)
  ) {
    return {
      field: 'places',
      message: '장소로 저장하려면 장소 이름을 하나 이상 입력해 주세요.',
    };
  }

  return null;
}

export function updateAnalysisCategory(
  result: AnalysisResult,
  category: CaptureCategory
): AnalysisResult {
  return { ...result, category };
}

export function updateAnalysisPlace(
  result: AnalysisResult,
  index: number,
  field: EditablePlaceField,
  value: string
): AnalysisResult {
  if (!result.places[index]) return result;

  const places = result.places.map((place, placeIndex) => {
    if (placeIndex !== index || place[field] === value) return place;
    if (field === 'date') return { ...place, date: value };

    const {
      lat: _lat,
      lng: _lng,
      placeId: _placeId,
      geocodedAt: _geocodedAt,
      links: _links,
      ...identityWithoutCachedLocation
    } = place;
    return { ...identityWithoutCachedLocation, [field]: value };
  });

  return { ...result, places };
}

export function addAnalysisPlace(result: AnalysisResult): AnalysisResult {
  return {
    ...result,
    places: [...result.places, { ...EMPTY_PLACE }],
  };
}

export function removeAnalysisPlace(result: AnalysisResult, index: number): AnalysisResult {
  if (!result.places[index]) return result;
  return {
    ...result,
    places: result.places.filter((_, placeIndex) => placeIndex !== index),
  };
}

export function prepareAnalysisForSave(result: AnalysisResult): AnalysisResult {
  const places = result.category === 'text'
    ? []
    : result.places
      .map((place) => ({
        ...place,
        name: place.name.trim(),
        address: place.address?.trim() || undefined,
        date: place.date?.trim() || undefined,
      }))
      .filter((place) => place.name.length > 0);

  return {
    ...result,
    title: result.title.trim(),
    summary: result.summary.trim(),
    extractedText: result.extractedText.trim(),
    places,
  };
}
