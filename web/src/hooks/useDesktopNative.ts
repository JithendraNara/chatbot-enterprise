import { getCurrentWindow } from '@tauri-apps/api/window';
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';
import { platform } from '@tauri-apps/plugin-os';

export interface DesktopNativeAPI {
  hideWindow: () => Promise<void>;
  showNotifications: (title: string, body: string) => Promise<void>;
  getPlatform: () => Promise<string>;
}

export const useDesktopNative = (): DesktopNativeAPI => {
  const hideWindow = async (): Promise<void> => {
    try {
      const window = getCurrentWindow();
      await window.hide();
    } catch (error) {
      console.warn('hideWindow not available:', error);
    }
  };

  const showNotifications = async (title: string, body: string): Promise<void> => {
    try {
      let permissionGranted = await isPermissionGranted();
      if (!permissionGranted) {
        const permission = await requestPermission();
        permissionGranted = permission === 'granted';
      }
      if (permissionGranted) {
        sendNotification({ title, body });
      }
    } catch (error) {
      console.warn('Notifications not available:', error);
    }
  };

  const getPlatform = async (): Promise<string> => {
    try {
      return await platform();
    } catch (error) {
      console.warn('Platform detection failed:', error);
      return 'unknown';
    }
  };

  return { hideWindow, showNotifications, getPlatform };
};
