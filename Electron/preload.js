// Preload script for the launcher window
const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'api', {
    startGame: (config) => {
      return ipcRenderer.invoke('start-game', config);
    },
    onGameStarted: (callback) => {
      ipcRenderer.on('game-started', (event, ...args) => callback(...args));
    },
    stopGame: () => {
      ipcRenderer.send('stop-game');
    },
    getAvailableImplementations: () => {
      return ipcRenderer.invoke('get-implementations');
    }
  }
);
