import { app, BrowserWindow, Menu, Tray, nativeImage } from 'electron'
import { join } from 'path'
import { config } from 'dotenv'
import { BridgeServer } from '../bridge/server'
import { ProcessScanner } from '../services/scanner'
import { NotificationService } from '../services/notifier'
import { HookConfigService } from '../services/hook-config'
import { TranslationService } from '../services/translation'
import { TTSService } from '../services/tts'
import { setupIPCHandlers } from '../ipc/handlers'

// Load .env file for development
const isDev = !app.isPackaged
if (isDev) {
  const envPath = join(app.getAppPath(), '..', '..', '.env')
  config({ path: envPath })
}

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let bridgeServer: BridgeServer
let processScanner: ProcessScanner
let notifier: NotificationService
let hookConfigService: HookConfigService
let translationService: TranslationService
let ttsService: TTSService

function getAppPaths() {
  const basePath = isDev ? process.cwd() : join(app.getAppPath(), '..')
  return {
    basePath,
    isDev,
    preloadPath: join(basePath, 'out', 'preload', 'index.js'),
    htmlPath: isDev
      ? (process.env.ELECTRON_RENDERER_VITE_URL || 'http://localhost:5173')
      : join(basePath, 'out', 'renderer', 'index.html'),
    iconPath: join(app.getAppPath(), 'build', 'icon.png'),
  }
}

function createWindow(): void {
  const paths = getAppPaths()
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: paths.preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (paths.isDev) {
    mainWindow.loadURL(paths.htmlPath)
  } else {
    mainWindow.loadFile(paths.htmlPath)
  }

  mainWindow.on('close', (event) => {
    if (process.platform !== 'darwin') {
      event.preventDefault()
      mainWindow?.hide()
    }
  })
}

function createTray(): void {
  const paths = getAppPaths()
  const iconPath = paths.iconPath
  const icon = nativeImage.createFromPath(iconPath)
  tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon)

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show Window',
      click: () => mainWindow?.show(),
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.quit()
      },
    },
  ])

  tray.setToolTip('Agent Echo')
  tray.setContextMenu(contextMenu)

  tray.on('click', () => {
    mainWindow?.show()
  })
}

async function initialize(): Promise<void> {
  notifier = new NotificationService()
  createWindow()
  createTray()

  bridgeServer = new BridgeServer()
  translationService = new TranslationService()
  ttsService = new TTSService()

  // Apply .env config if set, otherwise keep defaults
  const envApiKey = process.env.MINIMAX_TRANSLATION_API_KEY
  if (envApiKey && envApiKey !== 'your_minimax_api_key_here') {
    translationService.configure({
      apiKey: envApiKey,
      apiBase: process.env.MINIMAX_TRANSLATION_API_BASE || 'https://api.minimaxi.com/anthropic',
      modelName: process.env.MINIMAX_TRANSLATION_MODEL || 'MiniMax-M2.7',
    })
    console.log('[Main] Translation service configured from .env')
  }

  // Apply .env TTS config if set
  const ttsApiKey = process.env.MINIMAX_TTS_API_KEY || envApiKey
  if (ttsApiKey && ttsApiKey !== 'your_minimax_api_key_here') {
    ttsService.configure({
      apiKey: ttsApiKey,
      apiBase: process.env.MINIMAX_TTS_API_BASE || 'https://api.minimaxi.com',
      model: process.env.MINIMAX_TTS_MODEL || 'speech-2.8-hd',
      voiceId: process.env.MINIMAX_TTS_VOICE_ID || 'male-qn-qingse',
    })
    console.log('[Main] TTS service configured from .env')
  }

  setupIPCHandlers(bridgeServer, notifier, translationService, ttsService, mainWindow)

  try {
    await bridgeServer.start()
  } catch (err) {
    console.error('[Main] Failed to start BridgeServer:', err)
  }

  // Auto-configure Claude Code hooks if not already configured
  hookConfigService = new HookConfigService()

  if (!hookConfigService.isConfigured()) {
    console.log('[Main] Hooks not configured, configuring now...')
    hookConfigService.configure()
  } else {
    console.log('[Main] Hooks already configured')
  }

  bridgeServer.on('session:start', (session) => {
    notifier.notify({
      title: '会话开始',
      body: `New session started: ${session.source}`,
    })
  })

  bridgeServer.on('message:assistant', (message) => {
    notifier.notify({
      title: '回复已生成',
      body: message.content.substring(0, 100),
    })
  })

  bridgeServer.on('session:end', (session) => {
    notifier.notify({
      title: '会话结束',
      body: `Session ended: ${session.source}`,
    })
  })

  processScanner = new ProcessScanner(
    async (processInfo) => {
      const details = await processScanner.getProcessDetails(processInfo.pid)
      console.log('[Main] Claude process discovered:', {
        ...processInfo,
        ...details,
      })
      mainWindow?.webContents.send('process:discovered', { ...processInfo, ...details })
    },
    (pid) => {
      console.log('[Main] Claude process lost:', pid)
      mainWindow?.webContents.send('process:lost', pid)
    }
  )

  processScanner.scan().then(() => {
    console.log('[Main] Initial scan completed')
  }).catch(err => {
    console.error('[Main] Initial scan failed:', err)
  })

  processScanner.start(5000)
}

process.on('uncaughtException', (err) => {
  console.error('[Main] Uncaught exception:', err)
})

process.on('unhandledRejection', (reason) => {
  console.error('[Main] Unhandled rejection:', reason)
})

app.whenReady().then(() => {
  initialize().catch((err) => {
    console.error('[Main] Initialization failed:', err)
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // On non-macOS, keep app running in tray
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  } else {
    mainWindow?.show()
  }
})

app.on('before-quit', () => {
  bridgeServer?.stop()
  processScanner?.stop()
  mainWindow?.removeAllListeners('close')
  mainWindow?.close()
})
