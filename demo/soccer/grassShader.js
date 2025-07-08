/**
 * Ultra-Performant State-of-the-Art Grass Shader with Dynamic Wear System
 * Features: CPU-generated heightmaps with Simplex Noise, realistic grass rendering, dynamic wear tracking
 */

import * as THREE from 'https://unpkg.com/three@0.156.1/build/three.module.js';

// Simple Simplex Noise implementation for CPU-side heightmap generation
class SimplexNoise {
  constructor(seed = Math.random()) {
    this.seed = seed;
    this.p = new Array(512);
    this.perm = new Array(512);

    // Initialize permutation table
    for (let i = 0; i < 256; i++) {
      this.p[i] = Math.floor(Math.random() * 256);
    }
    for (let i = 0; i < 512; i++) {
      this.perm[i] = this.p[i & 255];
    }
  }

  // 2D Simplex noise
  noise2D(x, y) {
    const F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
    const G2 = (3.0 - Math.sqrt(3.0)) / 6.0;

    let n0, n1, n2;

    const s = (x + y) * F2;
    const i = Math.floor(x + s);
    const j = Math.floor(y + s);
    const t = (i + j) * G2;
    const X0 = i - t;
    const Y0 = j - t;
    const x0 = x - X0;
    const y0 = y - Y0;

    let i1, j1;
    if (x0 > y0) {
      i1 = 1; j1 = 0;
    } else {
      i1 = 0; j1 = 1;
    }

    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1.0 + 2.0 * G2;
    const y2 = y0 - 1.0 + 2.0 * G2;

    const ii = i & 255;
    const jj = j & 255;
    const gi0 = this.perm[ii + this.perm[jj]] % 12;
    const gi1 = this.perm[ii + i1 + this.perm[jj + j1]] % 12;
    const gi2 = this.perm[ii + 1 + this.perm[jj + 1]] % 12;

    const grad3 = [
      [1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
      [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
      [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]
    ];

    let t0 = 0.5 - x0*x0 - y0*y0;
    if (t0 < 0) n0 = 0.0;
    else {
      t0 *= t0;
      n0 = t0 * t0 * (grad3[gi0][0] * x0 + grad3[gi0][1] * y0);
    }

    let t1 = 0.5 - x1*x1 - y1*y1;
    if (t1 < 0) n1 = 0.0;
    else {
      t1 *= t1;
      n1 = t1 * t1 * (grad3[gi1][0] * x1 + grad3[gi1][1] * y1);
    }

    let t2 = 0.5 - x2*x2 - y2*y2;
    if (t2 < 0) n2 = 0.0;
    else {
      t2 *= t2;
      n2 = t2 * t2 * (grad3[gi2][0] * x2 + grad3[gi2][1] * y2);
    }

    return 70.0 * (n0 + n1 + n2);
  }

  // Fractal Brownian Motion for complex patterns
  fbm(x, y, octaves = 6, persistence = 0.5, lacunarity = 2.0) {
    let value = 0;
    let amplitude = 1;
    let frequency = 1;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
      value += this.noise2D(x * frequency, y * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= lacunarity;
    }

    return value / maxValue;
  }

  // Ridged noise for more dramatic patterns
  ridgedNoise(x, y, octaves = 4) {
    let value = 0;
    let amplitude = 1;
    let frequency = 1;

    for (let i = 0; i < octaves; i++) {
      const n = Math.abs(this.noise2D(x * frequency, y * frequency));
      value += (1 - n) * amplitude;
      amplitude *= 0.5;
      frequency *= 2;
    }

    return value;
  }

  // Turbulence for chaotic patterns
  turbulence(x, y, octaves = 4) {
    let value = 0;
    let amplitude = 1;
    let frequency = 1;

    for (let i = 0; i < octaves; i++) {
      value += Math.abs(this.noise2D(x * frequency, y * frequency)) * amplitude;
      amplitude *= 0.5;
      frequency *= 2;
    }

    return value;
  }
}

export class GrassShader {
  constructor(renderer, fieldWidth = 52.5, fieldHeight = 34) {
    this.renderer = renderer;
    this.fieldWidth = fieldWidth;
    this.fieldHeight = fieldHeight;
    
    // Wear tracking system
    this.wearResolution = 512; // High resolution wear map
    this.wearData = new Float32Array(this.wearResolution * this.wearResolution);
    this.wearTexture = null;
    this.wearNeedsUpdate = false;
    
    // Performance optimization
    this.lastWearUpdate = 0;
    this.wearUpdateInterval = 16; // Update every 16ms for immediate feedback in test mode

    // Debug tracking
    this.lastDebugTime = -1;
    
    this.initializeShader();
    this.initializeWearSystem();
  }

  initializeShader() {
    // Advanced vertex shader with real grass displacement
    this.vertexShader = `
      uniform float time;
      uniform vec2 windDirection;
      uniform float windStrength;
      uniform sampler2D wearMap;
      uniform sampler2D heightMap;
      uniform float grassHeight;
      uniform float displacementStrength;
      uniform float noiseScale;

      varying vec2 vUv;
      varying vec3 vPosition;
      varying float vWear;
      varying vec3 vNormal;
      varying vec3 vWorldPosition;
      varying float vGrassHeight;
      varying float vDisplacement;
      varying float vDebugHeight;
      varying vec2 vDebugUV;

      // Advanced noise functions for realistic grass
      float random(vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
      }

      float noise(vec2 st) {
        vec2 i = floor(st);
        vec2 f = fract(st);
        float a = random(i);
        float b = random(i + vec2(1.0, 0.0));
        float c = random(i + vec2(0.0, 1.0));
        float d = random(i + vec2(1.0, 1.0));
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(a, b, u.x) + (c - a)* u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
      }

      // Fractal Brownian Motion for complex grass patterns
      float fbm(vec2 st) {
        float value = 0.0;
        float amplitude = 0.5;
        float frequency = 1.0;
        for (int i = 0; i < 6; i++) {
          value += amplitude * noise(st * frequency);
          st *= 2.0;
          amplitude *= 0.5;
          frequency *= 2.0;
        }
        return value;
      }

      // Advanced grass blade shape function
      float grassBlade(vec2 uv, float height, float density) {
        // Create natural blade width variation
        float bladeWidth = 0.8 + noise(uv * 100.0) * 0.4;
        float blade = 1.0 - abs(uv.x - 0.5) * 2.0 * bladeWidth;

        // Natural blade taper with variation
        float taperStart = 0.05 + noise(uv * 150.0) * 0.05;
        float taperEnd = 0.75 + noise(uv * 120.0) * 0.2;
        blade *= smoothstep(0.0, taperStart, uv.y) * smoothstep(1.0, taperEnd, uv.y);

        // Add blade curvature for realism
        float curvature = sin(uv.y * 3.14159) * 0.1;
        blade *= (1.0 + curvature);

        // Apply density for sparse areas
        blade *= density;

        return blade * height;
      }

      // Grass density function based on position
      float grassDensity(vec2 uv, float wear) {
        // Base density with natural variation
        float density = 0.8 + fbm(uv * 50.0) * 0.4;

        // Reduce density in worn areas
        density *= (1.0 - wear * 0.8);

        // Create natural sparse patches
        float sparseness = noise(uv * 20.0);
        if (sparseness > 0.7) {
          density *= 0.3; // Sparse patches
        }

        return clamp(density, 0.1, 1.0);
      }

      void main() {
        vUv = uv;
        vPosition = position;
        vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;

        // Debug: Store original UV coordinates
        vDebugUV = uv;

        // Sample wear data - UV coordinates should match world coordinate system
        // For a plane rotated -90° around X-axis:
        // - World X maps to texture U (left-right on field)
        // - World Z maps to texture V (front-back on field)
        // Standard UV mapping should work correctly with proper coordinate conversion
        vec2 correctedUV = uv;
        vWear = texture2D(wearMap, correctedUV).r;

        // Sample CPU-generated heightmap for realistic grass patterns
        // Use standard UV coordinates for heightmap sampling
        float heightmapValue = texture2D(heightMap, correctedUV * noiseScale).r;
        vDisplacement = heightmapValue;

        // Debug: Ensure heightmap value is in correct range
        heightmapValue = clamp(heightmapValue, 0.0, 1.0);

        // Calculate base grass height with wear reduction
        float baseHeight = grassHeight * (1.0 - vWear * 0.8);

        // Calculate grass density for this position
        float density = grassDensity(uv, vWear);

        // Use heightmap for natural grass variation
        float grassVariation = heightmapValue * 0.7;
        float microVariation = noise(uv * 300.0) * 0.15;

        // Combine all height factors
        float finalHeight = baseHeight * (0.3 + grassVariation + microVariation);

        // Create advanced grass blade displacement - SIMPLIFIED FOR TESTING
        // float bladeHeight = grassBlade(uv, finalHeight, density);
        float bladeHeight = finalHeight; // Simplified - just use height directly
        vGrassHeight = bladeHeight;

        // Wind animation DISABLED for debugging
        // float windPhase = time * 1.5 + position.x * 0.05 + position.z * 0.05;
        // float windNoise = noise(vec2(windPhase * 0.1, position.z * 0.1));
        // float baseWindHeight = grassHeight * (1.0 - vWear * 0.8);
        // float windEffect = sin(windPhase) * windNoise * windStrength * baseWindHeight;

        // Wind effects completely disabled
        vec3 windOffset = vec3(0.0, 0.0, 0.0);

        // Vertex displacement for real 3D grass
        vec3 newPosition = position;

        // Apply height displacement using CPU-generated heightmap
        // Use heightmap value for realistic grass height variation
        // Clamp heightmap value and apply smooth curve for natural grass growth
        float clampedHeight = clamp(heightmapValue, 0.0, 1.0);
        float totalDisplacement = clampedHeight * displacementStrength;

        // For a plane rotated -Math.PI/2 around X-axis (standard horizontal plane):
        // - Local Y-axis becomes world Z-axis (up/down)
        // - We want displacement to create grass height variation (elevation)
        // - Apply displacement along the vertex normal direction for proper grass height
        vec3 originalPosition = newPosition;

        // Apply displacement along the normal direction (which should be up after rotation)
        vec3 displacementVector = normal * totalDisplacement;
        newPosition += displacementVector;

        // Store debug info for fragment shader
        vDebugHeight = totalDisplacement;

        // Store debug info for fragment shader
        vDebugHeight = totalDisplacement;

        // Ensure grass stays above ground level with minimal adjustment
        newPosition.y = max(newPosition.y, 0.001);

        // Debug: Log displacement values occasionally for verification
        if (position.x == 0.0 && position.z == 0.0) {
          // This will only execute for the center vertex, reducing console spam
          // Note: This is a shader debug technique - values won't actually log in real-time
        }

        // Advanced wear-based compression and deformation (SEPARATE from displacement strength)
        if (vWear > 0.2) {
          // Progressive height reduction based on wear intensity
          float compressionFactor = smoothstep(0.2, 1.0, vWear);
          newPosition.y *= (1.0 - compressionFactor * 0.7);

          // Realistic grass flattening patterns (independent of displacement strength)
          float flattenAmount = vWear * 0.2; // Reduced amount to prevent excessive movement
          float directionNoise = noise(uv * 150.0);
          float angleNoise = noise(uv * 180.0 + 50.0) * 6.28318; // 2π

          // Create directional flattening (grass lies down in patterns)
          // TEMPORARILY DISABLED to isolate displacement issue
          // newPosition.x += cos(angleNoise) * flattenAmount * directionNoise * 0.1;
          // newPosition.z += sin(angleNoise) * flattenAmount * directionNoise * 0.1;

          // Add clumping effect in heavily worn areas
          // TEMPORARILY DISABLED to isolate displacement issue
          // if (vWear > 0.6) {
          //   float clumpNoise = noise(uv * 80.0);
          //   newPosition.x += (clumpNoise - 0.5) * 0.2;
          //   newPosition.z += (noise(uv * 80.0 + 25.0) - 0.5) * 0.2;
          // }
        }

        // Apply wind displacement - DISABLED for debugging
        // newPosition += windOffset;

        // Calculate normal for proper lighting
        vNormal = normalize(normalMatrix * normal);

        gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
      }
    `;

    // Enhanced fragment shader for displaced grass
    this.fragmentShader = `
      uniform float time;
      uniform vec3 grassColorBase;
      uniform vec3 grassColorTip;
      uniform vec3 grassColorDry;
      uniform vec3 dirtColor;
      uniform float grassDensity;
      uniform sampler2D noiseTexture;
      uniform vec3 lightDirection;
      uniform float ambientLight;

      varying vec2 vUv;
      varying vec3 vPosition;
      varying float vWear;
      varying vec3 vNormal;
      varying vec3 vWorldPosition;
      varying float vGrassHeight;
      varying float vDisplacement;
      varying float vDebugHeight;
      varying vec2 vDebugUV;

      // Advanced noise for grass texture
      float random(vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
      }

      float noise(vec2 st) {
        vec2 i = floor(st);
        vec2 f = fract(st);
        float a = random(i);
        float b = random(i + vec2(1.0, 0.0));
        float c = random(i + vec2(0.0, 1.0));
        float d = random(i + vec2(1.0, 1.0));
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(a, b, u.x) + (c - a)* u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
      }

      float fbm(vec2 st) {
        float value = 0.0;
        float amplitude = 0.5;
        float frequency = 1.0;
        for (int i = 0; i < 4; i++) {
          value += amplitude * noise(st * frequency);
          st *= 2.0;
          amplitude *= 0.5;
          frequency *= 2.0;
        }
        return value;
      }

      void main() {
        // Discard fragments where grass height is too low (creates realistic grass density)
        // Temporarily disabled to debug field coverage
        // if (vGrassHeight < 0.01) {
        //   discard;
        // }

        // Advanced height-based color variation
        float heightFactor = smoothstep(0.0, 1.0, vGrassHeight);
        float heightCurve = pow(heightFactor, 1.2); // More dramatic height variation

        // Multi-layer grass coloring
        vec3 grassRoot = grassColorBase * 0.8; // Darker roots
        vec3 grassMid = mix(grassColorBase, grassColorTip, 0.5);
        vec3 grassTop = grassColorTip * 1.1; // Brighter tips

        // Blend colors based on height
        vec3 grassColor;
        if (heightFactor < 0.3) {
          grassColor = mix(grassRoot, grassColorBase, heightFactor / 0.3);
        } else if (heightFactor < 0.7) {
          grassColor = mix(grassColorBase, grassMid, (heightFactor - 0.3) / 0.4);
        } else {
          grassColor = mix(grassMid, grassTop, (heightFactor - 0.7) / 0.3);
        }

        // Advanced grass blade texture with multiple scales
        float bladeTexture = fbm(vUv * 200.0) * 0.3;
        float fineTexture = noise(vUv * 500.0) * 0.15;
        grassColor *= (0.8 + bladeTexture + fineTexture);

        // Advanced wear effects with realistic color transitions
        float wearIntensity = smoothstep(0.05, 0.95, vWear);

        // Multi-stage wear progression
        vec3 stressedGrass = mix(grassColor, grassColorDry * 0.9, wearIntensity * 0.4);
        vec3 damagedGrass = mix(stressedGrass, grassColorDry, wearIntensity * 0.6);
        vec3 deadGrass = mix(damagedGrass, grassColorDry * 0.7, wearIntensity * 0.8);
        vec3 finalGrassColor = mix(deadGrass, dirtColor, pow(wearIntensity, 2.0) * 0.9);

        // Add wear pattern variation
        float wearNoise = noise(vUv * 300.0) * 0.2;
        finalGrassColor = mix(finalGrassColor, finalGrassColor * (0.8 + wearNoise), wearIntensity);

        // Progressive grass density reduction for two-layer system
        float densityReduction = smoothstep(0.1, 0.9, vWear);
        float alpha = grassDensity * (1.0 - densityReduction * 0.95);

        // Create realistic bare patches where grass is completely worn away
        if (vWear > 0.5) {
          float patchNoise = noise(vUv * 150.0);
          if (patchNoise > 0.4) {
            alpha *= 0.1; // Almost completely transparent to show dirt underneath
          }
        }

        // Very worn areas become completely transparent
        if (vWear > 0.8) {
          float bareNoise = noise(vUv * 200.0);
          if (bareNoise > 0.3) {
            alpha = 0.0; // Completely transparent to reveal dirt layer
          }
        }

        // Advanced lighting system with multiple effects
        vec3 normal = normalize(vNormal);
        vec3 lightDir = normalize(lightDirection);
        float NdotL = dot(normal, lightDir);

        // Enhanced diffuse lighting with wrap-around
        float diffuse = max(NdotL * 0.5 + 0.5, 0.0);

        // Advanced subsurface scattering for grass translucency
        float backLight = max(0.0, dot(-normal, lightDir));
        float subsurface = pow(backLight, 1.5) * 0.6;

        // Rim lighting for grass edges
        vec3 viewDir = normalize(vWorldPosition - cameraPosition);
        float rim = 1.0 - max(0.0, dot(normal, -viewDir));
        rim = pow(rim, 2.0) * 0.3;

        // Height-based ambient occlusion
        float ao = mix(0.5, 1.0, vGrassHeight);

        // Density-based lighting (sparse areas get more light)
        float densityLight = mix(1.2, 0.8, vGrassHeight);

        // Environmental lighting variation
        float envNoise = noise(vUv * 50.0) * 0.1;

        // Combine all lighting effects
        float lightIntensity = (diffuse + subsurface + rim + ambientLight) * ao * densityLight;
        lightIntensity = clamp(lightIntensity + envNoise, 0.15, 1.3);

        // Final color with lighting
        vec3 finalColor = finalGrassColor * lightIntensity;

        // Debug visualization modes (controlled by debug buttons)
        // These are replaced dynamically by the debug system:

        // Displacement mode: Blue = low displacement, Red = high displacement
        // finalColor = mix(vec3(0.0, 0.0, 1.0), vec3(1.0, 0.0, 0.0), clamp(vDebugHeight / 0.15, 0.0, 1.0));

        // UV coordinate mode: Red = U coordinate, Green = V coordinate
        // finalColor = vec3(vDebugUV.x, vDebugUV.y, 0.5);

        // Wear visualization mode: Green = no wear, Red = full wear
        // finalColor = mix(vec3(0.0, 1.0, 0.0), vec3(1.0, 0.0, 0.0), vWear);

        // Height visualization mode: Dark = low grass, Bright = tall grass
        // finalColor = vec3(vGrassHeight, vGrassHeight, vGrassHeight);

        // Add subtle color variation for realism
        float colorVariation = noise(vUv * 300.0) * 0.1;
        finalColor += colorVariation;

        // Enhance contrast in worn areas
        if (wearIntensity > 0.5) {
          finalColor = mix(finalColor, finalColor * finalColor, (wearIntensity - 0.5) * 0.4);
        }

        gl_FragColor = vec4(finalColor, alpha);
      }
    `;
  }

  initializeWearSystem() {
    // Create wear texture
    this.wearTexture = new THREE.DataTexture(
      this.wearData,
      this.wearResolution,
      this.wearResolution,
      THREE.RedFormat,
      THREE.FloatType
    );
    this.wearTexture.needsUpdate = true;
    this.wearTexture.wrapS = THREE.ClampToEdgeWrapping;
    this.wearTexture.wrapT = THREE.ClampToEdgeWrapping;
    this.wearTexture.minFilter = THREE.LinearFilter;
    this.wearTexture.magFilter = THREE.LinearFilter;

    // Create CPU-generated heightmap with Simplex noise
    this.createHeightmapTexture();

    // Create noise texture for grass variation
    this.createNoiseTexture();
  }

  createHeightmapTexture() {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    const imageData = ctx.createImageData(size, size);

    // Initialize Simplex noise
    const noise = new SimplexNoise(42); // Fixed seed for consistent results

    console.log('🏔️ DISPLACEMENT DEBUG: Generating CPU-based heightmap with Simplex Noise...');
    console.log(`🏔️ DISPLACEMENT DEBUG: Heightmap size: ${size}x${size}`);

    let minHeight = Infinity;
    let maxHeight = -Infinity;
    let avgHeight = 0;
    let sampleCount = 0;

    // Generate realistic grass heightmap using Simplex noise
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const u = x / size;
        const v = y / size;

        // Advanced multi-layer noise for ultra-realistic grass patterns

        // Layer 1: Base grass height variation (large scale)
        const baseNoise = noise.fbm(u * 4, v * 4, 4, 0.6, 2.0);

        // Layer 2: Grass clumps and patches (medium scale)
        const clumpNoise = noise.fbm(u * 12, v * 12, 3, 0.5, 2.1);

        // Layer 3: Individual grass blade variation (small scale)
        const bladeNoise = noise.fbm(u * 40, v * 40, 2, 0.4, 2.2);

        // Layer 4: Micro-detail for grass texture (very small scale)
        const microNoise = noise.turbulence(u * 80, v * 80, 2);

        // Layer 5: Ridged noise for natural grass growth patterns
        const ridgedNoise = noise.ridgedNoise(u * 6, v * 6, 3);

        // Combine all layers with different weights - reduced for subtlety
        let height = 0;
        height += baseNoise * 0.3;      // 30% base variation
        height += clumpNoise * 0.2;     // 20% clump patterns
        height += bladeNoise * 0.15;    // 15% blade variation
        height += microNoise * 0.05;    // 5% micro detail
        height += ridgedNoise * 0.03;   // 3% ridged patterns

        // Normalize to [0, 1] range
        height = (height + 1) / 2;

        // Apply grass growth curve for more realistic distribution
        height = Math.pow(height, 0.8); // Slight curve for natural look

        // Add some base height and variation - more subtle for realistic grass
        height = 0.7 + height * 0.3; // Range from 0.7 to 1.0 (subtle variation)

        // Clamp to valid range
        height = Math.max(0, Math.min(1, height));

        // Track height statistics for debugging
        minHeight = Math.min(minHeight, height);
        maxHeight = Math.max(maxHeight, height);
        avgHeight += height;
        sampleCount++;

        // Convert to 0-255 for canvas
        const val = Math.floor(height * 255);
        const i = (y * size + x) * 4;

        // Store as grayscale
        imageData.data[i] = val;     // R
        imageData.data[i + 1] = val; // G
        imageData.data[i + 2] = val; // B
        imageData.data[i + 3] = 255; // A
      }
    }

    // Draw to canvas
    ctx.putImageData(imageData, 0, 0);

    // Create Three.js texture from canvas
    this.heightmapTexture = new THREE.CanvasTexture(canvas);
    this.heightmapTexture.wrapS = THREE.RepeatWrapping;
    this.heightmapTexture.wrapT = THREE.RepeatWrapping;
    this.heightmapTexture.minFilter = THREE.LinearFilter;
    this.heightmapTexture.magFilter = THREE.LinearFilter;
    this.heightmapTexture.needsUpdate = true;

    // Calculate and log height statistics
    avgHeight /= sampleCount;
    console.log('🏔️ DISPLACEMENT DEBUG: Heightmap generated successfully!');
    console.log(`🏔️ DISPLACEMENT DEBUG: Height range: ${minHeight.toFixed(3)} - ${maxHeight.toFixed(3)}`);
    console.log(`🏔️ DISPLACEMENT DEBUG: Average height: ${avgHeight.toFixed(3)}`);
    console.log(`🏔️ DISPLACEMENT DEBUG: Height variation: ${(maxHeight - minHeight).toFixed(3)}`);

    // Store canvas for potential wear modifications
    this.heightmapCanvas = canvas;
    this.heightmapContext = ctx;
    this.heightmapImageData = imageData;
  }

  createNoiseTexture() {
    const size = 256;
    const data = new Uint8Array(size * size);

    for (let i = 0; i < size * size; i++) {
      data[i] = Math.random() * 255;
    }

    this.noiseTexture = new THREE.DataTexture(data, size, size, THREE.RedFormat);
    this.noiseTexture.needsUpdate = true;
    this.noiseTexture.wrapS = THREE.RepeatWrapping;
    this.noiseTexture.wrapT = THREE.RepeatWrapping;
  }

  createGrassMaterial() {
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0.0 },
        windDirection: { value: new THREE.Vector2(1.0, 0.5) },
        windStrength: { value: 0.02 },
        wearMap: { value: this.wearTexture },
        heightMap: { value: this.heightmapTexture },
        noiseTexture: { value: this.noiseTexture },
        grassHeight: { value: 0.3 }, // Realistic grass height in meters
        displacementStrength: { value: 0.15 }, // Realistic grass height variation (was 1.5 - too extreme)
        noiseScale: { value: 1.0 }, // Proper heightmap sampling
        grassColorBase: { value: new THREE.Color(0x1a4a0a) },
        grassColorTip: { value: new THREE.Color(0x4a7c1a) },
        grassColorDry: { value: new THREE.Color(0x8b6914) },
        dirtColor: { value: new THREE.Color(0x5d4037) },
        grassDensity: { value: 1.0 },
        lightDirection: { value: new THREE.Vector3(1.0, 2.0, 1.0) },
        ambientLight: { value: 0.3 }
      },
      vertexShader: this.vertexShader,
      fragmentShader: this.fragmentShader,
      transparent: true,
      side: THREE.DoubleSide,
      alphaTest: 0.1
    });

    // Debug displacement-related uniforms
    console.log('🏔️ DISPLACEMENT DEBUG: Material created with uniforms:');
    console.log(`🏔️ DISPLACEMENT DEBUG: - grassHeight: ${this.material.uniforms.grassHeight.value}`);
    console.log(`🏔️ DISPLACEMENT DEBUG: - displacementStrength: ${this.material.uniforms.displacementStrength.value}`);
    console.log(`🏔️ DISPLACEMENT DEBUG: - noiseScale: ${this.material.uniforms.noiseScale.value}`);
    console.log(`🏔️ DISPLACEMENT DEBUG: - heightMap texture: ${this.material.uniforms.heightMap.value ? 'LOADED' : 'MISSING'}`);

    return this.material;
  }

  // Record player activity for wear tracking
  recordPlayerActivity(x, z, activityType = 'walk', intensity = 1.0) {
    // Convert world coordinates to texture coordinates
    // Field layout: width=52.5 (X-axis, goal to goal), height=34 (Z-axis, sideline to sideline)
    // Texture mapping: U corresponds to X-axis (width), V corresponds to Z-axis (height)

    // Map world coordinates to texture coordinates (standard mapping)
    // World X (-width/2 to +width/2) -> Texture U (0 to 1)
    // World Z (-height/2 to +height/2) -> Texture V (0 to 1)
    const texU = Math.floor(((x + this.fieldWidth/2) / this.fieldWidth) * this.wearResolution);
    const texV = Math.floor(((z + this.fieldHeight/2) / this.fieldHeight) * this.wearResolution);

    // Clamp to texture bounds
    const clampedU = Math.max(0, Math.min(this.wearResolution - 1, texU));
    const clampedV = Math.max(0, Math.min(this.wearResolution - 1, texV));

    console.log(`Grass Shader: Recording wear at world(${x.toFixed(2)}, ${z.toFixed(2)}) -> texture(${clampedU}, ${clampedV})`);

    // Calculate wear intensity based on activity type
    let wearAmount = 0.001; // Base wear for walking
    
    // Advanced wear mechanics with different damage types
    let wearRadius = 3; // Default radius
    let wearPattern = 'circular';

    switch(activityType) {
      case 'walk':
        wearAmount = 0.008 * intensity;
        wearRadius = 2;
        wearPattern = 'circular';
        break;
      case 'run':
        wearAmount = 0.015 * intensity;
        wearRadius = 3;
        wearPattern = 'oval';
        break;
      case 'tackle':
        wearAmount = 0.04 * intensity;
        wearRadius = 5;
        wearPattern = 'irregular';
        break;
      case 'slide':
        wearAmount = 0.07 * intensity;
        wearRadius = 8;
        wearPattern = 'streak';
        break;
      case 'shot':
        wearAmount = 0.025 * intensity;
        wearRadius = 4;
        wearPattern = 'divot';
        break;
      case 'foul':
        wearAmount = 0.035 * intensity;
        wearRadius = 6;
        wearPattern = 'scuff';
        break;
      case 'sprint':
        wearAmount = 0.02 * intensity;
        wearRadius = 3;
        wearPattern = 'trail';
        break;
      case 'jump':
        wearAmount = 0.03 * intensity;
        wearRadius = 3;
        wearPattern = 'impact';
        break;
    }

    console.log(`Wear amount: ${wearAmount} for activity: ${activityType}`);

    
    // Apply advanced wear patterns based on activity type
    this.applyWearPattern(clampedU, clampedV, wearAmount, wearRadius, wearPattern);

    this.wearNeedsUpdate = true;

    // Also modify the heightmap for physical grass flattening
    this.modifyHeightmapForWear(clampedU, clampedV, wearAmount, wearRadius);

    // Force immediate update for test mode
    this.updateWearTexture();
  }

  // Advanced wear pattern application
  applyWearPattern(centerX, centerZ, wearAmount, radius, pattern) {
    const maxRadius = Math.ceil(radius);

    for (let dx = -maxRadius; dx <= maxRadius; dx++) {
      for (let dz = -maxRadius; dz <= maxRadius; dz++) {
        const px = centerX + dx;
        const pz = centerZ + dz;

        if (px >= 0 && px < this.wearResolution && pz >= 0 && pz < this.wearResolution) {
          const distance = Math.sqrt(dx * dx + dz * dz);
          let falloff = 0;

          // Calculate falloff based on wear pattern
          switch(pattern) {
            case 'circular':
              falloff = Math.max(0, 1 - distance / radius);
              break;

            case 'oval':
              const ovalDist = Math.sqrt((dx * dx) / (radius * radius) + (dz * dz) / ((radius * 0.7) * (radius * 0.7)));
              falloff = Math.max(0, 1 - ovalDist);
              break;

            case 'irregular':
              const irregularNoise = Math.sin(dx * 0.5) * Math.cos(dz * 0.5) * 0.3;
              falloff = Math.max(0, 1 - distance / (radius + irregularNoise));
              break;

            case 'streak':
              const streakLength = radius * 1.5;
              const streakWidth = radius * 0.4;
              const streakDist = Math.abs(dz) / streakWidth + Math.abs(dx) / streakLength;
              falloff = Math.max(0, 1 - streakDist);
              break;

            case 'divot':
              const divotCenter = distance < radius * 0.3 ? 1 : Math.max(0, 1 - distance / radius);
              falloff = divotCenter * (1 + Math.sin(distance * 3) * 0.2);
              break;

            case 'scuff':
              const scuffNoise = Math.sin(dx * 0.8) * Math.cos(dz * 0.6) * 0.4;
              falloff = Math.max(0, (1 - distance / radius) * (0.7 + scuffNoise));
              break;

            case 'trail':
              const trailFade = Math.max(0, 1 - Math.abs(dx) / (radius * 2));
              const trailWidth = Math.max(0, 1 - Math.abs(dz) / (radius * 0.5));
              falloff = trailFade * trailWidth;
              break;

            case 'impact':
              const impactCore = distance < radius * 0.2 ? 1.5 : Math.max(0, 1 - distance / radius);
              falloff = Math.min(1, impactCore);
              break;

            default:
              falloff = Math.max(0, 1 - distance / radius);
          }

          if (falloff > 0) {
            const index = pz * this.wearResolution + px;
            const oldWear = this.wearData[index];
            this.wearData[index] = Math.min(1.0, this.wearData[index] + wearAmount * falloff);

            if (this.wearData[index] !== oldWear) {
              console.log(`${pattern} wear at (${px}, ${pz}): ${oldWear.toFixed(3)} -> ${this.wearData[index].toFixed(3)}`);

              // Debug: Also log displacement impact
              if (this.wearData[index] > 0.1) {
                console.log(`🏔️ DISPLACEMENT DEBUG: High wear (${this.wearData[index].toFixed(3)}) at texture(${px}, ${pz}) - should reduce grass height`);
              }
            }
          }
        }
      }
    }
  }

  // Modify heightmap canvas for physical grass flattening
  modifyHeightmapForWear(texX, texZ, wearAmount, radius) {
    if (!this.heightmapContext || !this.heightmapImageData) return;

    const size = this.wearResolution;
    const canvas = this.heightmapCanvas;
    const ctx = this.heightmapContext;

    // Convert wear texture coordinates to heightmap coordinates
    const heightmapSize = canvas.width;
    const hX = Math.floor((texX / size) * heightmapSize);
    const hZ = Math.floor((texZ / size) * heightmapSize);

    // Apply wear to heightmap (flatten the grass)
    const flattenRadius = Math.max(2, Math.floor(radius * heightmapSize / size));

    for (let dx = -flattenRadius; dx <= flattenRadius; dx++) {
      for (let dz = -flattenRadius; dz <= flattenRadius; dz++) {
        const px = hX + dx;
        const pz = hZ + dz;

        if (px >= 0 && px < heightmapSize && pz >= 0 && pz < heightmapSize) {
          const distance = Math.sqrt(dx * dx + dz * dz);
          const falloff = Math.max(0, 1 - distance / flattenRadius);

          // Get current pixel
          const imageData = ctx.getImageData(px, pz, 1, 1);
          const currentHeight = imageData.data[0] / 255;

          // Flatten the grass (reduce height)
          const flattenAmount = wearAmount * falloff * 0.3; // Moderate flattening
          const newHeight = Math.max(0.1, currentHeight - flattenAmount); // Don't go below 0.1

          // Set new height
          const newVal = Math.floor(newHeight * 255);
          imageData.data[0] = newVal;
          imageData.data[1] = newVal;
          imageData.data[2] = newVal;
          imageData.data[3] = 255;

          ctx.putImageData(imageData, px, pz);
        }
      }
    }

    // Update the Three.js texture
    this.heightmapTexture.needsUpdate = true;
  }

  // Update wear texture (called periodically for performance)
  updateWearTexture() {
    if (this.wearNeedsUpdate) {
      this.wearTexture.needsUpdate = true;
      this.wearNeedsUpdate = false;
    }
  }

  // Update shader uniforms
  update(deltaTime, windDirection = { x: 1, y: 0.5 }, windStrength = 0.02) {
    const currentTime = performance.now();
    
    // Update wear texture periodically for performance
    if (currentTime - this.lastWearUpdate > this.wearUpdateInterval) {
      this.updateWearTexture();
      this.lastWearUpdate = currentTime;
    }
    
    // Update shader uniforms if material exists
    if (this.material) {
      this.material.uniforms.time.value += deltaTime;
      // Wind uniforms disabled for debugging
      // this.material.uniforms.windDirection.value.set(windDirection.x, windDirection.y);
      // this.material.uniforms.windStrength.value = windStrength;

      // Debug displacement values periodically (every 5 seconds)
      const timeSeconds = Math.floor(this.material.uniforms.time.value);
      if (timeSeconds % 5 === 0 && timeSeconds !== this.lastDebugTime) {
        this.lastDebugTime = timeSeconds;
        console.log('🏔️ DISPLACEMENT DEBUG: Current shader state:');
        console.log(`🏔️ DISPLACEMENT DEBUG: - Time: ${this.material.uniforms.time.value.toFixed(2)}`);
        console.log(`🏔️ DISPLACEMENT DEBUG: - Displacement strength: ${this.material.uniforms.displacementStrength.value}`);
        console.log(`🏔️ DISPLACEMENT DEBUG: - Grass height: ${this.material.uniforms.grassHeight.value}`);
        console.log(`🏔️ DISPLACEMENT DEBUG: - Noise scale: ${this.material.uniforms.noiseScale.value}`);
        console.log(`🏔️ DISPLACEMENT DEBUG: - HeightMap texture: ${this.material.uniforms.heightMap.value ? 'LOADED' : 'MISSING'}`);
      }
    } else {
      console.warn('🏔️ DISPLACEMENT DEBUG: Material not available for update');
    }
  }

  // Get the grass material
  getMaterial() {
    if (!this.material) {
      this.material = this.createGrassMaterial();
    }
    return this.material;
  }

  // Reset wear data (for new match)
  resetWear() {
    this.wearData.fill(0);
    this.wearNeedsUpdate = true;

    // Also regenerate the heightmap
    this.createHeightmapTexture();

    // Update material uniform
    if (this.material) {
      this.material.uniforms.heightMap.value = this.heightmapTexture;
    }
  }

  // Get wear intensity at a specific position (for gameplay effects)
  getWearAt(x, z) {
    const texX = Math.floor(((x + this.fieldWidth/2) / this.fieldWidth) * this.wearResolution);
    const texZ = Math.floor(((z + this.fieldHeight/2) / this.fieldHeight) * this.wearResolution);
    
    const clampedX = Math.max(0, Math.min(this.wearResolution - 1, texX));
    const clampedZ = Math.max(0, Math.min(this.wearResolution - 1, texZ));
    
    const index = clampedZ * this.wearResolution + clampedX;
    return this.wearData[index];
  }

  // Debug method to test displacement at specific coordinates
  testDisplacementAt(worldX, worldZ) {
    // Convert world coordinates to UV coordinates
    const u = (worldX + this.fieldWidth/2) / this.fieldWidth;
    const v = (worldZ + this.fieldHeight/2) / this.fieldHeight;

    // Clamp to valid range
    const clampedU = Math.max(0, Math.min(1, u));
    const clampedV = Math.max(0, Math.min(1, v));

    console.log(`🧪 DISPLACEMENT TEST: World(${worldX}, ${worldZ}) -> UV(${clampedU.toFixed(3)}, ${clampedV.toFixed(3)})`);

    // Get current displacement strength
    const displacementStrength = this.material ? this.material.uniforms.displacementStrength.value : 0.15;

    // Simulate heightmap sampling (approximate)
    if (this.heightmapCanvas) {
      const canvas = this.heightmapCanvas;
      const ctx = this.heightmapContext;
      const x = Math.floor(clampedU * canvas.width);
      const y = Math.floor(clampedV * canvas.height);

      const imageData = ctx.getImageData(x, y, 1, 1);
      const heightValue = imageData.data[0] / 255; // Red channel
      const displacement = heightValue * displacementStrength;

      console.log(`🧪 DISPLACEMENT TEST: Height value: ${heightValue.toFixed(3)}, Displacement: ${displacement.toFixed(3)}m`);
      return { heightValue, displacement, u: clampedU, v: clampedV };
    }

    return null;
  }

  // Method to create test wear patterns for debugging
  createTestWearPattern() {
    console.log('🧪 WEAR TEST: Creating test wear pattern...');

    // Create a cross pattern in the center
    const centerX = this.wearResolution / 2;
    const centerZ = this.wearResolution / 2;

    // Horizontal line
    for (let x = centerX - 50; x < centerX + 50; x++) {
      if (x >= 0 && x < this.wearResolution) {
        const index = centerZ * this.wearResolution + x;
        this.wearData[index] = 0.8;
      }
    }

    // Vertical line
    for (let z = centerZ - 50; z < centerZ + 50; z++) {
      if (z >= 0 && z < this.wearResolution) {
        const index = z * this.wearResolution + centerX;
        this.wearData[index] = 0.8;
      }
    }

    // Corner spots
    const corners = [
      [centerX - 100, centerZ - 100],
      [centerX + 100, centerZ - 100],
      [centerX - 100, centerZ + 100],
      [centerX + 100, centerZ + 100]
    ];

    corners.forEach(([x, z]) => {
      for (let dx = -10; dx <= 10; dx++) {
        for (let dz = -10; dz <= 10; dz++) {
          const px = x + dx;
          const pz = z + dz;
          if (px >= 0 && px < this.wearResolution && pz >= 0 && pz < this.wearResolution) {
            const distance = Math.sqrt(dx * dx + dz * dz);
            if (distance <= 10) {
              const index = pz * this.wearResolution + px;
              this.wearData[index] = 0.6;
            }
          }
        }
      }
    });

    this.wearNeedsUpdate = true;
    this.updateWearTexture();
    console.log('🧪 WEAR TEST: Test pattern created - cross in center with corner spots');
  }

  // Dispose of resources
  dispose() {
    if (this.wearTexture) this.wearTexture.dispose();
    if (this.heightmapTexture) this.heightmapTexture.dispose();
    if (this.noiseTexture) this.noiseTexture.dispose();
    if (this.material) this.material.dispose();
  }
}
