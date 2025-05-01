// Set up the scene, camera, and renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 5;
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Add basic lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); // Soft white light
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8); // Stronger white light from above
directionalLight.position.set(0, 1, 1);
scene.add(directionalLight);

// Add OrbitControls
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
controls.dampingFactor = 0.05;

// Define the custom shader material
const animatedMaterial = new THREE.ShaderMaterial({ // Rename to distinguish from torus material
    uniforms: {
        time: { value: 0.0 },
        // Increase number of seeds to 15
        seeds: { 
            value: Array.from({ length: 15 }, () => new THREE.Vector2(Math.random(), Math.random())) 
        }
    },
    vertexShader: `
        varying vec2 vUv;
        // varying vec3 vNormal; // No longer needed here
        void main() {
            vUv = uv;
            // vNormal = normal; // No longer needed here
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform float time;
        uniform vec2 seeds[15]; // Update uniform size to 15
        varying vec2 vUv;

        // Restore Voronoi function
        float voronoi(vec2 p) {
            float minDist = 1.0;
            float secondMinDist = 1.0;
            // Update loop limit to 15
            for (int i = 0; i < 15; i++) {
                // Animate seed positions with more range and variation
                float speed = 0.5 + float(i) * 0.02; // Slightly vary speed per seed
                // Use initial position and varied speed for more chaotic movement
                vec2 offset = vec2(sin(time * speed + seeds[i].x * 6.2831), 
                                   cos(time * speed * 0.8 + seeds[i].y * 6.2831)); 
                vec2 seed = seeds[i] + offset * 0.4; // Increased range of motion (0.05 -> 0.4)
                seed = fract(seed); // Keep seeds within 0-1 range (wrap around)
                
                float dist = distance(p, seed);
                if (dist < minDist) {
                    secondMinDist = minDist;
                    minDist = dist;
                } else if (dist < secondMinDist) {
                    secondMinDist = dist;
                }
            }
            return secondMinDist - minDist;
        }

        // --- Restored Voronoi Shader --- 
        void main() {
            vec2 uv = vUv;
            
            // Calculate Voronoi distances to detect borders
            float voronoiDist = voronoi(uv);
            
            // Make edge smoother to reduce pixelation
            float edge = smoothstep(0.01, 0.05, voronoiDist); // Wider transition (0.01 to 0.05)
            
            // Restore original color mix (or choose new colors)
            vec3 color = mix(vec3(0.7, 0.7, 0.7), vec3(0.5, 0.5, 1.0), 1.0 - edge); // Silver to blue

            // Optional: Re-add subtle flickering if desired (using a simple random function)
            // float randomVal = fract(sin(dot(uv.xy, vec2(12.9898, 78.233))) * 43758.5453);
            // float flicker = 0.8 + 0.2 * randomVal; 
            // color *= flicker;

            // Apply radial gradient to dim edges (optional, keep if liked)
            vec2 center = vec2(0.5, 0.5);
            float distToCenter = distance(uv, center);
            // Revert intensity calculation
            float intensity = 1.0 - smoothstep(0.0, 0.5, distToCenter); 
            color *= intensity;

            // Revert brightness boost
            vec3 finalColor = color * 1.5; 

            gl_FragColor = vec4(finalColor, 1.0); // Use solid alpha
        }
    `,
    side: THREE.DoubleSide, // Make sure we see the circle from both sides
    transparent: true // Enable transparency for the alpha fade
});

// Create the Torus geometry (adjust parameters as needed: radius, tube diameter, segments)
const torusRadius = 1.5;
const tubeRadius = 0.2;
const torusGeometry = new THREE.TorusGeometry(torusRadius, tubeRadius, 16, 100); 

// Create a texture loader
const textureLoader = new THREE.TextureLoader();
// Load a placeholder texture (replace URL with your desired texture)
const ringTexture = textureLoader.load('https://threejs.org/examples/textures/hardwood2_diffuse.jpg'); 
ringTexture.wrapS = THREE.RepeatWrapping;
ringTexture.wrapT = THREE.RepeatWrapping;
ringTexture.repeat.set(4, 1); // Adjust tiling as needed

// Create a textured standard material for the torus
const torusMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xAAAAAA, // Base gray color (texture modifies this)
    map: ringTexture,
    roughness: 0.7, // Adjust appearance
    metalness: 0.3  // Adjust appearance
});

// Create the torus mesh
const torusMesh = new THREE.Mesh(torusGeometry, torusMaterial);
scene.add(torusMesh);

// Create a Circle geometry to fill the torus hole
const circleGeometry = new THREE.CircleGeometry(torusRadius, 32); // Radius matches torus, 32 segments

// Create the circle mesh using the animated material
const circleMesh = new THREE.Mesh(circleGeometry, animatedMaterial); 
circleMesh.position.z = -0.01; // Add a tiny offset to prevent Z-fighting
scene.add(circleMesh);

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    // Update time uniform for animation - Reduced increment for slower speed
    animatedMaterial.uniforms.time.value += 0.05;

    controls.update(); // only required if controls.enableDamping = true, or if controls.autoRotate = true

    renderer.render(scene, camera);
}
animate();

// Handle window resize
window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
}); 