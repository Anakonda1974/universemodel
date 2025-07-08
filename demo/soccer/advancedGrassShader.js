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
    this.densityMultiplier = 1.0; // Global density multiplier
    this.isRegenerating = false; // Flag to prevent LOD updates during regeneration

    // Individual LOD density multipliers
    this.lodDensityMultipliers = [1.0, 0.8, 0.6, 0.4, 0.2]; // Default values for each LOD level
    
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
        transparent: false,
        side: THREE.DoubleSide,
        wireframe: true // Enable wireframe to see grass geometry
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
        
        // DEBUG: Use bright magenta color to make grass visible
        gl_FragColor = vec4(1.0, 0.0, 1.0, 1.0); // Bright magenta
        // gl_FragColor = vec4(finalColor, alpha);
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

    // Calculate FOV-based distance scaling
    const fov = camera.fov || 60; // Default FOV
    const fovScale = Math.max(0.5, Math.min(2.0, fov / 60)); // Scale factor based on FOV
    const heightScale = Math.max(0.5, Math.min(3.0, cameraPosition.y / 15)); // Scale based on camera height

    console.log(`🌾 LOD: Camera FOV: ${fov}°, Height: ${cameraPosition.y.toFixed(1)}, FOV Scale: ${fovScale.toFixed(2)}, Height Scale: ${heightScale.toFixed(2)}`);

    this.visibleChunks.clear();

    // Reset instance counts
    this.grassInstances.forEach(instance => {
      instance.currentInstances = 0;
    });

    // Process each chunk
    this.chunks.forEach(chunk => {
      // Calculate distance to chunk center
      const chunkCenter = chunk.boundingBox.getCenter(new THREE.Vector3());
      const rawDistance = cameraPosition.distanceTo(chunkCenter);

      // Adjust distance based on FOV and camera height
      const adjustedDistance = rawDistance / (fovScale * heightScale);

      // Check if chunk is in frustum (be more lenient)
      const isInFrustum = this.frustum.intersectsBox(chunk.boundingBox);
      const maxDistance = this.lodLevels[this.lodLevels.length - 1].distance * 2.0; // Double max distance
      const isExtremelyFar = adjustedDistance > maxDistance;

      // Very conservative culling - render almost everything
      if (!isInFrustum && isExtremelyFar) {
        return; // Only cull if outside frustum AND extremely far
      }

      this.visibleChunks.add(chunk);

      // Determine appropriate LOD level using adjusted distance
      let lodLevel = this.lodLevels.length - 1; // Start with lowest detail
      for (let i = 0; i < this.lodLevels.length; i++) {
        if (adjustedDistance < this.lodLevels[i].distance) {
          lodLevel = i;
          break;
        }
      }

      // Add instances for this LOD level
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
          const emergencyCount = Math.min(100, instance.maxInstances);
          instance.mesh.count = emergencyCount;
          instance.mesh.visible = true;
          instance.mesh.frustumCulled = false; // Disable culling
          console.log(`🌾 LOD UPDATE: EMERGENCY - LOD ${lodIndex} forced visible with ${emergencyCount} instances`);
        }
      });
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
    this.grassInstances.forEach((instance, lodIndex) => {
      console.log(`🌱 SCENE ADD: Adding LOD ${lodIndex} with ${instance.maxInstances} max instances`);
      console.log(`🌱 SCENE ADD: Mesh geometry vertices: ${instance.mesh.geometry.attributes.position.count}`);
      console.log(`🌱 SCENE ADD: Mesh material type: ${instance.mesh.material.type}`);
      console.log(`🌱 SCENE ADD: Mesh visible: ${instance.mesh.visible}, count: ${instance.mesh.count}`);
      console.log(`🌱 SCENE ADD: Mesh position: (${instance.mesh.position.x}, ${instance.mesh.position.y}, ${instance.mesh.position.z})`);
      console.log(`🌱 SCENE ADD: Mesh scale: (${instance.mesh.scale.x}, ${instance.mesh.scale.y}, ${instance.mesh.scale.z})`);
      scene.add(instance.mesh);
      instance.mesh.visible = true; // Ensure visibility
      instance.mesh.count = Math.min(100, instance.maxInstances); // Force some instances for testing
    });
    console.log('🌱 SCENE ADD: All grass meshes added to scene');
  }

  update(deltaTime, camera, windDirection = { x: 1, y: 0.5 }, windStrength = 0.02) {
    this.windTime += deltaTime;
    this.windDirection.set(windDirection.x, windDirection.y);
    this.windStrength = windStrength;

    // Update LOD less frequently for performance (every 100ms)
    if (!this.lastLODUpdate) this.lastLODUpdate = 0;
    this.lastLODUpdate += deltaTime;

    if (this.lastLODUpdate > 0.1 && camera && camera.position) { // 10 FPS LOD updates
      this.updateLOD(camera);
      this.lastLODUpdate = 0;
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

  // Update grass density and regenerate
  updateDensity(newDensity) {
    this.isRegenerating = true; // Prevent LOD updates during regeneration
    this.densityMultiplier = newDensity;
    console.log(`🌾 GRASS DENSITY: Starting update to ${newDensity}x`);

    // Clear existing grass instances
    const oldInstanceCount = this.grassInstances.size;
    this.grassInstances.forEach(instance => {
      if (instance.mesh) {
        // Only remove from scene if scene reference exists
        if (this.scene) {
          this.scene.remove(instance.mesh);
        }
        // Dispose of geometry to free memory
        if (instance.mesh.geometry) {
          instance.mesh.geometry.dispose();
        }
      }
    });
    this.grassInstances.clear();
    console.log(`🌾 GRASS DENSITY: Cleared ${oldInstanceCount} old instances`);

    // Clear visible chunks to force regeneration
    this.visibleChunks.clear();

    // Regenerate grass system (same as initialization)
    console.log(`🌾 GRASS DENSITY: Regenerating chunks...`);
    this.generateGrassChunks();
    console.log(`🌾 GRASS DENSITY: Generated ${this.chunks.size} chunks`);

    console.log(`🌾 GRASS DENSITY: Setting up instanced meshes...`);
    this.setupInstancedMeshes();
    console.log(`🌾 GRASS DENSITY: Created ${this.grassInstances.size} new instances`);

    // Re-add to scene if scene reference exists
    if (this.scene) {
      console.log(`🌾 GRASS DENSITY: Adding to scene...`);
      this.addToScene(this.scene);
      console.log(`🌾 GRASS DENSITY: Added to scene successfully`);
    } else {
      console.warn(`🌾 GRASS DENSITY: No scene reference available`);
    }

    this.isRegenerating = false; // Re-enable LOD updates

    // Force an immediate LOD update to populate the instances
    console.log(`🌾 GRASS DENSITY: Checking for camera - scene: ${!!this.scene}, camera: ${!!window.camera}`);

    if (this.scene && window.camera) {
      console.log(`🌾 GRASS DENSITY: Forcing initial LOD update...`);
      // Reset LOD update timer to force immediate update
      this.lastLODUpdate = 0.2; // Force update on next frame
      this.updateLOD(window.camera);
      console.log(`🌾 GRASS DENSITY: LOD update complete - ${this.visibleChunks.size} visible chunks`);

      // Debug: Check final mesh states
      console.log(`🌾 GRASS DENSITY: Final mesh states:`);
      this.grassInstances.forEach((instance, lodIndex) => {
        const mesh = instance.mesh;
        console.log(`🌾 GRASS DENSITY: LOD ${lodIndex} - count: ${mesh.count}, visible: ${mesh.visible}, inScene: ${this.scene.children.includes(mesh)}, frustumCulled: ${mesh.frustumCulled}`);
        console.log(`🌾 GRASS DENSITY: LOD ${lodIndex} - position: (${mesh.position.x}, ${mesh.position.y}, ${mesh.position.z}), scale: (${mesh.scale.x}, ${mesh.scale.y}, ${mesh.scale.z})`);
        console.log(`🌾 GRASS DENSITY: LOD ${lodIndex} - material visible: ${mesh.material.visible}, transparent: ${mesh.material.transparent}`);
      });

      // If still no visible chunks, force some visibility for debugging
      if (this.visibleChunks.size === 0) {
        console.warn(`🌾 GRASS DENSITY: No visible chunks after LOD update, forcing visibility...`);
        this.grassInstances.forEach((instance, lodIndex) => {
          if (instance.maxInstances > 0) {
            instance.mesh.count = Math.min(100, instance.maxInstances);
            instance.mesh.visible = true;
            instance.mesh.frustumCulled = false; // Disable frustum culling for debugging
            console.log(`🌾 GRASS DENSITY: Forced LOD ${lodIndex} visible with ${instance.mesh.count} instances`);
          }
        });
      }
    } else {
      // Fallback: Force visibility without LOD update
      console.warn(`🌾 GRASS DENSITY: Camera not available, forcing visibility without LOD update...`);
      this.grassInstances.forEach((instance, lodIndex) => {
        if (instance.maxInstances > 0) {
          instance.mesh.count = Math.min(200, instance.maxInstances);
          instance.mesh.visible = true;
          instance.mesh.frustumCulled = false; // Disable frustum culling
          console.log(`🌾 GRASS DENSITY: Fallback - Forced LOD ${lodIndex} visible with ${instance.mesh.count} instances`);
        }
      });
    }

    // EMERGENCY: Force at least one LOD to be visible for debugging
    console.log(`🌾 GRASS DENSITY: EMERGENCY - Forcing LOD 1 to be visible for debugging...`);
    const emergencyInstance = this.grassInstances.get(1);
    if (emergencyInstance) {
      emergencyInstance.mesh.count = 100;
      emergencyInstance.mesh.visible = true;
      emergencyInstance.mesh.frustumCulled = false;
      emergencyInstance.mesh.instanceMatrix.needsUpdate = true;
      console.log(`🌾 GRASS DENSITY: EMERGENCY - LOD 1 forced visible with 100 instances`);
    }

    console.log(`🌾 GRASS DENSITY: Update complete - ${this.grassInstances.size} instances at ${newDensity}x density`);
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
      densityMultiplier: this.densityMultiplier
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
