import { ipcMain, BrowserWindow } from 'electron';
import type { BridgeServer } from '../bridge/server';
import type { NotificationService } from '../services/notifier';
import type { TranslationService } from '../services/translation';
import type { TTSService } from '../services/tts';
import { focusTerminal } from '../services/focus-terminal';

export function setupIPCHandlers(
  bridgeServer: BridgeServer,
  notifier: NotificationService,
  translationService: TranslationService,
  ttsService: TTSService,
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

  // Translation handlers
  ipcMain.handle('translate:configure', (_, config) => {
    translationService.configure(config);
    return translationService.getConfig();
  });

  ipcMain.handle('translate:request', async (_, messageId, text, contentType) => {
    try {
      const result = await translationService.translate(messageId, text, contentType);
      return { success: true, translated: result.translated, usage: result.usage };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  // Forward translation events to renderer
  translationService.on('translate:result', (result) => {
    mainWindow?.webContents.send('translate:result', result);
  });

  translationService.on('translate:error', (error) => {
    mainWindow?.webContents.send('translate:error', error);
  });

  // TTS handlers
  ipcMain.handle('tts:configure', (_, config) => {
    ttsService.configure(config);
    return ttsService.getConfig();
  });

  ipcMain.handle('tts:speak', async (_, messageId, text) => {
    try {
      const result = await ttsService.speak(text, messageId);
      // Return base64 data URL instead of file path
      return { success: true, audioData: result.audioData };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  // Forward TTS events to renderer
  ttsService.on('tts:result', (result) => {
    mainWindow?.webContents.send('tts:result', result);
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

  // Focus terminal
  ipcMain.handle('focus-terminal', async (_, sessionId: string) => {
    const sessions = bridgeServer.getSessions();
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) return { success: false, error: 'Session not found' };
    await focusTerminal(session.pid, session.pidChain, session.editor);
    return { success: true };
  });
}