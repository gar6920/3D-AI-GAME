### **Refactoring Plan: Unified Input Handling & Pointer Lock Control**

**Introduction:**

The primary goal of this refactoring is to solve a critical input handling bug: currently, keyboard and mouse actions (like moving, toggling views, or building) can still occur even when the browser's pointer lock is disengaged (e.g., after pressing 'Esc'). This breaks immersion and causes unintended behavior.

The root cause is fragmented input handling across multiple JavaScript modules. Input events are being processed in parallel paths, and not all paths correctly check the pointer lock state.

**Core Principle: Abstraction via Global State**

1.  **Single Source of Truth (for M+KB Active State):** A global variable, `window.isMouseKeyboardActive`, will represent whether Mouse & Keyboard (M+KB) input intended for game control should be processed. It defaults to `false`.

2.  **Environment-Specific Control:**
    *   **Browser (Single Player):** An inline `<script>` within `index.html` directly listens to native browser pointer lock events (`pointerlockchange`, `pointerlockerror`). It sets `window.isMouseKeyboardActive` to `true` on successful lock and `false` on unlock or error. It also initiates the lock request via the native `element.requestPointerLock()` API when the user clicks the game container.
    *   **Electron (Multiplayer):** The Electron main process determines which game instance (webview) has M+KB focus. It sends IPC messages (`set-mkb-active`, `true`/`false`) to the relevant webview. A preload script (`game-preload.js`) in the webview receives the message and sets `window.isMouseKeyboardActive` accordingly.

3.  **Agnostic Core Logic:** All deeper game modules (`InputManager.js`, `ActionManager.js`, `controls.js`, `BuildingModeManager.js`, etc.) **do not know or care *why*** `window.isMouseKeyboardActive` is true or false. They **only check its current value**. `InputManager.js` specifically acts as the central gate: if the flag is `false`, it ignores incoming M+KB events; if `true`, it processes them.

**This approach ensures the core game logic remains identical and adaptable for both browser and Electron environments, controlled solely by the state of the `window.isMouseKeyboardActive` flag.**

**Refactoring Strategy Summary:**

1.  **Define Global Flag:** Initialize `window.isMouseKeyboardActive = false;`.
2.  **Implement Top-Level Listeners (`index.html` inline script):** Handle `pointerlockchange`, `pointerlockerror`, and the click-to-lock (using `requestPointerLock()`) to set the global flag.
3.  **Implement Central Input Gate (`InputManager.js`):** Add checks at the start of M+KB handlers to only proceed if `window.isMouseKeyboardActive` is `true`.
4.  **Consolidate M+KB Listeners:** Remove all other raw M+KB event listeners for game controls from other modules (e.g., `BuildingModeManager`, `controls.js`), ensuring `InputManager` is the sole entry point.
5.  **Refine `InputManager`/`ActionManager`:** Remove now-redundant internal checks within these modules.
6.  **Reconnect Logic:** Update modules (e.g., `BuildingModeManager`) to subscribe to actions from `ActionManager` instead of listening for raw input.

---

**Detailed Steps:**

**Step 1: Establish Core Pointer Lock State & Re-lock (Top-Level via `index.html` Inline Script)**

*   **Goal:** Create the global state flag and link it reliably to pointer lock events handled *directly* within `<script>` tags in `index.html`, enabling easy re-locking via native API calls, independent of any game logic modules.
*   **Files Involved:**
    *   `index.html` (adding inline script logic)
    *   `client/js/core/controls.js` (to *remove* listeners)
*   **Actions:**
    1.  In `index.html` (inside a `<script>` tag, placed before other game scripts load, e.g., in `<head>` or early `<body>`): Define `window.isMouseKeyboardActive = false;`.
    2.  In the *same* `index.html` `<script>` tag: Add event listeners directly to the `document` for pointer lock changes:
        ```javascript
        // --- Pointer Lock State Management (index.html) ---
        document.addEventListener('pointerlockchange', () => {
          const hasLock = !!document.pointerLockElement;
          console.log(`[IndexContext] pointerlockchange: Lock ${hasLock ? 'acquired' : 'released'}. Setting isMouseKeyboardActive = ${hasLock}`);
          window.isMouseKeyboardActive = hasLock;

          // Optional: UI updates based on lock state
          const instructions = document.getElementById('lock-instructions');
          if (instructions) {
              instructions.style.display = hasLock ? 'none' : 'block';
          }
          // Always show OS cursor when unlocked
          if (!hasLock) {
              document.body.style.cursor = 'auto';
          }
        }, false);

        document.addEventListener('pointerlockerror', (error) => {
          console.error('[IndexContext] Pointer Lock Error:', error);
          window.isMouseKeyboardActive = false; // Ensure flag is false on error
        }, false);
        // --- End Pointer Lock State Management ---
        ```
    3.  In the *same* `index.html` `<script>` tag: Add the click-to-relock listener, using the native `requestPointerLock()` API:
        ```javascript
        // --- Click-to-(Re)Lock Logic (index.html) ---
        function attemptBrowserLock() {
           if (!document.pointerLockElement) {
             console.log("[IndexContext Click] Attempting pointer lock via requestPointerLock().");
             // Get the element the game runs in (adjust selector as needed)
             const gameContainer = document.getElementById('gameContainer') || document.body;
             try {
               gameContainer.requestPointerLock();
             } catch (err) {
               console.error("[IndexContext Click] Error requesting pointer lock:", err);
             }
           } else {
             console.log("[IndexContext Click] Cannot request lock: Pointer already locked.");
           }
        }

        // Add listener once the DOM is ready
        document.addEventListener('DOMContentLoaded', () => {
            const gameContainer = document.getElementById('gameContainer') || document.body; // Adjust selector
            if (gameContainer) {
                console.log("[IndexContext] Adding click listener for pointer lock to:", gameContainer);
                gameContainer.addEventListener('click', attemptBrowserLock);
            } else {
                console.error("[IndexContext] Game container not found for click-to-lock listener.");
            }
        });
        // --- End Click-to-(Re)Lock Logic ---
        ```
    4.  **Crucially:** In `client/js/core/controls.js`, inside the `initControls` function, **REMOVE** any lines that add event listeners for `'lock'`, `'unlock'`, or `'click'` *related to managing the pointer lock state or initiating the lock*. The `PointerLockControls` library will still internally react to the `pointerlockchange` event for camera movement, which is fine.
*   **Test:** Load game. Open console. Click screen -> check for "[IndexContext Click] Attempting..." log, then "[IndexContext] pointerlockchange: Lock acquired..." log and `true` flag. Press ESC -> check for "[IndexContext] pointerlockchange: Lock released..." log and `false` flag. Click back into window -> check lock attempts and acquires again. Ensure instructions/cursor display correctly.

**Step 2: Implement Primary Input Gate in `InputManager`**

*   **Goal:** Make `InputManager` block *all* M+KB processing when `window.isMouseKeyboardActive` is `false`.
*   **Files Involved:** `client/js/core/InputManager.js`
*   **Actions:** Add `if (!window.isMouseKeyboardActive) { /* log optional */ return; }` check at the start of relevant M+KB handlers (`onKeyDown`, `onKeyUp`, `onMouseMove`, `onMouseDown`, `onMouseUp`, `onWheel`).
*   **Test:** Load game. Use gamepad (ok). Click to lock. Press ESC. **Verify strictly:** *All* M+KB input (keys, clicks, movement, wheel) produces *no* game effect and ideally only minimal/optional "ignored" logs. Gamepad remains functional.

**Step 3: Audit and Eliminate External M+KB Game Control Listeners**

*   **Goal:** Force all M+KB game control input through the gated `InputManager`.
*   **Files Involved:** `BuildingModeManager.js`, `controls.js`, others via search.
*   **Actions:** Remove `addEventListener` or `.on('key...')`/`.on('mouse...')` calls for M+KB *game controls* from all modules *except* `InputManager`. Keep UI-related listeners if necessary, but verify they don't trigger game actions.
*   **Test:** Repeat Step 2 test. Lock inactive: M+KB still fully blocked. Lock active: M+KB behavior should become more consistent and correct as duplicate handlers are removed.

**Step 4: Complete `InputManager` & `ActionManager` Refinement**

*   **Goal:** Clean up redundant internal checks now that the top-level gate and listener consolidation are done.
*   **Files Involved:** `InputManager.js`, `ActionManager.js`.
*   **Actions:**
    1.  Remove now-redundant internal `if (document.pointerLockElement)` or `if (window.isMouseKeyboardActive)` checks from methods within `InputManager` and `ActionManager`.
    2.  Ensure `ActionManager` has bindings for all actions previously triggered by removed listeners (e.g., Q/E rotate, B/V toggles).
*   **Test:** Gameplay should function correctly when pointer lock is active, relying solely on the `InputManager` -> `ActionManager` flow.

**Step 5: Final Integration and Comprehensive Testing**

*   **Goal:** Re-connect logic (e.g., `BuildingModeManager` rotation) via `ActionManager` subscriptions and perform full testing.
*   **Files Involved:** `BuildingModeManager.js`, etc.
*   **Actions:** Add `window.actionManager.on(...)` subscriptions where needed in modules like `BuildingModeManager` to react to actions (e.g., `'rotate_left'`, `'toggle_building'`).
*   **Full Test Plan:**
    *   **Gamepad:** Verify independent functionality.
    *   **Lock Active:** M+KB movement, camera look, actions (toggles, build, jump, etc.), building rotation (Q/E *only* in build mode) work correctly.
    *   **Lock Inactive (ESC):** *All* M+KB game input is strictly ignored.
    *   **Re-engaging Lock:** Click window after ESC -> lock re-acquires correctly, M+KB controls resume.
    *   **Input Fields:** Ensure game input is ignored when typing in UI elements (if any).

---