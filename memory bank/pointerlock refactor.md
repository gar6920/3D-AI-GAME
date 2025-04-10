### **Refactoring Plan: Unified Input Handling & Pointer Lock Control**

**Introduction:**

The primary goal of this refactoring is to solve a critical input handling bug: currently, Mouse & Keyboard (M+KB) actions (like moving, toggling views, or building) and camera look can still occur even when the browser's pointer lock is disengaged (e.g., after pressing 'Esc'). This breaks immersion and causes unintended behavior. **Crucially, gamepad input should remain functional regardless of the pointer lock state.**

A secondary, but equally important, goal is to **abstract input handling**, ensuring core game logic modules (`controls.js`, `game-engine.js`, `BuildingModeManager.js`, etc.) react only to abstract *actions* (e.g., `'start_moving_forward'`, `'look_delta'`) emitted via `ActionManager`, making them independent of the specific input modality (M+KB, Gamepad). **This abstraction improves code maintainability, testability, and simplifies adding future input methods.**

The root cause is fragmented input handling across multiple JavaScript modules. Input events are being processed in parallel paths, not all paths correctly check the pointer lock state, and core logic often depends directly on input events or intermediate state flags rather than abstract actions.

**Core Principle: Abstraction via Global State, Single Gatekeeper, and ActionManager**

1.  **Single Source of Truth (for M+KB Active State):** A global variable, `window.isMouseKeyboardActive`, will represent whether Mouse & Keyboard (M+KB) input intended for game control (actions *and* camera look) should be processed. It defaults to `false`. **Gamepad input processing remains independent of this flag.**

2.  **Environment-Specific Control (Flag Setting):**
    *   **Browser (Single Player - This Refactor's Focus):** An inline `<script>` within `index.html` directly listens to native browser pointer lock events (`pointerlockchange`, `pointerlockerror`). It sets `window.isMouseKeyboardActive` to `true` on successful lock and `false` on unlock or error. It also initiates the lock request via the native `element.requestPointerLock()` API when the user clicks the game container.
    *   **Electron (Multiplayer - Deferred):** *(Implementation deferred to a subsequent task)* The Electron main process will determine M+KB focus and send IPC messages (`set-mkb-active`, `true`/`false`) to the relevant webview. A preload script (`game-preload.js`) will receive the message and set `window.isMouseKeyboardActive`.

3.  **Agnostic Core Logic & The Gatekeeper (`InputManager.js`):**
    *   `InputManager.js` acts as the **sole gatekeeper** for *all* game-related M+KB input. It is the *only* module that needs to check `window.isMouseKeyboardActive`.
    *   If the flag is `false`, `InputManager` ignores incoming M+KB events (keys, buttons, mouse movement, wheel) and **does not process them further**.
    *   If the flag is `true`, `InputManager` processes the M+KB events, **translating them into abstract actions** emitted via `ActionManager` (e.g., `'start_moving_forward'`, `'stop_moving_forward'`, `'jump_press'`, `'look_delta'`, `'rotate_build_item_left'`). It should **avoid** setting intermediate global state flags like `window.moveForward` directly.
    *   All downstream modules (`ActionManager.js` subscribers like `controls.js`, `BuildingModeManager.js`, `game-engine.js`) receive input *only* as abstract actions via `ActionManager`. They **do not need to know or check** `window.isMouseKeyboardActive` themselves and should **not** rely on raw input events or intermediate state flags.
    *   Gamepad processing paths within `InputManager` also translate input into the same abstract `ActionManager` events, achieving modality independence.

**This approach ensures the core game logic remains identical and adaptable for both browser and Electron environments, controlled solely by the state of the `window.isMouseKeyboardActive` flag (gated exclusively by `InputManager.js` for M+KB input), and driven purely by abstract actions via `ActionManager`.**

**Refactoring Strategy Summary:**

1.  **Define Global Flag:** Initialize `window.isMouseKeyboardActive = false;`.
2.  **Implement Top-Level Listeners (`index.html` inline script):** Handle browser pointer lock events/requests to set the global flag. Perform initial listener cleanup in `controls.js` (removing listeners that *managed* lock state).
3.  **Implement Central Input Gate (`InputManager.js`):** Add checks to M+KB handlers to gate processing based on `window.isMouseKeyboardActive`.
4.  **Consolidate & Abstract Input (`InputManager.js`):** Ensure `InputManager` handles *all* raw input (M+KB gated, Gamepad always active), translating everything into abstract `ActionManager` events. Remove external listeners *for game controls*.
5.  **Refine `ActionManager`:** Ensure `ActionManager` defines all necessary abstract actions.
6.  **Refactor Core Logic (`controls.js`, etc.) & Test:** Update core modules to subscribe *only* to `ActionManager` events, removing dependencies on raw input/flags. Perform comprehensive testing.

---

**Detailed Steps:**

**(Matches the 6-point Summary Above)**

**Step 1: Define Global Flag**

*   **Goal:** Establish the single source of truth for M+KB active state.
*   **Files Involved:** `index.html`
*   **Actions:**
    1.  In `index.html` (inside a `<script>` tag, placed before other game scripts load), define the global flag:
        ```javascript
        // --- Global M+KB Active State Flag ---
        window.isMouseKeyboardActive = false;
        // ---
        ```
*   **Test:** Verify the variable is accessible.

**Step 2: Implement Top-Level Listeners & Initial Cleanup**

*   **Goal:** Link the global flag to native browser pointer lock events, provide click-to-lock, and remove conflicting listeners from `controls.js`.
*   **Files Involved:** `index.html`, `client/js/core/controls.js`
*   **Actions:**
    1.  In the `index.html` `<script>`: Add listeners for `pointerlockchange`, `pointerlockerror` to set `window.isMouseKeyboardActive` and update basic UI (instructions, cursor).
        ```javascript // [Code as previously defined] ```
    2.  In the `index.html` `<script>`: Add the `click` listener to `gameContainer` to call `attemptBrowserLock()` (which uses `requestPointerLock()`).
        ```javascript // [Code as previously defined] ```
    3.  In `client/js/core/controls.js` (`initControls`): **REMOVE** listeners for `'lock'`, `'unlock'`, `'click'` related to pointer lock management/UI. These are now handled in `index.html`.
*   **Test:** Browser pointer lock engages/disengages correctly on click/ESC, `window.isMouseKeyboardActive` flag updates, UI updates. Gamepad works. M+KB might still be wrong.

**Step 3: Implement Central Input Gate (`InputManager.js`)**

*   **Goal:** Make `InputManager` gate M+KB event processing based on `window.isMouseKeyboardActive`.
*   **Files Involved:** `client/js/core/InputManager.js`
*   **Actions:** Add `if (!window.isMouseKeyboardActive) { return; }` check at the start of **all** relevant M+KB handlers (`onKeyDown`, `onKeyUp`, `onMouseMove`, `onMouseDown`, `onMouseUp`, `onWheel`) *before* any further processing or action emission occurs.
*   **Test:** Load game. Use gamepad (ok). Click to lock (M+KB works). Press ESC. **Verify strictly:** *All* M+KB input produces *no* game effect. Gamepad remains functional. Click to re-lock, M+KB works again.

**Step 4: Consolidate & Abstract Input (`InputManager.js`)**

*   **Goal:** Ensure `InputManager` is the sole handler for raw game input (M+KB gated, Gamepad always active), translating everything into abstract `ActionManager` events. Remove external listeners *for game controls*.
*   **Files Involved:** `InputManager.js`, `BuildingModeManager.js`, `controls.js`, others via search.
*   **Actions:**
    1.  **Remove External Game Control Listeners:** Search the codebase and remove `addEventListener` calls (or similar) for M+KB/Gamepad events intended to trigger *game controls* from all modules *except* `InputManager.js`. UI-specific listeners that don't directly trigger game actions can remain, but should be reviewed.
    2.  **Implement Action Emitters:** Modify `InputManager`'s handlers (keydown, keyup, mousedown, mouseup, mousemove, wheel, gamepadbutton, gamepadaxis) to emit corresponding abstract actions via `window.actionManager.emit(...)`. Examples:
        *   W key down (if M+KB active): `emit('start_moving_forward')`
        *   W key up (if M+KB active): `emit('stop_moving_forward')`
        *   Mouse move (if M+KB active): `emit('look_delta', { x: deltaX, y: deltaY })`
        *   Gamepad Left Stick Y > threshold: `emit('start_moving_forward')`
        *   Gamepad Left Stick Y ~ 0: `emit('stop_moving_forward')`
        *   Gamepad Right Stick X: `emit('look_delta', { x: deltaX_gp, y: 0 })`
    3.  **Remove Intermediate State:** Stop setting global flags like `window.moveForward` within `InputManager`.
*   **Test:** Lock inactive: M+KB blocked. Lock active: M+KB and Gamepad should *attempt* to trigger actions (verify via `ActionManager` logs or basic tests). Core logic won't react correctly yet.

**Step 5: Refine `ActionManager`**

*   **Goal:** Ensure `ActionManager` defines all necessary abstract actions identified in Step 4.
*   **Files Involved:** `ActionManager.js`.
*   **Actions:**
    1.  Review `ActionManager.js` and add definitions/constants for any missing actions (`'start_moving_forward'`, `'stop_moving_forward'`, `'look_delta'`, `'toggle_build_mode'`, `'rotate_build_item_left'`, `'jump_press'`, etc.).
    2.  Ensure `InputManager` uses the correct action names when emitting.
*   **Test:** Verify `ActionManager` recognizes and can dispatch all required actions.

**Step 6: Refactor Core Logic (`controls.js`, etc.) & Test**

*   **Goal:** Make core game logic modules subscribe *only* to `ActionManager` events, removing dependencies on direct input or intermediate flags. Perform comprehensive testing.
*   **Files Involved:** `controls.js` (esp. `updateControls`, camera handling), `BuildingModeManager.js`, `game-engine.js`, etc.
*   **Actions:**
    1.  **Subscribe to Actions:** Modify modules like `controls.js` and `BuildingModeManager.js` to subscribe (`window.actionManager.on(...)`) to the relevant actions defined in Step 5.
    2.  **Replace Direct Logic:** Remove code that checks raw input or intermediate flags (e.g., `if (window.moveForward)`). Instead, use the action handlers to set internal component state (e.g., a `this.isMovingForward` flag within the relevant class/module upon receiving `'start_moving_forward'`). The main `updateControls` loop (or similar update functions) will need refactoring to react to this internal state rather than global flags.
    3.  **Handle `look_delta`:** Update camera logic (likely in `controls.js`) to react to the `'look_delta'` action, applying the provided deltas based on the current view mode.
*   **Full Test Plan:**
    *   **Gamepad:** Verify independent functionality for movement, actions, camera look via `ActionManager`.
    *   **Lock Active:** Verify M+KB functionality for movement, actions, camera look via `ActionManager`.
    *   **Lock Inactive (ESC):** *All* M+KB game input is strictly ignored. Gamepad still works.
    *   **Re-engaging Lock:** Click window after ESC -> lock re-acquires correctly, M+KB controls resume.
    *   **Input Modality Independence:** Confirm actions behave identically whether triggered by M+KB or Gamepad.
    *   **Input Fields/UI:** Ensure game input is ignored when interacting with UI elements.
    *   **(Deferred) Electron Test:** Future testing for IPC mechanism.

---