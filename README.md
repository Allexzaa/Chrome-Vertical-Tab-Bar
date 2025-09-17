# Vertical Tab Bar

A modern, responsive vertical tab bar application for Windows, built with Electron and TypeScript. Features an advanced hamburger menu with collapsible color picker, glass morphism effects, and intelligent responsive design that adapts to different window sizes.

## ✨ Features

### 🎨 Advanced UI & Visual Effects
- **Glass Morphism Design**: Beautiful frosted glass backgrounds with enhanced blur effects
- **Collapsible Color Picker**: Hamburger menu with expandable horizontal color selection
- **Responsive Window Controls**: Dynamic button sizing and spacing based on window width
- **Smooth Animations**: 0.3s transitions for seamless user experience
- **Section Color Coding**: Organize tabs with customizable color-coded sections

### 📱 Responsive Design
- **Adaptive Layout**: Automatically switches between wide and narrow modes
- **Smart Spacing**: Window controls compress in narrow mode to maximize space
- **Three-Tab Mode**: Hamburger menu appears when window fits 3 tabs or fewer (≤159px)
- **Dynamic Sizing**: All UI elements scale appropriately with window size

### 🎯 Tab Management
- **Drag & Drop**: Intuitive tab reordering with visual feedback
- **Section Organization**: Create and manage custom tab sections
- **Color-Coded Sections**: Assign colors to sections for better organization
- **Tab Pinning**: Keep important tabs easily accessible
- **Context Menus**: Right-click for quick actions and section management

### 🖥️ Window Management
- **Moveable Window**: Position anywhere on your screen
- **Resizable Interface**: Drag edges to adjust width (90px - 300px)
- **System Tray Integration**: Minimize to tray for background operation
- **Silent Launch**: Run without command window visibility
- **Auto-start Support**: Configure to launch on Windows startup

## Installation

### Prerequisites

- Node.js (v16 or higher)
- npm (comes with Node.js)

### Setup

1. Clone or download this repository
2. Navigate to the project directory
3. Install dependencies:
   ```bash
   npm install
   ```

## Usage

### Quick Start

**Option 1: Silent Launch (Recommended)**
- Double-click `start-tab-bar-silent.vbs` for silent operation

**Option 2: Standard Launch**
- Double-click `start-tab-bar.bat` (shows command window)

**Option 3: Manual Build & Run**
```bash
npm run build
npm start
```

## 📋 Silent Launcher Instructions

### Using start-tab-bar-silent.vbs

The VBS script provides silent execution without showing command windows:

**Features:**
- ✅ **Silent Operation**: No command window appears
- ✅ **Automatic Path Detection**: Works from any location
- ✅ **Error Handling**: Shows helpful error messages
- ✅ **Portable**: Can be moved with the project folder

**Basic Usage:**
1. **Double-click** `start-tab-bar-silent.vbs` to launch silently
2. **No command window** will appear - app starts in background

### Desktop Shortcut Setup

1. **Right-click** on `start-tab-bar-silent.vbs`
2. Select **"Send to"** → **"Desktop (create shortcut)"**
3. **Rename shortcut** to "Chrome Tab Bar" (optional)
4. **Change icon** (optional): Right-click shortcut → Properties → Change Icon

### Auto-start on Windows Boot

**Method 1: Startup Folder (Simple)**
1. Press `Win + R`, type `shell:startup`, press Enter
2. **Copy** `start-tab-bar-silent.vbs` to the startup folder
3. App will start automatically when Windows boots

**Method 2: Task Scheduler (Advanced)**
1. Press `Win + R`, type `taskschd.msc`, press Enter
2. Click **"Create Basic Task"**
3. **Name**: "Chrome Vertical Tab Bar"
4. **Trigger**: "When the computer starts"
5. **Action**: "Start a program"
6. **Program**: Browse to `start-tab-bar-silent.vbs`
7. **Finish** and test the task

### Troubleshooting VBS Script

**If the app doesn't start:**
1. **Check Node.js**: Ensure Node.js is installed
2. **Install dependencies**: Run `npm install` in project folder
3. **Verify files**: Ensure `start-tab-bar.bat` exists
4. **Run manually**: Try double-clicking `start-tab-bar.bat` first

**Error messages:**
- **"start-tab-bar.bat not found"**: Files may be in wrong location
- **No response**: Node.js might not be installed or npm dependencies missing

## 🚀 How to Use

### Basic Operations
1. **Adding Tabs**: Drag URLs or use the system tray menu
2. **Moving Tabs**: Drag and drop tabs to reorder within or between sections
3. **Moving Window**: Click and drag the title bar to reposition
4. **Resizing**: Drag the right edge to adjust width (90px - 300px)

### Section Management
1. **Create Sections**: Right-click empty space → "Create New Section"
2. **Hamburger Menu**: Click ☰ icon on any section header for options:
   - **Color Picker**: Click 🎨 to expand color selection horizontally
   - **Move Up/Down**: Reorder sections
   - **Edit Name**: Rename sections
   - **Delete**: Remove empty sections

### Color Coding
1. **Assign Colors**: Use hamburger menu → click 🎨 icon
2. **Expand Colors**: Colors appear horizontally to the right
3. **Select Color**: Click any of the 5 color circles or "No Color"
4. **Visual Organization**: Sections display with chosen background colors

### Responsive Features
- **Narrow Mode** (≤159px): Compact layout with hamburger menu and smaller controls
- **Wide Mode** (>159px): Full-featured layout with all options visible
- **Automatic Adaptation**: UI elements resize and reposition automatically

### Window Controls
- **Theme Toggle**: 🌙/☀️ icon switches between dark/light modes
- **Minimize/Maximize/Close**: Responsive buttons that adapt to window size
- **System Tray**: Minimize to tray for background operation

## Development

### Scripts

- `npm run build` - Build TypeScript files and copy assets
- `npm run dev` - Build and start the application
- `npm start` - Start the built application
- `npm run watch` - Watch for TypeScript changes

### Project Structure

```
├── src/
│   ├── main/
│   │   └── main.ts          # Electron main process
│   └── renderer/
│       ├── index.html       # UI structure and styles
│       └── renderer.ts      # Frontend logic
├── dist/                    # Compiled output
├── start-tab-bar.bat        # Windows batch launcher
├── start-tab-bar-silent.vbs # Silent VBScript launcher
└── SETUP-INSTRUCTIONS.txt   # Detailed setup guide
```

## 🎨 New Features Showcase

### Hamburger Menu with Collapsible Colors
- **Glass Background**: Frosted glass effect with 50px blur
- **Color Picker**: Click 🎨 icon to expand 6 color options horizontally
- **Smooth Animation**: 0.3s transitions for expand/collapse
- **Perfect Positioning**: Colors appear exactly to the right of the color icon

### Responsive Window Controls
- **Dynamic Sizing**: Buttons shrink in narrow mode (20×16px → 16×14px)
- **Smart Spacing**: Zero gaps between buttons in narrow mode
- **Space Optimization**: 42px → 32px total width (24% reduction)
- **Seamless Transitions**: Smooth animations when switching modes

### Enhanced Visual Effects
- **Stronger Blur**: Enhanced backdrop-filter for better glass morphism
- **Better Borders**: Improved visibility with optimized opacity
- **Hover Effects**: Responsive button hover states
- **Theme Integration**: Perfect dark/light mode compatibility

## 🔧 Technical Details

- **Framework**: Electron 26.x with modern ES6+ features
- **Language**: TypeScript with strict type checking
- **UI**: HTML5 + CSS3 with Flexbox and CSS Grid
- **Effects**: CSS backdrop-filter for glass morphism
- **Animations**: CSS transitions and transforms
- **Drag & Drop**: SortableJS library with custom enhancements
- **Build System**: TypeScript compiler with multiple targets
- **Platform**: Windows (primary), cross-platform capable
- **Performance**: Optimized rendering with requestAnimationFrame

## Configuration

The application remembers:
- Tab positions and order
- Window size and position
- Pinned tab states
- Custom tab URLs

## Troubleshooting

**App won't start:**
- Ensure Node.js is installed
- Run `npm install` in the project directory

**Command window appears:**
- Use `start-tab-bar-silent.vbs` instead of the .bat file

**Window resets position:**
- This has been fixed in the latest version

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

ISC License - See package.json for details

## Screenshots

*A clean, minimal tab bar that integrates seamlessly with your desktop workflow.*

---

**Built with ❤️ for better tab management**