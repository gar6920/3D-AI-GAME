// Player definition for 3D AI Game
// Similar to npcs.js, but for the player character

module.exports = {
    player1: {
        id: 'player1',
        name: 'Player',
        modelId: 'player_model', // Replace with actual model file if needed
        colliderType: 'sphere', // Default to sphere, can be 'box' or 'mesh' if you want
        scale: 1,
        x: 0,
        y: 0,
        z: 0,
        rotationY: 0,
        health: 100,
        maxHealth: 100,
        speed: 7,
        // You can add animationMap, abilities, etc. as needed
        // animationMap: { idle: 'Idle', run: 'Run', ... }
    }
};
