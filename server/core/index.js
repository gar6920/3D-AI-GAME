/**
 * 3D AI Game Platform - Server
 * Main entry point for the server
 */

const http = require('http');
const express = require('express');
const { Server } = require('colyseus');
const path = require('path');
const fs = require('fs');

// Load environment variables
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

// Function to load all available implementations
function loadImplementations() {
    const implementationsDir = path.join(__dirname, '../implementations');
    const implementations = {};
    
    if (fs.existsSync(implementationsDir)) {
        fs.readdirSync(implementationsDir, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .forEach(dirent => {
                const implName = dirent.name;
                try {
                    implementations[implName] = require(`../implementations/${implName}`);
                } catch (error) {
                    console.error(`Failed to load implementation ${implName}:`, error);
                }
            });
    }
    
    return implementations;
}

// Load all implementations
const implementations = loadImplementations();

// Server-side configuration
const serverConfig = {
    port: parseInt(process.env.PORT || "3000", 10),
    environment: process.env.NODE_ENV || 'development',
    logLevel: process.env.LOG_LEVEL || 'info'
};

/**
 * Main server class
 */
class GameServer {
    constructor() {
        // Create Express app and HTTP server
        this.app = express();
        this.server = http.createServer(this.app);
        
        // Configure app
        this.configureApp();
        
        // Create Colyseus server with correct configuration
        this.gameServer = new Server({
            server: this.server
        });
        
        // Register rooms
        this.registerRooms();
    }
    
    /**
     * Configure Express app
     */
    configureApp() {
        // Set up CORS headers for all requests
        const allowedOrigins = process.env.ALLOWED_ORIGINS ? 
            process.env.ALLOWED_ORIGINS.split(',') : 
            ['http://localhost:3000', 'http://localhost:8080'];

        this.app.use((req, res, next) => {
            const origin = req.headers.origin;
            if (serverConfig.environment === 'production' || !origin || allowedOrigins.includes(origin)) {
                res.header("Access-Control-Allow-Origin", origin || "*");
                res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
                res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
            }
            next();
        });

        // --- Define Specific Routes FIRST ---

        // Route for player selection page
        this.app.get('/select', (req, res) => {
            res.sendFile(path.join(__dirname, '../../', 'public', 'player_select.html'));
        });

        // Route for split-screen setup page
        this.app.get('/setup', (req, res) => {
            res.sendFile(path.join(__dirname, '../../', 'four_player_setup.html'));
        });

        // Serve the main index.html (for the game itself)
        this.app.get('/game', (req, res) => {
            res.sendFile(path.join(__dirname, '../../', 'client', 'index.html'));
        });

        // Health check endpoint
        this.app.get('/health', (req, res) => {
            res.status(200).json({ status: 'ok' });
        });

        // API config endpoint
        this.app.get('/api/config', (req, res) => {
            const availableImplementations = Object.keys(implementations);
            res.json({ 
                availableImplementations,
                environment: serverConfig.environment
            });
        });

        // Root route redirects to player selection
        // IMPORTANT: Define this AFTER other specific routes that might start with /
        this.app.get('/', (req, res) => {
            res.redirect('/select');
        });

        // --- Set up Static File Serving LAST ---
        // Serve files from 'public' first (e.g., for player_select.html CSS/JS if added)
        this.app.use(express.static(path.join(__dirname, '../../', 'public')));
        // Serve files from 'client' (like the game's JS, CSS, assets)
        this.app.use(express.static(path.join(__dirname, '../../', 'client')));

        // Optional: Add a 404 handler for any request that didn't match a route or static file
        this.app.use((req, res, next) => {
            res.status(404).send("Sorry, that page doesn't exist!");
        });
    }
    
    /**
     * Register room handlers
     */
    registerRooms() {
        // Register each implementation's room
        for (const [implName, implementation] of Object.entries(implementations)) {
            const RoomClass = this.getRoomClass(implementation);
            if (RoomClass) {
                const roomType = implementation.implementation?.roomType || implName;
                this.gameServer.define(roomType, RoomClass);
                
                // Also define this room as the active room if it's the first one
                // This maintains compatibility with existing clients
                if (Object.keys(implementations).indexOf(implName) === 0) {
                    console.log(`Defining ${roomType} as the active room type`);
                    this.gameServer.define('active', RoomClass);
                }
            } else {
                console.warn(`No room class found for implementation: ${implName}`);
            }
        }
    }
    
    /**
     * Helper method to get the room class from an implementation
     * @param {Object} implementation The implementation object
     * @returns {Class} The room class, or null if not found
     */
    getRoomClass(implementation) {
        // First try to get the implementation-specific room
        if (implementation.ImplementationRoom) {
            return implementation.ImplementationRoom;
        }
        // Fallback to DefaultRoom if provided
        if (implementation.DefaultRoom) {
            return implementation.DefaultRoom;
        }
        return null;
    }
    
    /**
     * Start the server
     * @param {number} port Port to listen on
     */
    start(port = 3000) {
        const host = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';
        this.server.listen(port, host, () => {
            console.log(`Environment: ${serverConfig.environment}`);
            console.log(`3D Game Platform server running on http://${host}:${port}`);
        });
    }
}

// Create and start server
const gameServer = new GameServer();
gameServer.start(serverConfig.port);

// Export server instance and configuration for external access
module.exports = { 
    gameServer,
    serverConfig
}; 