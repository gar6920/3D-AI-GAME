// Preload script for the launcher window
const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'api', {
    startGame: (playerCount, implementation) => {
      ipcRenderer.send('start-game', { playerCount, implementation });
    },
    
    quitApp: () => {
      ipcRenderer.send('quit-app');
    },
    
    checkServer: () => {
      ipcRenderer.send('check-server');
    },
    
    onServerStatus: (callback) => {
      ipcRenderer.on('server-status', (event, ...args) => callback(...args));
    },
    
    // Gamepad detection
    onGamepadConnectionUpdate: (callback) => {
      ipcRenderer.on('gamepad-connection-update', (event, data) => callback(data));
    },
    
    onPollGamepads: (callback) => {
      ipcRenderer.on('poll-gamepads', (event) => callback());
    },
    
    sendGamepadDetected: (data) => {
      ipcRenderer.send('gamepad-detected', data);
    }
  }
);
