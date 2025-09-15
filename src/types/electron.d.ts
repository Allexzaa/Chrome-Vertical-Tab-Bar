// Electron API types
interface ElectronAPI {
    addTab: (url: string) => void;
    openUrl: (url: string) => void;
    showPreview: (url: string) => void;
    hidePreview: () => void;
    showContextMenu: (tabId: string) => void;
    resizeWindow: (width: number) => void;
    onWindowResized: (callback: (width: number) => void) => void;
    onAddNote: (callback: (tabId: string) => void) => void;
    onTogglePin: (callback: (tabId: string) => void) => void;
    onRemoveTab: (callback: (tabId: string) => void) => void;
}

declare global {
    interface Window {
        electronAPI: ElectronAPI;
    }
}

export {};