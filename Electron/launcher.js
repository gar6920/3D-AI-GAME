/**
 * Electron Launcher
 * This script launches the Electron application
 * It is designed to be called from the server when a browser connects
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * Check if Electron is already running
 * @returns {Promise<boolean>} True if Electron is running
 */
async function isElectronRunning() {
    return new Promise((resolve) => {
        // On Windows, use tasklist to check for electron processes
        const proc = spawn('tasklist', ['/fi', 'imagename eq electron.exe', '/fo', 'csv', '/nh'], {
            windowsHide: true,
            shell: true
        });
        
        let output = '';
        proc.stdout.on('data', (data) => {
            output += data.toString();
        });
        
        proc.on('close', () => {
            // If we find an Electron process, it's running
            resolve(output.toLowerCase().includes('electron.exe'));
        });
    });
}

/**
 * Launch the Electron application
 */
async function launchElectron() {
    // Check if Electron is already running
    const isRunning = await isElectronRunning();
    if (isRunning) {
        console.log('Electron is already running. Skipping launch.');
        return;
    }
    
    console.log('Launching Electron application...');
    
    // Path to project root (parent of electron folder)
    const projectRoot = path.join(__dirname, '..');
    
    // Launch Electron
    const electronProc = spawn('npx', ['electron', '.'], {
        cwd: projectRoot,
        detached: true, // Run in background
        stdio: 'ignore', // Don't pipe IO
        shell: true,
        windowsHide: false // Show the window
    });
    
    // Detach the process so it runs independently
    electronProc.unref();
    
    console.log('Electron application launched.');
}

// Export the launcher function
module.exports = { launchElectron };

// If this script is run directly, launch Electron
if (require.main === module) {
    launchElectron();
}
