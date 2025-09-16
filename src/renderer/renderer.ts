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
        swapThreshold?: number;
        emptyInsertThreshold?: number;
        group?: string | { name: string; pull?: boolean; put?: boolean };
        sort?: boolean;
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
    section?: string;
}

let tabs: Tab[] = [];
let tabContainer: HTMLElement | null = null;
let sections: string[] = [];
let currentDraggedTabId: string | null = null;
let globalIsCurrentlyDragging = false;

// Section colors data structure
interface SectionColors {
    [sectionName: string]: string;
}

let sectionColors: SectionColors = {};

// Available color options with good contrast for both light and dark themes (1 shade darker)
const colorOptions = [
    { name: 'Blue', light: '#3b82f6', dark: '#60a5fa' },
    { name: 'Green', light: '#22c55e', dark: '#4ade80' },
    { name: 'Red', light: '#ef4444', dark: '#f87171' },
    { name: 'Purple', light: '#a855f7', dark: '#c084fc' },
    { name: 'Orange', light: '#f97316', dark: '#fb923c' }
];

// Improved function to force reset styles and prevent stuck states
function forceResetStyles() {
    requestAnimationFrame(() => {
        // Reset background colors
        document.body.style.background = 'var(--bg-color)';
        const container = document.querySelector('.container') as HTMLElement;
        const appRoot = document.getElementById('app-root');
        if (container) container.style.background = 'var(--bg-color)';
        if (appRoot) appRoot.style.background = 'var(--bg-color)';
        if (tabContainer) tabContainer.style.background = 'var(--bg-color)';

        // Clean up all drag-related classes and styles
        const allElements = document.querySelectorAll('.tab, .section-header');
        allElements.forEach(element => {
            const el = element as HTMLElement;

            // Remove all drag-related classes
            el.classList.remove(
                'sortable-drag',
                'sortable-fallback',
                'sortable-ghost',
                'drag-hover',
                'drop-target',
                'drag-over'
            );

            // Reset inline styles that might be set by SortableJS
            el.style.position = '';
            el.style.left = '';
            el.style.top = '';
            el.style.transform = '';
            el.style.zIndex = '';
            el.style.opacity = '';
            el.style.pointerEvents = '';
            el.style.cursor = '';

            // Remove drag attributes
            el.removeAttribute('data-dragging');
        });

        // Remove global drag class
        document.body.classList.remove('dragging');
    });
}

// Initialize DOM elements and functionality
function initializeApp() {
    // Get DOM elements
    tabContainer = document.getElementById('tab-container');
    const container = document.querySelector('.container') as HTMLElement;

    // Track dragging state globally to prevent conflicts

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


    // Initialize sortable with simplified drag and drop
    if (tabContainer) {
        // Simplified drag state management
        interface DragState {
            tabId: string | null;
            fromSection: string | null;
            targetSection: string | null;
            isActive: boolean;
        }

        let dragState: DragState = {
            tabId: null,
            fromSection: null,
            targetSection: null,
            isActive: false
        };

        // Clear any existing sortable instance
        const existingSortable = (tabContainer as any).sortable;
        if (existingSortable) {
            existingSortable.destroy();
        }

        // Add global mouse tracking during drag
        let globalMouseTracker: ((e: MouseEvent) => void) | null = null;

        const sortableInstance = Sortable.create(tabContainer, {
            animation: 200,
            ghostClass: 'sortable-ghost',
            dragClass: 'sortable-drag',
            draggable: '.tab',
            handle: '.tab',
            group: 'tabs',
            sort: true,
            forceFallback: true,

            onStart: (evt: SortableEvent) => {
                // Initialize drag state
                dragState.isActive = true;
                dragState.tabId = evt.item.id;
                dragState.fromSection = tabs.find(t => t.id === evt.item.id)?.section || 'Unsorted';
                dragState.targetSection = null;

                // Set global state
                globalIsCurrentlyDragging = true;
                currentDraggedTabId = dragState.tabId;
                document.body.classList.add('dragging');

                // Mark the dragged element
                evt.item.setAttribute('data-dragging', 'true');



                // Add global mouse tracking since onMove isn't reliable
                globalMouseTracker = (e: MouseEvent) => {
                    if (!dragState.isActive) return;

                    // Clear previous highlights
                    document.querySelectorAll('.section-header').forEach(header => {
                        header.classList.remove('drag-hover');
                    });

                    dragState.targetSection = null;

                    // Check all section headers
                    const allSectionHeaders = document.querySelectorAll('.section-header');
                    allSectionHeaders.forEach(header => {
                        const rect = header.getBoundingClientRect();
                        const sectionName = header.getAttribute('data-section');

                        // Expand hit area significantly
                        const expandedTop = rect.top - 20;
                        const expandedBottom = rect.bottom + 40;
                        const expandedLeft = rect.left - 20;
                        const expandedRight = rect.right + 20;

                        if (e.clientY >= expandedTop && e.clientY <= expandedBottom &&
                            e.clientX >= expandedLeft && e.clientX <= expandedRight) {
                            header.classList.add('drag-hover');
                            dragState.targetSection = sectionName;

                        }
                    });
                };

                document.addEventListener('mousemove', globalMouseTracker);
            },

            onEnd: (evt: SortableEvent) => {


                // Remove global mouse tracker
                if (globalMouseTracker) {
                    document.removeEventListener('mousemove', globalMouseTracker);
                    globalMouseTracker = null;
                }

                // Clean up visual feedback immediately
                document.querySelectorAll('.section-header').forEach(header => {
                    header.classList.remove('drag-hover', 'drop-target', 'drag-over');
                });

                evt.item.removeAttribute('data-dragging');
                document.body.classList.remove('dragging');

                // Process the drop if we have valid drag state
                if (dragState.isActive && dragState.tabId) {
                    const tab = tabs.find(t => t.id === dragState.tabId);

                    if (tab) {
                        // Try multiple methods to determine the target section
                        let finalTargetSection = dragState.targetSection;

                        // Method 1: Use the last known target section from onMove
                        if (!finalTargetSection) {

                            finalTargetSection = getSectionFromDOMPosition(evt.item);
                        }

                        // Method 2: Use the current position of the dropped element
                        if (!finalTargetSection) {

                            const rect = evt.item.getBoundingClientRect();
                            finalTargetSection = getSectionFromPosition(rect.top + rect.height / 2);
                        }

                        // Method 3: Check if any section header has drag-hover class
                        if (!finalTargetSection) {
                            const hoveredSection = document.querySelector('.section-header.drag-hover');
                            if (hoveredSection) {
                                finalTargetSection = hoveredSection.getAttribute('data-section');
                            }
                        }

                        // Apply the section change if different and valid
                        if (finalTargetSection && finalTargetSection !== tab.section) {
                            tab.section = finalTargetSection;

                            // Add section if it doesn't exist
                            if (!sections.includes(finalTargetSection) && finalTargetSection !== 'Unsorted') {
                                sections.push(finalTargetSection);
                                saveSections();
                            }

                            // Save and re-render
                            saveTabs();
                            renderAllTabs();
                        }
                    }
                }

                // Reset all drag state
                dragState = {
                    tabId: null,
                    fromSection: null,
                    targetSection: null,
                    isActive: false
                };
                globalIsCurrentlyDragging = false;
                currentDraggedTabId = null;

                // Force cleanup
                setTimeout(() => forceResetStyles(), 100);
            }
        });

        // Store reference for cleanup
        (tabContainer as any).sortable = sortableInstance;
    }

    // Initialize resize functionality
    initializeResize(container);

    // Add context menu for empty space
    if (tabContainer) {
        tabContainer.addEventListener('contextmenu', (e) => {
            // Only show context menu if clicking on empty space (not on a tab or section header)
            const target = e.target as HTMLElement;
            if (target === tabContainer || target.id === 'tab-container') {
                e.preventDefault();
                window.electronAPI.showEmptySpaceContextMenu();
            }
        });
    }

    // Load tabs
    loadTabs();

    // Initialize modal
    initializeModal();
}

// Initialize resize functionality
let isResizing = false;
let currentWidth = 90; // Default width for two columns with smaller tabs

// Global setWidth function for maximize button
function setWidthGlobal(width: number) {
    const boundedWidth = Math.max(90, Math.min(300, width));
    currentWidth = boundedWidth;

    // Get all elements that need width update
    const appRoot = document.getElementById('app-root');
    const container = document.querySelector('.container') as HTMLElement;

    // Update all elements atomically
    requestAnimationFrame(() => {
        // Set widths on all layers
        if (appRoot) appRoot.style.width = `${boundedWidth}px`;
        if (container) container.style.width = '100%';
        document.body.style.width = `${boundedWidth}px`;

        // Ensure consistent background
        document.body.style.background = 'var(--bg-color)';
        if (container) container.style.background = 'var(--bg-color)';
        if (appRoot) appRoot.style.background = 'var(--bg-color)';

        // Update window size
        window.electronAPI.resizeWindow(boundedWidth);
    });

    // Store the width
    localStorage.setItem('tabBarWidth', boundedWidth.toString());
}

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

    // Listen for window resize events from main process
    window.electronAPI.onWindowResized((width: number) => {
        currentWidth = width;
        
        // Update DOM elements to match the new width
        const appRoot = document.getElementById('app-root');
        requestAnimationFrame(() => {
            if (appRoot) appRoot.style.width = `${width}px`;
            container.style.width = '100%';
            document.body.style.width = `${width}px`;
            
            // Ensure consistent background
            document.body.style.background = 'var(--bg-color)';
            container.style.background = 'var(--bg-color)';
            if (appRoot) appRoot.style.background = 'var(--bg-color)';
        });
        
        // Store the width
        localStorage.setItem('tabBarWidth', width.toString());
    });

    // Update window size to match current width
    window.electronAPI.resizeWindow(currentWidth);
}

// Function to render a section header
function renderSectionHeader(sectionName: string, isEmpty: boolean = false) {
    if (!tabContainer) return;

    const headerElement = document.createElement('div');
    headerElement.className = 'section-header';
    headerElement.dataset.section = sectionName;
    headerElement.draggable = true; // Make section headers draggable

    // Apply section color if available
    const sectionColor = getSectionColor(sectionName);
    if (sectionColor && sectionColor !== 'transparent') {
        headerElement.style.backgroundColor = sectionColor;
        headerElement.style.color = 'white'; // Ensure text is readable on colored background
    }

    // Add empty section styling if it has no tabs
    if (isEmpty) {
        headerElement.classList.add('empty-section');
        headerElement.style.minHeight = '60px';
        headerElement.style.display = 'flex';
        headerElement.style.alignItems = 'center';
        headerElement.style.justifyContent = 'center';
    }

    const titleSpan = document.createElement('span');
    titleSpan.textContent = isEmpty ? `${sectionName} (Drop tabs here)` : sectionName;
    headerElement.appendChild(titleSpan);

    const actionsSpan = document.createElement('span');
    actionsSpan.className = 'section-actions';
    headerElement.appendChild(actionsSpan);

    // Move up button
    const moveUpButton = document.createElement('span');
    moveUpButton.innerHTML = '⬆️';
    moveUpButton.title = 'Move section up';
    moveUpButton.style.marginRight = '2px';
    actionsSpan.appendChild(moveUpButton);

    // Move down button
    const moveDownButton = document.createElement('span');
    moveDownButton.innerHTML = '⬇️';
    moveDownButton.title = 'Move section down';
    moveDownButton.style.marginRight = '2px';
    actionsSpan.appendChild(moveDownButton);

    // Edit button
    const editButton = document.createElement('span');
    editButton.innerHTML = '✏️';
    editButton.title = 'Edit section name';
    editButton.style.marginRight = '2px';
    actionsSpan.appendChild(editButton);

    // Delete button
    const deleteButton = document.createElement('span');
    deleteButton.innerHTML = '<span class="delete-icon">×</span>';
    deleteButton.title = 'Delete section';
    deleteButton.style.marginLeft = '2px';
    actionsSpan.appendChild(deleteButton);

    // Double-click to edit section name
    headerElement.addEventListener('dblclick', () => {
        editSectionName(headerElement, sectionName);
    });

    moveUpButton.addEventListener('click', (e) => {
        e.stopPropagation();
        moveSectionUp(sectionName);
    });

    moveDownButton.addEventListener('click', (e) => {
        e.stopPropagation();
        moveSectionDown(sectionName);
    });

    editButton.addEventListener('click', (e) => {
        e.stopPropagation();
        editSectionName(headerElement, sectionName);
    });

    deleteButton.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteSection(sectionName);
    });

    // Enhanced drop target handling for all sections (empty and non-empty)
    // This works in conjunction with SortableJS
    headerElement.addEventListener('dragover', (e) => {
        // Only handle if this is a tab being dragged (not a section)
        if (currentDraggedTabId) {
            e.preventDefault();
            e.stopPropagation();
            headerElement.classList.add('drag-over');
        }
    });

    headerElement.addEventListener('dragleave', (e) => {
        // Only remove drag-over if we're not moving to a child element
        if (!headerElement.contains(e.relatedTarget as Node)) {
            headerElement.classList.remove('drag-over');
        }
    });

    headerElement.addEventListener('drop', (e) => {
        // Only handle if this is a tab being dragged (not a section)
        if (currentDraggedTabId) {
            e.preventDefault();
            e.stopPropagation();
            headerElement.classList.remove('drag-over');

            // Force the tab to be assigned to this section
            const tab = tabs.find(t => t.id === currentDraggedTabId);
            if (tab && tab.section !== sectionName) {

                tab.section = sectionName;

                // Add section if it doesn't exist
                if (!sections.includes(sectionName) && sectionName !== 'Unsorted') {
                    sections.push(sectionName);
                    saveSections();
                }

                saveTabs();
                renderAllTabs();
            }
        }
    });

    // Add a drag handle for section reordering
    const dragHandle = document.createElement('span');
    dragHandle.innerHTML = '⋮⋮';
    dragHandle.title = 'Drag to reorder section';
    dragHandle.style.cssText = `
        position: absolute;
        left: 2px;
        top: 50%;
        transform: translateY(-50%);
        cursor: grab;
        opacity: 0.5;
        font-size: 12px;
        line-height: 1;
        user-select: none;
    `;
    headerElement.appendChild(dragHandle);

    // Add color circle next to drag handle
    const colorCircle = document.createElement('div');
    colorCircle.className = 'section-color-circle';
    colorCircle.title = 'Click to change section color';
    const currentColor = getSectionColor(sectionName);
    colorCircle.style.cssText = `
        position: absolute;
        left: 18px;
        top: 50%;
        transform: translateY(-50%);
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background-color: ${currentColor || 'transparent'};
        border: 1px solid var(--border-color);
        cursor: pointer;
        z-index: 1000;
        transition: all 0.2s ease;
    `;
    
    // Color circle hover effect
    colorCircle.addEventListener('mouseenter', () => {
        colorCircle.style.transform = 'translateY(-50%) scale(1.2)';
        colorCircle.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
    });
    
    colorCircle.addEventListener('mouseleave', () => {
        colorCircle.style.transform = 'translateY(-50%) scale(1)';
        colorCircle.style.boxShadow = 'none';
    });
    
    headerElement.appendChild(colorCircle);

    // Create color dropdown
    const colorDropdown = document.createElement('div');
    colorDropdown.className = 'section-color-dropdown';
    colorDropdown.style.cssText = `
        position: absolute;
        left: 18px;
        top: calc(100% + 2px);
        display: none;
        z-index: 10000;
        padding: 2px;
        min-width: 24px;
    `;
    
    // Initially hide the dropdown
    colorDropdown.style.display = 'none';
    
    // Add color options to dropdown
    colorOptions.forEach(colorOption => {
        const colorSwatch = document.createElement('div');
        const isDarkTheme = document.documentElement.getAttribute('data-theme') === 'dark';
        const swatchColor = isDarkTheme ? colorOption.dark : colorOption.light;
        colorSwatch.className = 'color-dropdown-swatch';
        colorSwatch.title = colorOption.name;
        colorSwatch.style.cssText = `
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background-color: ${swatchColor};
            margin: 2px;
            cursor: pointer;
            border: 1px solid var(--border-color);
            transition: all 0.2s ease;
            display: inline-block;
        `;
        
        colorSwatch.addEventListener('mouseenter', () => {
            colorSwatch.style.transform = 'scale(1.2)';
            colorSwatch.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
        });
        
        colorSwatch.addEventListener('mouseleave', () => {
            colorSwatch.style.transform = 'scale(1)';
            colorSwatch.style.boxShadow = 'none';
        });
        
        colorSwatch.addEventListener('click', (e) => {
            e.stopPropagation();
            sectionColors[sectionName] = colorOption.name;
            saveSectionColors();
            
            // Update the color circle
            const newColor = getSectionColor(sectionName);
            colorCircle.style.backgroundColor = newColor;
            
            // Hide dropdown
            colorDropdown.style.display = 'none';
            
            // Re-render to update all instances
            renderAllTabs();
        });
        
        colorDropdown.appendChild(colorSwatch);
    });
    
    // Add "No Color" option
    const noColorSwatch = document.createElement('div');
    noColorSwatch.className = 'color-dropdown-swatch';
    noColorSwatch.title = 'No Color';
    noColorSwatch.style.cssText = `
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background-color: transparent;
        margin: 2px;
        cursor: pointer;
        border: 1px solid var(--border-color);
        transition: all 0.2s ease;
        display: inline-block;
    `;
    
    noColorSwatch.addEventListener('mouseenter', () => {
        noColorSwatch.style.transform = 'scale(1.2)';
        noColorSwatch.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
    });
    
    noColorSwatch.addEventListener('mouseleave', () => {
        noColorSwatch.style.transform = 'scale(1)';
        noColorSwatch.style.boxShadow = 'none';
    });
    
    noColorSwatch.addEventListener('click', (e) => {
        e.stopPropagation();
        delete sectionColors[sectionName];
        saveSectionColors();
        
        // Update the color circle
        colorCircle.style.backgroundColor = 'transparent';
        
        // Hide dropdown
        colorDropdown.style.display = 'none';
        
        // Re-render to update all instances
        renderAllTabs();
    });
    
    colorDropdown.appendChild(noColorSwatch);
    headerElement.appendChild(colorDropdown);
    
    // Color circle click handler to show/hide dropdown
    colorCircle.addEventListener('click', (e) => {
        e.stopPropagation();
        
        // Hide all other dropdowns first
        document.querySelectorAll('.section-color-dropdown').forEach(dropdown => {
            if (dropdown !== colorDropdown) {
                (dropdown as HTMLElement).style.display = 'none';
            }
        });
        
        // Toggle this dropdown
        const isVisible = colorDropdown.style.display === 'flex';
        colorDropdown.style.display = isVisible ? 'none' : 'flex';
        
        // Update color swatches in dropdown based on current theme
        const isDarkTheme = document.documentElement.getAttribute('data-theme') === 'dark';
        const colorSwatches = colorDropdown.querySelectorAll('.color-dropdown-swatch');
        colorSwatches.forEach((swatch, index) => {
            if (index < colorOptions.length) {
                const colorOption = colorOptions[index];
                const swatchColor = isDarkTheme ? colorOption.dark : colorOption.light;
                (swatch as HTMLElement).style.backgroundColor = swatchColor;
            }
        });
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!headerElement.contains(e.target as Node)) {
            colorDropdown.style.display = 'none';
        }
    });

    // Section drag functionality
    dragHandle.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();

        dragHandle.style.cursor = 'grabbing';
        headerElement.style.opacity = '0.7';
        headerElement.style.transform = 'scale(0.98)';

        let startY = e.clientY;
        let currentY = startY;

        const onMouseMove = (e: MouseEvent) => {
            currentY = e.clientY;
            const deltaY = currentY - startY;

            // Visual feedback
            headerElement.style.transform = `scale(0.98) translateY(${deltaY}px)`;

            // Find target section based on mouse position
            const allSections = Array.from(document.querySelectorAll('.section-header'));
            allSections.forEach(section => section.classList.remove('section-drop-target'));

            // Find the section we're hovering over
            for (const section of allSections) {
                if (section === headerElement) continue;

                const rect = section.getBoundingClientRect();
                if (e.clientY >= rect.top && e.clientY <= rect.bottom) {
                    section.classList.add('section-drop-target');
                    break;
                }
            }
        };

        const onMouseUp = (e: MouseEvent) => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);

            // Find target section
            const allSections = Array.from(document.querySelectorAll('.section-header'));
            let targetSection = null;

            for (const section of allSections) {
                if (section === headerElement) continue;

                const rect = section.getBoundingClientRect();
                if (e.clientY >= rect.top && e.clientY <= rect.bottom) {
                    targetSection = section;
                    break;
                }
            }

            if (targetSection) {
                const targetSectionName = targetSection.getAttribute('data-section');
                if (targetSectionName && targetSectionName !== sectionName) {

                    reorderSections(sectionName, targetSectionName);
                }
            }

            // Reset styles
            dragHandle.style.cursor = 'grab';
            headerElement.style.opacity = '1';
            headerElement.style.transform = '';
            allSections.forEach(section => section.classList.remove('section-drop-target'));
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });

    tabContainer.appendChild(headerElement);
}

// Function to edit section name
function editSectionName(headerElement: HTMLElement, currentName: string) {
    const titleSpan = headerElement.querySelector('span:first-child');
    if (!titleSpan) return;

    headerElement.classList.add('editing');

    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentName;
    input.style.width = '100%';

    titleSpan.replaceWith(input);
    input.focus();
    input.select();

    let isFinished = false;

    function finishEdit() {
        if (isFinished) return;
        isFinished = true;

        const newName = input.value.trim() || currentName;

        // Update sections array
        const sectionIndex = sections.indexOf(currentName);
        if (sectionIndex !== -1) {
            sections[sectionIndex] = newName;
        }

        // Check if input is still in the DOM before replacing
        if (input.parentNode) {
            const newSpan = document.createElement('span');
            newSpan.textContent = newName;
            input.replaceWith(newSpan);
        }

        headerElement.classList.remove('editing');
        headerElement.dataset.section = newName;

        saveTabs();
        saveSections();
    }

    function cancelEdit() {
        if (isFinished) return;
        isFinished = true;

        // Check if input is still in the DOM before replacing
        if (input.parentNode) {
            const span = document.createElement('span');
            span.textContent = currentName;
            input.replaceWith(span);
        }

        headerElement.classList.remove('editing');
    }

    input.addEventListener('blur', finishEdit);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            finishEdit();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            cancelEdit();
        }
    });
}

// Function to sort tabs by section
function sortTabs() {
    tabs.sort((a, b) => {
        // Sort by section
        const sectionA = a.section || 'Unsorted';
        const sectionB = b.section || 'Unsorted';

        if (sectionA !== sectionB) {
            return sectionA.localeCompare(sectionB);
        }

        return 0;
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
function addTabWithTitle(url: string, title: string, section?: string) {
    const id = `tab-${Date.now()}`;
    const tab: Tab = {
        id,
        url,
        title: title,
        favicon: `https://www.google.com/s2/favicons?domain=${url}`,
        section: section || 'Unsorted'
    };

    tabs.push(tab);

    // Add the section to sections array if it doesn't exist
    if (section && !sections.includes(section) && section !== 'Unsorted') {
        sections.push(section);
        saveSections();
    }

    renderAllTabs();
    saveTabs();
}

// Function to update sections array - no longer based on tabs since they don't store sections
function updateSections() {
    // Since tabs no longer store section info, just save current sections array
    saveSections();
}

// Function to move tab to different section
function moveTabToSection(tabId: string, newSection: string) {
    const tab = tabs.find(t => t.id === tabId);
    if (tab) {
        tab.section = newSection;

        // Add the section to sections array if it doesn't exist
        if (!sections.includes(newSection) && newSection !== 'Unsorted') {
            sections.push(newSection);
            saveSections();
        }

        renderAllTabs();
        saveTabs();
    }
}

// Function to determine which section a tab should be in based on DOM position
function getTabSectionAtIndex(index: number): string | null {
    if (!tabContainer) return null;

    const allElements = Array.from(tabContainer.children);
    let currentSection: string | null = null;
    let tabIndex = 0;

    for (let i = 0; i < allElements.length; i++) {
        const element = allElements[i];

        if (element.classList.contains('section-header')) {
            currentSection = element.getAttribute('data-section') || 'Unsorted';
        } else if (element.classList.contains('tab')) {
            if (tabIndex === index) {
                return currentSection || 'Unsorted';
            }
            tabIndex++;
        }
    }

    // If we're adding at the end, use the last section
    return currentSection || 'Unsorted';
}

// Function to determine section based on actual DOM element position
function getTabSectionFromDOM(tabElement: HTMLElement): string | null {
    if (!tabContainer || !tabElement) return null;

    let currentElement = tabElement.previousElementSibling;

    // Walk backwards to find the nearest section header
    while (currentElement) {
        if (currentElement.classList.contains('section-header')) {
            return currentElement.getAttribute('data-section') || 'Unsorted';
        }
        currentElement = currentElement.previousElementSibling;
    }

    // If no section header found above, check if there's one at the beginning
    const firstElement = tabContainer.firstElementChild;
    if (firstElement && firstElement.classList.contains('section-header')) {
        return firstElement.getAttribute('data-section') || 'Unsorted';
    }

    return 'Unsorted';
}

// Improved function to get section from Y position
function getSectionFromPosition(clientY: number): string | null {
    if (!tabContainer) return null;

    const sectionHeaders = Array.from(tabContainer.querySelectorAll('.section-header'));

    if (sectionHeaders.length === 0) {
        return 'Unsorted';
    }

    // Sort headers by their Y position
    const sortedHeaders = sectionHeaders.sort((a, b) => {
        const aRect = a.getBoundingClientRect();
        const bRect = b.getBoundingClientRect();
        return aRect.top - bRect.top;
    });

    // Find which section the Y position falls into
    for (let i = 0; i < sortedHeaders.length; i++) {
        const header = sortedHeaders[i];
        const headerRect = header.getBoundingClientRect();

        // If we're above or within this header, it's our target
        if (clientY <= headerRect.bottom + 50) { // Add some buffer below header
            const sectionName = header.getAttribute('data-section');
            console.log(`📍 Position ${clientY} maps to section: ${sectionName}`);
            return sectionName || 'Unsorted';
        }
    }

    // If we're below all headers, use the last section
    const lastHeader = sortedHeaders[sortedHeaders.length - 1];
    const lastSectionName = lastHeader.getAttribute('data-section') || 'Unsorted';
    console.log(`📍 Below all headers, using last section: ${lastSectionName}`);
    return lastSectionName;
}

// Function to determine section from DOM position (fallback)
function getSectionFromDOMPosition(tabElement: HTMLElement): string | null {
    if (!tabContainer || !tabElement) return null;

    // Walk backwards to find the nearest section header
    let currentElement = tabElement.previousElementSibling;

    while (currentElement) {
        if (currentElement.classList.contains('section-header')) {
            return currentElement.getAttribute('data-section') || 'Unsorted';
        }
        currentElement = currentElement.previousElementSibling;
    }

    // If no section header found, check if there's one at the beginning
    const firstElement = tabContainer.firstElementChild;
    if (firstElement && firstElement.classList.contains('section-header')) {
        return firstElement.getAttribute('data-section') || 'Unsorted';
    }

    return 'Unsorted';
}

// Function to detect which section a drop event occurred in
function getDropTargetSection(event: DragEvent): string {
    if (!tabContainer) return 'Unsorted';

    const rect = tabContainer.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Find the element at the drop position within the tab container
    const elementAtPoint = document.elementFromPoint(event.clientX, event.clientY);

    if (!elementAtPoint) return 'Unsorted';

    // Check if the drop was directly on a section header
    if (elementAtPoint.classList.contains('section-header')) {
        return elementAtPoint.getAttribute('data-section') || 'Unsorted';
    }

    // Check if the drop was on a tab - find its section
    if (elementAtPoint.classList.contains('tab')) {
        const tabId = elementAtPoint.getAttribute('data-id');
        if (tabId) {
            // Tabs no longer store section info
            // Section is determined by position only
        }
    }

    // Check if the element is inside a section by traversing up the DOM
    let currentElement: Element | null = elementAtPoint;
    while (currentElement && currentElement !== tabContainer) {
        if (currentElement.classList && currentElement.classList.contains('section-header')) {
            return currentElement.getAttribute('data-section') || 'Unsorted';
        }
        currentElement = currentElement.parentElement;
    }

    // Find the section based on the Y position of the drop
    const allElements = Array.from(tabContainer.children);
    let currentSection = 'Unsorted';
    let currentY = 0;

    for (const element of allElements) {
        const elementRect = element.getBoundingClientRect();
        const relativeY = elementRect.top - rect.top;

        if (element.classList.contains('section-header')) {
            currentSection = element.getAttribute('data-section') || 'Unsorted';
            if (y >= relativeY && y <= relativeY + elementRect.height + 50) {
                // Within the section header or shortly after it
                return currentSection;
            }
        } else if (element.classList.contains('tab')) {
            if (y >= relativeY && y <= relativeY + elementRect.height) {
                // Within a tab area, use the current section
                return currentSection;
            }
        }
        currentY = relativeY + elementRect.height;
    }

    // If no specific section found, return the last section or default
    return sections.length > 0 ? sections[sections.length - 1] : 'Unsorted';
}


// Function to render all tabs grouped by sections
function renderAllTabs() {
    if (!tabContainer) {
        console.error('❌ tabContainer not found, cannot render tabs');
        return;
    }

    console.log('🎨 Starting renderAllTabs...');

    // Clear all elements except resize handle
    const elementsToRemove = tabContainer.querySelectorAll('.tab, .section-header');
    elementsToRemove.forEach(el => el.remove());
    console.log(`🧹 Cleared ${elementsToRemove.length} existing elements`);

    // Group tabs by section
    const tabsBySection: { [section: string]: Tab[] } = {};

    // Initialize with existing sections
    sections.forEach(section => {
        tabsBySection[section] = [];
    });

    // Add "Unsorted" section for tabs without a section
    tabsBySection['Unsorted'] = [];

    // Group tabs by their assigned section
    tabs.forEach(tab => {
        const section = tab.section || 'Unsorted';
        if (!tabsBySection[section]) {
            tabsBySection[section] = [];
        }
        tabsBySection[section].push(tab);
    });

    // Get all sections that actually have tabs or are in the sections array
    const allSectionsWithTabs = new Set([
        ...sections, // Explicitly created sections
        ...Object.keys(tabsBySection).filter(section => tabsBySection[section].length > 0) // Sections with tabs
    ]);

    // Convert to array and maintain sections order, with Unsorted at the end
    const sectionsToRender: string[] = [];

    // Add sections in their defined order
    sections.forEach(section => {
        if (allSectionsWithTabs.has(section)) {
            sectionsToRender.push(section);
        }
    });

    // Add any remaining sections (like those with tabs but not in sections array)
    Array.from(allSectionsWithTabs).forEach(section => {
        if (!sectionsToRender.includes(section) && section !== 'Unsorted') {
            sectionsToRender.push(section);
        }
    });

    // Add Unsorted at the end if it has tabs
    if (allSectionsWithTabs.has('Unsorted')) {
        sectionsToRender.push('Unsorted');
    }

    console.log('Rendering sections:', sectionsToRender);
    console.log('Tabs by section:', tabsBySection);

    sectionsToRender.forEach(section => {
        // Check if section is empty
        const sectionTabs = tabsBySection[section] || [];
        const isEmpty = sectionTabs.length === 0;

        console.log(`Rendering section "${section}" with ${sectionTabs.length} tabs`);

        // Always render section header
        renderSectionHeader(section, isEmpty);

        // Render tabs in this section
        if (sectionTabs.length > 0) {
            sectionTabs.forEach(tab => {
                renderTab(tab);
            });
        }
    });

    // Update sections array to include any new sections from tabs
    Object.keys(tabsBySection).forEach(section => {
        if (section !== 'Unsorted' && !sections.includes(section)) {
            sections.push(section);
        }
    });

    updateSections();
}

// Function to render a single tab
function renderTab(tab: Tab) {
    if (!tabContainer) return;

    const tabElement = document.createElement('div');
    tabElement.className = 'tab';
    tabElement.id = tab.id;

    const favicon = document.createElement('img');
    favicon.src = tab.favicon;
    favicon.alt = tab.title;

    tabElement.title = tab.title;

    tabElement.appendChild(favicon);
    tabContainer.appendChild(tabElement);

    // Add click event to open URL in default browser
    tabElement.addEventListener('click', () => {
        window.electronAPI.openUrl(tab.url);
    });

    // Add context menu event
    tabElement.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        updateSections();
        window.electronAPI.showContextMenu(tab.id, sections);
    });
}

// Save tabs to localStorage
function saveTabs() {
    localStorage.setItem('tabs', JSON.stringify(tabs));
}

// Save sections to localStorage
function saveSections() {
    localStorage.setItem('sections', JSON.stringify(sections));
}

// Save section colors to localStorage
function saveSectionColors() {
    localStorage.setItem('sectionColors', JSON.stringify(sectionColors));
}

// Load section colors from localStorage
function loadSectionColors() {
    const savedColors = localStorage.getItem('sectionColors');
    if (savedColors) {
        sectionColors = JSON.parse(savedColors);
    }
}

// Get current theme-appropriate color for a section
function getSectionColor(sectionName: string): string {
    const colorName = sectionColors[sectionName];
    if (!colorName) return 'transparent';
    
    const colorOption = colorOptions.find(opt => opt.name === colorName);
    if (!colorOption) return 'transparent';
    
    // Check if we're in dark theme
    const isDarkTheme = document.documentElement.getAttribute('data-theme') === 'dark';
    return isDarkTheme ? colorOption.dark : colorOption.light;
}

// Load tabs from localStorage
function loadTabs() {
    console.log('🔄 Loading tabs from localStorage...');

    const savedTabs = localStorage.getItem('tabs');
    if (savedTabs) {
        tabs = JSON.parse(savedTabs);
        console.log(`📋 Loaded ${tabs.length} tabs:`, tabs);
    } else {
        console.log('📋 No saved tabs found');
    }

    // Load sections
    const savedSections = localStorage.getItem('sections');
    if (savedSections) {
        sections = JSON.parse(savedSections);
        console.log(`📁 Loaded ${sections.length} sections:`, sections);
    } else {
        console.log('📁 No saved sections found');
    }
    
    // Load section colors
    loadSectionColors();

    // Always render after loading both tabs and sections
    if (tabs.length > 0 || sections.length > 0) {
        console.log('🎨 Rendering tabs...');
        renderAllTabs();
    } else {
        console.log('🎨 Nothing to render');
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
            const targetSection = getDropTargetSection(e);
            addTabWithTitle(url, finalTitle, targetSection);
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

if (window.electronAPI && window.electronAPI.onMoveTabToSection) {
    window.electronAPI.onMoveTabToSection((tabId: string, section: string) => {
        moveTabToSection(tabId, section);
    });
}

// Variables for modal handling
let currentTabIdForSection: string | null = null;

// Function to show the section creation modal
function showSectionModal(tabId?: string) {
    currentTabIdForSection = tabId || null;
    const modal = document.getElementById('section-modal') as HTMLElement;
    const input = document.getElementById('section-name-input') as HTMLInputElement;

    modal.style.display = 'block';
    input.value = '';
    input.focus();
}

// Function to confirm section creation
function confirmCreateSection() {
    const input = document.getElementById('section-name-input') as HTMLInputElement;
    const sectionName = input.value.trim();

    if (sectionName) {
        if (currentTabIdForSection) {
            // Move specific tab to new section
            moveTabToSection(currentTabIdForSection, sectionName);
        } else {
            // Create empty section
            createNewSection(sectionName);
        }
    }

    cancelCreateSection();
}

// Function to cancel section creation
function cancelCreateSection() {
    const modal = document.getElementById('section-modal') as HTMLElement;
    modal.style.display = 'none';
    currentTabIdForSection = null;
}

// Function to create a new empty section
function createNewSection(sectionName: string) {
    if (!sections.includes(sectionName)) {
        sections.push(sectionName); // Add to end, don't sort
        saveSections();
        renderAllTabs(); // Re-render to show the new section (even if empty)
    }
}

// Function to reorder sections
function reorderSections(draggedSection: string, targetSection: string) {
    const draggedIndex = sections.indexOf(draggedSection);
    const targetIndex = sections.indexOf(targetSection);

    console.log(`Reordering: ${draggedSection} (${draggedIndex}) -> ${targetSection} (${targetIndex})`);
    console.log('Before reorder:', [...sections]);

    if (draggedIndex !== -1 && targetIndex !== -1 && draggedIndex !== targetIndex) {
        // Create a new array to avoid mutation issues
        const newSections = [...sections];

        // Remove the dragged section
        const [draggedItem] = newSections.splice(draggedIndex, 1);

        // Calculate the new insertion index
        let insertIndex = targetIndex;
        if (draggedIndex < targetIndex) {
            insertIndex = targetIndex - 1; // Adjust for the removed item
        }

        // Insert the dragged section at the new position
        newSections.splice(insertIndex, 0, draggedItem);

        // Update the sections array
        sections.length = 0;
        sections.push(...newSections);

        console.log('After reorder:', [...sections]);
        saveSections();
        renderAllTabs();
    } else {
        console.log('Reorder failed: invalid indices or same position');
    }
}

// Function to move section up
function moveSectionUp(sectionName: string) {
    const index = sections.indexOf(sectionName);
    if (index > 0) {
        // Swap with previous section
        [sections[index - 1], sections[index]] = [sections[index], sections[index - 1]];
        saveSections();
        renderAllTabs();
    }
}

// Function to move section down
function moveSectionDown(sectionName: string) {
    const index = sections.indexOf(sectionName);
    if (index !== -1 && index < sections.length - 1) {
        // Swap with next section
        [sections[index], sections[index + 1]] = [sections[index + 1], sections[index]];
        saveSections();
        renderAllTabs();
    }
}

// Function to delete a section
function deleteSection(sectionName: string) {
    // Ask for confirmation before deleting
    const confirmed = confirm(`Are you sure you want to delete the section "${sectionName}"?\n\nAny tabs in this section will be moved to "Unsorted".`);

    if (!confirmed) return;

    // Move all tabs in this section to "Unsorted"
    tabs.forEach(tab => {
        if (tab.section === sectionName) {
            tab.section = 'Unsorted';
        }
    });

    // Remove the section from the sections array
    const index = sections.indexOf(sectionName);
    if (index !== -1) {
        sections.splice(index, 1);
    }

    // Save changes and re-render
    saveSections();
    saveTabs();
    renderAllTabs();
}

// Initialize modal event listeners
function initializeModal() {
    const confirmBtn = document.getElementById('confirm-section-btn');
    const cancelBtn = document.getElementById('cancel-section-btn');
    const modal = document.getElementById('section-modal') as HTMLElement;

    if (confirmBtn) {
        confirmBtn.addEventListener('click', confirmCreateSection);
    }

    if (cancelBtn) {
        cancelBtn.addEventListener('click', cancelCreateSection);
    }

    // Close modal when clicking outside
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                cancelCreateSection();
            }
        });
    }
}

// Add keyboard support for modal
document.addEventListener('keydown', (e) => {
    const modal = document.getElementById('section-modal') as HTMLElement;
    if (modal && modal.style.display === 'block') {
        if (e.key === 'Enter') {
            e.preventDefault();
            confirmCreateSection();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            cancelCreateSection();
        }
    }
});

// Expose functions globally for the context menu and tray
(window as any).moveTabToSection = moveTabToSection;
(window as any).createNewSection = () => showSectionModal();
(window as any).showSectionModal = showSectionModal;
(window as any).confirmCreateSection = confirmCreateSection;
(window as any).cancelCreateSection = cancelCreateSection;


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
            // Use CSS-styled icons for better contrast
            themeButton.innerHTML = this.currentTheme === 'light' ? 
                '<span class="theme-icon moon">🌙</span>' : 
                '<span class="theme-icon sun">☀️</span>';
            themeButton.title = `Switch to ${this.currentTheme === 'light' ? 'dark' : 'light'} mode`;
        }
        
        // Update section colors when theme changes
        this.updateSectionColors();
    }
    
    private updateSectionColors(): void {
        // Update all section color circles and headers
        document.querySelectorAll('.section-color-circle').forEach(circle => {
            const header = circle.closest('.section-header') as HTMLElement;
            if (header) {
                const sectionName = header.getAttribute('data-section');
                if (sectionName) {
                    const newColor = getSectionColor(sectionName);
                    (circle as HTMLElement).style.backgroundColor = newColor || 'transparent';
                    
                    // Update section header color
                    if (newColor && newColor !== 'transparent') {
                        header.style.backgroundColor = newColor;
                        header.style.color = 'white';
                    } else {
                        header.style.backgroundColor = '';
                        header.style.color = '';
                    }
                }
            }
        });
        
        // Update color swatches in any open dropdowns
        document.querySelectorAll('.section-color-dropdown').forEach(dropdown => {
            const colorSwatches = dropdown.querySelectorAll('.color-dropdown-swatch');
            colorSwatches.forEach((swatch, index) => {
                if (index < colorOptions.length) {
                    const colorOption = colorOptions[index];
                    const swatchColor = this.currentTheme === 'dark' ? colorOption.dark : colorOption.light;
                    (swatch as HTMLElement).style.backgroundColor = swatchColor;
                }
            });
        });
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

// Initialize window controls
function initializeWindowControls() {
    const minimizeBtn = document.getElementById('minimize-btn');
    const maximizeBtn = document.getElementById('maximize-btn');
    const closeBtn = document.getElementById('close-btn');

    if (minimizeBtn) {
        minimizeBtn.addEventListener('click', () => {
            window.electronAPI.minimizeWindow();
        });
    }

    if (maximizeBtn) {
        maximizeBtn.addEventListener('click', () => {
            // Custom maximize to 300px width instead of full screen
            setWidthGlobal(300);
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            window.electronAPI.closeWindow();
        });
    }
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initializeApp();
        initializeTheme();
        initializeWindowControls();
    });
} else {
    // DOM is already loaded
    initializeApp();
    initializeTheme();
    initializeWindowControls();
}