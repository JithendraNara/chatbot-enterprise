export interface DesktopNativeAPI {
  hideWindow: () => Promise<void>;
  showNotifications: (title: string, body: string) => Promise<void>;
  getPlatform: () => Promise<string>;
}

export const useDesktopNative = (): DesktopNativeAPI => {
  const hideWindow = async (): Promise<void> => {
    // The standalone web app has no native window controls.
  };

  const showNotifications = async (title: string, body: string): Promise<void> => {
    if (typeof window === 'undefined' || typeof Notification === 'undefined') {
      return;
    }

    if (Notification.permission === 'granted') {
      new Notification(title, { body });
      return;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        new Notification(title, { body });
      }
    }
  };

  const getPlatform = async (): Promise<string> => {
    if (typeof navigator === 'undefined') {
      return 'unknown';
    }

    const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
    return nav.userAgentData?.platform || navigator.platform || 'web';
  };

  return { hideWindow, showNotifications, getPlatform };
};
