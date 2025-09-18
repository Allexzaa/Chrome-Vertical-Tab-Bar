import { app, BrowserWindow, screen, BrowserView, ipcMain, shell, Menu, Tray, dialog } from 'electron';
import * as path from 'path';

let mainWindow: BrowserWindow | null = null;
let dropdownPopup: BrowserWindow | null = null;
let sectionModalPopup: BrowserWindow | null = null;
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

    // Add keyboard shortcut to open developer tools
    mainWindow.webContents.on('before-input-event', (event, input) => {
        if (input.control && input.shift && input.key.toLowerCase() === 'i') {
            mainWindow?.webContents.openDevTools();
        }
        if (input.key === 'F12') {
            mainWindow?.webContents.openDevTools();
        }
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
            const boundedWidth = Math.max(40, Math.min(266, width));

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



        dropdownPopup = new BrowserWindow({
            width: 190,  // Extra wide to ensure expanded colors fit completely
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
                webSecurity: true
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
                        padding: 3px;
                        background: transparent;
                        border: none;
                        font-family: Arial, sans-serif;
                        box-shadow: none;
                        overflow: hidden;
                        height: 100vh;
                        box-sizing: border-box;
                        display: flex;
                        flex-direction: column;
                        gap: 2px;
                    }
                    .glass-container {
                        background: rgba(61, 143, 224, 0.92);
                        backdrop-filter: blur(50px);
                        -webkit-backdrop-filter: blur(50px);
                        border: 1px solid rgba(255, 255, 255, 0.2);
                        border-radius: 6px;
                        padding: 4px 2px;
                        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
                        display: inline-flex;
                        flex-direction: column;
                        gap: 2px;
                        width: fit-content;
                        align-self: center;
                        min-width: fit-content;
                    }
                    .expanded-colors-glass {
                        background: rgba(30, 78, 102, 0.57);
                        backdrop-filter: blur(50px);
                        -webkit-backdrop-filter: blur(50px);
                        border: 1px solid rgba(255, 255, 255, 0.2);
                        border-radius: 6px;
                        padding: 3px 6px;
                        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
                        display: none;
                        width: fit-content;
                        transition: all 0.3s ease;
                        position: absolute;
                        top: 5px;
                        left: 85px;
                        z-index: 1000;
                        pointer-events: auto;
                    }
                    .expanded-colors-glass.visible {
                        display: flex;
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
                        display: flex;
                        flex-direction: row;
                        gap: 1px;
                        align-items: center;
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
                <div class="glass-container">
                    <div class="color-icon" onclick="toggleColors()" title="Click to show/hide colors">🎨</div>
                    <div class="option-item" onclick="sendAction('moveUp')" title="Move up">⬆️</div>
                    <div class="option-item" onclick="sendAction('moveDown')" title="Move down">⬇️</div>
                    <div class="option-item" onclick="sendAction('edit')" title="Edit name">✏️</div>
                    <div class="option-item" onclick="sendAction('delete')" title="Delete section">×</div>
                </div>
                <div class="expanded-colors-glass" id="expandedColorsGlass">
                    <div class="color-row" id="colorRow">
                        <div class="color-swatch" style="background-color: #3b82f6;" onclick="sendColorAction('Blue')" title="Blue"></div>
                        <div class="color-swatch" style="background-color: #22c55e;" onclick="sendColorAction('Green')" title="Green"></div>
                        <div class="color-swatch" style="background-color: #ef4444;" onclick="sendColorAction('Red')" title="Red"></div>
                        <div class="color-swatch" style="background-color: #a855f7;" onclick="sendColorAction('Purple')" title="Purple"></div>
                        <div class="color-swatch" style="background-color: #f97316;" onclick="sendColorAction('Orange')" title="Orange"></div>
                        <div class="color-swatch no-color" onclick="sendColorAction('none')" title="No Color"></div>
                    </div>
                </div>
                <script>
                    const { ipcRenderer } = require('electron');
                    const sectionName = '${content.sectionName}';
                    let colorsVisible = false;
                    
                    function toggleColors() {
                        const expandedColorsGlass = document.getElementById('expandedColorsGlass');
                        
                        if (!colorsVisible) {
                            // Show colors glass container
                            expandedColorsGlass.classList.add('visible');
                            colorsVisible = true;
                        } else {
                            // Hide colors glass container
                            expandedColorsGlass.classList.remove('visible');
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

    // Handle section modal popup
    ipcMain.on('show-section-modal', (event, x: number, y: number, tabId?: string) => {
        if (sectionModalPopup) {
            sectionModalPopup.close();
        }

        // Get main window position to calculate screen coordinates
        const mainWindowBounds = mainWindow?.getBounds();
        if (!mainWindowBounds) return;

        // Calculate screen position: main window position + relative coordinates
        const screenX = mainWindowBounds.x + x;
        const screenY = mainWindowBounds.y + y;

        sectionModalPopup = new BrowserWindow({
            width: 120,  // Smaller width for minimalistic design
            height: 70,  // Smaller height for compact layout
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
                webSecurity: true
            }
        });

        // Create HTML content for the section modal popup
        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {
                        margin: 0;
                        padding: 4px;
                        background: transparent;
                        font-family: Arial, sans-serif;
                        overflow: hidden;
                        height: 100vh;
                        box-sizing: border-box;
                        display: flex;
                        flex-direction: column;
                        gap: 2px;
                    }
                    .modal-container {
                        background: rgba(255, 255, 255, 0.95);
                        backdrop-filter: blur(10px);
                        -webkit-backdrop-filter: blur(10px);
                        border: 1px solid rgba(0, 0, 0, 0.2);
                        border-radius: 10px;
                        padding: 6px;
                        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
                        display: flex;
                        flex-direction: column;
                        gap: 4px;
                        width: fit-content;
                        align-self: center;
                    }
                    .modal-input {
                        width: 100px;
                        padding: 4px;
                        border: 1px solid #ccc;
                        border-radius: 3px;
                        font-size: 11px;
                        outline: none;
                        background: white;
                    }
                    .modal-input:focus {
                        border-color: #007acc;
                        box-shadow: 0 0 4px rgba(0, 122, 204, 0.3);
                    }
                    .button-container {
                        display: flex;
                        gap: 2px;
                        justify-content: center;
                    }
                    .modal-button {
                        padding: 4px 8px;
                        border: 1px solid #ccc;
                        border-radius: 3px;
                        cursor: pointer;
                        font-size: 8px;
                        transition: all 0.2s ease;
                        min-width: 20px;
                    }
                    .confirm-btn {
                        background: #22c55e;
                        color: white;
                        border-color: #22c55e;
                    }
                    .confirm-btn:hover {
                        background: #16a34a;
                    }
                    .cancel-btn {
                        background: #f5f5f5;
                        color: #333;
                    }
                    .cancel-btn:hover {
                        background: #e5e5e5;
                    }
                </style>
            </head>
            <body>
                <div class="modal-container">
                    <input type="text" class="modal-input" id="sectionInput" placeholder="Section name" autofocus>
                    <div class="button-container">
                        <button class="modal-button confirm-btn" onclick="confirmSection()">✓</button>
                        <button class="modal-button cancel-btn" onclick="cancelSection()">✕</button>
                    </div>
                </div>
                <script>
                    const { ipcRenderer } = require('electron');
                    const tabId = '${tabId || ''}';
                    
                    function confirmSection() {
                        const sectionName = document.getElementById('sectionInput').value.trim();
                        if (sectionName) {
                            ipcRenderer.send('section-modal-action', { 
                                action: 'confirm', 
                                sectionName, 
                                tabId: tabId || null 
                            });
                        }
                        window.close();
                    }
                    
                    function cancelSection() {
                        ipcRenderer.send('section-modal-action', { action: 'cancel' });
                        window.close();
                    }
                    
                    // Handle Enter and Escape keys
                    document.addEventListener('keydown', (e) => {
                        if (e.key === 'Enter') {
                            confirmSection();
                        } else if (e.key === 'Escape') {
                            cancelSection();
                        }
                    });
                    
                    // Auto-focus and select input
                    setTimeout(() => {
                        const input = document.getElementById('sectionInput');
                        input.focus();
                        input.select();
                    }, 100);
                </script>
            </body>
            </html>
        `;

        sectionModalPopup.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);

        sectionModalPopup.on('closed', () => {
            sectionModalPopup = null;
        });

        // Auto-close when clicking outside
        sectionModalPopup.on('blur', () => {
            if (sectionModalPopup) {
                sectionModalPopup.close();
            }
        });
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

    // Handle section modal actions
    ipcMain.on('section-modal-action', (event, data) => {
        // Forward the action to the main renderer window
        if (mainWindow) {
            mainWindow.webContents.send('section-modal-result', data);
        }

        // Close the section modal popup
        if (sectionModalPopup) {
            sectionModalPopup.close();
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