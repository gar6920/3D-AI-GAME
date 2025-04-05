// Preload script for individual game windows
const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'electronAPI', {
    // Receive controller setup information
    onControllerSetup: (callback) => {
      ipcRenderer.on('controller-setup', (event, ...args) => callback(...args));
    },
    
    // Receive gamepad input from the main process
    onGamepadInput: (callback) => {
      ipcRenderer.on('gamepad-input', (event, ...args) => callback(...args));
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
