// varying vec2 vUv; // Not needed for this simple test
uniform float time;
uniform vec2 seeds[15]; 
varying vec2 vUv;

// Voronoi function
float voronoi(vec2 p) {
    float minDist = 1.0;
    float secondMinDist = 1.0;
    for (int i = 0; i < 15; i++) {
        float speed = 0.5 + float(i) * 0.02;
        vec2 offset = vec2(sin(time * speed + seeds[i].x * 6.2831),
                           cos(time * speed * 0.8 + seeds[i].y * 6.2831));
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
    return secondMinDist - minDist;
}

void main() {
    vec2 uv = vUv;
    float voronoiDist = voronoi(uv);
    float edge = smoothstep(0.01, 0.05, voronoiDist); 
    vec3 color = mix(vec3(0.7, 0.7, 0.7), vec3(0.5, 0.5, 1.0), 1.0 - edge); 

    vec2 center = vec2(0.5, 0.5);
    float distToCenter = distance(uv, center);
    float intensity = 1.0 - smoothstep(0.0, 0.5, distToCenter);
    color *= intensity;

    vec3 finalColor = color * 1.5; 

    gl_FragColor = vec4(finalColor, 1.0); 
} 