const { app, BrowserWindow, dialog, shell, ipcMain } = require('electron')
const path = require('path')
const { autoUpdater } = require('electron-updater')

// ── Auto-updater configuration ─────────────────────────────────────────────────
autoUpdater.autoDownload = true
autoUpdater.autoInstallOnAppQuit = true

let mainWindow = null

function sendUpdateStatus(status) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-status', status)
  }
}

autoUpdater.on('checking-for-update', () => {
  console.log('[eden-updater] Checking for update...')
  sendUpdateStatus('checking')
})

autoUpdater.on('update-available', () => {
  console.log('[eden-updater] Update available — downloading in background')
  sendUpdateStatus('available')
})

autoUpdater.on('update-not-available', () => {
  console.log('[eden-updater] Up to date')
  sendUpdateStatus('current')
})

autoUpdater.on('update-downloaded', () => {
  console.log('[eden-updater] Update downloaded')
  sendUpdateStatus('downloaded')
  dialog.showMessageBox({
    type: 'info',
    title: 'Eden Updated',
    message: 'A new version of Eden has been downloaded.',
    detail: 'Restart Eden now to apply the update, or it will apply automatically on next launch.',
    buttons: ['Restart Now', 'Later'],
    defaultId: 0,
  }).then(({ response }) => {
    if (response === 0) autoUpdater.quitAndInstall()
  })
})

autoUpdater.on('error', (err) => {
  console.error('[eden-updater] Update error:', err.message)
  sendUpdateStatus('error')
})

// ── Window creation ────────────────────────────────────────────────────────────
function createWindow() {
  const isMac = process.platform === 'darwin'

  const winOptions = {
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    titleBarStyle: 'hidden',
    hasShadow: true,
    transparent: false,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    title: 'Eden',
    backgroundColor: '#0b1622',
  }

  if (isMac) {
    winOptions.trafficLightPosition = { x: 12, y: 14 }
  }

  const win = new BrowserWindow(winOptions)
  mainWindow = win

  // Load boot sequence
  const bootPath = path.join(__dirname, 'boot.html')
  win.loadFile(bootPath)

  win.once('ready-to-show', () => {
    win.show()
  })

  // After boot completes, navigate to the real app
  win.webContents.on('did-finish-load', function onBootLoad() {
    win.webContents.removeListener('did-finish-load', onBootLoad)

    // Wait for boot sequence to finish (3.5s)
    setTimeout(() => {
      // Set background to match app before navigating to prevent flash
      win.setBackgroundColor('#0b1622')
      win.loadURL('https://edencloud.app')

      // Once the real app loads, restore normal window chrome
      win.webContents.on('did-finish-load', function onAppLoad() {
        win.webContents.removeListener('did-finish-load', onAppLoad)
      })

      // Check for updates after app loads (non-blocking)
      setTimeout(() => {
        autoUpdater.checkForUpdatesAndNotify().catch(() => {})
      }, 3000)
    }, 3500)
  })

  // Open external links in browser not app
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  win.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  createWindow()

  // IPC handlers for custom title bar
  ipcMain.on('window-minimize', () => {
    const win = BrowserWindow.getFocusedWindow()
    if (win) win.minimize()
  })

  ipcMain.on('window-maximize', () => {
    const win = BrowserWindow.getFocusedWindow()
    if (win) {
      if (win.isMaximized()) win.unmaximize()
      else win.maximize()
    }
  })

  ipcMain.on('window-close', () => {
    const win = BrowserWindow.getFocusedWindow()
    if (win) win.close()
  })

  ipcMain.handle('get-version', () => {
    try {
      return require('./package.json').version
    } catch {
      return '0.1.0'
    }
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
