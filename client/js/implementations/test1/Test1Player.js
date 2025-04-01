import { Player } from '../../core/Player.js';
import * as THREE from '../../../vendor/three/three.module.js';

export class Test1Player extends Player {
    constructor(options) {
        super(options);
        this.type = 'test1_player';
    }

    createMesh() {
        // Create a simple colored cube for the player
        const geometry = new THREE.BoxGeometry(1, 2, 1);
        const material = new THREE.MeshPhongMaterial({ 
            color: this.color || 0x00ff00,
            transparent: true,
            opacity: 0.8
        });
        
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
        
        // Position the mesh so it stands on the ground
        this.mesh.position.y = 1;
        
        // Add the mesh to the scene
        if (window.scene) {
            window.scene.add(this.mesh);
            console.log(`[Test1Player ${this.id}] Added player mesh to scene`);
        } else {
            console.error(`[Test1Player ${this.id}] Scene not available`);
        }
        
        return this.mesh;
    }

    update(deltaTime) {
        super.update(deltaTime);
        // Add any test1-specific player update logic here
    }
} 