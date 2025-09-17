import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// specific electron APIs without exposing all of electron.
contextBridge.exposeInMainWorld(
    'electronAPI', {
        addTab: (url: string) => ipcRenderer.send('add-tab', url),
        openUrl: (url: string) => ipcRenderer.send('open-url', url),
        showContextMenu: (tabId: string, sections?: string[]) => ipcRenderer.send('show-context-menu', tabId, sections),
        showEmptySpaceContextMenu: () => ipcRenderer.send('show-empty-space-context-menu'),
        onWindowResized: (callback: (width: number) => void) =>
            ipcRenderer.on('window-resized', (_, width) => callback(width)),
        resizeWindow: (width: number) => ipcRenderer.send('resize-window', width),
        onRemoveTab: (callback: (tabId: string) => void) => ipcRenderer.on('remove-tab', (_, tabId) => callback(tabId)),
        moveTabToSection: (tabId: string, section: string) => ipcRenderer.send('move-tab-to-section', tabId, section),
        onMoveTabToSection: (callback: (tabId: string, section: string) => void) =>
            ipcRenderer.on('move-tab-to-section', (_, tabId, section) => callback(tabId, section)),
        minimizeWindow: () => ipcRenderer.send('minimize-window'),
        maximizeWindow: () => ipcRenderer.send('maximize-window'),
        closeWindow: () => ipcRenderer.send('close-window'),
        showDropdownPopup: (x: number, y: number, content: any) => ipcRenderer.send('show-dropdown-popup', x, y, content),
        hideDropdownPopup: () => ipcRenderer.send('hide-dropdown-popup'),
        showSectionModal: (x: number, y: number, tabId?: string) => ipcRenderer.send('show-section-modal', x, y, tabId),
        onSectionModalResult: (callback: (data: { action: string, sectionName?: string, tabId?: string }) => void) =>
            ipcRenderer.on('section-modal-result', (_, data) => callback(data)),
        onDropdownAction: (callback: (data: { action: string, sectionName: string, colorName?: string }) => void) => {
            ipcRenderer.on('execute-dropdown-action', (event, data) => callback(data));
        }
    }
);