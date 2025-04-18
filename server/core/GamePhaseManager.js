/**
 * GamePhaseManager - Handles game phase transitions and timing
 * This is a server-only utility that doesn't affect client functionality
 */
class GamePhaseManager {
    /**
     * Create a new game phase manager
     * @param {GameState} gameState - Reference to the game state
     */
    constructor(gameState) {
        this.gameState = gameState;
        this.lastUpdateTime = Date.now();
        this.isActive = true;
    }

    /**
     * Initialize the phase manager with configuration values
     * @param {Object} options - Configuration options
     */
    initialize(options = {}) {
        // Read configuration from gameState or use defaults
        this.peacePhaseDuration = this.gameState.gameConfig.peacePhaseDuration || 600;
        this.invasionPhaseDuration = this.gameState.gameConfig.invasionPhaseDuration || 1800;
        
        // Start in peace phase by default
        if (!this.gameState.gamePhase) {
            this.setPhase("peace");
        }
    }

    /**
     * Set the current game phase
     * @param {string} phase - The phase to set ("peace" or "invasion")
     */
    setPhase(phase) {
        if (phase !== "peace" && phase !== "invasion") {
            console.error(`[GamePhaseManager] Invalid phase: ${phase}`);
            return;
        }

        // Update game state
        this.gameState.gamePhase = phase;
        
        // Set the appropriate phase duration
        const duration = phase === "peace" 
            ? this.peacePhaseDuration 
            : this.invasionPhaseDuration;
            
        this.gameState.phaseTimeRemaining = duration;
        
        console.log(`[GamePhaseManager] Phase changed to: ${phase}, duration: ${duration} seconds`);
    }

    /**
     * Toggle between peace and invasion phases
     */
    togglePhase() {
        const newPhase = this.gameState.gamePhase === "peace" ? "invasion" : "peace";
        this.setPhase(newPhase);
    }

    /**
     * Update the phase timer
     * Called every simulation tick from BaseRoom
     */
    update() {
        if (!this.isActive) return;
        
        // Calculate time delta in seconds
        const now = Date.now();
        const deltaSeconds = (now - this.lastUpdateTime) / 1000;
        this.lastUpdateTime = now;
        
        // Update the timer
        this.gameState.phaseTimeRemaining -= deltaSeconds;
        
        // Check for phase change
        if (this.gameState.phaseTimeRemaining <= 0) {
            this.togglePhase();
        }
    }

    /**
     * Pause the phase timer
     */
    pause() {
        this.isActive = false;
    }

    /**
     * Resume the phase timer
     */
    resume() {
        this.isActive = true;
        this.lastUpdateTime = Date.now();
    }
}

module.exports = { GamePhaseManager };
