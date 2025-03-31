// Game Server Configuration
const CONFIG = {
    // Default to localhost for development, override with environment variable if set
    SERVER_URL: window.ENV_GAME_SERVER_URL || 'ws://localhost:2567',
    
    // Add any other configuration variables here
    DEBUG: false,
    VERSION: '1.0.0'
};

// Prevent modifications to the configuration
Object.freeze(CONFIG);

// Make configuration available globally
window.CONFIG = CONFIG; 