const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
})

// Inject custom title bar into web content
window.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('eden-titlebar')) return

  const bar = document.createElement('div')
  bar.id = 'eden-titlebar'
  bar.style.cssText = [
    'position:fixed', 'top:0', 'left:0', 'right:0', 'height:36px',
    'z-index:99999', 'display:flex', 'align-items:center',
    'justify-content:space-between', 'padding:0 12px',
    'background:rgba(11,22,34,0.95)',
    'border-bottom:1px solid rgba(45,212,191,0.12)',
    '-webkit-app-region:drag', 'user-select:none'
  ].join(';')

  bar.innerHTML = [
    '<div style="-webkit-app-region:no-drag;display:flex;align-items:center;gap:8px">',
    '<div style="width:8px;height:8px;border-radius:50%;background:#2dd4bf;opacity:0.7"></div>',
    '<span style="font-family:monospace;font-size:11px;color:rgba(45,212,191,0.6);letter-spacing:0.1em">EDEN OS</span>',
    '</div>',
    '<div id="eden-winbtns" style="-webkit-app-region:no-drag;display:flex;gap:2px">',
    '<button id="eb-min" title="Minimize" style="width:30px;height:22px;background:transparent;border:none;color:rgba(255,255,255,0.35);font-size:18px;cursor:pointer;border-radius:4px">&#8722;</button>',
    '<button id="eb-max" title="Maximize" style="width:30px;height:22px;background:transparent;border:none;color:rgba(255,255,255,0.35);font-size:11px;cursor:pointer;border-radius:4px">&#9634;</button>',
    '<button id="eb-cls" title="Close" style="width:30px;height:22px;background:transparent;border:none;color:rgba(255,255,255,0.35);font-size:13px;cursor:pointer;border-radius:4px">&#10005;</button>',
    '</div>'
  ].join('')

  document.body.prepend(bar)
  document.body.style.paddingTop = '36px'

  const hover = (el, hoverStyle, outStyle) => {
    el.addEventListener('mouseover', () => Object.assign(el.style, hoverStyle))
    el.addEventListener('mouseout', () => Object.assign(el.style, outStyle))
  }

  const minBtn = document.getElementById('eb-min')
  const maxBtn = document.getElementById('eb-max')
  const clsBtn = document.getElementById('eb-cls')

  hover(minBtn, { background: 'rgba(255,255,255,0.08)' }, { background: 'transparent' })
  hover(maxBtn, { background: 'rgba(255,255,255,0.08)' }, { background: 'transparent' })
  hover(clsBtn, { background: 'rgba(220,38,38,0.6)', color: 'white' }, { background: 'transparent', color: 'rgba(255,255,255,0.35)' })

  minBtn.onclick = () => window.electronAPI.minimize()
  maxBtn.onclick = () => window.electronAPI.maximize()
  clsBtn.onclick = () => window.electronAPI.close()
})
