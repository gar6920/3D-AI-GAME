// 3D AI Game Platform - Player UI module
// Handles player list UI and related functionality

class PlayerUI {
    constructor() {
        this.initialized = false;
        this.selectionPanelInitialized = false;
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

        // console.log(`UIManager: Added element <${elementType}> with ID: ${options.id || element.id || 'N/A'}`);
        return element; // Return the created element
    }
    
    // *** NEW: Placeholder for updating HUD elements ***
    updateHUD(data = {}) {
        // Create HUD panel if missing
        let hud = document.getElementById('credits-hud');
        if (!hud) {
            hud = this.addElement('div', {
                id: 'credits-hud',
                style: {
                    position: 'absolute', top: '10px', right: '10px',
                    color: 'white', background: 'rgba(0,0,0,0.7)',
                    padding: '4px', borderRadius: '4px', zIndex: '1000', width: '160px'
                }
            });
            // Header (collapsible)
            const header = this.addElement('div', {
                id: 'credits-hud-header',
                html: '<span id="credits-toggle">−</span> Credits',
                style: { fontWeight: 'bold', cursor: 'pointer', marginBottom: '4px' },
                parent: hud
            });
            // Content wrapper
            this.addElement('div', { id: 'credits-hud-content', parent: hud });
            // Credit lines
            this.addElement('div', { id: 'player-credits', parent: document.getElementById('credits-hud-content'), style: { margin: '2px 0' } });
            this.addElement('div', { id: 'city-credits', parent: document.getElementById('credits-hud-content'), style: { margin: '2px 0' } });
            this.addElement('div', { id: 'enemy-credits', parent: document.getElementById('credits-hud-content'), style: { margin: '2px 0' } });
            // Toggle collapse
            header.addEventListener('click', () => {
                const contentEl = document.getElementById('credits-hud-content');
                const toggle = document.getElementById('credits-toggle');
                if (contentEl.style.display === 'none') {
                    contentEl.style.display = 'block'; toggle.textContent = '−';
                } else { contentEl.style.display = 'none'; toggle.textContent = '+'; }
            });
        }
        // Update displayed values
        if (data.playerCredits !== undefined) {
            document.getElementById('player-credits').textContent = `Your Credits: ${data.playerCredits}`;
        }
        if (data.cityCredits !== undefined) {
            document.getElementById('city-credits').textContent = `City Credits: ${data.cityCredits}`;
        }
        if (data.enemyCredits !== undefined) {
            document.getElementById('enemy-credits').textContent = `Enemy Credits: ${data.enemyCredits}`;
        }
    }

    // Initialize selection panel container
    initSelectionPanel() {
        if (this.selectionPanelInitialized) return;
        this.selectionPanelInitialized = true;
        this.selectionPanel = this.addElement('div', {
            id: 'selection-panel',
            style: {
                position: 'absolute', top: '100px', left: '10px',
                background: 'rgba(0,0,0,0.7)', color: 'white', padding: '8px',
                borderRadius: '4px', width: '220px', maxHeight: '50%', overflowY: 'auto', zIndex: '10000'
            }
        });
        // Header
        this.addElement('div', { html: '<strong>Selection</strong>', parent: this.selectionPanel, style: { marginBottom: '4px' } });
        // Content container
        this.selectionContent = this.addElement('div', { id: 'selection-panel-content', parent: this.selectionPanel });
    }

    // Update selection panel with server data
    updateSelectionPanel(data) {
        this.initSelectionPanel();
        this.selectionContent.innerHTML = '';
        if (!data.entities || data.entities.length === 0) {
            this.selectionContent.innerHTML = '<em>No entity selected</em>';
            return;
        }
        data.entities.forEach(entity => {
            const card = this.addElement('div', { className: 'entity-card', parent: this.selectionContent, style: { padding: '4px', borderBottom: '1px solid #444', marginBottom: '4px' } });
            this.addElement('div', { text: entity.name, parent: card, style: { fontWeight: 'bold' } });
            if (entity.health !== undefined) {
                const maxH = entity.maxHealth !== undefined ? `/${entity.maxHealth}` : '';
                this.addElement('div', { text: `Health: ${entity.health}${maxH}`, parent: card });
            }
            // Actions
            const actCont = this.addElement('div', { className: 'actions', parent: card, style: { marginTop: '4px' } });
            const actions = data.availableActions && data.availableActions[entity.id] ? data.availableActions[entity.id] : [];
            actions.forEach(actionName => {
                this.addElement('button', { text: actionName, parent: actCont, style: { marginRight: '4px' }, onclick: () => window.room.send('entity_action', { entityId: entity.id, action: actionName }) });
            });
        });
    }

    // Update player list in UI
    updatePlayerListUI() {
        // Get player list container
        const playerList = document.getElementById('player-list');
        if (!playerList) {
            // console.warn("Player list element not found");
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
                    // console.log("Added local player to list. Players map size:", window.room.state.players.size);
                    
                    // Add other players - directly iterate over the Schema MapSchema
                    window.room.state.players.forEach((player, sessionId) => {
                        if (sessionId !== mySessionId) {
                            this.addPlayerToList(player, sessionId, false);
                            playerCount++;
                            // console.log("Added remote player to list:", sessionId, player);
                        }
                    });
                } catch (e) {
                    // console.error("Error iterating through players:", e);
                }
            }
            
            // Update player count in UI
            const playerCountElement = document.getElementById('player-count');
            if (playerCountElement) {
                playerCountElement.textContent = `(${playerCount})`;
            }
        } catch (error) {
            // console.error("Error updating player list UI:", error);
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
            // console.error("Error adding player to UI list:", error);
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
                // console.log("Tab key pressed - toggling player list");
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
            // console.warn("Player list toggle: Could not find required elements");
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
        // console.log("Player list toggled. Now " + (isCollapsed ? "visible" : "hidden"));
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
            // console.warn("Error initializing player list state:", error);
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
        // console.log("DOM loaded via InputManager - initializing player UI");
        playerUI.init();
    });
    
    // Also try to initialize immediately in case DOMContentLoaded already fired
    if (document.readyState === 'interactive' || document.readyState === 'complete') {
        // console.log("Document already loaded - initializing player UI now");
        playerUI.init();
    }
}

if (typeof module !== 'undefined') {
    module.exports = { PlayerUI, playerUI };
} 