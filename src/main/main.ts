import { app, BrowserWindow, screen, BrowserView, ipcMain, shell, Menu, Tray, dialog } from 'electron';
import * as path from 'path';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

function createWindow() {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

    // Create the browser window.
    mainWindow = new BrowserWindow({
        width: 90, // Default width for the tab bar (updated to match current size)
        height: screenHeight,
        x: 0, // Position at the left edge of the screen
        y: 0,
        frame: false, // Frameless window
        alwaysOnTop: true,
        resizable: false,
        movable: true, // Allow window to be moved
        transparent: false,
        hasShadow: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: true,
            webSecurity: true,
            sandbox: false,
            preload: path.join(__dirname, 'preload.js')
        }
    });
    
    // Enable interaction with the window
    mainWindow.setIgnoreMouseEvents(false);
    
    // Load the index.html file
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

    // Show the window after it's fully loaded
    mainWindow.once('ready-to-show', () => {
        mainWindow?.show();
    });

    // Event handlers for the window
    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    // Handle URL opening
    ipcMain.on('open-url', (event, url) => {
        shell.openExternal(url);
    });

    // Handle window resizing
    ipcMain.on('resize-window', (event, width) => {
        if (mainWindow) {
            const [currentX, currentY] = mainWindow.getPosition();
            const [_, height] = mainWindow.getSize();

            // Ensure width is within bounds
            const boundedWidth = Math.max(40, Math.min(300, width));

            // Resize window and maintain current position
            mainWindow.setBounds({
                x: currentX,
                y: currentY,
                width: boundedWidth,
                height: height
            }, true); // true means animate the resize

            // Notify renderer of the actual size
            event.reply('window-resized', boundedWidth);
        }
    });

    // Handle window controls
    ipcMain.on('minimize-window', () => {
        if (mainWindow) {
            mainWindow.minimize();
        }
    });

    ipcMain.on('maximize-window', () => {
        if (mainWindow) {
            if (mainWindow.isMaximized()) {
                mainWindow.unmaximize();
            } else {
                mainWindow.maximize();
            }
        }
    });

    ipcMain.on('close-window', () => {
        if (mainWindow) {
            mainWindow.close();
        }
    });

    // Set up context menu
    ipcMain.on('show-context-menu', (event, tabId: string, sections?: string[]) => {
        const sectionMenuItems = sections ? sections.map(section => ({
            label: section,
            click: () => {
                mainWindow?.webContents.send('move-tab-to-section', tabId, section);
            }
        })) : [];

        const contextMenu = Menu.buildFromTemplate([
            {
                label: 'Move to Section',
                submenu: [
                    ...sectionMenuItems,
                    { type: 'separator' },
                    {
                        label: 'New Section...',
                        click: () => {
                            mainWindow?.webContents.executeJavaScript(`
                                window.showSectionModal('${tabId}');
                            `);
                        }
                    }
                ]
            },
            { type: 'separator' },
            {
                label: 'Remove Tab',
                click: () => {
                    mainWindow?.webContents.send('remove-tab', tabId);
                }
            }
        ]);
        contextMenu.popup();
    });

    // Handle moving tab to section
    ipcMain.on('move-tab-to-section', (event, tabId: string, section: string) => {
        mainWindow?.webContents.send('move-tab-to-section', tabId, section);
    });

    // Set up empty space context menu
    ipcMain.on('show-empty-space-context-menu', (event) => {
        const contextMenu = Menu.buildFromTemplate([
            {
                label: 'Create New Section',
                click: () => {
                    mainWindow?.webContents.executeJavaScript(`
                        window.showSectionModal();
                    `);
                }
            },
            { type: 'separator' },
            {
                label: 'Add New Tab',
                click: () => {
                    mainWindow?.webContents.executeJavaScript(`
                        const url = prompt('Enter the URL:', 'https://');
                        if (url) {
                            window.addTab(url);
                        }
                    `);
                }
            }
        ]);
        contextMenu.popup();
    });

    // Set up system tray
    try {
        const iconPath = path.join(__dirname, '../assets/icon.png');
        if (require('fs').existsSync(iconPath)) {
            tray = new Tray(iconPath);
        } else {
            // Create a default icon
            const { nativeImage } = require('electron');
            const icon = nativeImage.createEmpty();
            tray = new Tray(icon);
        }
    } catch (error) {
        // Tray creation failed - app will continue without tray
    }
    
    const trayMenu = Menu.buildFromTemplate([
        {
            label: 'Show/Hide',
            click: () => {
                if (mainWindow?.isVisible()) {
                    mainWindow.hide();
                } else {
                    mainWindow?.show();
                }
            }
        },
        {
            label: 'Add New Tab',
            click: () => {
                mainWindow?.webContents.executeJavaScript(`
                    const url = prompt('Enter the URL:', 'https://');
                    if (url) {
                        window.addTab(url);
                    }
                `);
            }
        },
        {
            label: 'Create New Section',
            click: () => {
                mainWindow?.webContents.executeJavaScript(`
                    window.showSectionModal();
                `);
            }
        },
        { type: 'separator' },
        {
            label: 'Exit',
            click: () => {
                app.quit();
            }
        }
    ]);

    if (tray) {
        tray.setToolTip('Vertical Tab Bar');
        tray.setContextMenu(trayMenu);

        // Handle tray click
        tray.on('click', () => {
            if (mainWindow?.isVisible()) {
                mainWindow.hide();
            } else {
                mainWindow?.show();
            }
        });
    }
}

// Create window when Electron is ready
app.whenReady().then(createWindow);

// Quit when all windows are closed
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});