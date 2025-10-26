import { contextBridge, ipcRenderer } from 'electron'

console.log('Preload script is running!')

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  analyzeTrends: (category: string, limit: number) =>
    ipcRenderer.invoke('analyze-trends', category, limit),
  compareSnsMedia: (limit: number) =>
    ipcRenderer.invoke('compare-sns-media', limit),
})

console.log('electronAPI exposed to window')
