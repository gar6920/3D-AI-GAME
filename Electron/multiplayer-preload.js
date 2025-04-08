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
    
    // Gamepad management
    assignGamepad: (gamepadIndex, playerIndex) => {
      ipcRenderer.send('assign-gamepad', { gamepadIndex, playerIndex });
    },
    
    assignKeyboard: (playerIndex) => {
      ipcRenderer.send('assign-keyboard', { playerIndex });
    },
    
    // Create a dedicated game window for player
    createPlayerWindow: (playerIndex, inputType, config) => {
      ipcRenderer.send('create-player-window', { playerIndex, inputType, config });
    },
    
    // Gamepad detection
    onGamepadConnectionUpdate: (callback) => {
      ipcRenderer.on('gamepad-connection-update', (event, data) => callback(data));
    },
    
    onPollGamepads: (callback) => {
      ipcRenderer.on('poll-gamepads', (event) => callback());
    },
    
    // Send gamepad info (connection, disconnection)
    sendGamepadDetected: (data) => {
      ipcRenderer.send('gamepad-detected', data);
    },
    
    // Send gamepad input to main process
    sendGamepadInput: (data) => {
      ipcRenderer.send('gamepad-input', data);
    },
    
    // Game window management
    closeGame: () => {
      ipcRenderer.send('close-game');
    }
  }
);
