import { app, BrowserWindow, Menu, Tray, nativeImage } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { BridgeServer } from './bridge/server.js';
import { ProcessScanner } from './services/scanner.js';
import { NotificationService } from './services/notifier.js';
import { setupIPCHandlers } from './ipc/handlers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let bridgeServer: BridgeServer;
let processScanner: ProcessScanner;
let notifier: NotificationService;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, '../index.html'));

  mainWindow.on('close', (event) => {
    if (process.platform !== 'darwin') {
      event.preventDefault();
      mainWindow?.hide();
    }
  });
}

function createTray(): void {
  const iconPath = path.join(__dirname, '../assets/icon.png');
  const icon = nativeImage.createFromPath(iconPath);
  tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show Window',
      click: () => mainWindow?.show(),
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.quit();
      },
    },
  ]);

  tray.setToolTip('Agent Echo');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    mainWindow?.show();
  });
}

async function initialize(): Promise<void> {
  // Initialize notification service
  notifier = new NotificationService();

  // Create window and tray
  createWindow();
  createTray();

  // Setup IPC handlers
  bridgeServer = new BridgeServer();
  setupIPCHandlers(bridgeServer, notifier);

  // Start BridgeServer
  try {
    await bridgeServer.start();
  } catch (err) {
    console.error('[Main] Failed to start BridgeServer:', err);
  }

  // Setup BridgeServer event handlers for notifications
  bridgeServer.on('session:start', (session) => {
    notifier.notify({
      title: '会话开始',
      body: `New session started: ${session.source}`,
    });
  });

  bridgeServer.on('message:assistant', (message) => {
    notifier.notify({
      title: '回复已生成',
      body: message.content.substring(0, 100),
    });
  });

  bridgeServer.on('session:end', (session) => {
    notifier.notify({
      title: '会话结束',
      body: `Session ended: ${session.source}`,
    });
  });

  // Start ProcessScanner with callbacks that use NotificationService
  processScanner = new ProcessScanner(
    // onDiscover
    async (processInfo) => {
      const details = await processScanner.getProcessDetails(processInfo.pid);
      console.log('[Main] Claude process discovered:', {
        ...processInfo,
        ...details,
      });
    },
    // onLost
    (pid) => {
      console.log('[Main] Claude process lost:', pid);
    }
  );

  processScanner.start(5000);
}

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('[Main] Uncaught exception:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('[Main] Unhandled rejection:', reason);
});

// App lifecycle
app.whenReady().then(() => {
  initialize().catch((err) => {
    console.error('[Main] Initialization failed:', err);
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // On non-macOS, keep app running in tray
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  } else {
    mainWindow?.show();
  }
});

app.on('before-quit', () => {
  bridgeServer?.stop();
  processScanner?.stop();
  mainWindow?.removeAllListeners('close');
  mainWindow?.close();
});
