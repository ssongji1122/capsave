import type { CaptureItem, PlaceInfo } from '@scrave/shared';

export interface GeocodedPlacePatch {
  captureId: number;
  placeIndex: number;
  lat: number;
  lng: number;
  address?: string;
}

export interface CapturePlacesCoordUpdate {
  captureId: number;
  places: PlaceInfo[];
}

/**
 * Computes which authenticated user captures (capture.id > 0) gained new
 * geocoded coordinates so MapView can persist them via updateCapturePlaces (TODOS G4)
 * and avoid re-geocoding on subsequent visits.
 */
export function buildCapturePlacesCoordUpdates(
  captures: readonly CaptureItem[],
  geocoded: readonly GeocodedPlacePatch[],
): CapturePlacesCoordUpdate[] {
  if (geocoded.length === 0) return [];

  const patchesByCapture = new Map<number, Map<number, GeocodedPlacePatch>>();
  for (const patch of geocoded) {
    if (patch.captureId <= 0) continue;
    if (!Number.isFinite(patch.lat) || !Number.isFinite(patch.lng)) continue;
    let map = patchesByCapture.get(patch.captureId);
    if (!map) {
      map = new Map<number, GeocodedPlacePatch>();
      patchesByCapture.set(patch.captureId, map);
    }
    map.set(patch.placeIndex, patch);
  }

  const updates: CapturePlacesCoordUpdate[] = [];

  for (const capture of captures) {
    if (capture.id <= 0) continue;
    const patchMap = patchesByCapture.get(capture.id);
    if (!patchMap || patchMap.size === 0) continue;

    let changed = false;
    const nextPlaces: PlaceInfo[] = capture.places.map((place, index) => {
      const patch = patchMap.get(index);
      if (!patch) return place;
      if (typeof place.lat === 'number' && typeof place.lng === 'number') {
        return place;
      }
      changed = true;
      return {
        ...place,
        lat: patch.lat,
        lng: patch.lng,
        ...(place.address ? {} : patch.address ? { address: patch.address } : {}),
      };
    });

    if (changed) {
      updates.push({ captureId: capture.id, places: nextPlaces });
    }
  }

  return updates;
}
