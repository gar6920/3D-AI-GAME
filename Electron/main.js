const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const url = require('url');
const { autoUpdater } = require('electron-updater');

// Keep references to prevent garbage collection
let mainWindow;
let gameWindows = [];

// Gamepad management
const gamepads = {}; // Store connected gamepads
const gamepadAssignments = {}; // Map gamepad to player
const playerInputMap = {}; // Map player to input type & gamepad

// Gamepad polling
let gamepadPollingInterval = null;
const GAMEPAD_POLL_RATE = 16; // ~60fps

// Parse command line arguments for environment configuration
function parseCommandLineArgs() {
  const args = process.argv.slice(1);
  let environment = 'production';
  let serverUrl = environment === 'development' ? 'http://localhost:3000' : 'http://sea-lion-app-4mc79.ondigitalocean.app:8080';
  
  args.forEach(arg => {
    if (arg.startsWith('--env=')) {
      environment = arg.split('=')[1];
    }
    if (arg.startsWith('--server=')) {
      serverUrl = arg.split('=')[1];
    }
  });
  
  console.log(`Starting in ${environment} environment, connecting to ${serverUrl}`);
  return { environment, serverUrl };
}

// Get configuration from command line or defaults
const config = parseCommandLineArgs();

// Server config
const SERVER_PORT = 3000;
const SERVER_URL = config.serverUrl || `http://localhost:${SERVER_PORT}`;

// Register custom protocol handler - now using 3dgame
app.setAsDefaultProtocolClient('3dgame');

// Handle single instance lock to prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  // If we couldn't get the lock, quit immediately
  app.quit();
} else {
  // If we got the lock, register a second-instance handler
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, focus our window instead
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
      
      // Handle the protocol URL if this second instance was started via protocol
      if (process.platform === 'win32' && commandLine.length > 1) {
        // The second command line argument might be the URL
        const protocolUrl = commandLine.find(arg => arg.startsWith('3dgame://'));
        if (protocolUrl) {
          handleProtocolLaunch(protocolUrl);
        }
      }
    }
  });
}

// Create the main window
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    title: '3D AI Game - Launcher',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Maximize the window on startup
  mainWindow.maximize();

  // Load the main menu interface
  mainWindow.loadFile(path.join(__dirname, 'launcher.html'));

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
    closeGameWindows();
    stopGamepadPolling();
  });
}

// Check if server is available
async function checkServerAvailability() {
  return new Promise((resolve, reject) => {
    const url = require('url');
    const parsedUrl = url.parse(SERVER_URL);
    const protocol = parsedUrl.protocol === 'https:' ? require('https') : require('http');
    let retries = 3;
    let lastError = null;
    
    function attemptConnection() {
      console.log(`Attempting to connect to server at ${SERVER_URL}/health (Attempt ${4 - retries} of 3)`);
      const req = protocol.get(`${SERVER_URL}/health`, (res) => {
        console.log(`Server response status code: ${res.statusCode}`);
        if (res.statusCode === 200) {
          console.log('Server connection successful.');
          resolve(true);
        } else {
          lastError = new Error(`Server returned status code ${res.statusCode}`);
          console.log(lastError.message);
          retryOrReject();
        }
      });
      
      req.on('error', (err) => {
        lastError = new Error(`Server is not available: ${err.message}`);
        console.log(lastError.message);
        retryOrReject();
      });
      
      req.setTimeout(5000, () => {
        req.abort();
        lastError = new Error('Server connection timed out');
        console.log(lastError.message);
        retryOrReject();
      });
      
      function retryOrReject() {
        retries--;
        if (retries > 0) {
          console.log(`Retrying connection... (${retries} attempts left)`);
          setTimeout(attemptConnection, 2000);
        } else {
          reject(lastError);
        }
      }
    }
    
    attemptConnection();
  });
}

// Initialize gamepad detection
function initializeGamepadDetection() {
  console.log('Initializing gamepad detection');
  
  // Set up polling interval for gamepad states
  startGamepadPolling();
  
  // This is a workaround since Electron doesn't expose gamepad API directly
  ipcMain.on('gamepad-detected', (event, data) => {
    if (data.connected) {
      console.log(`Gamepad connected: ${data.id}, index: ${data.index}`);
      gamepads[data.index] = {
        id: data.id,
        index: data.index,
        timestamp: Date.now(),
        assigned: false
      };
      
      // Notify all game windows about newly connected gamepad
      sendGamepadConnectionUpdate(data.index, true);
    } else {
      console.log(`Gamepad disconnected: index: ${data.index}`);
      
      // Check if this gamepad was assigned to a player
      if (gamepads[data.index] && gamepadAssignments[data.index] !== undefined) {
        const playerId = gamepadAssignments[data.index];
        // Unassign the gamepad
        delete gamepadAssignments[data.index];
        
        // Update player input map
        if (playerInputMap[playerId] && playerInputMap[playerId].type === 'gamepad') {
          delete playerInputMap[playerId];
        }
      }
      
      // Remove the gamepad from our list
      delete gamepads[data.index];
      
      // Notify all game windows
      sendGamepadConnectionUpdate(data.index, false);
    }
  });
}

// Start polling for gamepad states
function startGamepadPolling() {
  if (gamepadPollingInterval) return; // Already polling
  
  console.log('Starting gamepad polling');
  gamepadPollingInterval = setInterval(() => {
    // Request an update from renderer (gamepads can only be accessed from a renderer process)
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('poll-gamepads');
    } else if (gameWindows.length > 0) {
      // If main window is closed but we have game windows, poll through one of them
      gameWindows[0].webContents.send('poll-gamepads');
    }
  }, GAMEPAD_POLL_RATE);
}

// Stop gamepad polling
function stopGamepadPolling() {
  if (gamepadPollingInterval) {
    clearInterval(gamepadPollingInterval);
    gamepadPollingInterval = null;
    console.log('Gamepad polling stopped');
  }
}

// Send gamepad connection updates to all windows
function sendGamepadConnectionUpdate(gamepadIndex, isConnected) {
  // Send to main window
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('gamepad-connection-update', {
      index: gamepadIndex,
      connected: isConnected,
      gamepad: isConnected ? gamepads[gamepadIndex] : null
    });
  }
  
  // Send to all game windows
  gameWindows.forEach(window => {
    if (!window.isDestroyed()) {
      window.webContents.send('gamepad-connection-update', {
        index: gamepadIndex,
        connected: isConnected,
        gamepad: isConnected ? gamepads[gamepadIndex] : null
      });
    }
  });
}

// Handle gamepad input from renderer
function handleGamepadInput(data) {
  // Check if this gamepad is assigned to a player
  if (gamepadAssignments[data.gamepadIndex] === undefined) return;
  
  const playerId = gamepadAssignments[data.gamepadIndex];
  
  // Find the game window for this player
  const targetWindow = gameWindows[playerId];
  if (!targetWindow || targetWindow.isDestroyed()) return;
  
  // Forward the input to the appropriate game window
  targetWindow.webContents.send('gamepad-input', {
    type: data.type, // 'button' or 'axis'
    gamepadIndex: data.gamepadIndex,
    buttonIndex: data.buttonIndex,
    axisIndex: data.axisIndex,
    isPressed: data.isPressed,
    value: data.value
  });
}

// Assign gamepad to player
function assignGamepadToPlayer(gamepadIndex, playerId) {
  console.log(`Assigning gamepad ${gamepadIndex} to player ${playerId}`);
  
  // Unassign any previously assigned gamepad for this player
  Object.keys(gamepadAssignments).forEach(gpIndex => {
    if (gamepadAssignments[gpIndex] === playerId) {
      delete gamepadAssignments[gpIndex];
      console.log(`Unassigned previous gamepad ${gpIndex} from player ${playerId}`);
    }
  });
  
  // Assign the new gamepad
  gamepadAssignments[gamepadIndex] = playerId;
  gamepads[gamepadIndex].assigned = true;
  
  // Update player input map
  playerInputMap[playerId] = {
    type: 'gamepad',
    gamepadIndex: gamepadIndex
  };
  
  // Notify the target game window about its assigned gamepad
  const targetWindow = gameWindows[playerId];
  if (targetWindow && !targetWindow.isDestroyed()) {
    targetWindow.webContents.send('controller-setup', {
      type: 'gamepad',
      gamepadIndex: gamepadIndex,
      gamepadId: gamepads[gamepadIndex].id
    });
  }
  
  return true;
}

// Assign keyboard/mouse to player
function assignKeyboardToPlayer(playerId) {
  console.log(`Assigning keyboard/mouse to player ${playerId}`);
  
  // Update player input map
  playerInputMap[playerId] = {
    type: 'keyboard'
  };
  
  // Notify the target game window
  const targetWindow = gameWindows[playerId];
  if (targetWindow && !targetWindow.isDestroyed()) {
    targetWindow.webContents.send('controller-setup', {
      type: 'keyboard'
    });
  }
  
  return true;
}

// Launch the game with specific player configuration
function launchGame(playerCount, implementation = 'default') {
  console.log(`Launching game with ${playerCount} player(s), implementation: ${implementation}`);
  
  // Close any existing game windows
  closeGameWindows();
  
  // Always use the multiplayer setup for controller selection
  const multiplayerWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    title: `3D AI Game - ${playerCount} Players - ${implementation}`,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'multiplayer-preload.js')
    }
  });

  // Maximize the window on startup
  multiplayerWindow.maximize();

  multiplayerWindow.loadFile(path.join(__dirname, 'multiplayer.html'), {
    query: { 
      playerCount: playerCount, 
      implementation: implementation,
      serverUrl: SERVER_URL,
      environment: config.environment
    }
  });

  // Dev tools in dev mode
  if (process.env.NODE_ENV === 'development') {
    multiplayerWindow.webContents.openDevTools();
  }

  multiplayerWindow.setMenuBarVisibility(false);
  gameWindows.push(multiplayerWindow);
  
  // Make sure gamepad polling is active
  startGamepadPolling();
  
  // Reset player input assignments for new game
  for (let i = 0; i < playerCount; i++) {
    playerInputMap[i] = null;
  }
}

// Create a game window for a specific player with appropriate input device
function createPlayerGameWindow(playerIndex, inputType, options = {}) {
  console.log(`Creating game window for player ${playerIndex} with input ${inputType}`);
  
  // Create window with player-specific settings
  const gameWindow = new BrowserWindow({
    width: options.width || 800,
    height: options.height || 600,
    x: options.x,
    y: options.y,
    title: `3D AI Game - Player ${playerIndex + 1}`,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, inputType === 'gamepad' ? 'game-preload.js' : 'preload.js')
    },
    fullscreen: options.fullscreen || false
  });
  
  // Load the game URL with player-specific parameters
  const gameUrl = new URL(`${SERVER_URL}/game`);
  gameUrl.searchParams.append('implementation', options.implementation || 'default');
  gameUrl.searchParams.append('playerId', playerIndex);
  gameUrl.searchParams.append('inputType', inputType);
  
  gameWindow.loadURL(gameUrl.toString());
  
  // Set game window properties
  gameWindow.setMenuBarVisibility(false);
  
  // Add to gameWindows array at specific index
  gameWindows[playerIndex] = gameWindow;
  
  // Setup window close handler
  gameWindow.on('closed', () => {
    gameWindows[playerIndex] = null;
    
    // Check if all game windows are closed
    const allClosed = gameWindows.every(win => win === null);
    if (allClosed) {
      // Reset any gamepad assignments
      Object.keys(gamepadAssignments).forEach(key => {
        delete gamepadAssignments[key];
        if (gamepads[key]) {
          gamepads[key].assigned = false;
        }
      });
    }
  });
  
  return gameWindow;
}

// Close all game windows
function closeGameWindows() {
  gameWindows.forEach(window => {
    if (window && !window.isDestroyed()) {
      window.close();
    }
  });
  gameWindows = [];
  
  // Reset gamepad assignments
  Object.keys(gamepadAssignments).forEach(key => {
    delete gamepadAssignments[key];
    if (gamepads[key]) {
      gamepads[key].assigned = false;
    }
  });
}

// Handle URL protocol launches
function handleProtocolLaunch(rawUrl) {
  console.log('Protocol launch requested with URL:', rawUrl);
  
  try {
    // Parse URL - now handling 3dgame:// protocol
    const parsedUrl = url.parse(rawUrl);
    
    if (parsedUrl.protocol === '3dgame:') {
      // Remove any leading slashes from the pathname
      const cleanPath = parsedUrl.pathname.replace(/^\/+/, '');
      const pathParts = cleanPath.split('/');
      
      console.log('Parsed protocol path parts:', pathParts);
      
      // Handle ping command (used for app detection)
      if (pathParts[0] === 'ping') {
        console.log('Ping received - app detection check');
        // Just need to focus the app to trigger detection
        if (mainWindow) {
          if (mainWindow.isMinimized()) mainWindow.restore();
          mainWindow.focus();
        } else {
          // Create a temporary window that will be hidden and closed immediately
          // This is used to just trigger window.blur in the browser
          const tempWindow = new BrowserWindow({
            width: 0,
            height: 0,
            show: false,
            focusable: true
          });
          tempWindow.once('ready-to-show', () => {
            tempWindow.focus();
            setTimeout(() => tempWindow.close(), 50);
          });
          tempWindow.loadURL('about:blank');
        }
        return true;
      }
      
      if (pathParts[0] === 'launch') {
        // Default configuration
        let playerCount = 2;
        let implementation = 'default';
        
        // Parse query parameters if available
        if (parsedUrl.query) {
          const queryParams = new URLSearchParams(parsedUrl.query);
          if (queryParams.has('players')) {
            playerCount = parseInt(queryParams.get('players'));
          }
          if (queryParams.has('implementation')) {
            implementation = queryParams.get('implementation');
          }
        }
        
        console.log(`Launching from protocol with ${playerCount} players and implementation: ${implementation}`);
        
        // Launch game with extracted configuration
        launchGame(playerCount, implementation);
        return true;
      }
    }
  } catch (error) {
    console.error('Error handling protocol URL:', error);
  }
  
  return false;
}

// Set up IPC event handlers
function setupIPC() {
  // Handle game start request from launcher
  ipcMain.on('start-game', (event, { playerCount, implementation }) => {
    console.log(`Start game request received for ${playerCount} players, implementation: ${implementation}`);
    launchGame(playerCount, implementation);
  });
  
  // Handle quit request
  ipcMain.on('quit-app', () => {
    app.quit();
  });
  
  // Handle server check
  ipcMain.on('check-server', async (event) => {
    try {
      await checkServerAvailability();
      event.reply('server-status', { available: true });
    } catch (error) {
      console.error('Server check failed:', error);
      event.reply('server-status', { available: false, error: error.message });
    }
  });
  
  // Handle gamepad assignment from multiplayer screen
  ipcMain.on('assign-gamepad', (event, { gamepadIndex, playerIndex }) => {
    assignGamepadToPlayer(gamepadIndex, playerIndex);
  });
  
  // Handle keyboard assignment from multiplayer screen
  ipcMain.on('assign-keyboard', (event, { playerIndex }) => {
    assignKeyboardToPlayer(playerIndex);
  });
  
  // Handle gamepad input from polling
  ipcMain.on('gamepad-input', (event, data) => {
    handleGamepadInput(data);
  });
  
  // Handle game window ready notification
  ipcMain.on('game-window-ready', (event) => {
    // Find which window sent this
    const window = BrowserWindow.fromWebContents(event.sender);
    const playerIndex = gameWindows.findIndex(win => win === window);
    
    if (playerIndex >= 0 && playerInputMap[playerIndex]) {
      // Send input setup to the window
      event.sender.send('controller-setup', playerInputMap[playerIndex]);
    }
  });
  
  // Handle create-player-window request
  ipcMain.on('create-player-window', (event, { playerIndex, inputType, config }) => {
    createPlayerGameWindow(playerIndex, inputType, config);
  });
}

// Setup auto-updater
function setupAutoUpdater() {
  autoUpdater.logger = console;
  autoUpdater.on('checking-for-update', () => {
    console.log('Checking for updates...');
  });
  autoUpdater.on('update-available', (info) => {
    console.log('Update available:', info);
  });
  autoUpdater.on('update-not-available', () => {
    console.log('No updates available');
  });
  autoUpdater.on('error', (err) => {
    console.error('Auto-updater error:', err);
  });
  autoUpdater.on('update-downloaded', () => {
    console.log('Update downloaded - will install on quit');
  });
}

// App initialization
app.whenReady().then(() => {
  createMainWindow();
  setupIPC();
  setupAutoUpdater();
  initializeGamepadDetection();
  
  // Check for updates (only in production)
  if (process.env.NODE_ENV !== 'development') {
    autoUpdater.checkForUpdatesAndNotify();
  }
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

// Handle macOS dock click
app.on('activate', () => {
  if (mainWindow === null) {
    createMainWindow();
  }
});

// Handle protocol activation from launch or OS
app.on('open-url', (event, url) => {
  event.preventDefault();
  
  if (app.isReady()) {
    handleProtocolLaunch(url);
  } else {
    // If app is not ready, defer handling until it is
    app.once('ready', () => {
      setTimeout(() => {
        handleProtocolLaunch(url);
      }, 500);
    });
  }
});

// Handle Windows protocol launch
if (process.platform === 'win32' && process.argv.length >= 2) {
  // Windows passes protocol URLs as command line arguments
  const protocolUrl = process.argv.find(arg => arg.startsWith('3dgame://'));
  if (protocolUrl) {
    app.once('ready', () => {
      handleProtocolLaunch(protocolUrl);
    });
  }
}

// Gracefully shut down when all windows are closed
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
