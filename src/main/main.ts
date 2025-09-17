import { app, BrowserWindow, screen, BrowserView, ipcMain, shell, Menu, Tray, dialog } from 'electron';
import * as path from 'path';

let mainWindow: BrowserWindow | null = null;
let dropdownPopup: BrowserWindow | null = null;
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
        // Open dev tools for debugging
        mainWindow?.webContents.openDevTools();
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

    // Handle dropdown popup
    ipcMain.on('show-dropdown-popup', (event, x: number, y: number, content: any) => {
        if (dropdownPopup) {
            dropdownPopup.close();
        }

        // Get main window position to calculate screen coordinates
        const mainWindowBounds = mainWindow?.getBounds();
        if (!mainWindowBounds) return;

        // Calculate screen position: main window position + relative coordinates
        const screenX = mainWindowBounds.x + x;
        const screenY = mainWindowBounds.y + y;

        console.log('Creating popup at screen coordinates:', {
            mainWindowBounds,
            relativeX: x,
            relativeY: y,
            screenX,
            screenY
        });

        dropdownPopup = new BrowserWindow({
            width: 130,  // Even wider to fully accommodate all 6 color circles (5 colors + no-color)
            height: 120, // Height for color row + 4 action icons with full visibility
            x: screenX,
            y: screenY,
            frame: false,
            alwaysOnTop: true,
            resizable: false,
            movable: false,
            transparent: true,
            hasShadow: false,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false,
                webSecurity: false
            }
        });

        // Create HTML content for the popup with collapsible color options
        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {
                        margin: 0;
                        padding: 4px;
                        background: transparent;
                        border: none;
                        border-radius: 4px;
                        font-family: Arial, sans-serif;
                        box-shadow: none;
                        display: flex;
                        flex-direction: column;
                        gap: 2px;
                        overflow: hidden;
                        height: 100vh;
                        box-sizing: border-box;
                    }
                    .color-section {
                        display: flex;
                        flex-direction: row;
                        align-items: center;
                        gap: 2px;
                        padding: 2px;
                        background: transparent;
                        border-radius: 2px;
                        margin-bottom: 2px;
                    }
                    .color-icon {
                        width: 20px;
                        height: 20px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        cursor: pointer;
                        border-radius: 2px;
                        transition: all 0.2s ease;
                        font-size: 14px;
                        flex-shrink: 0;
                    }
                    .color-icon:hover {
                        background-color: #e0e0e0;
                    }
                    .color-row {
                        display: none;
                        flex-direction: row;
                        gap: 1px;
                        opacity: 0;
                        transform: translateX(-10px);
                        transition: all 0.3s ease;
                    }
                    .color-row.visible {
                        display: flex;
                        opacity: 1;
                        transform: translateX(0);
                    }
                    .color-swatch {
                        width: 12px;
                        height: 12px;
                        border-radius: 50%;
                        cursor: pointer;
                        border: 1px solid #ccc;
                        transition: all 0.2s ease;
                        flex-shrink: 0;
                    }
                    .color-swatch:hover {
                        transform: scale(1.3);
                        border-color: #007acc;
                    }
                    .no-color {
                        background: transparent;
                        position: relative;
                    }
                    .no-color::after {
                        content: '';
                        position: absolute;
                        top: 50%;
                        left: 50%;
                        width: 12px;
                        height: 1px;
                        background: #666;
                        transform: translate(-50%, -50%) rotate(45deg);
                    }
                    .option-item {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        width: 22px;
                        height: 20px;
                        cursor: pointer;
                        border-radius: 2px;
                        transition: background-color 0.2s ease;
                        font-size: 13px;
                        flex-shrink: 0;
                    }
                    .option-item:hover {
                        background-color: #e0e0e0;
                    }
                    .option-item:active {
                        background-color: #d0d0d0;
                    }
                </style>
            </head>
            <body>
                <div class="color-section">
                    <div class="color-icon" onclick="toggleColors()" title="Click to show/hide colors">🎨</div>
                    <div class="color-row" id="colorRow">
                        <div class="color-swatch" style="background-color: #3b82f6;" onclick="sendColorAction('Blue')" title="Blue"></div>
                        <div class="color-swatch" style="background-color: #22c55e;" onclick="sendColorAction('Green')" title="Green"></div>
                        <div class="color-swatch" style="background-color: #ef4444;" onclick="sendColorAction('Red')" title="Red"></div>
                        <div class="color-swatch" style="background-color: #a855f7;" onclick="sendColorAction('Purple')" title="Purple"></div>
                        <div class="color-swatch" style="background-color: #f97316;" onclick="sendColorAction('Orange')" title="Orange"></div>
                        <div class="color-swatch no-color" onclick="sendColorAction('none')" title="No Color"></div>
                    </div>
                </div>
                <div class="option-item" onclick="sendAction('moveUp')" title="Move up">⬆️</div>
                <div class="option-item" onclick="sendAction('moveDown')" title="Move down">⬇️</div>
                <div class="option-item" onclick="sendAction('edit')" title="Edit name">✏️</div>
                <div class="option-item" onclick="sendAction('delete')" title="Delete section">×</div>
                <script>
                    const { ipcRenderer } = require('electron');
                    const sectionName = '${content.sectionName}';
                    let colorsVisible = false;
                    
                    function toggleColors() {
                        const colorRow = document.getElementById('colorRow');
                        
                        if (!colorsVisible) {
                            // Show colors
                            colorRow.style.display = 'flex';
                            setTimeout(() => {
                                colorRow.classList.add('visible');
                            }, 10);
                            colorsVisible = true;
                        } else {
                            // Hide colors
                            colorRow.classList.remove('visible');
                            setTimeout(() => {
                                colorRow.style.display = 'none';
                            }, 300);
                            colorsVisible = false;
                        }
                    }
                    
                    function sendAction(action) {
                        ipcRenderer.send('dropdown-action', { action, sectionName });
                        window.close();
                    }
                    
                    function sendColorAction(colorName) {
                        ipcRenderer.send('dropdown-action', { action: 'setColor', sectionName, colorName });
                        window.close();
                    }
                </script>
            </body>
            </html>
        `;

        dropdownPopup.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);

        dropdownPopup.on('closed', () => {
            dropdownPopup = null;
        });

        // Auto-close when clicking outside
        dropdownPopup.on('blur', () => {
            if (dropdownPopup) {
                dropdownPopup.close();
            }
        });
    });

    ipcMain.on('hide-dropdown-popup', () => {
        if (dropdownPopup) {
            dropdownPopup.close();
        }
    });

    // Handle dropdown actions from popup window
    ipcMain.on('dropdown-action', (event, data) => {
        // Forward the action to the main renderer window
        if (mainWindow) {
            mainWindow.webContents.send('execute-dropdown-action', data);
        }

        // Close the popup
        if (dropdownPopup) {
            dropdownPopup.close();
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
                                const clickX = window.lastClickX;
                                const clickY = window.lastClickY;
                                window.showSectionModal('${tabId}', clickX, clickY);
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
                        window.createNewSection();
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
                    window.createNewSection();
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