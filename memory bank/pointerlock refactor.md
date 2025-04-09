# Input System Refactor Plan (Electron Split-Screen)

## Overview

This plan details the steps to refactor the input handling for the 3D AI Game's Electron-based split-screen multiplayer mode. The goal is to reliably handle mouse/keyboard and multiple gamepad inputs across four independent game instances (webviews) without relying on native browser pointer lock or gamepad APIs within the game clients themselves, thus avoiding focus-related issues.

We will use two main strategies:
1.  **Simulated Pointer Lock:** The host window (`multiplayer.html`) will manage mouse input, simulating the lock behavior (click-to-activate, Escape-to-exit) and sending relative movement data (`dx`, `dy`) via IPC to the designated player's webview.
2.  **Centralized Gamepad Handling:** A hidden background window managed by the main process (`main.js`) will poll `navigator.getGamepads()`. The main process will route detected gamepad events via IPC to the appropriate player's webview based on user assignments made in `multiplayer.html`.

The game client code (`index.html` -> `main.js` -> ...) will be refactored to remove all native input API calls and instead listen for specific IPC messages (`player-mouse-input`, `player-gamepad-input`) sent via its preload script (`game-preload.js`).

## Step-by-Step Implementation

### Step 1: Refactor Game Client & Preload Script

*   **Goal:** Decouple the core game logic from native browser input APIs (`requestPointerLock`, `navigator.getGamepads`). Make the game react solely to input commands received via IPC.
*   **Files Involved:**
    *   Core game scripts (`index.html`, `main.js`, related modules)
    *   `electron/game-preload.js`
*   **Actions:**
    1.  **Modify Core Game Logic:**
        *   Remove **all** code related to `document.requestPointerLock()`, `document.exitPointerLock()`.
        *   Remove **all** event listeners for `'pointerlockchange'` and `'pointerlockerror'`.
        *   Remove **all** code that uses `navigator.getGamepads()` or listens for `gamepadconnected`/`gamepaddisconnected` events.
        *   Refactor input handling functions to accept processed data directly (e.g., `handleMouseLook(dx, dy)`, `handleGamepadButton(buttonId, state)`, `handleGamepadAxis(axisId, value)`). Ensure these functions exist and are callable.
    2.  **Modify `electron/game-preload.js`:**
        *   Use `contextBridge.exposeInMainWorld` to safely expose an API object (e.g., `window.electronGameInput`) to the renderer process (your game code).
        *   This exposed API should contain the necessary game input functions (e.g., `electronGameInput.mouseLook(dx, dy)`).
        *   Implement `ipcRenderer.on('player-mouse-input', (event, data) => { ... });`. Inside the handler, call the exposed game function (e.g., `window.electronGameInput.mouseLook(data.dx, data.dy)`).
        *   Implement `ipcRenderer.on('player-gamepad-input', (event, data) => { ... });`. Inside the handler, call the appropriate exposed game function based on `data` (e.g., distinguishing between button and axis events).
*   **Testing:** Use Electron main process dev tools (`yourWindow.webContents.send('player-mouse-input', { dx: 10, dy: 5 })` or `...send('player-gamepad-input', { type: 'button', index: 0, state: true })`) to manually send IPC messages to a game webview. Verify that the game responds correctly (e.g., camera moves, character acts).

### Step 2: Implement Simulated Pointer Lock (Mouse) in Host Window

*   **Goal:** Implement the click-to-activate, Escape-to-exit mouse control simulation within the host `electron/multiplayer.html` window.
*   **Files Involved:**
    *   `electron/multiplayer.html`
    *   `electron/multiplayer-preload.js` (potentially, for communication with main process if needed)
*   **Actions:**
    1.  **Identify Webview Containers:** Ensure each `<webview>` tag in `multiplayer.html` is easily selectable (e.g., has an ID like `webview-player1`).
    2.  **Add Event Listeners (`multiplayer.html` script):**
        *   Listen for `mousedown` events on the webview container elements (or a wrapper div).
        *   On `mousedown` inside Player X's area:
            *   Set a state variable `activeMousePlayer = 'playerX'`.
            *   Hide the OS cursor: `document.body.style.cursor = 'none';`.
            *   Add event listeners to the `multiplayer.html` `document` for `'mousemove'` and `'keydown'`.
    3.  **Handle Mouse Movement:**
        *   Inside the `'mousemove'` listener (only run if `activeMousePlayer` is set):
            *   Get `event.movementX`, `event.movementY`.
            *   Find the target webview element (e.g., `document.getElementById('webview-' + activeMousePlayer)`).
            *   Send IPC to the webview: `targetWebview.send('player-mouse-input', { dx: event.movementX, dy: event.movementY });`.
    4.  **Handle Deactivation (Escape Key):**
        *   Inside the `'keydown'` listener (only run if `activeMousePlayer` is set):
            *   Check if `event.key === 'Escape'`.
            *   If 'Escape' is pressed:
                *   Show the OS cursor: `document.body.style.cursor = 'auto';`.
                *   Remove the `'mousemove'` and `'keydown'` listeners from the document.
                *   Clear the state: `activeMousePlayer = null`.
*   **Testing:** Open the multiplayer window. Click inside a player's view area. The cursor should hide. Move the mouse; verify (via dev tools console logs in the webview's preload script or the game's reaction) that `player-mouse-input` messages are being sent to the correct webview. Press Escape; the cursor should reappear, and mouse movement should stop sending messages.

### Step 3: Implement Centralized Gamepad Handling

*   **Goal:** Capture input from all connected gamepads centrally and route events via IPC to the correctly assigned player webview, regardless of window focus.
*   **Files Involved:**
    *   `electron/main.js`
    *   `electron/multiplayer.html`
    *   `electron/multiplayer-preload.js`
    *   New file: `electron/gamepad-poller.html` (or similar minimal HTML)
    *   New file: `electron/gamepad-poller.js` (script for the hidden window)
*   **Actions:**
    1.  **Create Hidden Polling Window (`main.js`):**
        *   When the app is ready, create a `BrowserWindow` with `show: false`.
        *   Load `electron/gamepad-poller.html` into this hidden window.
        *   `webPreferences` should include `contextIsolation: true` and potentially a preload script if needed, although `sendToHost` might suffice.
    2.  **Implement Poller (`gamepad-poller.html` / `gamepad-poller.js`):**
        *   Use `setInterval` (e.g., every ~16ms for ~60Hz polling).
        *   Inside the interval callback, call `navigator.getGamepads()`.
        *   Compare the current state of each detected gamepad (button presses, axis values) with the state from the previous interval.
        *   If changes are detected for a specific gamepad `index`, send the change details back to the main process: `ipcRenderer.sendToHost('gamepad-update', { index: gamepadIndex, changes: detectedChanges });`. (Note: `sendToHost` requires `contextIsolation: false` or careful handling via preload/contextBridge if `contextIsolation: true` is used for the hidden window). *Alternatively, use `ipcRenderer.send` and have `main.js` listen.*
    3.  **Implement Gamepad Assignment UI (`multiplayer.html`):**
        *   Add UI elements to show currently detected gamepads (perhaps based on initial info sent from `main.js` after polling starts).
        *   Allow the user to assign a detected gamepad `index` to a Player slot (1-4).
        *   When assignments are made/changed, send the mapping to the main process: `ipcRenderer.send('set-gamepad-mapping', { player1: index0, player2: index1, ... });`. (Requires IPC setup via `multiplayer-preload.js`).
    4.  **Implement Routing (`main.js`):**
        *   Store the `gamepadMapping` received from `multiplayer.html`. Initialize it to a default.
        *   Listen for `'gamepad-update'` events from the hidden poller window (using `ipcMain.on(...)` if using `ipcRenderer.send`, or handling messages from `WebContents.ipc` if using `sendToHost`).
        *   When an update for `gamepadIndex` arrives:
            *   Look up which player `gamepadIndex` is mapped to using `gamepadMapping`.
            *   If mapped to `playerY`, find the `webContents` of Player Y's webview (you'll need to store these when creating them).
            *   Send the relevant input data to that webview: `playerYWebviewContents.send('player-gamepad-input', { ... processed gamepad data ... });`.
*   **Testing:** Connect multiple gamepads. Assign them using the UI in `multiplayer.html`. Press buttons/move axes on different controllers. Verify (via dev tools or game reaction) that the corresponding `player-gamepad-input` messages are sent only to the webview associated with the correct player slot, regardless of which window/webview is focused.