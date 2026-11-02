import { describe, expect, it } from 'vitest';
import { getStaticPinPosition, STATIC_PIN_AREA } from '@/lib/static-map-layout';

const seongsu = { lat: 37.5446, lng: 127.0559 };
const euljiro = { lat: 37.5663, lng: 126.9918 };

describe('getStaticPinPosition', () => {
  it('centers a single pin inside the area left free by the top bar and bottom sheet', () => {
    const position = getStaticPinPosition(seongsu, [seongsu]);
    expect(position.left).toBe(50);
    expect(position.top).toBe(STATIC_PIN_AREA.top + (100 - STATIC_PIN_AREA.top - STATIC_PIN_AREA.bottom) / 2);
  });

  it('keeps the northernmost pin below the top bar and the southernmost above the bottom sheet', () => {
    const places = [seongsu, euljiro];
    expect(getStaticPinPosition(euljiro, places).top).toBe(STATIC_PIN_AREA.top);
    expect(getStaticPinPosition(seongsu, places).top).toBe(100 - STATIC_PIN_AREA.bottom);
  });

  it('spreads pins west to east within the side margins', () => {
    const places = [seongsu, euljiro];
    expect(getStaticPinPosition(euljiro, places).left).toBe(STATIC_PIN_AREA.side);
    expect(getStaticPinPosition(seongsu, places).left).toBe(100 - STATIC_PIN_AREA.side);
  });
});
