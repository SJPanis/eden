const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  getVersion: () => ipcRenderer.invoke('get-version'),
  onUpdateStatus: (callback) => ipcRenderer.on('update-status', (_event, status) => callback(status)),
})

// Inject custom title bar into web content
window.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('eden-titlebar')) return

  const bar = document.createElement('div')
  bar.id = 'eden-titlebar'
  bar.style.cssText = [
    '-webkit-app-region:drag',
    'height:36px',
    'background:rgba(6,8,18,0.98)',
    'border-bottom:1px solid rgba(45,212,191,0.15)',
    'display:flex',
    'align-items:center',
    'justify-content:space-between',
    'padding:0 12px',
    'position:fixed',
    'top:0', 'left:0', 'right:0',
    'z-index:99999',
    'user-select:none',
  ].join(';')

  bar.innerHTML = [
    // Left: window controls (macOS-style dots)
    '<div style="-webkit-app-region:no-drag;display:flex;gap:6px;align-items:center">',
    '  <div id="btn-close" style="width:12px;height:12px;border-radius:50%;background:#ff5f57;cursor:pointer"></div>',
    '  <div id="btn-min" style="width:12px;height:12px;border-radius:50%;background:#febc2e;cursor:pointer"></div>',
    '  <div id="btn-max" style="width:12px;height:12px;border-radius:50%;background:#28c840;cursor:pointer"></div>',
    '</div>',
    // Center: Eden OS label + version + update status
    '<div style="position:absolute;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:8px">',
    '  <span style="color:rgba(45,212,191,0.9);font-size:11px;letter-spacing:0.2em;font-family:\'SF Mono\',\'IBM Plex Mono\',monospace">EDEN OS</span>',
    '  <span id="eden-version" style="color:rgba(255,255,255,0.3);font-size:9px;font-family:\'SF Mono\',\'IBM Plex Mono\',monospace;letter-spacing:0.1em">v0.1.0</span>',
    '  <span id="eden-update-status" style="font-size:9px;font-family:\'SF Mono\',\'IBM Plex Mono\',monospace"></span>',
    '</div>',
    // Right: status dot
    '<div style="-webkit-app-region:no-drag;display:flex;align-items:center;gap:6px">',
    '  <div style="width:6px;height:6px;border-radius:50%;background:#2dd4bf;box-shadow:0 0 6px #2dd4bf"></div>',
    '  <span style="color:rgba(255,255,255,0.3);font-size:9px;font-family:\'SF Mono\',\'IBM Plex Mono\',monospace;letter-spacing:0.1em">LIVE</span>',
    '</div>',
  ].join('')

  document.body.prepend(bar)
  document.body.style.paddingTop = '36px'

  // Wire window control buttons
  document.getElementById('btn-close').onclick = () => window.electronAPI.close()
  document.getElementById('btn-min').onclick = () => window.electronAPI.minimize()
  document.getElementById('btn-max').onclick = () => window.electronAPI.maximize()

  // Hover effects for window control dots
  const dots = [
    { id: 'btn-close', hover: '#ff5f57', base: '#ff5f57' },
    { id: 'btn-min', hover: '#febc2e', base: '#febc2e' },
    { id: 'btn-max', hover: '#28c840', base: '#28c840' },
  ]
  for (const dot of dots) {
    const el = document.getElementById(dot.id)
    el.addEventListener('mouseover', () => { el.style.boxShadow = `0 0 6px ${dot.hover}` })
    el.addEventListener('mouseout', () => { el.style.boxShadow = 'none' })
  }

  // Fetch and display version
  if (window.electronAPI && window.electronAPI.getVersion) {
    window.electronAPI.getVersion().then((version) => {
      const versionEl = document.getElementById('eden-version')
      if (versionEl && version) versionEl.textContent = 'v' + version
    })
  }

  // Listen for update status changes
  if (window.electronAPI && window.electronAPI.onUpdateStatus) {
    window.electronAPI.onUpdateStatus((status) => {
      const statusEl = document.getElementById('eden-update-status')
      if (!statusEl) return

      switch (status) {
        case 'checking':
          statusEl.textContent = '\u00b7 checking...'
          statusEl.style.color = 'rgba(255,255,255,0.3)'
          statusEl.style.animation = ''
          break
        case 'available':
          statusEl.textContent = '\u00b7 update available'
          statusEl.style.color = '#f59e0b'
          statusEl.style.animation = ''
          break
        case 'downloaded':
          statusEl.textContent = '\u00b7 restart to update'
          statusEl.style.color = '#f59e0b'
          statusEl.style.animation = 'pulse-update 1.5s ease-in-out infinite'
          break
        case 'current':
        case 'error':
        default:
          statusEl.textContent = ''
          statusEl.style.animation = ''
          break
      }
    })
  }

  // Add pulse animation for downloaded state
  const pulseStyle = document.createElement('style')
  pulseStyle.textContent = '@keyframes pulse-update { 0%,100% { opacity:1 } 50% { opacity:0.4 } }'
  document.head.appendChild(pulseStyle)
})
