export interface CoordinateLabel {
  latitude: string;
  longitude: string;
}

const COORDINATE_DECIMALS = 3;

export function formatCoordinateLabel(latitude: number, longitude: number): CoordinateLabel {
  return {
    latitude: `${Math.abs(latitude).toFixed(COORDINATE_DECIMALS)}° ${latitude < 0 ? 'S' : 'N'}`,
    longitude: `${Math.abs(longitude).toFixed(COORDINATE_DECIMALS)}° ${longitude < 0 ? 'W' : 'E'}`,
  };
}
