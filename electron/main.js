const { app, BrowserWindow, dialog, shell } = require('electron')
const path = require('path')
const { autoUpdater } = require('electron-updater')

// ── Auto-updater configuration ─────────────────────────────────────────────────
autoUpdater.autoDownload = true
autoUpdater.autoInstallOnAppQuit = true

autoUpdater.on('update-available', () => {
  console.log('[eden-updater] Update available — downloading in background')
})

autoUpdater.on('update-downloaded', () => {
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
})

// ── Window creation ────────────────────────────────────────────────────────────
function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: 'hidden',
    frame: false,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    title: 'Eden',
    backgroundColor: '#0b1622',
  })

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
        // Restore title bar on macOS, show frame elements
        win.setTitleBarStyle && win.setTitleBarStyle('hiddenInset')
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
}

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
