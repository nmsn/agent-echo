import { ipcMain } from 'electron';
import type { BridgeServer } from '../bridge/server.js';
import type { NotificationService } from '../services/notifier.js';

export function setupIPCHandlers(
  bridgeServer: BridgeServer,
  notifier: NotificationService
): void {
  ipcMain.handle('config:get', () => {
    return {
      soundEnabled: notifier.soundEnabled,
      bounceEnabled: notifier.bounceEnabled,
    };
  });

  ipcMain.handle('config:set', (_, config) => {
    notifier.configure(config);
    return config;
  });

  ipcMain.handle('bridge:status', () => {
    return bridgeServer.isRunning();
  });

  ipcMain.handle('bridge:sessions', () => {
    return bridgeServer.getSessions();
  });
}