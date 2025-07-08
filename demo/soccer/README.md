# ⚽ Enhanced Soccer Simulation

A comprehensive 2D and 3D soccer simulation with advanced AI, FIFA rules, and realistic physics.

## 🚀 Quick Start

### Option 1: Automatic Server (Recommended)
**Windows:**
```bash
# Double-click or run in command prompt
start-server.bat
```

**Python (any OS):**
```bash
python serve.py
# or
python3 serve.py
```

**Node.js (any OS):**
```bash
node serve.js
```

### Option 2: Manual Server Setup
If you have other tools available:

**VS Code Live Server:**
1. Install "Live Server" extension
2. Right-click on `index.html` or `index3d.html`
3. Select "Open with Live Server"

**http-server (Node.js):**
```bash
npm install -g http-server
http-server -p 8000
```

**Python built-in server:**
```bash
# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000
```

## 🎮 Game Versions

### 2D Version (`index.html`)
- **Classic top-down view** with enhanced graphics
- **Complete FIFA rules** implementation
- **Advanced AI** with 12 player traits
- **Real-time commentary** and match statistics
- **Debug visualizations** for development

### 3D Version (`index3d.html`)
- **Immersive 3D experience** with multiple camera modes
- **All 2D features** integrated into 3D visualization
- **Professional field design** with realistic lighting
- **Enhanced controls** with WASD movement
- **Real-time sync** between 2D logic and 3D display

## 🎯 Features

### ⚽ Game Mechanics
- **22 AI players** with individual traits and abilities
- **Realistic ball physics** with friction and spin
- **Enhanced possession system** with cooldown mechanics
- **Strategic AI** with goal-oriented passing
- **Weather effects** affecting ball behavior

### 🏆 FIFA Rules Implementation
- **Professional referee** with strategic positioning
- **Card system** (yellow/red cards with consequences)
- **Match timing** with halftime and added time
- **Fouls and restarts** (throw-ins, corners, free kicks)
- **Offside detection** and enforcement

### 🧠 Advanced AI
- **12 specialized traits**: Sniper, Playmaker, Wall, Engine, etc.
- **Intelligent passing** that advances toward goal
- **Tactical positioning** with dynamic zones
- **Role-based behavior** for different player positions
- **Pressure-aware decisions** under defensive pressure

### 🎮 Controls & UI

#### 2D Version:
- **Mouse**: Click to select players, interact with UI
- **Keyboard**: Various shortcuts for game control
- **UI Panel**: Debug options, weather control, game settings

#### 3D Version:
- **WASD**: Move selected player
- **Space**: Kick ball (when near)
- **Mouse**: Camera control in free mode
- **UI Panel**: All 2D features plus camera controls

### 🔧 Debug Features
- **Player Zones**: Visualize tactical positioning
- **Field of View**: Show player perception cones
- **Ball Physics**: Display trajectory and vectors
- **Formation Debug**: Show positioning guides
- **Player Targets**: Movement indicators

## 📋 System Requirements

### Minimum:
- **Modern web browser** (Chrome, Firefox, Safari, Edge)
- **JavaScript enabled**
- **Local HTTP server** (Python, Node.js, or VS Code)

### Recommended:
- **Chrome or Firefox** for best performance
- **Python 3.7+** or **Node.js 14+** for server
- **1920x1080 resolution** for optimal UI experience

## 🛠️ Development

### File Structure:
```
demo/soccer/
├── index.html          # 2D version
├── index3d.html        # 3D version
├── main.js             # 2D game logic
├── main3d.js           # 3D game logic + 2D integration
├── player.js           # Player AI and behavior
├── ball.js             # Ball physics
├── referee.js          # FIFA rules enforcement
├── gameStateManager.js # Match flow and timing
├── traitConfig.js      # Player trait system
├── serve.py           # Python HTTP server
├── serve.js           # Node.js HTTP server
└── start-server.bat   # Windows batch file
```

### Key Components:
- **Component Reuse**: 3D version reuses all 2D game logic
- **Modular Design**: Separate files for different systems
- **ES Modules**: Modern JavaScript module system
- **Real-time Sync**: 2D logic drives 3D visualization

## 🎯 Troubleshooting

### CORS Errors:
- **Problem**: "Cross origin requests are only supported for protocol schemes..."
- **Solution**: Use one of the provided HTTP servers instead of opening files directly

### Three.js Warnings:
- **Problem**: "Scripts build/three.js and build/three.min.js are deprecated..."
- **Solution**: Already fixed - using ES modules instead

### Performance Issues:
- **3D Version**: Try reducing game speed or using overview camera
- **2D Version**: Disable debug visualizations if not needed

### Server Won't Start:
- **Port in use**: Try a different port or stop other servers
- **Python/Node not found**: Install Python or Node.js

## 🎉 Enjoy the Game!

Experience the most advanced soccer simulation with:
- **Realistic gameplay** following FIFA rules
- **Intelligent AI** with specialized player traits  
- **Professional presentation** in both 2D and 3D
- **Comprehensive debug tools** for analysis

Have fun exploring the tactical depth and realistic soccer action! ⚽🏆
