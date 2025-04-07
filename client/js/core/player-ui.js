// 3D AI Game Platform - Player UI module
// Handles player list UI and related functionality

class PlayerUI {
    constructor() {
        this.initialized = false;
    }
    
    // Initialize the player UI
    init() {
        if (this.initialized) return;
        
        this.initPlayerListState();
        this.setupPlayerListKeyControls();
        this.initialized = true;
    }

    // Generic method to add UI elements
    addElement(elementType, options = {}) {
        const element = document.createElement(elementType);

        // Apply properties
        if (options.id) element.id = options.id;
        if (options.className) element.className = options.className;
        if (options.text) element.textContent = options.text;
        if (options.html) element.innerHTML = options.html;
        if (options.value) element.value = options.value;

        // Apply styles
        if (options.style) {
            Object.assign(element.style, options.style);
        }

        // Append to parent or body
        const parentElement = options.parent || document.body;
        parentElement.appendChild(element);

        // Add event listeners through InputManager
        if (options.listeners) {
            Object.entries(options.listeners).forEach(([event, listener]) => {
                // Register the element with InputManager
                if (!element.id) {
                    element.id = `auto-id-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
                }
                window.inputManager.registerUIElement(element.id, event, listener);
            });
        }
        
        // Assign onclick if provided directly
        if (options.onclick) {
            if (!element.id) {
                element.id = `auto-id-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
            }
            window.inputManager.registerUIElement(element.id, 'click', options.onclick);
        }

        console.log(`UIManager: Added element <${elementType}> with ID: ${options.id || element.id || 'N/A'}`);
        return element; // Return the created element
    }
    
    // *** NEW: Placeholder for updating HUD elements ***
    updateHUD(data = {}) {
        // Example: Update elements based on data provided
        // For BuildModeManager, this might involve showing/hiding menus,
        // updating selected item text, etc.
        console.log("UIManager: updateHUD called with data:", data);

        // Example implementation (needs refinement based on actual needs):
        if (data.buildModeActive !== undefined) {
            const buildMenu = document.getElementById('building-menu');
            if (buildMenu) {
                buildMenu.style.display = data.buildModeActive ? 'block' : 'none';
            }
            const buildButton = document.getElementById('toggle-build-mode-btn');
            if (buildButton) {
                buildButton.textContent = `Build Mode (${data.buildModeActive ? 'ON' : 'OFF'}) (B)`;
                buildButton.style.backgroundColor = data.buildModeActive ? 'lightgreen' : '';
            }
        }
        if (data.selectedStructure !== undefined) {
            // Find or create an element to display the selected structure
            let structureDisplay = document.getElementById('selected-structure-display');
            if (!structureDisplay) {
                structureDisplay = this.addElement('div', {
                    id: 'selected-structure-display',
                    style: {
                        position: 'absolute',
                        bottom: '20px', // Adjust position as needed
                        left: '150px', // Adjust position as needed
                        zIndex: '100',
                        color: 'white',
                        background: 'rgba(0,0,0,0.5)',
                        padding: '5px'
                    }
                });
            }
            structureDisplay.textContent = `Selected: ${data.selectedStructure || 'None'}`;
        }
    }

    // Update player list in UI
    updatePlayerListUI() {
        // Get player list container
        const playerList = document.getElementById('player-list');
        if (!playerList) {
            console.warn("Player list element not found");
            this.createPlayerListUI(); // Create if missing
            return;
        }
        
        try {
            // Clear current list
            playerList.innerHTML = '';
            
            let playerCount = 0;
            
            // Add myself first if available
            if (window.room && window.room.state && window.room.state.players) {
                try {
                    const mySessionId = window.room.sessionId;
                    let myPlayer = null;
                    
                    // Try different methods to get the player data
                    if (typeof window.room.state.players.get === 'function') {
                        myPlayer = window.room.state.players.get(mySessionId);
                    } else if (window.room.state.players[mySessionId]) {
                        myPlayer = window.room.state.players[mySessionId];
                    }
                    
                    if (myPlayer) {
                        this.addPlayerToList(myPlayer, mySessionId, true);
                        playerCount++;
                    } else if (window.playerEntity) {
                        // Show connected player UI
                        this.updatePlayerUI({
                            value: window.playerEntity.value || 1,
                            color: window.playerEntity.color || "#FFFF00"
                        });
                        playerCount++;
                    }
                    
                    // Log for debugging
                    console.log("Added local player to list. Players map size:", window.room.state.players.size);
                    
                    // Add other players - directly iterate over the Schema MapSchema
                    window.room.state.players.forEach((player, sessionId) => {
                        if (sessionId !== mySessionId) {
                            this.addPlayerToList(player, sessionId, false);
                            playerCount++;
                            console.log("Added remote player to list:", sessionId, player);
                        }
                    });
                } catch (e) {
                    console.error("Error iterating through players:", e);
                }
            }
            
            // Update player count in UI
            const playerCountElement = document.getElementById('player-count');
            if (playerCountElement) {
                playerCountElement.textContent = `(${playerCount})`;
            }
        } catch (error) {
            console.error("Error updating player list UI:", error);
        }
    }

    // Helper function to add a player to the list UI
    addPlayerToList(player, sessionId, isCurrentPlayer) {
        if (!player) return;
        
        try {
            // Get player list element
            const playerList = document.getElementById('player-list');
            if (!playerList) return;
            
            // Create player entry
            const playerEntry = document.createElement('div');
            playerEntry.className = 'player-entry';
            playerEntry.id = `player-${sessionId}`;
            
            // Add highlighting for current player
            if (isCurrentPlayer) {
                playerEntry.style.fontWeight = 'bold';
                playerEntry.style.backgroundColor = 'rgba(255,255,255,0.2)';
            }
            
            // Create color indicator
            const colorIndicator = document.createElement('div');
            colorIndicator.className = 'player-color';
            colorIndicator.style.backgroundColor = player.color || '#FFFFFF';
            
            // Create player info
            const playerInfo = document.createElement('div');
            playerInfo.className = 'player-info';
            
            // Format player name with value
            const playerName = player.name || `Player ${sessionId.substring(0, 4)}`;
            const playerValue = player.value || 1;
            playerInfo.textContent = `${playerName} (${playerValue})`;
            
            // Build entry
            playerEntry.appendChild(colorIndicator);
            playerEntry.appendChild(playerInfo);
            playerList.appendChild(playerEntry);
        } catch (error) {
            console.error("Error adding player to UI list:", error);
        }
    }

    // Set up key event listeners for player list toggle
    setupPlayerListKeyControls() {
        // Toggle player list on 'Tab' key
        window.inputManager.on('keydown', (event) => {
            if (event.key === 'Tab') {
                event.preventDefault(); // Prevent default tab behavior
                this.togglePlayerList();
                
                // Debug log to confirm function was called
                console.log("Tab key pressed - toggling player list");
            }
        });
        
        // Set up click listener for header
        const playerListHeader = document.getElementById('player-list-header');
        if (playerListHeader) {
            window.inputManager.registerUIElement('player-list-header', 'click', () => this.togglePlayerList());
        }
    }

    // Function to toggle player list visibility
    togglePlayerList() {
        const playerList = document.getElementById('player-list');
        const collapseIcon = document.getElementById('collapse-icon');
        
        if (!playerList || !collapseIcon) {
            console.warn("Player list toggle: Could not find required elements");
            return;
        }
        
        // Check current state
        const isCollapsed = playerList.style.display === 'none';
        
        // Toggle display
        playerList.style.display = isCollapsed ? 'block' : 'none';
        
        // Update icon
        collapseIcon.textContent = isCollapsed ? '▼' : '▶';
        
        // Save state in localStorage
        localStorage.setItem('playerListCollapsed', !isCollapsed);
        
        // Log the toggle event
        console.log("Player list toggled. Now " + (isCollapsed ? "visible" : "hidden"));
    }

    // Initialize player list state from saved preference
    initPlayerListState() {
        try {
            // Get saved state
            const isCollapsed = localStorage.getItem('playerListCollapsed') === 'true';
            
            // Get elements
            const playerList = document.getElementById('player-list');
            const collapseIcon = document.getElementById('collapse-icon');
            
            if (playerList && collapseIcon) {
                // Set initial state
                playerList.style.display = isCollapsed ? 'none' : 'block';
                collapseIcon.textContent = isCollapsed ? '▶' : '▼';
            }
        } catch (error) {
            console.warn("Error initializing player list state:", error);
        }
    }
    
    // Create the player list UI elements if they don't exist
    createPlayerListUI() {
        // Check if player list UI already exists
        if (document.getElementById('player-list-container')) {
            return;
        }
        
        // Create container
        const container = document.createElement('div');
        container.id = 'player-list-container';
        container.className = 'ui-panel';
        
        // Create header
        const header = document.createElement('div');
        header.id = 'player-list-header';
        header.className = 'ui-panel-header';
        header.innerHTML = '<span id="collapse-icon">▼</span> Players <span id="player-count">(0)</span>';
        
        // Create list
        const list = document.createElement('div');
        list.id = 'player-list';
        list.className = 'ui-panel-content';
        
        // Build UI
        container.appendChild(header);
        container.appendChild(list);
        
        // Add to document
        document.body.appendChild(container);
        
        // Initialize state
        this.initPlayerListState();
    }
}

// Create and export a singleton instance
const playerUI = new PlayerUI();

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.PlayerUI = PlayerUI;
    window.playerUI = playerUI;
    
    // Initialize when DOM is ready using InputManager
    window.inputManager.on('domcontentloaded', () => {
        console.log("DOM loaded via InputManager - initializing player UI");
        playerUI.init();
    });
    
    // Also try to initialize immediately in case DOMContentLoaded already fired
    if (document.readyState === 'interactive' || document.readyState === 'complete') {
        console.log("Document already loaded - initializing player UI now");
        playerUI.init();
    }
}

if (typeof module !== 'undefined') {
    module.exports = { PlayerUI, playerUI };
} 