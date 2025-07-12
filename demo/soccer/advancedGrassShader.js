/**
 * AAA-Quality Advanced Grass Shader System
 * Features: LOD, Culling, PBR, Geometry Instancing, Wind Animation, Realistic Grass Blades
 */

import * as THREE from 'https://unpkg.com/three@0.156.1/build/three.module.js';

export class AdvancedGrassSystem {
  constructor(renderer, fieldWidth = 52.5, fieldHeight = 34) {
    console.log('🌱 ADVANCED GRASS: Constructor called with field size:', fieldWidth, 'x', fieldHeight);
    this.renderer = renderer;
    this.fieldWidth = fieldWidth;
    this.fieldHeight = fieldHeight;
    
    // LOD system with higher base density and always-visible grass
    this.baseGrassHeight = 0.15; // Realistic soccer field grass height in meters
    this.lodLevels = [
      { distance: 15, density: 1.0, bladeHeight: 1.0, segments: 3 },   // Close: full detail
      { distance: 30, density: 0.8, bladeHeight: 0.9, segments: 2 },   // Medium: high detail
      { distance: 60, density: 0.6, bladeHeight: 0.7, segments: 1 },   // Far: medium detail
      { distance: 120, density: 0.4, bladeHeight: 0.5, segments: 1 },  // Very far: low detail
      { distance: 300, density: 0.2, bladeHeight: 0.3, segments: 1 }   // Distant: minimal but visible
    ];

    // Minimum base density to ensure grass is always visible
    this.minimumBaseDensity = 0.1;

    // Rendering options
    this.showWireframe = false;
    this.densityMultiplier = 2.0; // Global density multiplier - increased for minimum 2000 blades
    this.isRegenerating = false; // Flag to prevent LOD updates during regeneration
    this.manualLODMode = true; // Start in manual mode for better control

    // Individual LOD density multipliers - optimized for minimum 2000 blades total
    this.lodDensityMultipliers = [1.5, 1.2, 1.0, 0.8, 0.6]; // Higher values to ensure visibility

    // Screen-space LOD thresholds (in pixels) - very lenient to ensure all chunks get grass
    this.lodThresholds = [100, 50, 25, 10, 2]; // Lower thresholds = more grass everywhere

    // Minimum grass blade guarantee
    this.minimumTotalBlades = 2000; // Ensure at least 2000 blades are always visible
    
    // Grass blade geometry cache
    this.grassGeometries = new Map();
    this.grassMaterials = new Map();
    this.grassInstances = new Map();
    
    // Culling and performance
    this.frustum = new THREE.Frustum();
    this.cameraMatrix = new THREE.Matrix4();
    this.visibleChunks = new Set();
    
    // Chunk system for efficient culling
    this.chunkSize = 8; // 8x8 meter chunks
    this.chunks = new Map();
    
    // Wind system
    this.windTime = 0;
    this.windDirection = new THREE.Vector2(1, 0.5);
    this.windStrength = 0.02;
    
    // Wear tracking
    this.wearResolution = 1024;
    this.wearData = new Float32Array(this.wearResolution * this.wearResolution);
    this.wearTexture = null;
    
    this.initializeSystem();
  }

  initializeSystem() {
    console.log('🌱 GRASS INIT: Starting advanced grass system initialization...');
    this.createWearTexture();
    console.log('🌱 GRASS INIT: Wear texture created');
    this.createGrassGeometries();
    console.log('🌱 GRASS INIT: Grass geometries created');
    this.createGrassMaterials();
    console.log('🌱 GRASS INIT: Grass materials created');
    this.generateGrassChunks();
    console.log('🌱 GRASS INIT: Grass chunks generated');
    this.setupInstancedMeshes();
    console.log('🌱 GRASS INIT: Instanced meshes set up');
    console.log('🌱 GRASS INIT: Advanced grass system initialization complete!');
  }

  createWearTexture() {
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
  }

  createGrassGeometries() {
    // Create different LOD grass blade geometries
    this.lodLevels.forEach((lod, index) => {
      const geometry = this.createGrassBladeGeometry(lod.bladeHeight, lod.segments);
      this.grassGeometries.set(index, geometry);
    });
  }

  createGrassBladeGeometry(heightMultiplier, segments) {
    const geometry = new THREE.BufferGeometry();
    const vertices = [];
    const normals = [];
    const uvs = [];
    const indices = [];

    const height = this.baseGrassHeight * heightMultiplier; // Use base height with multiplier
    const width = 0.02; // Realistic blade width (2cm)
    const curve = 0.05; // Subtle natural blade curve

    // Create realistic grass blade with curve and taper
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const y = t * height;
      const taper = 1 - t * 0.8; // Taper towards tip
      const currentWidth = width * taper;
      
      // Add natural curve
      const curveOffset = Math.sin(t * Math.PI * 0.5) * curve * t;

      // Left vertex
      vertices.push(-currentWidth / 2, y, curveOffset);
      normals.push(-1, 0, 0);
      uvs.push(0, t);

      // Right vertex
      vertices.push(currentWidth / 2, y, curveOffset);
      normals.push(1, 0, 0);
      uvs.push(1, t);

      // Create triangles
      if (i < segments) {
        const base = i * 2;
        // First triangle
        indices.push(base, base + 1, base + 2);
        // Second triangle
        indices.push(base + 1, base + 3, base + 2);
      }
    }

    geometry.setIndex(indices);
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();

    return geometry;
  }

  createGrassMaterials() {
    this.lodLevels.forEach((lod, index) => {
      const material = new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          windDirection: { value: this.windDirection },
          windStrength: { value: this.windStrength },
          wearMap: { value: this.wearTexture },
          grassColorBase: { value: new THREE.Color(0x00ff00) },
          grassColorTip: { value: new THREE.Color(0x88ff88) },
          grassColorDry: { value: new THREE.Color(0xffff00) },
          lightDirection: { value: new THREE.Vector3(1, 2, 1) },
          ambientLight: { value: 0.3 },
          lodLevel: { value: index },
          fieldWidth: { value: this.fieldWidth },
          fieldHeight: { value: this.fieldHeight },
          displacementStrength: { value: 0.5 } // Add displacement strength uniform
        },
        vertexShader: this.getAdvancedVertexShader(),
        fragmentShader: this.getAdvancedFragmentShader(),
        transparent: true, // Enable transparency for realistic grass alpha
        side: THREE.DoubleSide,
        wireframe: false // Disable wireframe for normal grass rendering
      });

      // Add shader compilation error checking
      material.onBeforeCompile = (shader) => {
        console.log(`🔧 SHADER COMPILE: LOD ${index} shader compilation started`);
      };

      // Check for compilation errors after creation
      setTimeout(() => {
        if (material.program && material.program.diagnostics) {
          console.error(`❌ SHADER ERROR LOD ${index}:`, material.program.diagnostics);
        } else {
          console.log(`✅ SHADER OK: LOD ${index} compiled successfully`);
        }
      }, 100);

      this.grassMaterials.set(index, material);
    });
  }

  getAdvancedVertexShader() {
    return `
      uniform float time;
      uniform vec2 windDirection;
      uniform float windStrength;
      uniform sampler2D wearMap;
      uniform float fieldWidth;
      uniform float fieldHeight;
      uniform float displacementStrength;
      
      attribute vec3 instancePosition;
      attribute float instanceRotation;
      attribute float instanceScale;
      attribute float instanceVariation;
      
      varying vec2 vUv;
      varying vec3 vWorldPosition;
      varying float vWear;
      varying float vHeight;
      varying vec3 vNormal;

      // Advanced noise functions
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

      void main() {
        vUv = uv;
        
        // Apply instance transformations
        vec3 pos = position;
        pos *= instanceScale;
        
        // Rotate around Y axis
        float c = cos(instanceRotation);
        float s = sin(instanceRotation);
        pos = vec3(
          pos.x * c - pos.z * s,
          pos.y,
          pos.x * s + pos.z * c
        );
        
        // Add instance position
        pos += instancePosition;
        
        // Sample wear data
        vec2 wearUV = (instancePosition.xz + vec2(fieldWidth, fieldHeight) * 0.5) / vec2(fieldWidth, fieldHeight);
        vWear = texture2D(wearMap, wearUV).r;
        
        // Wind animation with realistic physics
        float windPhase = time * 1.5 + instancePosition.x * 0.05 + instancePosition.z * 0.05;
        float windNoise = noise(vec2(windPhase * 0.1, instancePosition.z * 0.1));
        float windEffect = sin(windPhase) * windNoise * windStrength;
        
        // Apply wind only to upper parts of grass
        float heightFactor = uv.y;
        vec2 windOffset = windDirection * windEffect * heightFactor * (1.0 - vWear * 0.5);
        pos.xz += windOffset;

        // Apply height displacement for grass variation
        float grassNoise = noise(instancePosition.xz * 0.1);
        float heightDisplacement = grassNoise * displacementStrength * heightFactor;
        pos.y += heightDisplacement;

        // Wear-based flattening
        if (vWear > 0.2) {
          float flattenFactor = smoothstep(0.2, 1.0, vWear);
          pos.y *= (1.0 - flattenFactor * 0.7);
        }
        
        vWorldPosition = (modelMatrix * vec4(pos, 1.0)).xyz;
        vHeight = pos.y;
        vNormal = normalize(normalMatrix * normal);
        
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `;
  }

  getAdvancedFragmentShader() {
    return `
      uniform vec3 grassColorBase;
      uniform vec3 grassColorTip;
      uniform vec3 grassColorDry;
      uniform vec3 lightDirection;
      uniform float ambientLight;
      
      varying vec2 vUv;
      varying vec3 vWorldPosition;
      varying float vWear;
      varying float vHeight;
      varying vec3 vNormal;

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

      void main() {
        // Height-based color variation
        float heightFactor = vUv.y;
        vec3 grassColor = mix(grassColorBase, grassColorTip, heightFactor);
        
        // Add realistic grass blade texture
        float bladeTexture = noise(vUv * 200.0) * 0.3;
        grassColor *= (0.8 + bladeTexture);
        
        // Wear effects
        float wearIntensity = smoothstep(0.05, 0.95, vWear);
        grassColor = mix(grassColor, grassColorDry, wearIntensity * 0.8);
        
        // Advanced lighting with PBR-like effects
        vec3 normal = normalize(vNormal);
        vec3 lightDir = normalize(lightDirection);
        
        // Diffuse lighting
        float NdotL = max(dot(normal, lightDir), 0.0);
        float diffuse = NdotL * 0.8 + 0.2;
        
        // Subsurface scattering for grass translucency
        float backLight = max(0.0, dot(-normal, lightDir));
        float subsurface = pow(backLight, 1.5) * 0.4;
        
        // Rim lighting
        vec3 viewDir = normalize(vWorldPosition - cameraPosition);
        float rim = 1.0 - max(0.0, dot(normal, -viewDir));
        rim = pow(rim, 2.0) * 0.2;
        
        // Combine lighting
        float lightIntensity = diffuse + subsurface + rim + ambientLight;
        lightIntensity = clamp(lightIntensity, 0.2, 1.2);
        
        vec3 finalColor = grassColor * lightIntensity;
        
        // Alpha based on wear and height
        float alpha = 1.0 - wearIntensity * 0.9;
        if (vWear > 0.8) {
          float bareNoise = noise(vUv * 150.0);
          if (bareNoise > 0.3) alpha = 0.0;
        }
        
        // Use the calculated grass color and alpha
        gl_FragColor = vec4(finalColor, alpha);
      }
    `;
  }

  generateGrassChunks() {
    const chunksX = Math.ceil(this.fieldWidth / this.chunkSize);
    const chunksZ = Math.ceil(this.fieldHeight / this.chunkSize);

    for (let x = 0; x < chunksX; x++) {
      for (let z = 0; z < chunksZ; z++) {
        const chunkKey = `${x}_${z}`;
        const chunk = this.createGrassChunk(x, z);
        this.chunks.set(chunkKey, chunk);
      }
    }
  }

  createGrassChunk(chunkX, chunkZ) {
    const startX = -this.fieldWidth / 2 + chunkX * this.chunkSize;
    const startZ = -this.fieldHeight / 2 + chunkZ * this.chunkSize;

    const chunk = {
      x: chunkX,
      z: chunkZ,
      worldX: startX,
      worldZ: startZ,
      boundingBox: new THREE.Box3(
        new THREE.Vector3(startX, 0, startZ),
        new THREE.Vector3(startX + this.chunkSize, 2, startZ + this.chunkSize)
      ),
      instances: new Map() // LOD level -> instance data
    };

    // Generate grass instances for each LOD level
    this.lodLevels.forEach((lod, lodIndex) => {
      const instances = this.generateGrassInstances(startX, startZ, this.chunkSize, lod, lodIndex);
      chunk.instances.set(lodIndex, instances);
    });

    return chunk;
  }

  generateGrassInstances(startX, startZ, size, lod, lodIndex = 0) {
    // Apply both global and LOD-specific density multipliers
    const lodDensityMultiplier = this.lodDensityMultipliers[lodIndex] || 1.0;
    const combinedDensity = lod.density * this.densityMultiplier * lodDensityMultiplier;
    const baseDensity = Math.max(combinedDensity, this.minimumBaseDensity);
    const grassPerMeter = 50 * baseDensity; // Much denser grass for realistic appearance
    const totalGrass = Math.floor(size * size * grassPerMeter);

    const positions = [];
    const rotations = [];
    const scales = [];
    const variations = [];

    for (let i = 0; i < totalGrass; i++) {
      // Random position within chunk
      const x = startX + Math.random() * size;
      const z = startZ + Math.random() * size;
      const y = 0;

      // Random rotation
      const rotation = Math.random() * Math.PI * 2;

      // Random scale variation
      const scale = 0.8 + Math.random() * 0.4;

      // Random variation for shader
      const variation = Math.random();

      positions.push(x, y, z);
      rotations.push(rotation);
      scales.push(scale);
      variations.push(variation);
    }

    return {
      positions: new Float32Array(positions),
      rotations: new Float32Array(rotations),
      scales: new Float32Array(scales),
      variations: new Float32Array(variations),
      count: totalGrass
    };
  }

  setupInstancedMeshes() {
    this.lodLevels.forEach((lod, lodIndex) => {
      const geometry = this.grassGeometries.get(lodIndex);
      const material = this.grassMaterials.get(lodIndex);

      // Calculate max instances across all chunks (with reasonable limit)
      let maxInstances = 0;
      this.chunks.forEach(chunk => {
        const instances = chunk.instances.get(lodIndex);
        maxInstances += instances.count;
      });

      // Limit max instances to prevent memory issues
      maxInstances = Math.min(maxInstances, 10000); // Max 10k instances per LOD for stability

      console.log(`🌱 GRASS SETUP: LOD ${lodIndex} - ${maxInstances} instances`);

      const instancedMesh = new THREE.InstancedMesh(geometry, material, maxInstances);
      instancedMesh.frustumCulled = false; // We handle culling manually

      // Set up instance attributes
      const instancePositions = new THREE.InstancedBufferAttribute(new Float32Array(maxInstances * 3), 3);
      const instanceRotations = new THREE.InstancedBufferAttribute(new Float32Array(maxInstances), 1);
      const instanceScales = new THREE.InstancedBufferAttribute(new Float32Array(maxInstances), 1);
      const instanceVariations = new THREE.InstancedBufferAttribute(new Float32Array(maxInstances), 1);

      geometry.setAttribute('instancePosition', instancePositions);
      geometry.setAttribute('instanceRotation', instanceRotations);
      geometry.setAttribute('instanceScale', instanceScales);
      geometry.setAttribute('instanceVariation', instanceVariations);

      this.grassInstances.set(lodIndex, {
        mesh: instancedMesh,
        maxInstances,
        currentInstances: 0
      });
    });
  }

  updateLOD(camera) {
    // Skip LOD updates during regeneration
    if (this.isRegenerating) {
      return;
    }

    const cameraPosition = camera.position;

    // Ensure camera matrices are updated
    camera.updateMatrixWorld();
    camera.updateProjectionMatrix();

    // Update frustum for culling - check if matrices exist
    if (camera.projectionMatrix && camera.matrixWorldInverse) {
      this.cameraMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      this.frustum.setFromProjectionMatrix(this.cameraMatrix);
    } else {
      console.warn('Camera matrices not ready, skipping frustum culling');
      return;
    }

    // Get screen/viewport information for proper screen-space LOD
    const canvas = this.renderer.domElement;
    const screenWidth = canvas.width || 1920;
    const screenHeight = canvas.height || 1080;
    const aspect = screenWidth / screenHeight;

    // Camera properties
    const fov = camera.fov || 60;
    const fovRadians = (fov * Math.PI) / 180;

    // Calculate screen-space scaling factors
    const tanHalfFov = Math.tan(fovRadians / 2);

    console.log(`🌾 LOD: Camera FOV: ${fov}°, Height: ${cameraPosition.y.toFixed(1)}, Screen: ${screenWidth}x${screenHeight}, Aspect: ${aspect.toFixed(2)}`);
    console.log(`🌾 LOD: Camera at (${cameraPosition.x.toFixed(1)}, ${cameraPosition.y.toFixed(1)}, ${cameraPosition.z.toFixed(1)})`);

    // Get camera direction for debugging
    const debugCameraDirection = new THREE.Vector3();
    camera.getWorldDirection(debugCameraDirection);
    console.log(`🌾 LOD: Camera looking (${debugCameraDirection.x.toFixed(2)}, ${debugCameraDirection.y.toFixed(2)}, ${debugCameraDirection.z.toFixed(2)})`);

    this.visibleChunks.clear();

    // Reset instance counts
    this.grassInstances.forEach(instance => {
      instance.currentInstances = 0;
    });

    // Process each chunk - NEVER completely cull, always render with appropriate density
    this.chunks.forEach(chunk => {
      // Calculate screen-space size for proper LOD determination
      const chunkCenter = chunk.boundingBox.getCenter(new THREE.Vector3());
      const chunkSize = this.chunkSize; // 8x8 meter chunk

      // Calculate distance from camera to chunk
      const distance = cameraPosition.distanceTo(chunkCenter);

      // Calculate the projected size of the chunk on screen (in pixels)
      // This accounts for FOV, distance, and screen resolution
      const projectedSize = (chunkSize * screenHeight) / (2 * distance * tanHalfFov);

      // Calculate viewing angle factor (how directly we're looking at the chunk)
      const cameraDirection = new THREE.Vector3();
      camera.getWorldDirection(cameraDirection);
      const chunkDirection = chunkCenter.clone().sub(cameraPosition).normalize();
      const viewingAngle = cameraDirection.dot(chunkDirection);

      // Proper viewing factor: prioritize chunks in view direction
      // viewingAngle ranges from -1 (behind camera) to 1 (directly ahead)
      let viewingFactor;
      if (viewingAngle > 0) {
        // Chunk is in front of camera - boost based on how centered it is
        viewingFactor = 0.5 + (viewingAngle * 0.5); // Range: 0.5 to 1.0
      } else {
        // Chunk is behind camera - minimal visibility but not zero
        viewingFactor = 0.1 + (Math.max(-1, viewingAngle) + 1) * 0.2; // Range: 0.1 to 0.3
      }

      // Check if chunk is within camera frustum for additional boost
      const isInFrustum = this.frustum.intersectsBox(chunk.boundingBox);
      const frustumBoost = isInFrustum ? 1.5 : 0.8; // Boost chunks in frustum

      // Calculate elevation factor (higher camera = can see more detail at distance)
      const elevationFactor = Math.max(0.5, Math.min(2.0, cameraPosition.y / 10));

      // Combined screen-space metric for LOD selection
      const screenSpaceMetric = projectedSize * viewingFactor * frustumBoost * elevationFactor;

      console.log(`🌾 LOD CHUNK: Distance: ${distance.toFixed(1)}m, Projected: ${projectedSize.toFixed(1)}px, ViewAngle: ${viewingAngle.toFixed(2)}, ViewFactor: ${viewingFactor.toFixed(2)}, FrustumBoost: ${frustumBoost.toFixed(1)}, Elevation: ${elevationFactor.toFixed(2)}, Metric: ${screenSpaceMetric.toFixed(1)}`);

      // ALWAYS add chunk to visible chunks - never completely cull
      this.visibleChunks.add(chunk);

      // Determine LOD level based on screen-space metric instead of raw distance
      let lodLevel = this.lodLevels.length - 1; // Start with lowest detail

      // Use configurable screen-space thresholds for LOD levels (in pixels)
      for (let i = 0; i < this.lodThresholds.length; i++) {
        if (screenSpaceMetric > this.lodThresholds[i]) {
          lodLevel = i;
          break;
        }
      }

      // Additional safety: ensure chunks in frustum get at least medium detail
      if (isInFrustum && lodLevel > 2) {
        lodLevel = 2; // Force at least LOD 2 for frustum chunks
      }

      console.log(`🌾 LOD RESULT: Chunk at (${chunkCenter.x.toFixed(1)}, ${chunkCenter.z.toFixed(1)}) -> LOD ${lodLevel}, InFrustum: ${isInFrustum}, ViewAngle: ${viewingAngle.toFixed(2)}`);

      // Add instances for this LOD level - chunk is ALWAYS rendered
      this.addChunkInstances(chunk, lodLevel);
    });

    // Update instance counts and visibility with safety checks
    let totalVisibleInstances = 0;
    this.grassInstances.forEach((instance, lodIndex) => {
      // Clamp instance count to maxInstances to prevent overflow
      const clampedCount = Math.min(instance.currentInstances, instance.maxInstances);
      instance.mesh.count = clampedCount;
      instance.mesh.visible = clampedCount > 0;
      totalVisibleInstances += clampedCount;

      console.log(`🌾 LOD UPDATE: LOD ${lodIndex} - currentInstances: ${instance.currentInstances}, maxInstances: ${instance.maxInstances}, clampedCount: ${clampedCount}, visible: ${instance.mesh.visible}`);

      // Force matrix update
      instance.mesh.instanceMatrix.needsUpdate = true;
    });

    // Safety check: If no grass is visible, force some to be visible
    if (totalVisibleInstances === 0) {
      console.warn(`🌾 LOD UPDATE: No grass visible! Forcing emergency visibility...`);
      this.grassInstances.forEach((instance, lodIndex) => {
        if (instance.maxInstances > 0) {
          const emergencyCount = Math.min(500, instance.maxInstances);
          instance.mesh.count = emergencyCount;
          instance.mesh.visible = true;
          instance.mesh.frustumCulled = false; // Disable culling
          console.log(`🌾 LOD UPDATE: EMERGENCY - LOD ${lodIndex} forced visible with ${emergencyCount} instances`);
        }
      });
    }

    // Additional safety: Always ensure at least LOD 0 has some grass visible
    const lod0Instance = this.grassInstances.get(0);
    if (lod0Instance && lod0Instance.mesh.count < 50) {
      const minCount = Math.min(200, lod0Instance.maxInstances);
      lod0Instance.mesh.count = minCount;
      lod0Instance.mesh.visible = true;
      console.log(`🌾 LOD UPDATE: Ensuring LOD 0 minimum visibility with ${minCount} instances`);
    }
  }

  addChunkInstances(chunk, lodLevel) {
    const instances = chunk.instances.get(lodLevel);
    const grassInstance = this.grassInstances.get(lodLevel);

    if (!instances || !grassInstance) {
      console.warn(`🌾 CHUNK INSTANCES: Missing data - instances: ${!!instances}, grassInstance: ${!!grassInstance}, lodLevel: ${lodLevel}`);
      return;
    }

    const mesh = grassInstance.mesh;
    const startIndex = grassInstance.currentInstances;

    console.log(`🌾 CHUNK INSTANCES: Adding ${instances.count} instances at LOD ${lodLevel}, starting at index ${startIndex}`);

    // Copy instance data with proper matrix setup
    for (let i = 0; i < instances.count; i++) {
      const instanceIndex = startIndex + i;
      if (instanceIndex >= grassInstance.maxInstances) break;

      // Set instance matrix with proper positioning
      const matrix = new THREE.Matrix4();
      const position = new THREE.Vector3(
        instances.positions[i * 3],
        instances.positions[i * 3 + 1],
        instances.positions[i * 3 + 2]
      );
      const rotation = new THREE.Euler(0, instances.rotations[i], 0);
      const scale = new THREE.Vector3(instances.scales[i], instances.scales[i], instances.scales[i]);

      matrix.compose(position, new THREE.Quaternion().setFromEuler(rotation), scale);
      mesh.setMatrixAt(instanceIndex, matrix);
    }

    grassInstance.currentInstances += instances.count;
    console.log(`🌾 CHUNK INSTANCES: LOD ${lodLevel} now has ${grassInstance.currentInstances} total instances`);

    // Force matrix update
    mesh.instanceMatrix.needsUpdate = true;

    // Debug: Log first few instances for verification (reduced frequency)
    if (startIndex === 0 && instances.count > 0 && Math.random() < 0.1) { // Only 10% of the time
      console.log(`🌱 INSTANCE DEBUG: LOD ${lodLevel} first instance at (${instances.positions[0]}, ${instances.positions[1]}, ${instances.positions[2]})`);
    }
  }

  addToScene(scene) {
    this.scene = scene; // Store scene reference for later use
    console.log(`🌱 SCENE ADD: Adding ${this.grassInstances.size} grass LOD levels to scene`);

    let totalInstancesAdded = 0;
    this.grassInstances.forEach((instance, lodIndex) => {
      console.log(`🌱 SCENE ADD: Adding LOD ${lodIndex} with ${instance.maxInstances} max instances`);
      console.log(`🌱 SCENE ADD: Mesh geometry vertices: ${instance.mesh.geometry.attributes.position.count}`);
      console.log(`🌱 SCENE ADD: Mesh material type: ${instance.mesh.material.type}`);
      console.log(`🌱 SCENE ADD: Mesh visible: ${instance.mesh.visible}, count: ${instance.mesh.count}`);
      console.log(`🌱 SCENE ADD: Mesh position: (${instance.mesh.position.x}, ${instance.mesh.position.y}, ${instance.mesh.position.z})`);
      console.log(`🌱 SCENE ADD: Mesh scale: (${instance.mesh.scale.x}, ${instance.mesh.scale.y}, ${instance.mesh.scale.z})`);

      scene.add(instance.mesh);

      // Force initial visibility for testing - use different amounts per LOD
      const initialCount = Math.min(500 * (1 - lodIndex * 0.15), instance.maxInstances);
      instance.mesh.count = initialCount;
      instance.mesh.visible = true;
      instance.mesh.frustumCulled = false; // Disable frustum culling initially
      totalInstancesAdded += initialCount;

      console.log(`🌱 SCENE ADD: LOD ${lodIndex} forced to show ${initialCount} instances`);
    });

    console.log(`🌱 SCENE ADD: All grass meshes added to scene - Total instances: ${totalInstancesAdded}`);

    // Force immediate update to ensure grass is visible
    console.log('🌱 SCENE ADD: Ensuring all chunks have grass with minimum blade count...');
    this.forceAllChunksVisible();
  }

  update(deltaTime, camera, windDirection = { x: 1, y: 0.5 }, windStrength = 0.02) {
    this.windTime += deltaTime;
    this.windDirection.set(windDirection.x, windDirection.y);
    this.windStrength = windStrength;

    // Update LOD less frequently for performance (every 100ms)
    // Skip automatic LOD updates if in manual mode
    if (!this.manualLODMode) {
      if (!this.lastLODUpdate) this.lastLODUpdate = 0;
      this.lastLODUpdate += deltaTime;

      if (this.lastLODUpdate > 0.1 && camera && camera.position) { // 10 FPS LOD updates
        this.updateLOD(camera);
        this.lastLODUpdate = 0;
      }
    }

    // Update shader uniforms
    this.grassMaterials.forEach(material => {
      material.uniforms.time.value = this.windTime;
      material.uniforms.windDirection.value = this.windDirection;
      material.uniforms.windStrength.value = this.windStrength;
    });
  }

  recordPlayerActivity(x, z, activityType = 'walk', intensity = 1.0) {
    console.log(`🌱 ADVANCED GRASS WEAR: Starting wear processing for ${activityType} at (${x}, ${z})`);

    // Convert world coordinates to texture coordinates
    const texU = Math.floor(((x + this.fieldWidth/2) / this.fieldWidth) * this.wearResolution);
    const texV = Math.floor(((z + this.fieldHeight/2) / this.fieldHeight) * this.wearResolution);

    const clampedU = Math.max(0, Math.min(this.wearResolution - 1, texU));
    const clampedV = Math.max(0, Math.min(this.wearResolution - 1, texV));

    console.log(`🌱 TEXTURE COORDS: World(${x}, ${z}) -> Texture(${clampedU}, ${clampedV}) [Resolution: ${this.wearResolution}]`);

    // Apply wear based on activity type
    let wearAmount = 0.001;
    let wearRadius = 3;

    switch(activityType) {
      case 'walk': wearAmount = 0.008 * intensity; wearRadius = 2; break;
      case 'run': wearAmount = 0.015 * intensity; wearRadius = 3; break;
      case 'tackle': wearAmount = 0.04 * intensity; wearRadius = 5; break;
      case 'slide': wearAmount = 0.07 * intensity; wearRadius = 8; break;
      case 'shot': wearAmount = 0.025 * intensity; wearRadius = 4; break;
    }

    // Apply wear pattern
    for (let dx = -wearRadius; dx <= wearRadius; dx++) {
      for (let dz = -wearRadius; dz <= wearRadius; dz++) {
        const px = clampedU + dx;
        const pz = clampedV + dz;

        if (px >= 0 && px < this.wearResolution && pz >= 0 && pz < this.wearResolution) {
          const distance = Math.sqrt(dx * dx + dz * dz);
          const falloff = Math.max(0, 1 - distance / wearRadius);

          const index = pz * this.wearResolution + px;
          this.wearData[index] = Math.min(1.0, this.wearData[index] + wearAmount * falloff);
        }
      }
    }

    this.wearTexture.needsUpdate = true;
    console.log(`🌱 WEAR TEXTURE: Updated texture, needsUpdate = true`);
  }

  // Debug method to test displacement at specific coordinates
  testDisplacementAt(worldX, worldZ) {
    // Convert world coordinates to UV coordinates
    const u = (worldX + this.fieldWidth/2) / this.fieldWidth;
    const v = (worldZ + this.fieldHeight/2) / this.fieldHeight;

    // Clamp to valid range
    const clampedU = Math.max(0, Math.min(1, u));
    const clampedV = Math.max(0, Math.min(1, v));

    console.log(`🧪 ADVANCED DISPLACEMENT TEST: World(${worldX}, ${worldZ}) -> UV(${clampedU.toFixed(3)}, ${clampedV.toFixed(3)})`);

    // Get current displacement strength from materials
    let displacementStrength = 0.5; // Default
    if (this.grassMaterials.size > 0) {
      const firstMaterial = this.grassMaterials.values().next().value;
      displacementStrength = firstMaterial.uniforms.displacementStrength.value;
    }

    // Simulate noise calculation (simplified)
    const noiseValue = Math.sin(clampedU * 10) * Math.cos(clampedV * 10) * 0.5 + 0.5;
    const displacement = noiseValue * displacementStrength;

    console.log(`🧪 ADVANCED DISPLACEMENT TEST: Noise: ${noiseValue.toFixed(3)}, Displacement: ${displacement.toFixed(3)}m`);
    return { heightValue: noiseValue, displacement, u: clampedU, v: clampedV };
  }

  // Method to create test wear patterns for debugging
  createTestWearPattern() {
    console.log('🧪 ADVANCED WEAR TEST: Creating test wear pattern...');

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

    this.wearTexture.needsUpdate = true;
    console.log('🧪 ADVANCED WEAR TEST: Test pattern created - cross in center with corner spots');
  }

  // Update grass height for all LOD levels
  updateGrassHeight(newHeight) {
    this.baseGrassHeight = newHeight;
    console.log(`🌱 GRASS HEIGHT: Updated to ${newHeight}m`);

    // Regenerate geometries with new height
    this.grassGeometries.clear();
    this.lodLevels.forEach((lod, index) => {
      const geometry = this.createGrassBladeGeometry(lod.bladeHeight, lod.segments);
      this.grassGeometries.set(index, geometry);
    });

    // Update existing meshes
    this.grassInstances.forEach((instance, lodIndex) => {
      const newGeometry = this.grassGeometries.get(lodIndex);
      if (newGeometry && instance.mesh) {
        instance.mesh.geometry.dispose();
        instance.mesh.geometry = newGeometry;
      }
    });
  }

  // Toggle wireframe mode
  setWireframe(enabled) {
    this.showWireframe = enabled;
    console.log(`🔲 WIREFRAME: ${enabled ? 'Enabled' : 'Disabled'}`);

    this.grassMaterials.forEach(material => {
      material.wireframe = enabled;
    });
  }

  // Update grass density without full regeneration
  updateDensity(newDensity) {
    this.densityMultiplier = newDensity;
    console.log(`🌾 GRASS DENSITY: Global density updated to ${newDensity}x`);

    // Instead of full regeneration, just force visibility
    this.forceGrassVisibility();

    // Force LOD update to apply new density
    if (window.camera) {
      this.updateLOD(window.camera);
    }
  }

  // Update individual LOD density without full regeneration
  updateLODDensity(lodIndex, newDensity) {
    if (lodIndex >= 0 && lodIndex < this.lodDensityMultipliers.length) {
      this.lodDensityMultipliers[lodIndex] = newDensity;
      console.log(`🌾 LOD DENSITY: LOD ${lodIndex} density updated to ${newDensity}x`);

      // Instead of full regeneration, just force visibility
      this.forceGrassVisibility();

      // Force LOD update to apply new density
      if (window.camera) {
        this.updateLOD(window.camera);
      }
    }
  }

  // Update individual LOD threshold
  updateLODThreshold(lodIndex, newThreshold) {
    if (lodIndex >= 0 && lodIndex < this.lodThresholds.length) {
      this.lodThresholds[lodIndex] = newThreshold;
      console.log(`📐 LOD THRESHOLD: LOD ${lodIndex} threshold updated to ${newThreshold}px`);
      // No need to regenerate grass, just update thresholds
      // Force immediate LOD update to apply new thresholds
      if (window.camera) {
        this.updateLOD(window.camera);
      }
    }
  }

  // Force grass visibility without regeneration (emergency method)
  forceGrassVisibility() {
    console.log(`🌾 FORCE VISIBILITY: Ensuring all grass is visible...`);

    let totalForced = 0;
    this.grassInstances.forEach((instance, lodIndex) => {
      if (instance.mesh) {
        // More aggressive forcing for higher LOD levels
        const baseCount = 1000 * (1 - lodIndex * 0.15);
        const forceCount = Math.min(baseCount, instance.maxInstances);
        instance.mesh.count = forceCount;
        instance.mesh.visible = true;
        instance.mesh.frustumCulled = false;
        totalForced += forceCount;

        console.log(`🌾 FORCE VISIBILITY: LOD ${lodIndex} forced to ${forceCount} instances (max: ${instance.maxInstances})`);
      }
    });

    console.log(`🌾 FORCE VISIBILITY: Total forced instances: ${totalForced}`);

    // Also force an immediate LOD update if camera is available
    if (window.camera) {
      console.log(`🌾 FORCE VISIBILITY: Triggering LOD update...`);
      this.updateLOD(window.camera);
    }

    return totalForced;
  }

  // Force ALL chunks to have grass - ensure minimum 2000 blades with more when close
  forceAllChunksVisible() {
    console.log(`🌾 FORCE ALL CHUNKS: Ensuring every chunk has grass with minimum ${this.minimumTotalBlades} blades total...`);

    // Enable manual mode to prevent interference
    this.manualLODMode = true;

    // Reset all instances
    this.grassInstances.forEach(instance => {
      instance.currentInstances = 0;
    });

    let totalChunks = this.chunks.size;
    let processedChunks = 0;

    // First pass: Give every chunk basic grass
    this.chunks.forEach(chunk => {
      const chunkCenter = chunk.boundingBox.getCenter(new THREE.Vector3());
      let lodLevel = 2; // Default to medium detail for all chunks

      // If camera is available, improve detail for closer chunks
      if (window.camera) {
        const distance = window.camera.position.distanceTo(chunkCenter);
        if (distance < 15) lodLevel = 0; // Highest detail for very close
        else if (distance < 30) lodLevel = 1; // High detail for close
        else if (distance < 60) lodLevel = 2; // Medium detail for medium distance
        else lodLevel = 3; // Low detail but still visible for far
      }

      // Add instances for this chunk
      this.addChunkInstances(chunk, lodLevel);
      processedChunks++;

      if (processedChunks <= 5) {
        console.log(`🌾 FORCE ALL CHUNKS: Chunk ${processedChunks} at (${chunkCenter.x.toFixed(1)}, ${chunkCenter.z.toFixed(1)}) -> LOD ${lodLevel}`);
      }
    });

    // Update mesh counts and check if we meet minimum requirement
    let totalVisible = 0;
    this.grassInstances.forEach((instance, lodIndex) => {
      const clampedCount = Math.min(instance.currentInstances, instance.maxInstances);
      instance.mesh.count = clampedCount;
      instance.mesh.visible = clampedCount > 0;
      instance.mesh.instanceMatrix.needsUpdate = true;
      totalVisible += clampedCount;

      console.log(`🌾 FORCE ALL CHUNKS: LOD ${lodIndex} -> ${clampedCount} instances`);
    });

    // If we don't have enough grass, boost all LOD levels
    if (totalVisible < this.minimumTotalBlades) {
      console.log(`🌾 FORCE ALL CHUNKS: Only ${totalVisible} blades, boosting to meet minimum ${this.minimumTotalBlades}...`);

      // Boost all instances to ensure minimum
      const boostFactor = Math.ceil(this.minimumTotalBlades / totalVisible);
      totalVisible = 0;

      this.grassInstances.forEach((instance, lodIndex) => {
        const boostedCount = Math.min(instance.mesh.count * boostFactor, instance.maxInstances);
        instance.mesh.count = boostedCount;
        totalVisible += boostedCount;

        console.log(`🌾 FORCE ALL CHUNKS: BOOSTED LOD ${lodIndex} -> ${boostedCount} instances (boost factor: ${boostFactor}x)`);
      });
    }

    console.log(`🌾 FORCE ALL CHUNKS: Processed ${processedChunks}/${totalChunks} chunks, FINAL total: ${totalVisible} blades`);
    console.log(`🌾 FORCE ALL CHUNKS: ${totalVisible >= this.minimumTotalBlades ? '✅ MINIMUM MET' : '❌ MINIMUM NOT MET'}`);

    return totalVisible;
  }

  // Boost grass visibility in camera view direction
  boostViewDirectionGrass(camera) {
    if (!camera) return;

    console.log(`🌾 VIEW BOOST: Boosting grass in camera view direction...`);

    // Enable manual LOD mode to prevent automatic updates from interfering
    this.manualLODMode = true;

    const cameraPosition = camera.position;
    const cameraDirection = new THREE.Vector3();
    camera.getWorldDirection(cameraDirection);

    console.log(`🌾 VIEW BOOST: Camera at (${cameraPosition.x.toFixed(1)}, ${cameraPosition.y.toFixed(1)}, ${cameraPosition.z.toFixed(1)})`);
    console.log(`🌾 VIEW BOOST: Camera looking (${cameraDirection.x.toFixed(2)}, ${cameraDirection.y.toFixed(2)}, ${cameraDirection.z.toFixed(2)})`);

    // Reset all instances first
    this.grassInstances.forEach(instance => {
      instance.currentInstances = 0;
    });

    let totalBoosted = 0;
    let highDetailChunks = 0;

    // Process chunks with view direction priority - ENSURE ALL CHUNKS GET GRASS
    this.chunks.forEach(chunk => {
      const chunkCenter = chunk.boundingBox.getCenter(new THREE.Vector3());
      const chunkDirection = chunkCenter.clone().sub(cameraPosition).normalize();
      const viewingAngle = cameraDirection.dot(chunkDirection);
      const distance = cameraPosition.distanceTo(chunkCenter);

      // Determine LOD based on view direction and distance
      // IMPORTANT: Every chunk gets grass, just different amounts
      let lodLevel = 4; // Start with lowest detail (but still visible)

      if (viewingAngle > 0.7 && distance < 30) {
        lodLevel = 0; // Highest detail for chunks directly ahead and close
        highDetailChunks++;
        console.log(`🌾 VIEW BOOST: HIGH DETAIL chunk at (${chunkCenter.x.toFixed(1)}, ${chunkCenter.z.toFixed(1)}) - ViewAngle: ${viewingAngle.toFixed(2)}, Distance: ${distance.toFixed(1)}`);
      } else if (viewingAngle > 0.5 && distance < 50) {
        lodLevel = 1; // High detail for chunks in view direction
        highDetailChunks++;
        console.log(`🌾 VIEW BOOST: MEDIUM-HIGH chunk at (${chunkCenter.x.toFixed(1)}, ${chunkCenter.z.toFixed(1)}) - ViewAngle: ${viewingAngle.toFixed(2)}, Distance: ${distance.toFixed(1)}`);
      } else if (viewingAngle > 0.3 && distance < 80) {
        lodLevel = 2; // Medium detail for chunks somewhat in view
      } else if (viewingAngle > 0.1 || distance < 40) {
        lodLevel = 3; // Low detail for peripheral or close chunks
      }
      // Note: lodLevel 4 (lowest detail) is used for all other chunks - they still get grass!

      // Debug first few chunks
      if (totalBoosted < 5) {
        console.log(`🌾 VIEW BOOST: Chunk ${totalBoosted} at (${chunkCenter.x.toFixed(1)}, ${chunkCenter.z.toFixed(1)}) - ViewAngle: ${viewingAngle.toFixed(2)}, Distance: ${distance.toFixed(1)}, LOD: ${lodLevel}`);
      }

      // CRITICAL: Add instances for this chunk - EVERY chunk gets grass
      this.addChunkInstances(chunk, lodLevel);
      totalBoosted++;
    });

    // Update mesh counts
    this.grassInstances.forEach((instance, lodIndex) => {
      const clampedCount = Math.min(instance.currentInstances, instance.maxInstances);
      instance.mesh.count = clampedCount;
      instance.mesh.visible = clampedCount > 0;
      instance.mesh.instanceMatrix.needsUpdate = true;

      console.log(`🌾 VIEW BOOST: LOD ${lodIndex} -> ${clampedCount} instances`);
    });

    console.log(`🌾 VIEW BOOST: Processed ${totalBoosted} chunks with view direction priority`);
    console.log(`🌾 VIEW BOOST: ${highDetailChunks} chunks got high detail (LOD 0-1)`);
    console.log(`🌾 VIEW BOOST: Manual LOD mode enabled - automatic updates disabled`);
  }

  // Return to automatic LOD mode
  enableAutomaticLOD() {
    this.manualLODMode = false;
    console.log(`🌾 AUTO LOD: Automatic LOD mode re-enabled`);

    // Force immediate LOD update
    if (window.camera) {
      this.updateLOD(window.camera);
    }
  }

  // Common regeneration method
  regenerateGrass() {
    this.isRegenerating = true; // Prevent LOD updates during regeneration
    console.log(`🌾 GRASS REGEN: Starting regeneration...`);

    // Store scene reference before clearing
    const sceneRef = this.scene;

    // Clear existing grass instances
    const oldInstanceCount = this.grassInstances.size;
    this.grassInstances.forEach(instance => {
      if (instance.mesh) {
        // Only remove from scene if scene reference exists
        if (sceneRef) {
          sceneRef.remove(instance.mesh);
          console.log(`🌾 GRASS REGEN: Removed mesh from scene`);
        }
        // Dispose of geometry to free memory
        if (instance.mesh.geometry) {
          instance.mesh.geometry.dispose();
        }
        // Dispose of material if needed
        if (instance.mesh.material && instance.mesh.material.dispose) {
          // Don't dispose shared materials, just the mesh reference
        }
      }
    });
    this.grassInstances.clear();
    console.log(`🌾 GRASS REGEN: Cleared ${oldInstanceCount} old instances`);

    // Clear visible chunks to force regeneration
    this.visibleChunks.clear();

    // Regenerate grass system (same as initialization)
    console.log(`🌾 GRASS REGEN: Regenerating chunks...`);
    this.generateGrassChunks();
    console.log(`🌾 GRASS REGEN: Generated ${this.chunks.size} chunks`);

    console.log(`🌾 GRASS REGEN: Setting up instanced meshes...`);
    this.setupInstancedMeshes();
    console.log(`🌾 GRASS REGEN: Created ${this.grassInstances.size} new instances`);

    // Re-add to scene if scene reference exists
    if (sceneRef) {
      console.log(`🌾 GRASS REGEN: Re-adding ${this.grassInstances.size} grass instances to scene...`);

      let totalAdded = 0;
      this.grassInstances.forEach((instance, lodIndex) => {
        if (instance.mesh) {
          sceneRef.add(instance.mesh);

          // Force initial visibility
          const initialCount = Math.min(500 * (1 - lodIndex * 0.15), instance.maxInstances);
          instance.mesh.count = initialCount;
          instance.mesh.visible = true;
          instance.mesh.frustumCulled = false;
          totalAdded++;

          console.log(`🌾 GRASS REGEN: Re-added LOD ${lodIndex} with ${initialCount} instances`);
        }
      });

      console.log(`🌾 GRASS REGEN: Successfully re-added ${totalAdded} grass meshes to scene`);
    } else {
      console.error(`🌾 GRASS REGEN: No scene reference available for re-adding grass!`);
    }

    this.isRegenerating = false; // Re-enable LOD updates

    // Force immediate LOD update with emergency fallback
    if (sceneRef && window.camera) {
      console.log(`🌾 GRASS REGEN: Forcing LOD update...`);
      this.lastLODUpdate = 0.2;
      this.updateLOD(window.camera);
      console.log(`🌾 GRASS REGEN: LOD update complete - ${this.visibleChunks.size} visible chunks`);
    } else {
      console.warn(`🌾 GRASS REGEN: Cannot force LOD update - Scene: ${!!sceneRef}, Camera: ${!!window.camera}`);
    }

    // ALWAYS force some visibility to prevent disappearing grass
    console.log(`🌾 GRASS REGEN: Final visibility check...`);
    let totalVisible = 0;
    this.grassInstances.forEach((instance, lodIndex) => {
      if (instance.mesh) {
        // Ensure minimum visibility
        if (instance.mesh.count < 50) {
          const forceCount = Math.min(200, instance.maxInstances);
          instance.mesh.count = forceCount;
          instance.mesh.visible = true;
          instance.mesh.frustumCulled = false;
          console.log(`🌾 GRASS REGEN: Forced LOD ${lodIndex} visible with ${forceCount} instances`);
        }
        totalVisible += instance.mesh.count;
        console.log(`🌾 GRASS REGEN: LOD ${lodIndex} final state - Count: ${instance.mesh.count}, Visible: ${instance.mesh.visible}, Max: ${instance.maxInstances}`);
      }
    });

    console.log(`🌾 GRASS REGEN: Regeneration complete - Total visible instances: ${totalVisible}`);
  }

  // Get debug information about the grass system
  getDebugInfo() {
    const info = {
      fieldDimensions: `${this.fieldWidth} x ${this.fieldHeight}`,
      wearResolution: this.wearResolution,
      lodLevels: this.lodLevels.length,
      totalChunks: this.chunks.size,
      visibleChunks: this.visibleChunks.size,
      grassInstances: this.grassInstances.size,
      windDirection: `(${this.windDirection.x}, ${this.windDirection.y})`,
      windStrength: this.windStrength,
      baseGrassHeight: this.baseGrassHeight,
      showWireframe: this.showWireframe,
      densityMultiplier: this.densityMultiplier,
      lodDensityMultipliers: this.lodDensityMultipliers.map((d, i) => `LOD${i}: ${d.toFixed(1)}x`).join(', '),
      lodThresholds: this.lodThresholds.map((t, i) => `LOD${i}: ${t}px`).join(', ')
    };

    // Get material info
    if (this.grassMaterials.size > 0) {
      const firstMaterial = this.grassMaterials.values().next().value;
      info.displacementStrength = firstMaterial.uniforms.displacementStrength.value;
      info.time = firstMaterial.uniforms.time.value;
    }

    return info;
  }

  dispose() {
    this.grassGeometries.forEach(geometry => geometry.dispose());
    this.grassMaterials.forEach(material => material.dispose());
    this.grassInstances.forEach(instance => {
      instance.mesh.dispose();
    });
    if (this.wearTexture) this.wearTexture.dispose();
  }
}
