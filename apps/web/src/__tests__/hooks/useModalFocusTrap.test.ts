import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useModalFocusTrap } from '@/hooks/useModalFocusTrap';

// The hook guards on `containerRef.current !== null` before attaching the listener.
// renderHook does not render a DOM element, so we must manually assign a real
// HTMLDivElement to the ref and force the effect to re-run by changing `isOpen`.
function setupHookWithContainer(isOpen: boolean, onClose: () => void) {
  const container = document.createElement('div');
  const btn = document.createElement('button');
  btn.textContent = 'Button 1';
  container.appendChild(btn);
  document.body.appendChild(container);

  const { result, rerender, unmount } = renderHook(
    ({ open, close }: { open: boolean; close: () => void }) =>
      useModalFocusTrap(open, close),
    { initialProps: { open: false, close: onClose } },
  );

  // Assign the real DOM node to the ref, then toggle isOpen to true so the
  // effect re-runs with containerRef.current set.
  act(() => {
    (result.current as React.RefObject<HTMLDivElement>).current = container;
  });

  if (isOpen) {
    rerender({ open: true, close: onClose });
  }

  return { result, rerender, unmount, container };
}

function fireKeydown(key: string, shiftKey = false) {
  const event = new KeyboardEvent('keydown', { key, shiftKey, bubbles: true });
  document.dispatchEvent(event);
  return event;
}

describe('useModalFocusTrap', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('calls onClose when ESC is pressed and modal is open', () => {
    const onClose = vi.fn();
    setupHookWithContainer(true, onClose);
    act(() => {
      fireKeydown('Escape');
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does NOT call onClose when ESC is pressed and modal is closed', () => {
    const onClose = vi.fn();
    // isOpen=false — hook never registers the listener
    renderHook(() => useModalFocusTrap(false, onClose));
    act(() => {
      fireKeydown('Escape');
    });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('removes event listener on unmount', () => {
    const onClose = vi.fn();
    const { unmount } = setupHookWithContainer(true, onClose);
    unmount();
    act(() => {
      fireKeydown('Escape');
    });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('returns a ref object', () => {
    const { result } = renderHook(() => useModalFocusTrap(true, vi.fn()));
    expect(result.current).toBeDefined();
    expect(result.current).toHaveProperty('current');
  });
});
