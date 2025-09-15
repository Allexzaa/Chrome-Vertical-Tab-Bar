import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// specific electron APIs without exposing all of electron.
contextBridge.exposeInMainWorld(
    'electronAPI', {
        addTab: (url: string) => ipcRenderer.send('add-tab', url),
        openUrl: (url: string) => ipcRenderer.send('open-url', url),
        showContextMenu: (tabId: string) => ipcRenderer.send('show-context-menu', tabId),
        onWindowResized: (callback: (width: number) => void) => 
            ipcRenderer.on('window-resized', (_, width) => callback(width)),
        resizeWindow: (width: number) => ipcRenderer.send('resize-window', width),
        onTogglePin: (callback: (tabId: string) => void) => ipcRenderer.on('toggle-pin', (_, tabId) => callback(tabId)),
        onRemoveTab: (callback: (tabId: string) => void) => ipcRenderer.on('remove-tab', (_, tabId) => callback(tabId))
    }
);