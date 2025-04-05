// Preload script for the multiplayer window
const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'api', {
    // Receive initialization data from main process
    onInit: (callback) => {
      ipcRenderer.on('init-multiplayer', (event, ...args) => callback(...args));
    },
    
    // Controller input handling
    sendControllerInput: (playerIndex, inputData) => {
      ipcRenderer.send('controller-input', { playerIndex, inputData });
    },
    
    // Game window management
    closeGame: () => {
      ipcRenderer.send('close-game');
    }
  }
);
