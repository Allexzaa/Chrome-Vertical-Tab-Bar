// Electron API types
interface ElectronAPI {
    addTab: (url: string) => void;
    openUrl: (url: string) => void;
    showPreview: (url: string) => void;
    hidePreview: () => void;
    showContextMenu: (tabId: string, sections?: string[]) => void;
    showEmptySpaceContextMenu: () => void;
    resizeWindow: (width: number) => void;
    onWindowResized: (callback: (width: number) => void) => void;
    onAddNote: (callback: (tabId: string) => void) => void;
    onRemoveTab: (callback: (tabId: string) => void) => void;
    moveTabToSection: (tabId: string, section: string) => void;
    onMoveTabToSection: (callback: (tabId: string, section: string) => void) => void;
    minimizeWindow: () => void;
    maximizeWindow: () => void;
    closeWindow: () => void;
    showDropdownPopup: (x: number, y: number, content: any) => void;
    hideDropdownPopup: () => void;
    onDropdownAction: (callback: (data: { action: string, sectionName: string }) => void) => void;
}

declare global {
    interface Window {
        electronAPI: ElectronAPI;
    }
}

export {};