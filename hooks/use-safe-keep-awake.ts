import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useEffect } from 'react';
import { Platform } from 'react-native';

/**
 * Safely keeps the screen awake across Android, iOS, and Web.
 * - Catches Web WakeLock NotAllowedError when opened in a background/hidden tab.
 * - Re-acquires WakeLock automatically on Web whenever the tab becomes visible again
 *   (browsers release WakeLockSentinels automatically when a tab is hidden).
 */
export function useSafeKeepAwake(tag: string) {
  useEffect(() => {
    let cancelled = false;

    const tryActivate = () => {
      if (cancelled) return;
      if (
        Platform.OS === 'web' &&
        typeof document !== 'undefined' &&
        document.visibilityState !== 'visible'
      ) {
        return;
      }
      activateKeepAwakeAsync(tag).catch(() => {});
    };

    tryActivate();

    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          tryActivate();
        }
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);
      return () => {
        cancelled = true;
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        deactivateKeepAwake(tag).catch(() => {});
      };
    }

    return () => {
      cancelled = true;
      deactivateKeepAwake(tag).catch(() => {});
    };
  }, [tag]);
}
