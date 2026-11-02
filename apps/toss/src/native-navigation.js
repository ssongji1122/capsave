export function connectNativeNavigation(events, { location, isBusy, close, onError }) {
  const removeBack = events.addEventListener('backEvent', {
    onEvent: async () => {
      if (isBusy()) return;
      if (location.hash && location.hash !== '#') location.hash = '';
      else {
        try { await close(); } catch (error) { onError(error); }
      }
    },
    onError,
  });
  const removeHome = events.addEventListener('homeEvent', {
    onEvent: () => { if (!isBusy()) location.hash = ''; },
    onError,
  });
  return () => { removeBack(); removeHome(); };
}
