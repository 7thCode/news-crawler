const { contextBridge, ipcRenderer } = require('electron')

console.log('Preload script is running!')

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  analyzeTrends: (category, limit) =>
    ipcRenderer.invoke('analyze-trends', category, limit),
})

console.log('electronAPI exposed to window')
