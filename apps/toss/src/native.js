import { Device, graniteEvent, closeView } from '@apps-in-toss/web-framework';
import { useNativePicker, isSavingCapture, showNavigationError } from './main.js';
import { pickNativeImage } from './native-picker.js';
import { connectNativeNavigation } from './native-navigation.js';

useNativePicker(() => pickNativeImage(Device));

if (window.ReactNativeWebView) {
  try {
    const disconnect = connectNativeNavigation(graniteEvent, {
      location: window.location, isBusy: isSavingCapture,
      close: closeView, onError: showNavigationError,
    });
    if (import.meta.hot) import.meta.hot.dispose(disconnect);
  } catch { showNavigationError(); }
}
