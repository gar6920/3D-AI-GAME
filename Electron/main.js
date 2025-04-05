const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const url = require('url');
const { autoUpdater } = require('electron-updater');

// Keep references to prevent garbage collection
let mainWindow;
let gameWindows = [];

// Parse command line arguments for environment configuration
function parseCommandLineArgs() {
  const args = process.argv.slice(1);
  let environment = 'production';
  let serverUrl = 'https://3d-ai-game.com';
  
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
      nodeIntegration: true,
      contextIsolation: false,
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
  });
}

// Check if server is available
async function checkServerAvailability() {
  return new Promise((resolve, reject) => {
    const http = require('http');
    const req = http.get(`${SERVER_URL}/health`, (res) => {
      if (res.statusCode === 200) {
        resolve(true);
      } else {
        reject(new Error(`Server returned status code ${res.statusCode}`));
      }
    });
    
    req.on('error', (err) => {
      reject(new Error(`Server is not available: ${err.message}`));
    });
    
    req.setTimeout(5000, () => {
      req.abort();
      reject(new Error('Server connection timed out'));
    });
  });
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
      nodeIntegration: true,
      contextIsolation: false,
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
}

// Close all game windows
function closeGameWindows() {
  gameWindows.forEach(window => {
    if (!window.isDestroyed()) {
      window.close();
    }
  });
  gameWindows = [];
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
  
  // Handle server start/stop
  ipcMain.on('check-server', async (event) => {
    try {
      await checkServerAvailability();
      event.reply('server-status', { available: true });
    } catch (error) {
      console.error('Server check failed:', error);
      event.reply('server-status', { available: false, error: error.message });
    }
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
