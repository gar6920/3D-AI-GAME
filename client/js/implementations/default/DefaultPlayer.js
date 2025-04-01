// Default Implementation - Player class
// Specifies the model and implementation-specific details

class DefaultPlayer extends Player {
    constructor(params = {}) {
        // Set model path before calling super() so the core Player class can use it
        params.modelPath = 'assets/models/human_man.glb';
        
        // Call parent constructor
        super(params);
        
        // Default implementation specific settings
        this.modelRotation = new THREE.Euler(0, Math.PI, 0); // Rotate 180° on Y axis
        this.modelScale = new THREE.Vector3(1.0, 1.0, 1.0);
        
        console.log(`[DefaultPlayer ${this.id}] Created with model: ${params.modelPath}`);
    }
    
    // Override to provide implementation-specific animation mappings
    getAnimationName(state) {
        // Map generic animation states to specific animation clip names in this model
        switch(state) {
            case 'idle': return 'Idle.002';
            case 'walk': return 'Walking.006';
            case 'run': return 'Running.006';
            case 'jump': return 'Jumping.006';
            case 'strafeLeft': return 'Left_Strafe.006';
            case 'strafeRight': return 'Right_Strafe.006';
            default: return 'Idle.002';
        }
    }
}

// Register this class with the entity factory if available
if (window.entityFactory) {
    window.entityFactory.registerType('defaultPlayer', DefaultPlayer);
}

// Make available globally
if (typeof window !== 'undefined') {
    window.DefaultPlayer = DefaultPlayer;
}

if (typeof module !== 'undefined') {
    module.exports = { DefaultPlayer };
}