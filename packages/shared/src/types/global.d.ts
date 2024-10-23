import { ElectronAPI } from '@electron-toolkit/preload';

declare global {
  interface Window {
    electron: ElectronAPI;
    api: {
      showMessage: (message: string) => Promise<void>;
      getAppVersion: () => Promise<string>;
    };
  }
}
