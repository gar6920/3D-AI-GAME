/**
 * ResourceManager - Handles game economy and resources
 * This is a server-only utility that doesn't affect client functionality
 */
class ResourceManager {
    /**
     * Create a new resource manager
     * @param {GameState} gameState - Reference to the game state
     */
    constructor(gameState) {
        this.gameState = gameState;
    }

    /**
     * Initialize the resource manager with configuration values
     * @param {Object} options - Configuration options
     */
    initialize(options = {}) {
        // Read configuration from gameState
        this.playerMoneyPercentage = this.gameState.gameConfig.playerMoneyPercentage || 50;
        this.cityMoneyPercentage = this.gameState.gameConfig.cityMoneyPercentage || 50;
        this.aiResourceMultiplier = this.gameState.gameConfig.aiResourceMultiplier || 1.0;
    }

    /**
     * Award resources to a player for contribution
     * @param {string} playerId - ID of the player
     * @param {number} amount - Amount of resources to award
     * @param {string} source - Source of the reward (e.g., "combat", "building")
     */
    awardPlayerResources(playerId, amount, source = "unspecified") {
        if (!amount || amount <= 0) return;
        
        const player = this.gameState.players.get(playerId);
        if (!player) {
            console.warn(`[ResourceManager] Player ${playerId} not found for resource award`);
            return;
        }
        
        // Calculate split based on configuration
        const playerAmount = Math.floor(amount * (this.playerMoneyPercentage / 100));
        const cityAmount = amount - playerAmount;
        
        // Award player their share (using existing property or adding new one without affecting client)
        if (typeof player.personalMoney !== 'undefined') {
            player.personalMoney += playerAmount;
        } else {
            // Store in implementationData if property doesn't exist yet
            // This won't break client if it doesn't know about personalMoney
            if (!player.implementationData) {
                console.warn(`[ResourceManager] Player ${playerId} has no implementationData, can't store money`);
                return;
            }
            
            // Use the properties map
            const currentMoney = parseInt(player.implementationData.properties.get("money") || "0");
            player.implementationData.properties.set("money", (currentMoney + playerAmount).toString());
        }
        
        // Add to city money pool
        this.gameState.cityMoney += cityAmount;
        
        console.log(`[ResourceManager] Awarded ${playerAmount} to player ${playerId}, ${cityAmount} to city pool from ${source}`);
    }

    /**
     * Generate AI resources based on game state
     * Called during phase transition to invasion phase
     */
    generateAIResources() {
        // Base calculation:
        // 1. Start with total player money and city money pool
        // 2. Apply AI resource multiplier and player count scaling
        // 3. Apply difficulty adjustment based on game progress
        
        // Get total player money
        let totalPlayerMoney = 0;
        this.gameState.players.forEach(player => {
            // Try to get money from wherever it might be stored
            if (typeof player.personalMoney !== 'undefined') {
                totalPlayerMoney += player.personalMoney;
            } else if (player.implementationData && player.implementationData.properties) {
                totalPlayerMoney += parseInt(player.implementationData.properties.get("money") || "0");
            }
        });
        
        // Add city money
        const totalEconomy = totalPlayerMoney + this.gameState.cityMoney;
        
        // Apply multipliers
        const playerCount = this.gameState.players.size;
        const playerCountMultiplier = Math.sqrt(playerCount) || 1;
        
        // Calculate resources using formula:
        // AI Resources = Total Economy * AI Resource Multiplier * Player Count Scaling
        const aiResources = Math.floor(
            totalEconomy * 
            this.aiResourceMultiplier * 
            playerCountMultiplier
        );
        
        // Set the AI resources
        this.gameState.aiResources = aiResources;
        
        console.log(`[ResourceManager] Generated ${aiResources} AI resources (based on economy of ${totalEconomy})`);
        
        return aiResources;
    }

    /**
     * Spend resources from a specific pool
     * @param {string} pool - Resource pool ("player", "city", "ai")
     * @param {string} entityId - ID of entity for player resources
     * @param {number} amount - Amount to spend
     * @param {string} reason - Reason for spending
     * @returns {boolean} Whether the spending was successful
     */
    spendResources(pool, entityId, amount, reason = "unspecified") {
        if (!amount || amount <= 0) return true;
        
        let success = false;
        
        switch (pool) {
            case "player":
                const player = this.gameState.players.get(entityId);
                if (!player) return false;
                
                // Check if player has enough money
                let playerMoney = 0;
                if (typeof player.personalMoney !== 'undefined') {
                    playerMoney = player.personalMoney;
                    if (playerMoney >= amount) {
                        player.personalMoney -= amount;
                        success = true;
                    }
                } else if (player.implementationData && player.implementationData.properties) {
                    playerMoney = parseInt(player.implementationData.properties.get("money") || "0");
                    if (playerMoney >= amount) {
                        player.implementationData.properties.set("money", (playerMoney - amount).toString());
                        success = true;
                    }
                }
                break;
                
            case "city":
                if (this.gameState.cityMoney >= amount) {
                    this.gameState.cityMoney -= amount;
                    success = true;
                }
                break;
                
            case "ai":
                if (this.gameState.aiResources >= amount) {
                    this.gameState.aiResources -= amount;
                    success = true;
                }
                break;
                
            default:
                console.error(`[ResourceManager] Unknown resource pool: ${pool}`);
                return false;
        }
        
        if (success) {
            console.log(`[ResourceManager] Spent ${amount} resources from ${pool} pool for ${reason}`);
        } else {
            console.log(`[ResourceManager] Failed to spend ${amount} resources from ${pool} pool for ${reason} (insufficient funds)`);
        }
        
        return success;
    }
}

module.exports = { ResourceManager };
