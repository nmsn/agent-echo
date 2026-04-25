import { ipcMain, BrowserWindow } from 'electron';
import type { BridgeServer } from '../bridge/server';
import type { NotificationService } from '../services/notifier';

export function setupIPCHandlers(
  bridgeServer: BridgeServer,
  notifier: NotificationService,
  mainWindow: BrowserWindow
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

  // Real-time session updates
  bridgeServer.on('session:start', (session) => {
    mainWindow?.webContents.send('session:start', session);
  });

  bridgeServer.on('session:end', (session) => {
    mainWindow?.webContents.send('session:end', session);
  });

  bridgeServer.on('message:user', (message, session) => {
    mainWindow?.webContents.send('message:user', message, session.id);
  });

  bridgeServer.on('message:assistant', (message, session) => {
    mainWindow?.webContents.send('message:assistant', message, session.id);
  });
}