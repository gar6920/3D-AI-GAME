/**
 * 3D AI Game Platform - Server
 * Main entry point for the server
 */

const http = require('http');
const express = require('express');
const { Server } = require('colyseus');
const path = require('path');
const fs = require('fs');
const os = require('os');

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
    port: parseInt(process.env.PORT || "8080", 10),
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
            res.sendFile(path.join(__dirname, '../../', 'electron', 'multiplayer.html'));
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

        // API endpoint for fetching available implementations
        this.app.get('/api/implementations', (req, res) => {
            // Get available implementations
            const implementationsPath = path.join(__dirname, '../implementations');
            try {
                const implementations = fs.readdirSync(implementationsPath)
                    .filter(f => fs.statSync(path.join(implementationsPath, f)).isDirectory());
                res.json(implementations);
            } catch (error) {
                console.error('Error reading implementations:', error);
                res.json(['default']);
            }
        });

        // API endpoint to check if launcher is installed
        this.app.get('/api/check-launcher-installed', (req, res) => {
            if (process.platform === 'win32') {
                const { exec } = require('child_process');
                
                // Check both HKCU and HKCR for the protocol handler
                // Windows might register it in either location
                const checkHKCU = new Promise((resolve) => {
                    exec('reg query "HKCU\\SOFTWARE\\Classes\\3dgame" /ve', (error, stdout) => {
                        if (!error && stdout.includes('3D AI Game Protocol')) {
                            resolve(true);
                        } else {
                            resolve(false);
                        }
                    });
                });
                
                const checkHKCR = new Promise((resolve) => {
                    exec('reg query "HKCR\\3dgame" /ve', (error, stdout) => {
                        if (!error && stdout.includes('3D AI Game Protocol')) {
                            resolve(true);
                        } else {
                            resolve(false);
                        }
                    });
                });
                
                // Also check if launch_game.bat exists as a fallback
                const checkInstallPath = new Promise((resolve) => {
                    const launchBatPath = path.resolve(__dirname, '../../launch_game.bat');
                    fs.access(launchBatPath, fs.constants.F_OK, (err) => {
                        resolve(!err); // Resolves true if file exists
                    });
                });
                
                // Check all possible conditions
                Promise.all([checkHKCU, checkHKCR, checkInstallPath]).then(results => {
                    const [hkcuExists, hkcrExists, launchBatExists] = results;
                    const isInstalled = hkcuExists || hkcrExists || launchBatExists;
                    
                    // Log detailed results for debugging
                    console.log(`Launcher detection results:
                    - HKCU Registry: ${hkcuExists ? 'Found' : 'Not found'}
                    - HKCR Registry: ${hkcrExists ? 'Found' : 'Not found'}
                    - launch_game.bat: ${launchBatExists ? 'Found' : 'Not found'}
                    - Overall: ${isInstalled ? 'INSTALLED' : 'NOT INSTALLED'}`);
                    
                    res.json({ 
                        installed: isInstalled,
                        details: {
                            hkcuRegistry: hkcuExists,
                            hkcrRegistry: hkcrExists,
                            launchBatExists: launchBatExists
                        }
                    });
                }).catch(err => {
                    console.error('Error checking installation:', err);
                    res.json({ installed: false, error: err.message });
                });
            } else {
                // For non-Windows platforms
                res.json({ installed: false, error: 'Not supported on this platform' });
            }
        });

        // Root route - serve our new landing page
        this.app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, '../../', 'public', 'index.html'));
        });

        // Special route for downloading the launcher
        this.app.get('/download/3d-ai-game-launcher.exe', (req, res) => {
            // Check if we have a packaged launcher
            const launcherPath = path.resolve(__dirname, '../../dist/3d-ai-game-launcher.exe');
            
            if (fs.existsSync(launcherPath)) {
                // If packaged launcher exists, serve it
                return res.download(launcherPath);
            } else {
                // Otherwise, create a batch file that launches the app directly
                const tempDir = os.tmpdir();
                const tempBatchFile = path.join(tempDir, '3d-ai-game-launcher.bat');
                
                // Get the absolute path to the game directory
                const gamePath = path.resolve(__dirname, '../../');
                
                // Create batch file content that will launch the game
                const batchContent = `@echo off
echo Starting 3D AI Game Launcher...
cd /d "${gamePath}"
start "" "${gamePath}\\launch_game.bat"
`;
                
                // Write the batch file to temp directory
                fs.writeFileSync(tempBatchFile, batchContent);
                
                // Serve the batch file as a download with .exe extension for better user experience
                res.setHeader('Content-Type', 'application/octet-stream');
                res.setHeader('Content-Disposition', 'attachment; filename="3d-ai-game-launcher.exe"');
                return res.download(tempBatchFile);
            }
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
        let baseGameRoomClass = null; // Variable to hold the specific BaseGameRoom class

        for (const [implName, implementation] of Object.entries(implementations)) {
            const RoomClass = this.getRoomClass(implementation);
            if (RoomClass) {
                const roomType = implementation.implementation?.roomType || implName;
                this.gameServer.define(roomType, RoomClass);
                console.log(`Registered room type: ${roomType}`);

                // Store the room class if this is the 'default' implementation
                if (implName === 'default') {
                    baseGameRoomClass = RoomClass;
                }
            } else {
                console.warn(`No room class found for implementation: ${implName}`);
            }
        }

        // After looping through all, explicitly define the 'default' room if found
        if (baseGameRoomClass) {
            console.log(`Defining 'default' implementation as the active room type`);
            this.gameServer.define('default', baseGameRoomClass);
        } else {
            console.error("CRITICAL: 'default' implementation not found or has no room class. Cannot define active 'default' room.");
            // Optional: Fallback or throw error if 'default' is essential
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
        // Fallback to BaseGameRoom if provided
        if (implementation.BaseGameRoom) {
            return implementation.BaseGameRoom;
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