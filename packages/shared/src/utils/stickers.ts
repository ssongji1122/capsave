export { STICKER_CATALOG } from './sticker-catalog';
export const MAX_STICKERS = 20;
export interface StickerPlacement {
    id: string;
    stickerId: number;
    x: number;
    y: number;
    size: number;
    rotation: number;
}
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
export function normalizeSticker(p: StickerPlacement): StickerPlacement {
    const size = clamp(p.size, 0.12, 0.4);
    // Square canvas and a rotation-safe inset preserve the complete sticker.
    const inset = Math.round(size * 0.75 * 10000) / 10000;
    return { ...p, size, x: clamp(p.x, inset, 1 - inset), y: clamp(p.y, inset, 1 - inset), rotation: clamp(p.rotation, -30, 30) };
}
export function parseDecorations(raw: string | null): StickerPlacement[] {
    try {
        const items: unknown = JSON.parse(raw ?? '[]');
        if (!Array.isArray(items))
            return [];
        const seen = new Set<string>();
        return items.filter((p): p is StickerPlacement => {
            if (!p || typeof p !== 'object' || typeof p.id !== 'string' || !p.id || seen.has(p.id) || !Number.isInteger(p.stickerId) || p.stickerId < 1 || p.stickerId > 100 || ![p.x, p.y, p.size, p.rotation].every(n => typeof n === 'number' && Number.isFinite(n)))
                return false;
            seen.add(p.id);
            return true;
        }).slice(0, MAX_STICKERS).map(normalizeSticker);
    }
    catch {
        return [];
    }
}
export function stickerStorageKey(owner: string, target: string) {
    return `scrave:stickers:v1:${encodeURIComponent(owner)}:${encodeURIComponent(target)}`;
}
