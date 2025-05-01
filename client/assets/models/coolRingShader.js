// coolRingShader.js
// Exports a function that returns a THREE.ShaderMaterial for the animated portal effect

export default function createCoolRingShaderMaterial() {
    return new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0.0 },
            seeds: {
                value: Array.from({ length: 15 }, () => new THREE.Vector2(Math.random(), Math.random()))
            }
        },
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform float time;
            uniform vec2 seeds[15];
            varying vec2 vUv;
            float voronoi(vec2 p) {
                float minDist = 1.0;
                float secondMinDist = 1.0;
                for (int i = 0; i < 15; i++) {
                    float speed = 0.5 + float(i) * 0.02;
                    vec2 offset = vec2(sin(time * speed + seeds[i].x * 6.2831), cos(time * speed * 0.8 + seeds[i].y * 6.2831));
                    vec2 seed = seeds[i] + offset * 0.4;
                    seed = fract(seed);
                    float dist = distance(p, seed);
                    if (dist < minDist) {
                        secondMinDist = minDist;
                        minDist = dist;
                    } else if (dist < secondMinDist) {
                        secondMinDist = dist;
                    }
                }
                return minDist;
            }
            void main() {
                float v = voronoi(vUv);
                float edge = smoothstep(0.09, 0.11, v);
                float core = smoothstep(0.02, 0.04, v);
                vec3 color = mix(vec3(0.0, 0.7, 1.2), vec3(0.0, 0.0, 0.3), edge);
                color = mix(color, vec3(1.0, 1.0, 1.0), 1.0 - core);
                float alpha = 1.0 - edge;
                gl_FragColor = vec4(color, alpha);
            }
        `,
        transparent: true,
        depthWrite: false
    });
}
