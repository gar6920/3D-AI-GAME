// Import required Three.js components
import * as THREE from '../../../vendor/three/three.module.js';
import { Test1Player } from './Test1Player.js';

// Function to create a tree visual
function createTreeVisual(entity, entityId) {
    if (!window.scene) {
        console.error("Scene not available");
        return;
    }

    try {
        // Create tree trunk (cylinder)
        const trunkGeometry = new THREE.CylinderGeometry(0.2, 0.3, 2, 8);
        const trunkMaterial = new THREE.MeshPhongMaterial({ color: 0x8B4513 }); // Brown color
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.y = 1; // Half height of trunk

        // Create tree top (cone)
        const topGeometry = new THREE.ConeGeometry(1.5, 3, 8);
        const topMaterial = new THREE.MeshPhongMaterial({ color: 0x228B22 }); // Forest green
        const top = new THREE.Mesh(topGeometry, topMaterial);
        top.position.y = 3.5; // Place on top of trunk

        // Create tree group
        const treeGroup = new THREE.Group();
        treeGroup.add(trunk);
        treeGroup.add(top);

        // Position the tree
        treeGroup.position.set(entity.x, entity.y, entity.z);
        treeGroup.rotation.y = entity.rotation || 0;
        treeGroup.scale.setScalar(entity.scale || 1);
        
        // Enable shadows
        treeGroup.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
        
        // Add to scene
        window.scene.add(treeGroup);
        
        // Store reference
        window.visuals = window.visuals || {};
        window.visuals.trees = window.visuals.trees || {};
        window.visuals.trees[entityId] = treeGroup;
        
        console.log("Tree visual created:", entityId);
    } catch (error) {
        console.error("Error creating tree visual:", error);
    }
}

// Function to remove a tree visual
function removeTreeVisual(entityId) {
    if (window.visuals?.trees?.[entityId]) {
        if (window.scene) {
            window.scene.remove(window.visuals.trees[entityId]);
        }
        delete window.visuals.trees[entityId];
        console.log("Tree visual removed:", entityId);
    }
}

// Register the entity handlers
window.entityHandlers = window.entityHandlers || {};
window.entityHandlers.tree = {
    create: createTreeVisual,
    remove: removeTreeVisual
};

// Register the Test1Player class
window.Test1Player = Test1Player;

export { createTreeVisual, removeTreeVisual, Test1Player }; 