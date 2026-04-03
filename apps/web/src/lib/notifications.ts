export function generateDauNotificationHtml(dau: number, date: string): string {
  return `<h2>Phase 1 Validation Gate Passed</h2>
<p>Scrave has reached <strong>${dau} daily active users</strong> today (${date}).</p>
<p>Time to move to Phase 2 growth features.</p>`;
}

/**
 * Shows a temporary error toast at the bottom of the screen.
 * Auto-dismisses after 4 seconds.
 */
export function showErrorToast(message: string): void {
  if (typeof document === 'undefined') return;

  // Remove any existing toast
  const existing = document.getElementById('scrave-error-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'scrave-error-toast';
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'assertive');
  toast.textContent = message;
  toast.style.cssText = [
    'position: fixed',
    'bottom: 24px',
    'left: 50%',
    'transform: translateX(-50%)',
    'background: #F87171',
    'color: #000',
    'padding: 12px 20px',
    'border-radius: 12px',
    'font-size: 14px',
    'font-weight: 500',
    'z-index: 9999',
    'max-width: calc(100vw - 48px)',
    'text-align: center',
    'box-shadow: 0 4px 12px rgba(0,0,0,0.4)',
    'pointer-events: none',
  ].join(';');

  document.body.appendChild(toast);
  setTimeout(() => {
    if (document.getElementById('scrave-error-toast') === toast) {
      toast.remove();
    }
  }, 4000);
}
