import { describe, expect, it } from 'vitest';
import { normalizeSticker, parseDecorations, stickerStorageKey, MAX_STICKERS } from '../utils/stickers';
describe('sticker decorations', () => {
    it('keeps rotated stickers inside a normalized canvas', () => {
        expect(normalizeSticker({ id: 'a', stickerId: 1, x: -2, y: 4, size: 4, rotation: 999 })).toEqual({ id: 'a', stickerId: 1, x: 0.3, y: 0.7, size: 0.4, rotation: 30 });
    });
    it('rejects unknown images and corrupt saved data', () => {
        expect(parseDecorations('{')).toEqual([]);
        expect(parseDecorations(JSON.stringify([{ id: 'a', stickerId: 101, x: 0.5, y: 0.5, size: 0.2, rotation: 0 }]))).toEqual([]);
        expect(parseDecorations(JSON.stringify([{ id: 'a', stickerId: 1, x: NaN }]))).toEqual([]);
    });
    it('limits saved stickers and deduplicates instance ids', () => {
        const item = { id: 'a', stickerId: 1, x: 0.5, y: 0.5, size: 0.2, rotation: 0 };
        expect(parseDecorations(JSON.stringify([item, item]))).toHaveLength(1);
        expect(parseDecorations(JSON.stringify(Array.from({ length: 50 }, (_, i) => ({ ...item, id: String(i) }))))).toHaveLength(MAX_STICKERS);
    });
    it('separates account and capture keys', () => {
        expect(stickerStorageKey('one', 'capture:1')).not.toBe(stickerStorageKey('two', 'capture:1'));
        expect(stickerStorageKey('one', 'archive')).not.toBe(stickerStorageKey('one', 'capture:1'));
    });
});
