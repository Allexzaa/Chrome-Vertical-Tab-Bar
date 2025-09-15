/// <reference path="../types/electron.d.ts" />

// Sortable is loaded globally from CDN
interface SortableEvent extends Event {
    item: HTMLElement;
    newIndex: number;
    oldIndex: number;
    originalEvent?: DragEvent;
}

declare const Sortable: {
    create(element: HTMLElement, options: {
        animation?: number;
        direction?: string;
        ghostClass?: string;
        dragClass?: string;
        draggable?: string;
        handle?: string;
        forceFallback?: boolean;
        fallbackClass?: string;
        setData?: (dataTransfer: DataTransfer, dragEl: HTMLElement) => void;
        onStart?: (evt: SortableEvent) => void;
        onMove?: (evt: SortableEvent & { originalEvent: DragEvent }) => void;
        onEnd?: (evt: SortableEvent) => void;
    }): any;
}

interface Tab {
    id: string;
    url: string;
    title: string;
    favicon: string;
    isPinned: boolean;
}

let tabs: Tab[] = [];
let tabContainer: HTMLElement | null = null;

// Function to force reset styles and prevent stuck background colors
function forceResetStyles() {
    requestAnimationFrame(() => {
        document.body.style.background = 'var(--bg-color)';
        const container = document.querySelector('.container') as HTMLElement;
        const appRoot = document.getElementById('app-root');
        if (container) container.style.background = 'var(--bg-color)';
        if (appRoot) appRoot.style.background = 'var(--bg-color)';
        if (tabContainer) tabContainer.style.background = 'var(--bg-color)';

        // Clean up any remaining drag artifacts on all tabs
        const allTabs = document.querySelectorAll('.tab');
        allTabs.forEach(tab => {
            const tabElement = tab as HTMLElement;
            tabElement.style.position = '';
            tabElement.style.left = '';
            tabElement.style.top = '';
            tabElement.style.transform = '';
            tabElement.style.zIndex = '';
            tabElement.style.opacity = '';
            tabElement.style.pointerEvents = '';
            tabElement.classList.remove('sortable-drag', 'sortable-fallback', 'sortable-ghost');
        });
    });
}

// Initialize DOM elements and functionality
function initializeApp() {
    // Get DOM elements
    tabContainer = document.getElementById('tab-container');
    const container = document.querySelector('.container') as HTMLElement;

    // Track dragging state globally to prevent conflicts
    let globalIsCurrentlyDragging = false;

    // Add global cleanup event listeners to prevent stuck drag states
    document.addEventListener('mouseup', () => {
        // Only cleanup if we're not in a legitimate drag operation
        if (document.body.classList.contains('dragging') && !globalIsCurrentlyDragging) {
            document.body.classList.remove('dragging');
            forceResetStyles();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && document.body.classList.contains('dragging')) {
            globalIsCurrentlyDragging = false;
            document.body.classList.remove('dragging');
            forceResetStyles();
        }
    });

    // Additional cleanup when window loses focus
    window.addEventListener('blur', () => {
        if (document.body.classList.contains('dragging')) {
            globalIsCurrentlyDragging = false;
            document.body.classList.remove('dragging');
            forceResetStyles();
        }
    });

    // Ensure clean state when window regains focus
    window.addEventListener('focus', () => {
        forceResetStyles();
    });


    // Initialize sortable
    if (tabContainer) {
        let currentDragElement: HTMLElement | null = null;

        Sortable.create(tabContainer, {
            animation: 150,
            ghostClass: 'sortable-ghost',
            dragClass: 'sortable-drag',
            draggable: '.tab',  // Only make tab elements draggable
            handle: '.tab',     // Use the entire tab as the drag handle
            forceFallback: true, // Force fallback for better control
            fallbackClass: 'sortable-fallback',
            setData: function (dataTransfer: DataTransfer, dragEl: HTMLElement) {
                // Required for Firefox
                dataTransfer.setData('Text', dragEl.textContent || '');
            },
            onStart: (evt: SortableEvent) => {
                globalIsCurrentlyDragging = true;
                document.body.classList.add('dragging');
                currentDragElement = evt.item;
            },
            onEnd: (evt: SortableEvent) => {
                // Immediate cleanup
                globalIsCurrentlyDragging = false;
                document.body.classList.remove('dragging');

                currentDragElement = null;

                // Clean up the dragged element styles after a brief delay
                // to allow SortableJS to complete its internal cleanup
                requestAnimationFrame(() => {
                    if (evt.item) {
                        evt.item.style.position = '';
                        evt.item.style.left = '';
                        evt.item.style.top = '';
                        evt.item.style.transform = '';
                        evt.item.style.zIndex = '';
                        evt.item.style.opacity = '';
                        evt.item.style.pointerEvents = '';
                        evt.item.classList.remove('sortable-drag', 'sortable-fallback', 'sortable-ghost');

                        // Force a reflow to ensure styles are applied
                        evt.item.offsetHeight;
                    }

                    // Force reset any stuck styles
                    forceResetStyles();
                });

                const newIndex = evt.newIndex ?? 0;
                const oldIndex = evt.oldIndex ?? 0;

                // Only update if indices are valid and different
                if (oldIndex !== newIndex && oldIndex < tabs.length) {
                    // Update tabs array based on the new order
                    const tab = tabs[oldIndex];
                    tabs.splice(oldIndex, 1);
                    tabs.splice(newIndex, 0, tab);

                    // Sort pinned tabs to the top
                    sortTabs();
                    saveTabs();
                }
            }
        });
    }

    // Initialize resize functionality
    initializeResize(container);

    // Load tabs
    loadTabs();
}

// Initialize resize functionality
let isResizing = false;
let currentWidth = 90; // Default width for two columns with smaller tabs

function initializeResize(container: HTMLElement) {
    if (!container) return;
    
    // Initialize width from localStorage or default
    const storedWidth = localStorage.getItem('tabBarWidth');
    
    // Set up initial dimensions and styling
    const appRoot = document.getElementById('app-root');
    if (storedWidth) {
        currentWidth = parseInt(storedWidth);
    }
    
    // Apply initial styling
    requestAnimationFrame(() => {
        if (appRoot) {
            appRoot.style.width = `${currentWidth}px`;
            appRoot.style.background = 'var(--bg-color)';
        }
        container.style.width = '100%';
        container.style.background = 'var(--bg-color)';
        document.body.style.width = `${currentWidth}px`;
        document.body.style.background = 'var(--bg-color)';
    });

    function setWidth(width: number) {
        const boundedWidth = Math.max(90, Math.min(300, width));
        currentWidth = boundedWidth;
        
        // Get all elements that need width update
        const appRoot = document.getElementById('app-root');
        
        // Update all elements atomically
        requestAnimationFrame(() => {
            // Set widths on all layers
            if (appRoot) appRoot.style.width = `${boundedWidth}px`;
            container.style.width = '100%';
            document.body.style.width = `${boundedWidth}px`;

            // Ensure consistent background
            document.body.style.background = 'var(--bg-color)';
            container.style.background = 'var(--bg-color)';
            if (appRoot) appRoot.style.background = 'var(--bg-color)';

            // Update window size
            window.electronAPI.resizeWindow(boundedWidth);
        });
        
        // Store the width
        localStorage.setItem('tabBarWidth', boundedWidth.toString());
    }

    // Add resize functionality to right edge of container
    container.addEventListener('mousedown', (e) => {
        const containerRect = container.getBoundingClientRect();
        // Check if we're clicking near the right edge
        if (Math.abs(e.clientX - containerRect.right) > 5) return;

        isResizing = true;
        const startX = e.clientX;
        const startWidth = containerRect.width;

        function onMouseMove(e: MouseEvent) {
            if (!isResizing) return;
            requestAnimationFrame(() => {
                const diff = e.clientX - startX;
                const newWidth = startWidth + diff;
                setWidth(newWidth);
            });
        }

        function onMouseUp(e: MouseEvent) {
            if (!isResizing) return;
            isResizing = false;
            
            // Calculate final width
            const diff = e.clientX - startX;
            const finalWidth = startWidth + diff;
            setWidth(finalWidth);
            
            // Clean up
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            container.style.cursor = 'default';
        }

        // Set cursor and prevent text selection
        container.style.cursor = 'ew-resize';
        document.body.style.cursor = 'ew-resize';
        e.preventDefault();

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });

    // Show resize cursor when hovering near right edge
    container.addEventListener('mousemove', (e) => {
        if (isResizing) return;
        const containerRect = container.getBoundingClientRect();
        const isNearRightEdge = Math.abs(e.clientX - containerRect.right) <= 5;
        container.style.cursor = isNearRightEdge ? 'ew-resize' : 'default';
    });

    // Reset cursor when leaving container
    container.addEventListener('mouseleave', () => {
        if (!isResizing) {
            container.style.cursor = 'default';
        }
    });

    // Update window size to match current width
    window.electronAPI.resizeWindow(currentWidth);
}

// Function to sort tabs (pinned tabs go to top)
function sortTabs() {
    tabs.sort((a, b) => {
        if (a.isPinned === b.isPinned) return 0;
        return a.isPinned ? -1 : 1;
    });
    renderAllTabs();
}

// Function to add a new tab
function addTab(url: string) {
    addTabWithTitle(url, url);
}

// Expose addTab globally for the tray menu
(window as any).addTab = addTab;

// Function to add a new tab with custom title
function addTabWithTitle(url: string, title: string) {
    const id = `tab-${Date.now()}`;
    const tab: Tab = {
        id,
        url,
        title: title,
        favicon: `https://www.google.com/s2/favicons?domain=${url}`,
        isPinned: false
    };

    tabs.push(tab);
    renderTab(tab);
    saveTabs();
}

// Function to toggle pin state
function togglePin(tabId: string) {
    const tab = tabs.find(t => t.id === tabId);
    if (tab) {
        tab.isPinned = !tab.isPinned;
        sortTabs();
        saveTabs();
    }
}

// Function to render all tabs
function renderAllTabs() {
    if (!tabContainer) return;

    // Clear only tab elements, preserve resize handle
    const tabElements = tabContainer.querySelectorAll('.tab');
    tabElements.forEach(el => el.remove());

    // Render all tabs
    tabs.forEach(renderTab);
}

// Function to render a single tab
function renderTab(tab: Tab) {
    if (!tabContainer) return;

    const tabElement = document.createElement('div');
    tabElement.className = `tab${tab.isPinned ? ' pinned' : ''}`;
    tabElement.id = tab.id;

    const favicon = document.createElement('img');
    favicon.src = tab.favicon;
    favicon.alt = tab.title;

    const pinButton = document.createElement('div');
    pinButton.className = 'pin-button';
    pinButton.innerHTML = tab.isPinned ? '📌' : '📍';
    pinButton.onclick = (e) => {
        e.stopPropagation();
        togglePin(tab.id);
    };

    tabElement.title = tab.title;

    tabElement.appendChild(favicon);
    tabElement.appendChild(pinButton);
    tabContainer.appendChild(tabElement);

    // Add click event to open URL in default browser
    tabElement.addEventListener('click', () => {
        window.electronAPI.openUrl(tab.url);
    });

    // Add context menu event
    tabElement.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        window.electronAPI.showContextMenu(tab.id);
    });
}

// Save tabs to localStorage
function saveTabs() {
    localStorage.setItem('tabs', JSON.stringify(tabs));
}

// Load tabs from localStorage
function loadTabs() {
    const savedTabs = localStorage.getItem('tabs');
    if (savedTabs) {
        tabs = JSON.parse(savedTabs);
        renderAllTabs();
    }
}

// Handle drag and drop from external sources
document.addEventListener('dragenter', (e) => {
    e.preventDefault();
    e.stopPropagation();
    tabContainer?.classList.add('drag-over');
});

document.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy';
        tabContainer?.classList.add('drag-over');
    }
});

document.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    tabContainer?.classList.remove('drag-over');
});

document.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    tabContainer?.classList.remove('drag-over');

    if (!e.dataTransfer) {
        return;
    }

    let url = '';
    let title = '';

    // Try to get data in order of preference
    const dataFormats = [
        'text/x-moz-url',      // Firefox format (URL + title)
        'text/uri-list',       // Standard URI list
        'text/html',           // HTML content
        'text/plain',          // Plain text
        'text',                // Generic text
        'Text',                // Windows text
        'URL'                  // Direct URL
    ];

    for (const format of dataFormats) {
        if (e.dataTransfer.types.includes(format) && !url) {
            const data = e.dataTransfer.getData(format);

            if (data) {
                switch (format) {
                    case 'text/x-moz-url':
                        // Mozilla format: URL on first line, title on second line
                        const lines = data.split('\n');
                        if (lines.length >= 1 && lines[0].trim().match(/^https?:\/\//)) {
                            url = lines[0].trim();
                            title = lines.length > 1 ? lines[1].trim() : '';
                        }
                        break;

                    case 'text/uri-list':
                        // URI list format - take first valid URL
                        const uris = data.split(/\r?\n/).filter(line =>
                            line.trim() && !line.trim().startsWith('#') && line.trim().match(/^https?:\/\//)
                        );
                        if (uris.length > 0) {
                            url = uris[0].trim();
                        }
                        break;

                    case 'text/html':
                        // Extract from HTML content
                        // First try to find a link with href and text content
                        let linkMatch = data.match(/<a[^>]+href=["']([^"']+)["'][^>]*>([^<]*)<\/a>/i);
                        if (linkMatch && linkMatch[1].match(/^https?:\/\//)) {
                            url = linkMatch[1];
                            title = linkMatch[2].trim();
                        } else {
                            // Try to extract title from title tag
                            const titleMatch = data.match(/<title[^>]*>([^<]+)<\/title>/i);
                            if (titleMatch) {
                                title = titleMatch[1].trim();
                            }

                            // Try to find any URL in the HTML
                            const urlMatch = data.match(/href=["']([^"']+)["']/i) ||
                                           data.match(/(https?:\/\/[^\s<>"']+)/);
                            if (urlMatch && urlMatch[1] && urlMatch[1].match(/^https?:\/\//)) {
                                url = urlMatch[1];
                            }
                        }
                        break;

                    case 'text/plain':
                    case 'text':
                    case 'Text':
                    case 'URL':
                        // For text formats, check if it's a direct URL or contains one
                        const trimmedData = data.trim();
                        if (trimmedData.match(/^https?:\/\/[^\s]+$/)) {
                            // Direct URL
                            url = trimmedData;
                        } else {
                            // Try to extract URL from text
                            const urlMatch = trimmedData.match(/(https?:\/\/[^\s]+)/);
                            if (urlMatch) {
                                url = urlMatch[1];
                                // Use the full text as title if it's reasonably short
                                if (trimmedData.length <= 200 && trimmedData !== url) {
                                    title = trimmedData;
                                }
                            }
                        }
                        break;
                }
            }
        }
    }

    // Fallback: Try to extract any data that might be available
    if (!url) {
        // Try accessing any available type directly
        for (const type of e.dataTransfer.types) {
            try {
                const data = e.dataTransfer.getData(type);
                if (data && !url) {
                    // Look for URLs in any format
                    const urlMatch = data.match(/(https?:\/\/[^\s<>"']+)/);
                    if (urlMatch) {
                        url = urlMatch[1];
                    }
                }
            } catch (e) {
                // Ignore errors accessing data types
            }
        }
    }

    // Clean up and validate the URL
    if (url) {
        // Remove any HTML tags that might have slipped through
        url = url.replace(/<[^>]*>/g, '').trim();

        // Remove any trailing punctuation or whitespace
        url = url.replace(/[.,;!?\s]+$/, '');

        // Validate URL format
        if (url.match(/^https?:\/\/.+\..+/)) {
            // Clean up title
            if (title) {
                title = title.replace(/<[^>]*>/g, '').trim();
                // If title is too long or same as URL, just use URL
                if (title.length > 100 || title === url) {
                    title = '';
                }
            }

            const finalTitle = title || url;
            addTabWithTitle(url, finalTitle);
        }
    } else {
        // Show user-friendly message about Chrome tab limitations
        if (e.dataTransfer.types.length === 0 ||
            (e.dataTransfer.types.length === 1 && e.dataTransfer.types[0] === 'Files')) {

            // Optional: Show a temporary visual feedback
            if (tabContainer) {
                const message = document.createElement('div');
                message.textContent = 'Try dragging the URL from the address bar instead';
                message.style.cssText = `
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: rgba(0,0,0,0.8);
                    color: white;
                    padding: 10px;
                    border-radius: 5px;
                    font-size: 12px;
                    z-index: 1000;
                    pointer-events: none;
                `;
                tabContainer.appendChild(message);

                setTimeout(() => {
                    if (message.parentNode) {
                        message.parentNode.removeChild(message);
                    }
                }, 3000);
            }
        }
    }
});

// Handle IPC events
if (window.electronAPI && window.electronAPI.onTogglePin) {
    window.electronAPI.onTogglePin((tabId: string) => {
        togglePin(tabId);
    });
}

if (window.electronAPI && window.electronAPI.onRemoveTab) {
    window.electronAPI.onRemoveTab((tabId: string) => {
        const index = tabs.findIndex(t => t.id === tabId);
        if (index !== -1) {
            tabs.splice(index, 1);
            renderAllTabs();
            saveTabs();
        }
    });
}


// Theme management
class ThemeManager {
    private currentTheme: 'light' | 'dark' = 'light';

    constructor() {
        this.loadTheme();
        this.setupThemeToggle();
    }

    private loadTheme(): void {
        const savedTheme = localStorage.getItem('app-theme') as 'light' | 'dark' | null;
        this.currentTheme = savedTheme || 'light';
        this.applyTheme();
    }

    private applyTheme(): void {
        document.documentElement.setAttribute('data-theme', this.currentTheme);
        const themeButton = document.getElementById('theme-toggle');
        if (themeButton) {
            themeButton.textContent = this.currentTheme === 'light' ? '🌙' : '☀️';
            themeButton.title = `Switch to ${this.currentTheme === 'light' ? 'dark' : 'light'} mode`;
        }
    }

    private setupThemeToggle(): void {
        const themeButton = document.getElementById('theme-toggle');
        if (themeButton) {
            themeButton.addEventListener('click', () => {
                this.toggleTheme();
            });
        }
    }

    private toggleTheme(): void {
        this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.applyTheme();
        this.saveTheme();
    }

    private saveTheme(): void {
        localStorage.setItem('app-theme', this.currentTheme);
    }
}

// Initialize theme manager after DOM is ready
function initializeTheme() {
    new ThemeManager();
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initializeApp();
        initializeTheme();
    });
} else {
    // DOM is already loaded
    initializeApp();
    initializeTheme();
}