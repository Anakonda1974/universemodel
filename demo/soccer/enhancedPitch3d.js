import * as THREE from 'https://unpkg.com/three@0.156.1/build/three.module.js';
import { AdvancedGrassSystem } from './advancedGrassShader.js';

/**
 * Enhanced 3D Soccer Pitch with AAA-Quality Grass System
 * Features: LOD, Culling, PBR, Advanced Shaders, Realistic Grass
 */
export class EnhancedSoccerPitch3D {
  constructor(renderer = null) {
    // FIFA standard dimensions (in meters)
    this.dimensions = {
      width: 52.5,    // Goal to goal (shorter dimension with goals)
      height: 34,     // Sideline to sideline (longer dimension bisected by center line)
      lineWidth: 0.12,

      // Goal dimensions
      goalWidth: 7.32,
      goalHeight: 2.44,
      goalDepth: 2.0,
      postRadius: 0.06,

      // Area dimensions
      penaltyAreaWidth: 40.3,   // Width of penalty area (parallel to goal line)
      penaltyAreaHeight: 16.5,  // Distance from goal line into field
      goalAreaWidth: 18.3,      // Width of goal area (parallel to goal line)
      goalAreaHeight: 5.5,      // Distance from goal line into field

      // Circle and arc dimensions
      centerCircleRadius: 9.15,
      cornerArcRadius: 1.0,
      penaltySpotDistance: 11.0
    };

    this.group = new THREE.Group();
    this.renderer = renderer;

    // Initialize advanced grass system with error handling
    console.log('🌱 PITCH: About to create AdvancedGrassSystem...');
    console.log('🌱 PITCH: Renderer available:', !!renderer);
    console.log('🌱 PITCH: Field dimensions:', this.dimensions.width, 'x', this.dimensions.height);

    try {
      this.advancedGrass = new AdvancedGrassSystem(renderer, this.dimensions.width, this.dimensions.height);
      console.log('🌱 ADVANCED GRASS: Successfully initialized AAA grass system');
      console.log('🌱 ADVANCED GRASS: LOD levels:', this.advancedGrass.lodLevels.length);
      console.log('🌱 ADVANCED GRASS: Chunks created:', this.advancedGrass.chunks.size);
      console.log('🌱 ADVANCED GRASS: Grass instances:', this.advancedGrass.grassInstances.size);
    } catch (error) {
      console.error('🌱 ADVANCED GRASS: Failed to initialize, using fallback:', error);
      console.error('🌱 ADVANCED GRASS: Error details:', error.stack);
      this.advancedGrass = null;
    }

    this.materials = this.createMaterials();
    this.buildPitch();
  }

  createMaterials() {
    return {
      // Enhanced ground material with PBR
      ground: new THREE.MeshStandardMaterial({
        color: 0x4a5d23,
        roughness: 0.9,
        metalness: 0.0,
        normalScale: new THREE.Vector2(0.5, 0.5)
      }),

      // High-quality pitch markings
      marking: new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.8,
        metalness: 0.0,
        transparent: false,
        opacity: 1.0
      }),

      // Enhanced goal materials with PBR
      goalPost: new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.2,
        metalness: 0.8,
        envMapIntensity: 1.0
      }),

      goalNet: new THREE.MeshStandardMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide,
        roughness: 0.9,
        metalness: 0.0
      }),

      // Corner flag materials
      flagPole: new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.3,
        metalness: 0.1
      }),
      flag: new THREE.MeshStandardMaterial({
        color: 0xff0000,
        side: THREE.DoubleSide,
        roughness: 0.8,
        metalness: 0.0
      })
    };
  }

  buildPitch() {
    this.createField();
    this.createBoundaryLines();
    this.createCenterMarkings();
    this.createPenaltyAreas();
    this.createGoalAreas();
    this.createPenaltySpots();
    this.createGoals();
    this.createCornerFlags();
    this.createCornerArcs();
    this.createVisualHelpers();
  }

  createField() {
    // Create base ground plane
    const groundGeo = new THREE.PlaneGeometry(
      this.dimensions.width,
      this.dimensions.height,
      64, 64 // Higher resolution for better lighting
    );
    this.groundMesh = new THREE.Mesh(groundGeo, this.materials.ground);
    this.groundMesh.rotation.x = -Math.PI/2;
    this.groundMesh.position.y = -0.02; // Slightly below grass
    this.groundMesh.receiveShadow = true;
    this.groundMesh.name = 'ground';
    this.group.add(this.groundMesh);

    // Add advanced grass system (if available)
    console.log('🌱 PITCH: Checking if advanced grass is available:', !!this.advancedGrass);
    if (this.advancedGrass) {
      console.log('🌱 PITCH: Adding advanced grass to scene...');
      this.advancedGrass.addToScene(this.group);
      console.log('🌱 PITCH: Advanced grass added to scene successfully');
    } else {
      // Fallback: create simple grass plane
      console.log('🌱 FALLBACK: Using simple grass plane');
      const grassGeo = new THREE.PlaneGeometry(this.dimensions.width, this.dimensions.height, 32, 32);
      const grassMat = new THREE.MeshStandardMaterial({
        color: 0x2d5016,
        roughness: 0.9,
        metalness: 0.0
      });
      this.fallbackGrass = new THREE.Mesh(grassGeo, grassMat);
      this.fallbackGrass.rotation.x = -Math.PI/2;
      this.fallbackGrass.position.y = 0.01;
      this.fallbackGrass.receiveShadow = true;
      this.fallbackGrass.name = 'fallbackGrass';
      this.group.add(this.fallbackGrass);
    }
  }

  createBoundaryLines() {
    const { width, height, lineWidth } = this.dimensions;
    
    // Touchlines (sidelines) - now the longer sides
    const topTouchline = this.createLine(width, lineWidth, 0, height/2);
    const bottomTouchline = this.createLine(width, lineWidth, 0, -height/2);
    
    // Goal lines - now the shorter sides  
    const leftGoalLine = this.createLine(lineWidth, height, -width/2, 0);
    const rightGoalLine = this.createLine(lineWidth, height, width/2, 0);
    
    this.group.add(topTouchline, bottomTouchline, leftGoalLine, rightGoalLine);
  }

  createCenterMarkings() {
    const { lineWidth, centerCircleRadius } = this.dimensions;
    
    // Center line - now runs across the width (goal to goal)
    const centerLine = this.createLine(lineWidth, this.dimensions.height, 0, 0);
    this.group.add(centerLine);
    
    // Center circle
    const centerCircleGeo = new THREE.RingGeometry(centerCircleRadius - 0.05, centerCircleRadius, 64);
    const centerCircle = new THREE.Mesh(centerCircleGeo, this.materials.marking);
    centerCircle.rotation.x = -Math.PI/2;
    centerCircle.position.set(0, 0.01, 0);
    centerCircle.name = 'centerCircle';
    centerCircle.receiveShadow = true;
    this.group.add(centerCircle);
    
    // Center spot
    const centerSpotGeo = new THREE.CircleGeometry(0.15, 32);
    const centerSpot = new THREE.Mesh(centerSpotGeo, this.materials.marking);
    centerSpot.rotation.x = -Math.PI/2;
    centerSpot.position.set(0, 0.01, 0);
    centerSpot.name = 'centerSpot';
    centerSpot.receiveShadow = true;
    this.group.add(centerSpot);
  }

  createPenaltyAreas() {
    const { width, lineWidth, penaltyAreaWidth, penaltyAreaHeight } = this.dimensions;
    
    // Left penalty area (extends from left goal line)
    this.createAreaLines(-width/2, penaltyAreaHeight, penaltyAreaWidth, 'leftPenaltyArea');
    
    // Right penalty area (extends from right goal line)
    this.createAreaLines(width/2, -penaltyAreaHeight, penaltyAreaWidth, 'rightPenaltyArea');
  }

  createGoalAreas() {
    const { width, goalAreaWidth, goalAreaHeight } = this.dimensions;
    
    // Left goal area (extends from left goal line)
    this.createAreaLines(-width/2, goalAreaHeight, goalAreaWidth, 'leftGoalArea');
    
    // Right goal area (extends from right goal line)
    this.createAreaLines(width/2, -goalAreaHeight, goalAreaWidth, 'rightGoalArea');
  }

  createAreaLines(startX, areaWidth, areaHeight, name) {
    const { lineWidth } = this.dimensions;
    const direction = Math.sign(areaWidth);
    const absWidth = Math.abs(areaWidth);
    
    // Front line (parallel to goal)
    const frontLine = this.createLine(lineWidth, areaHeight, startX + direction * absWidth, 0);
    frontLine.name = `${name}_front`;
    
    // Top line
    const topLine = this.createLine(absWidth, lineWidth, startX + direction * absWidth/2, areaHeight/2);
    topLine.name = `${name}_top`;
    
    // Bottom line
    const bottomLine = this.createLine(absWidth, lineWidth, startX + direction * absWidth/2, -areaHeight/2);
    bottomLine.name = `${name}_bottom`;
    
    this.group.add(frontLine, topLine, bottomLine);
  }

  createPenaltySpots() {
    const { width, penaltySpotDistance } = this.dimensions;
    
    // Left penalty spot
    const leftSpot = this.createSpot(-width/2 + penaltySpotDistance, 0, 'leftPenaltySpot');
    
    // Right penalty spot
    const rightSpot = this.createSpot(width/2 - penaltySpotDistance, 0, 'rightPenaltySpot');
    
    this.group.add(leftSpot, rightSpot);
  }

  createLine(width, height, x, z) {
    const lineGeo = new THREE.PlaneGeometry(width, height, 8, 8);
    const line = new THREE.Mesh(lineGeo, this.materials.marking);
    line.rotation.x = -Math.PI/2;
    line.position.set(x, 0.01, z);
    line.receiveShadow = true;
    line.castShadow = false;
    return line;
  }

  createSpot(x, z, name) {
    const spotGeo = new THREE.CircleGeometry(0.15, 32);
    const spot = new THREE.Mesh(spotGeo, this.materials.marking);
    spot.rotation.x = -Math.PI/2;
    spot.position.set(x, 0.01, z);
    spot.name = name;
    spot.receiveShadow = true;
    spot.castShadow = false;
    return spot;
  }

  createGoals() {
    const { width } = this.dimensions;

    // Left goal - properly aligned (no rotation needed)
    const leftGoal = this.createGoal('left');
    leftGoal.position.set(-width/2, 0, 0);
    // Remove the 90-degree rotation that was causing misalignment
    this.group.add(leftGoal);

    // Right goal - properly aligned (no rotation needed)
    const rightGoal = this.createGoal('right');
    rightGoal.position.set(width/2, 0, 0);
    // Remove the 90-degree rotation that was causing misalignment
    this.group.add(rightGoal);
  }

  createGoal(side) {
    const { goalWidth, goalHeight, goalDepth, postRadius } = this.dimensions;
    const goalGroup = new THREE.Group();
    goalGroup.name = `${side}Goal`;

    // Enhanced goal posts with better geometry
    const postGeo = new THREE.CylinderGeometry(postRadius, postRadius, goalHeight, 16);

    const leftPost = new THREE.Mesh(postGeo, this.materials.goalPost);
    leftPost.position.set(0, goalHeight/2, -goalWidth/2);
    leftPost.castShadow = true;
    leftPost.receiveShadow = true;

    const rightPost = new THREE.Mesh(postGeo, this.materials.goalPost);
    rightPost.position.set(0, goalHeight/2, goalWidth/2);
    rightPost.castShadow = true;
    rightPost.receiveShadow = true;

    // Enhanced crossbar
    const crossbarGeo = new THREE.CylinderGeometry(postRadius, postRadius, goalWidth, 16);
    const crossbar = new THREE.Mesh(crossbarGeo, this.materials.goalPost);
    crossbar.rotation.z = Math.PI/2;
    crossbar.position.set(0, goalHeight, 0);
    crossbar.castShadow = true;
    crossbar.receiveShadow = true;

    goalGroup.add(leftPost, rightPost, crossbar);
    return goalGroup;
  }

  createCornerFlags() {
    const { width, height } = this.dimensions;

    const corners = [
      { x: -width/2, z: -height/2, name: 'bottomLeft' },
      { x: -width/2, z: height/2, name: 'topLeft' },
      { x: width/2, z: -height/2, name: 'bottomRight' },
      { x: width/2, z: height/2, name: 'topRight' }
    ];

    corners.forEach(corner => {
      const flag = this.createCornerFlag(corner.name);
      flag.position.set(corner.x, 0, corner.z);
      this.group.add(flag);
    });
  }

  createCornerFlag(name) {
    const flagGroup = new THREE.Group();
    flagGroup.name = `${name}Flag`;

    // Enhanced flag pole
    const poleGeo = new THREE.CylinderGeometry(0.02, 0.02, 1.5, 8);
    const pole = new THREE.Mesh(poleGeo, this.materials.flagPole);
    pole.position.y = 0.75;
    pole.castShadow = true;
    pole.receiveShadow = true;

    // Enhanced flag
    const flagGeo = new THREE.PlaneGeometry(0.3, 0.2, 4, 4);
    const flag = new THREE.Mesh(flagGeo, this.materials.flag);
    flag.position.set(0.15, 1.3, 0);
    flag.castShadow = true;
    flag.receiveShadow = true;

    flagGroup.add(pole, flag);
    return flagGroup;
  }

  createCornerArcs() {
    const { width, height, cornerArcRadius } = this.dimensions;

    const corners = [
      { x: -width/2, z: -height/2, rotation: -Math.PI/2 },
      { x: -width/2, z: height/2, rotation: 0 },
      { x: width/2, z: -height/2, rotation: Math.PI },
      { x: width/2, z: height/2, rotation: Math.PI/2 }
    ];

    corners.forEach((corner, index) => {
      const arc = this.createCornerArc(index);
      arc.rotation.z = corner.rotation;
      arc.position.set(corner.x, 0.01, corner.z);
      this.group.add(arc);
    });
  }

  createCornerArc(index) {
    const { cornerArcRadius } = this.dimensions;
    const arcGeo = new THREE.RingGeometry(cornerArcRadius - 0.05, cornerArcRadius, 32, 1, 0, Math.PI/2);
    const arc = new THREE.Mesh(arcGeo, this.materials.marking);
    arc.rotation.x = -Math.PI/2;
    arc.name = `cornerArc${index}`;
    arc.receiveShadow = true;
    arc.castShadow = false;
    return arc;
  }

  createVisualHelpers() {
    // Placeholder for debug helpers if needed
    this.debugHelpers = new THREE.Group();
    this.debugHelpers.name = 'debugHelpers';
    this.debugHelpers.visible = false;
    this.group.add(this.debugHelpers);
  }

  addTo(scene) {
    // Store scene reference for later use
    this.scene = scene;
    scene.add(this.group);

    // Test grass system visibility
    setTimeout(() => {
      this.testGrassVisibility();
    }, 2000); // Test after 2 seconds
  }

  testGrassVisibility() {
    console.log('🌱 GRASS TEST: Testing grass system visibility...');

    if (this.advancedGrass) {
      console.log('🌱 GRASS TEST: Advanced grass system exists');
      console.log('🌱 GRASS TEST: Total chunks:', this.advancedGrass.chunks.size);
      console.log('🌱 GRASS TEST: Visible chunks:', this.advancedGrass.visibleChunks.size);

      // Check if grass instances are in the scene
      let totalVisible = 0;
      this.advancedGrass.grassInstances.forEach((instance, lodIndex) => {
        console.log(`🌱 GRASS TEST: LOD ${lodIndex} - Visible: ${instance.mesh.visible}, Count: ${instance.mesh.count}, Max: ${instance.maxInstances}`);

        // Force visibility and set substantial instances for testing
        instance.mesh.visible = true;
        instance.mesh.frustumCulled = false;
        const forceCount = Math.min(1000 * (1 - lodIndex * 0.1), instance.maxInstances);
        instance.mesh.count = forceCount;
        totalVisible += forceCount;

        console.log(`🌱 GRASS TEST: Forced LOD ${lodIndex} to show ${forceCount} instances`);
      });

      console.log(`🌱 GRASS TEST: Total visible instances: ${totalVisible}`);

      // Use the simplified force all chunks method
      console.log('🌱 GRASS TEST: Ensuring all chunks have grass...');
      const totalBlades = this.advancedGrass.forceAllChunksVisible();
      console.log(`🌱 GRASS TEST: ${totalBlades} total grass blades now visible`);

      if (totalBlades >= this.advancedGrass.minimumTotalBlades) {
        console.log(`🌱 GRASS TEST: ✅ Minimum blade requirement met (${this.advancedGrass.minimumTotalBlades})`);
      } else {
        console.warn(`🌱 GRASS TEST: ❌ Minimum blade requirement not met (${this.advancedGrass.minimumTotalBlades})`);
      }

      // Test wear at center of field
      console.log('🌱 GRASS TEST: Testing wear at field center...');
      this.recordPlayerActivity(0, 0, 'tackle', 5.0);

      // Force maximum visibility for all grass instances
      this.advancedGrass.grassInstances.forEach((instance, lodIndex) => {
        instance.mesh.visible = true;
        instance.mesh.count = Math.min(1000, instance.maxInstances);
        console.log(`🌱 GRASS TEST: Forced LOD ${lodIndex} visibility with ${instance.mesh.count} instances`);

        // Debug: Check mesh properties
        console.log(`🌱 GRASS DEBUG: LOD ${lodIndex} mesh properties:`, {
          visible: instance.mesh.visible,
          count: instance.mesh.count,
          geometry: !!instance.mesh.geometry,
          material: !!instance.mesh.material,
          position: instance.mesh.position,
          scale: instance.mesh.scale,
          parent: !!instance.mesh.parent
        });
      });

      // SHADER DEBUG: Replace first LOD with basic material to test if shader is the issue
      console.log('🧪 SHADER TEST: Replacing LOD 0 with basic material...');
      const firstInstance = this.advancedGrass.grassInstances.get(0);
      if (firstInstance) {
        // Store original material
        firstInstance.originalMaterial = firstInstance.mesh.material;

        // Replace with basic material
        firstInstance.mesh.material = new THREE.MeshBasicMaterial({
          color: 0x00ff00, // Bright green
          side: THREE.DoubleSide,
          wireframe: true
        });

        console.log('🧪 SHADER TEST: LOD 0 now uses basic green wireframe material');
        console.log('🧪 SHADER TEST: If you see green wireframes, the issue is the shader. If not, it\'s geometry/positioning.');
      }

      // SIMPLE SHADER TEST: Replace LOD 1 with a minimal working shader
      console.log('🧪 SIMPLE SHADER: Testing minimal shader on LOD 1...');
      const secondInstance = this.advancedGrass.grassInstances.get(1);
      if (secondInstance) {
        secondInstance.mesh.material = new THREE.ShaderMaterial({
          uniforms: {
            color: { value: new THREE.Color(0xff0000) } // Red
          },
          vertexShader: `
            attribute vec3 instancePosition;
            attribute float instanceScale;
            attribute float instanceRotation;

            void main() {
              vec3 pos = position;

              // Apply instance rotation
              float c = cos(instanceRotation);
              float s = sin(instanceRotation);
              pos.xz = mat2(c, -s, s, c) * pos.xz;

              // Apply instance scale and position
              pos *= instanceScale;
              pos += instancePosition;

              gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
            }
          `,
          fragmentShader: `
            uniform vec3 color;
            void main() {
              gl_FragColor = vec4(color, 1.0);
            }
          `,
          side: THREE.DoubleSide
        });
        console.log('🧪 SIMPLE SHADER: LOD 1 now uses minimal red shader');
      }

      // Add a simple test cube to verify rendering works
      this.addTestCube();

    } else if (this.fallbackGrass) {
      console.log('🌱 GRASS TEST: Using fallback grass system');
      console.log(`🌱 GRASS TEST: Fallback grass visible: ${this.fallbackGrass.visible}`);
    } else {
      console.log('🌱 GRASS TEST: No grass system found!');
    }
  }

  getDimensions() {
    return { ...this.dimensions };
  }

  getFieldBounds() {
    return {
      minX: -this.dimensions.width / 2,
      maxX: this.dimensions.width / 2,
      minZ: -this.dimensions.height / 2,
      maxZ: this.dimensions.height / 2
    };
  }

  getBounds() {
    return this.getFieldBounds();
  }

  // Update the advanced grass system
  update(deltaTime, camera, windDirection = { x: 1, y: 0.5 }, windStrength = 0.02) {
    if (this.advancedGrass) {
      try {
        this.advancedGrass.update(deltaTime, camera, windDirection, windStrength);
      } catch (error) {
        console.error('🌱 GRASS UPDATE ERROR:', error);
      }
    }
    // Fallback grass doesn't need updates
  }

  // Track player activity for grass wear
  recordPlayerActivity(x, z, activityType = 'walk', intensity = 1.0) {
    console.log(`🌱 PITCH WEAR: Received activity ${activityType} at (${x.toFixed(2)}, ${z.toFixed(2)}) intensity ${intensity}`);

    if (this.advancedGrass) {
      try {
        console.log(`🌱 ADVANCED GRASS: Processing wear...`);
        this.advancedGrass.recordPlayerActivity(x, z, activityType, intensity);
        console.log(`🌱 ADVANCED GRASS: Wear processed successfully`);
      } catch (error) {
        console.error('🌱 GRASS WEAR ERROR:', error);
      }
    }
    // Fallback: just log the activity
    else {
      console.log(`🌱 FALLBACK WEAR: ${activityType} at (${x.toFixed(2)}, ${z.toFixed(2)}) intensity ${intensity}`);
    }
  }

  addTestCube() {
    if (!this.scene) {
      console.error('🧪 TEST CUBE ERROR: Scene reference not available');
      return;
    }

    // Add a simple bright red cube to test if instanced rendering works
    const geometry = new THREE.BoxGeometry(2, 2, 2);
    const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const cube = new THREE.Mesh(geometry, material);
    cube.position.set(0, 1, 0); // Center of field, 1 meter high
    this.scene.add(cube);
    console.log('🧪 TEST CUBE: Added red test cube at field center');

    // Also add instanced cubes to test instanced rendering
    const instancedGeometry = new THREE.BoxGeometry(1, 1, 1);
    const instancedMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const instancedMesh = new THREE.InstancedMesh(instancedGeometry, instancedMaterial, 10);

    // Position instances in a line
    for (let i = 0; i < 10; i++) {
      const matrix = new THREE.Matrix4();
      matrix.setPosition(i * 3 - 15, 0.5, 5);
      instancedMesh.setMatrixAt(i, matrix);
    }
    instancedMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(instancedMesh);
    console.log('🧪 TEST CUBES: Added 10 green instanced cubes');

    // Test grass blade geometry directly
    this.addTestGrassBlades();
  }

  addTestGrassBlades() {
    console.log('🧪 TEST GRASS: Creating test grass blades...');

    // Test 1: Simple box geometry (should definitely work)
    const boxGeometry = new THREE.BoxGeometry(0.1, 0.5, 0.1);
    const boxMaterial = new THREE.MeshBasicMaterial({
      color: 0xff00ff, // Bright magenta
      wireframe: true
    });

    const testBoxMesh = new THREE.InstancedMesh(boxGeometry, boxMaterial, 10);

    // Position test boxes in a line
    for (let i = 0; i < 10; i++) {
      const matrix = new THREE.Matrix4();
      const x = i * 1 - 4.5; // Line of boxes
      matrix.setPosition(x, 0.25, -5); // In front of field
      testBoxMesh.setMatrixAt(i, matrix);
    }
    testBoxMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(testBoxMesh);
    console.log('🧪 TEST GRASS: Added 10 magenta wireframe boxes');

    // Test 2: Plane geometry grass blades
    const grassGeometry = new THREE.PlaneGeometry(0.1, 0.5, 1, 3);
    const grassMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ffff, // Bright cyan
      side: THREE.DoubleSide,
      wireframe: true
    });

    const testGrassMesh = new THREE.InstancedMesh(grassGeometry, grassMaterial, 10);

    // Position test grass blades in a line
    for (let i = 0; i < 10; i++) {
      const matrix = new THREE.Matrix4();
      const x = i * 1 - 4.5; // Line of grass
      matrix.setPosition(x, 0.25, -6); // Behind the boxes
      testGrassMesh.setMatrixAt(i, matrix);
    }
    testGrassMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(testGrassMesh);
    console.log('🧪 TEST GRASS: Added 10 cyan wireframe grass planes');
  }

  // Get wear intensity at a position
  getWearAt(x, z) {
    // This would need to be implemented in the advanced grass system
    return 0;
  }

  // Reset wear for new match
  resetWear() {
    if (this.advancedGrass) {
      try {
        // Reset the advanced grass system wear data
        this.advancedGrass.wearData.fill(0);
        this.advancedGrass.wearTexture.needsUpdate = true;
        console.log('🌱 GRASS WEAR: Reset successful');
      } catch (error) {
        console.error('🌱 GRASS WEAR RESET ERROR:', error);
      }
    } else {
      console.log('🌱 FALLBACK: No wear data to reset');
    }
  }

  toggleDebugHelpers() {
    if (this.debugHelpers) {
      this.debugHelpers.visible = !this.debugHelpers.visible;
      return this.debugHelpers.visible;
    }
    return false;
  }

  dispose() {
    if (this.advancedGrass) {
      this.advancedGrass.dispose();
    }
    if (this.fallbackGrass) {
      this.fallbackGrass.geometry.dispose();
      this.fallbackGrass.material.dispose();
    }
  }
}
