// Preload script for individual game windows
const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'electronAPI', {
    // Get player ID assigned to this window
    getPlayerId: () => {
      const urlParams = new URLSearchParams(window.location.search);
      return parseInt(urlParams.get('playerId') || '0');
    },
    
    // Get input type for this player
    getInputType: () => {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get('inputType') || 'keyboard';
    },
    
    // Receive controller setup information
    onControllerSetup: (callback) => {
      ipcRenderer.on('controller-setup', (event, ...args) => callback(...args));
    },
    
    // Receive gamepad input from the main process
    onGamepadInput: (callback) => {
      ipcRenderer.on('gamepad-input', (event, ...args) => callback(...args));
    },
    
    // Receive gamepad connection updates
    onGamepadConnectionUpdate: (callback) => {
      ipcRenderer.on('gamepad-connection-update', (event, data) => callback(data));
    },
    
    // Poll gamepads (for renderer -> main communication)
    onPollGamepads: (callback) => {
      ipcRenderer.on('poll-gamepads', (event) => callback());
    },
    
    // Send gamepad info to main process
    sendGamepadDetected: (data) => {
      ipcRenderer.send('gamepad-detected', data);
    },
    
    // Send messages back to main process
    sendMessage: (channel, data) => {
      ipcRenderer.send(channel, data);
    },
    
    // Tell the main process this game window is ready
    notifyReady: () => {
      ipcRenderer.send('game-window-ready');
    }
  }
);
