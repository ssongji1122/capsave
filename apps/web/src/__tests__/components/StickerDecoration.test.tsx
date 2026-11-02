import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { StickerDecoration } from '@/components/stickers/StickerDecoration';
import { stickerStorageKey } from '@scrave/shared';
const auth = vi.hoisted(() => ({ owner: 'one', listener: null as null | ((event: string, session: unknown) => void) }));
vi.mock('@/lib/supabase/browser', () => ({ createClient: () => ({ auth: {
            getUser: async () => ({ data: { user: { id: auth.owner } } }),
            onAuthStateChange: (fn: typeof auth.listener) => { auth.listener = fn; return { data: { subscription: { unsubscribe: vi.fn() } } }; }
        } }) }));
beforeEach(() => { localStorage.clear(); auth.owner = 'one'; vi.stubGlobal('crypto', { randomUUID: () => String(Math.random()) }); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
async function open() { const b = screen.getByRole('button', { name: '보관함 스티커 꾸미기' }); await waitFor(() => expect(b.hasAttribute('disabled')).toBe(false)); fireEvent.click(b); return screen.getByRole('dialog'); }
it('saves independently per target and restores a decoration after remount', async () => {
    const view = render(<StickerDecoration target="archive" label="보관함"/>);
    let dialog = await open();
    fireEvent.click(within(dialog).getByRole('button', { name: '캡처 카드 붙이기' }));
    fireEvent.click(within(dialog).getByRole('button', { name: '저장' }));
    expect(JSON.parse(localStorage.getItem(stickerStorageKey('one', 'archive'))!)).toHaveLength(1);
    expect(localStorage.getItem(stickerStorageKey('one', 'capture:1'))).toBeNull();
    view.unmount();
    render(<StickerDecoration target="archive" label="보관함"/>);
    dialog = await open();
    expect(within(dialog).getByText('1/20')).toBeTruthy();
});
it('cancels edits, undoes deletion and keeps failed saves editable', async () => {
    render(<StickerDecoration target="archive" label="보관함"/>);
    let dialog = await open();
    fireEvent.click(within(dialog).getByRole('button', { name: '캡처 카드 붙이기' }));
    fireEvent.click(within(dialog).getByRole('button', { name: '선택 삭제' }));
    expect(within(dialog).getByText('0/20')).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: '되돌리기' }));
    expect(within(dialog).getByText('1/20')).toBeTruthy();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw Error('full'); });
    fireEvent.click(within(dialog).getByRole('button', { name: '저장' }));
    expect(screen.getByRole('alert').textContent).toContain('저장하지 못했습니다');
    fireEvent.click(within(dialog).getByRole('button', { name: '취소' }));
    dialog = await open();
    expect(within(dialog).getByText('0/20')).toBeTruthy();
});
it('filters all 100 stickers by label and supports keyboard movement', async () => {
    render(<StickerDecoration target="archive" label="보관함"/>);
    const dialog = await open();
    fireEvent.change(within(dialog).getByRole('searchbox'), { target: { value: '레모네이드' } });
    expect(within(dialog).getAllByRole('button', { name: /붙이기/ }).length).toBeGreaterThan(0);
    fireEvent.click(within(dialog).getAllByRole('button', { name: /붙이기/ })[0]);
    const placed = within(dialog).getByRole('button', { name: '레모네이드' });
    fireEvent.keyDown(placed, { key: 'ArrowRight' });
    fireEvent.click(within(dialog).getByRole('button', { name: '저장' }));
    expect(JSON.parse(localStorage.getItem(stickerStorageKey('one', 'archive'))!)[0].x).toBe(.52);
});
it('commits a pointer drag and can undo it after pointer release', async () => {
    vi.stubGlobal('PointerEvent', MouseEvent);
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ width: 400, height: 400, x: 0, y: 0, left: 0, top: 0, right: 400, bottom: 400, toJSON: () => ({}) });
    Object.defineProperty(HTMLImageElement.prototype, 'setPointerCapture', { configurable: true, value: vi.fn() });
    render(<StickerDecoration target="archive" label="보관함"/>);
    const dialog = await open();
    fireEvent.click(within(dialog).getByRole('button', { name: '캡처 카드 붙이기' }));
    const placed = within(dialog).getByRole('button', { name: '캡처 카드' });
    fireEvent.pointerDown(placed, { clientX: 200, clientY: 200, pointerId: 1 });
    fireEvent.pointerMove(placed, { clientX: 280, clientY: 240, pointerId: 1 });
    fireEvent.pointerUp(placed, { clientX: 280, clientY: 240, pointerId: 1 });
    expect(placed.style.left).toBe('70%');
    fireEvent.click(within(dialog).getByRole('button', { name: '되돌리기' }));
    expect(placed.style.left).toBe('50%');
    fireEvent.click(within(dialog).getByRole('button', { name: '저장' }));
    expect(JSON.parse(localStorage.getItem(stickerStorageKey('one', 'archive'))!)[0].x).toBe(.5);
});
it('keeps an edit open on token refresh and clears it when the account changes', async () => {
    render(<StickerDecoration target="archive" label="보관함"/>);
    const dialog = await open();
    fireEvent.click(within(dialog).getByRole('button', { name: '캡처 카드 붙이기' }));
    const { act } = await import('@testing-library/react');
    act(() => auth.listener?.('TOKEN_REFRESHED', { user: { id: 'one' } }));
    expect(screen.getByRole('dialog')).toBeTruthy();
    act(() => auth.listener?.('SIGNED_IN', { user: { id: 'two' } }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    const reopened = await open();
    expect(within(reopened).getByText('0/20')).toBeTruthy();
});
it('uses icon-only choices with accessible names and a selected-name hint', async () => {
    render(<StickerDecoration target="archive" label="보관함"/>);
    const dialog = await open();
    const choice = within(dialog).getByRole('button', { name: '딸기 케이크 붙이기' });
    expect(choice.getAttribute('title')).toBe('딸기 케이크');
    expect(choice.querySelector('[role="tooltip"]')?.textContent).toBe('딸기 케이크');
    fireEvent.click(choice);
    expect(within(dialog).getByRole('status').textContent).toBe('딸기 케이크');
});
