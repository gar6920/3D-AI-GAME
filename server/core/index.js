/**
 * 3D AI Game Platform - Server
 * Main entry point for the server
 */

const http = require('http');
const express = require('express');
const { Server } = require('colyseus');
const path = require('path');

// Load environment variables
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

// Import default implementation
const DefaultImpl = require('../implementations/default');

// Server-side configuration
const serverConfig = {
    activeImplementation: process.env.ACTIVE_IMPLEMENTATION || "default",
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
            res.json({ 
                activeImplementation: serverConfig.activeImplementation,
                availableImplementations: ["default"],
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
        // Get the room from default implementation
        const roomType = DefaultImpl.implementation.roomType;
        const RoomClass = this.getRoomClass(DefaultImpl);
        
        if (RoomClass) {
            this.gameServer.define(roomType, RoomClass);
            this.gameServer.define('active', RoomClass);
        } else {
            console.warn('No room class found for default implementation');
        }
    }
    
    /**
     * Helper method to get the room class from an implementation
     * @param {Object} implementation The implementation object
     * @returns {Class} The room class, or null if not found
     */
    getRoomClass(implementation) {
        if (implementation.DefaultRoom) {
            return implementation.DefaultRoom;
        } else if (implementation.ImplementationRoom) {
            return implementation.ImplementationRoom;
        }
        
        // Log what's available in the implementation for debugging
        console.log(`Available properties in implementation: ${Object.keys(implementation).join(', ')}`);
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
            console.log(`Active implementation: ${serverConfig.activeImplementation}`);
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