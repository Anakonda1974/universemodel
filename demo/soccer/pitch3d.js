import * as THREE from 'https://unpkg.com/three@0.156.1/build/three.module.js';
import { GrassShader } from './grassShader.js';

/**
 * Professional 3D Soccer Pitch Component with Advanced Grass Shader
 * FIFA-compliant dimensions and markings with dynamic wear tracking
 */
export class SoccerPitch3D {
  constructor(renderer = null) {
    // FIFA standard dimensions (in meters)
    // CORRECTED: Swapping width/height to match visual perspective
    this.dimensions = {
      width: 52.5,    // 105m / 2 (scaled down) - GOAL TO GOAL (shorter dimension with goals)
      height: 34,     // 68m / 2 (scaled down) - SIDELINE TO SIDELINE (longer dimension bisected by center line)
      lineWidth: 0.12,

      // Goal dimensions (goals are on the width sides - shorter dimension)
      goalWidth: 7.32,
      goalHeight: 2.44,
      goalDepth: 2.0,
      postRadius: 0.06,

      // Area dimensions (penalty areas extend into the field from goal lines)
      penaltyAreaWidth: 40.3,   // Width of penalty area (parallel to goal line)
      penaltyAreaHeight: 16.5,  // Distance from goal line into field
      goalAreaWidth: 18.3,      // Width of goal area (parallel to goal line)
      goalAreaHeight: 5.5,      // Distance from goal line into field

      // Circle and arc dimensions
      centerCircleRadius: 9.15,
      cornerArcRadius: 1.0,
      penaltySpotDistance: 11.0  // Distance from goal line
    };

    this.group = new THREE.Group();

    // Initialize advanced grass shader system
    this.grassShader = new GrassShader(renderer, this.dimensions.width, this.dimensions.height);

    this.materials = this.createMaterials();

    this.buildPitch();
  }
  
  createMaterials() {
    return {
      // Advanced grass shader with wear tracking
      grass: this.grassShader.createGrassMaterial(),

      // Ground/dirt layer underneath grass
      dirt: this.createDirtMaterial(),

      // White markings
      marking: new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: false,
        opacity: 1.0
      }),
      
      // Goal materials
      goalPost: new THREE.MeshStandardMaterial({ 
        color: 0xffffff,
        roughness: 0.3,
        metalness: 0.1
      }),
      
      goalNet: new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide
      }),
      
      // Corner flag materials
      flagPole: new THREE.MeshStandardMaterial({ color: 0xffffff }),
      flag: new THREE.MeshBasicMaterial({ 
        color: 0xff0000,
        side: THREE.DoubleSide
      })
    };
  }
  
  createGrassMaterial() {
    // Return the advanced grass shader material with dynamic wear tracking
    return this.grassShader.getMaterial();
  }

  createDirtMaterial() {
    // Create realistic dirt/ground material that shows when grass is worn away
    return new THREE.MeshLambertMaterial({
      color: 0x8b4513, // Saddle brown dirt color
      roughness: 0.9,
      metalness: 0.0
    });
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

    // Create visual debug helpers
    this.createVisualHelpers();
  }
  
  createField() {
    // Create two-layer field system: dirt base + grass overlay

    // Layer 1: Ground/Dirt base (always visible)
    const groundGeo = new THREE.PlaneGeometry(
      this.dimensions.width*10,
      this.dimensions.height*10
    );
    this.groundMesh = new THREE.Mesh(groundGeo, this.materials.dirt);
    this.groundMesh.rotation.x = -Math.PI/2;
    this.groundMesh.position.y = -0.01; // Slightly below grass
    this.groundMesh.receiveShadow = true;
    this.groundMesh.name = 'ground';
    this.group.add(this.groundMesh);

    // Layer 2: Grass overlay (can be worn away to reveal dirt)
    const segments = 512; // High resolution for detailed grass displacement
    const grassGeo = new THREE.PlaneGeometry(
      this.dimensions.width,
      this.dimensions.height,
      segments,
      segments
    );
    this.grassMesh = new THREE.Mesh(grassGeo, this.materials.grass);
    this.grassMesh.rotation.x = -Math.PI/2;
    this.grassMesh.position.y = 0; // On top of dirt
    this.grassMesh.receiveShadow = true;
    this.grassMesh.castShadow = false; // Grass doesn't cast shadows, only receives
    this.grassMesh.name = 'grass';
    this.group.add(this.grassMesh);

    // Debug grass mesh creation
    console.log('🏔️ DISPLACEMENT DEBUG: Grass mesh created:');
    console.log(`🏔️ DISPLACEMENT DEBUG: - Geometry: ${grassGeo.parameters.width}x${grassGeo.parameters.height} with ${segments}x${segments} segments`);
    console.log(`🏔️ DISPLACEMENT DEBUG: - Vertices: ${grassGeo.attributes.position.count}`);
    console.log(`🏔️ DISPLACEMENT DEBUG: - Material: ${this.materials.grass.type}`);
    console.log(`🏔️ DISPLACEMENT DEBUG: - Position: (${this.grassMesh.position.x}, ${this.grassMesh.position.y}, ${this.grassMesh.position.z})`);
    console.log(`🏔️ DISPLACEMENT DEBUG: - Rotation: (${this.grassMesh.rotation.x}, ${this.grassMesh.rotation.y}, ${this.grassMesh.rotation.z})`);
    console.log(`🏔️ DISPLACEMENT DEBUG: - Scale: (${this.grassMesh.scale.x}, ${this.grassMesh.scale.y}, ${this.grassMesh.scale.z})`);
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
    const centerCircleGeo = new THREE.RingGeometry(centerCircleRadius - 0.05, centerCircleRadius, 32);
    const centerCircle = new THREE.Mesh(centerCircleGeo, this.materials.marking);
    centerCircle.rotation.x = -Math.PI/2;
    centerCircle.position.set(0, 0.01, 0);
    centerCircle.name = 'centerCircle';
    this.group.add(centerCircle);
    
    // Center spot
    const centerSpotGeo = new THREE.CircleGeometry(0.15, 16);
    const centerSpot = new THREE.Mesh(centerSpotGeo, this.materials.marking);
    centerSpot.rotation.x = -Math.PI/2;
    centerSpot.position.set(0, 0.01, 0);
    centerSpot.name = 'centerSpot';
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
    const lineGeo = new THREE.PlaneGeometry(width, height);
    const line = new THREE.Mesh(lineGeo, this.materials.marking);
    line.rotation.x = -Math.PI/2;
    line.position.set(x, 0.01, z);
    return line;
  }
  
  createSpot(x, z, name) {
    const spotGeo = new THREE.CircleGeometry(0.15, 16);
    const spot = new THREE.Mesh(spotGeo, this.materials.marking);
    spot.rotation.x = -Math.PI/2;
    spot.position.set(x, 0.01, z);
    spot.name = name;
    return spot;
  }

  createGoals() {
    const { width } = this.dimensions;

    // Left goal
    const leftGoal = this.createGoal('left');
    leftGoal.position.set(-width/2, 0, 0);
    leftGoal.rotation.y = 90;
    this.group.add(leftGoal);

    // Right goal
    const rightGoal = this.createGoal('right');
    rightGoal.position.set(width/2, 0, 0);
    rightGoal.rotation.y = Math.PI/2;
    this.group.add(rightGoal);
  }

  createGoal(side) {
    const { goalWidth, goalHeight, goalDepth, postRadius } = this.dimensions;
    const goalGroup = new THREE.Group();
    goalGroup.name = `${side}Goal`;

    // Goal posts
    const postGeo = new THREE.CylinderGeometry(postRadius, postRadius, goalHeight);

    const leftPost = new THREE.Mesh(postGeo, this.materials.goalPost);
    leftPost.position.set(0, goalHeight/2, -goalWidth/2);
    leftPost.castShadow = true;

    const rightPost = new THREE.Mesh(postGeo, this.materials.goalPost);
    rightPost.position.set(0, goalHeight/2, goalWidth/2);
    rightPost.castShadow = true;

    // Crossbar
    const crossbarGeo = new THREE.CylinderGeometry(postRadius, postRadius, goalWidth);
    const crossbar = new THREE.Mesh(crossbarGeo, this.materials.goalPost);
    crossbar.rotation.z = Math.PI/2;
    crossbar.position.set(0, goalHeight, 0);
    crossbar.castShadow = true;

    // Back posts
    const backLeftPost = new THREE.Mesh(postGeo, this.materials.goalPost);
    backLeftPost.position.set(-goalDepth, goalHeight/2, -goalWidth/2);
    backLeftPost.castShadow = true;

    const backRightPost = new THREE.Mesh(postGeo, this.materials.goalPost);
    backRightPost.position.set(-goalDepth, goalHeight/2, goalWidth/2);
    backRightPost.castShadow = true;

    // Back crossbar
    const backCrossbar = new THREE.Mesh(crossbarGeo, this.materials.goalPost);
    backCrossbar.rotation.z = Math.PI/2;
    backCrossbar.position.set(-goalDepth, goalHeight, 0);
    backCrossbar.castShadow = true;

    // Side bars
    const sideBarGeo = new THREE.CylinderGeometry(postRadius, postRadius, goalDepth);
    const topLeftBar = new THREE.Mesh(sideBarGeo, this.materials.goalPost);
    topLeftBar.rotation.z = Math.PI/2;
    topLeftBar.position.set(-goalDepth/2, goalHeight, -goalWidth/2);
    topLeftBar.castShadow = true;

    const topRightBar = new THREE.Mesh(sideBarGeo, this.materials.goalPost);
    topRightBar.rotation.z = Math.PI/2;
    topRightBar.position.set(-goalDepth/2, goalHeight, goalWidth/2);
    topRightBar.castShadow = true;

    // Goal nets
    const netBack = this.createNetPanel(goalWidth, goalHeight, -goalDepth, goalHeight/2, 0);
    const netLeft = this.createNetPanel(goalDepth, goalHeight, -goalDepth/2, goalHeight/2, -goalWidth/2, Math.PI/2);
    const netRight = this.createNetPanel(goalDepth, goalHeight, -goalDepth/2, goalHeight/2, goalWidth/2, -Math.PI/2);
    const netTop = this.createNetPanel(goalWidth, goalDepth, -goalDepth/2, goalHeight, 0, Math.PI/2, -Math.PI/2);

    goalGroup.add(leftPost, rightPost, crossbar);
    goalGroup.add(backLeftPost, backRightPost, backCrossbar);
    goalGroup.add(topLeftBar, topRightBar);
    goalGroup.add(netBack, netLeft, netRight, netTop);

    return goalGroup;
  }

  createNetPanel(width, height, x, y, z, rotY = 0, rotX = 0) {
    const netGeo = new THREE.PlaneGeometry(width, height);
    const net = new THREE.Mesh(netGeo, this.materials.goalNet);
    net.position.set(x, y, z);
    if (rotY !== 0) net.rotation.y = rotY;
    if (rotX !== 0) net.rotation.x = rotX;
    return net;
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

    // Flag pole
    const poleGeo = new THREE.CylinderGeometry(0.02, 0.02, 1.5);
    const pole = new THREE.Mesh(poleGeo, this.materials.flagPole);
    pole.position.y = 0.75;
    pole.castShadow = true;

    // Flag
    const flagGeo = new THREE.PlaneGeometry(0.3, 0.2);
    const flag = new THREE.Mesh(flagGeo, this.materials.flag);
    flag.position.set(0.15, 1.3, 0);

    flagGroup.add(pole, flag);
    return flagGroup;
  }

  createCornerArcs() {
    const { width, height, cornerArcRadius } = this.dimensions;

    const corners = [
      { x: -width/2, z: -height/2, rotation: -Math.PI/2 },        // Bottom-left: arc into field (+X, +Z)
      { x: -width/2, z: height/2, rotation: 0 },                  // Top-left: arc into field (+X, -Z)
      { x: width/2, z: -height/2, rotation: Math.PI },            // Bottom-right: arc into field (-X, +Z)
      { x: width/2, z: height/2, rotation: Math.PI/2 }            // Top-right: arc into field (-X, -Z)
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
    const arcGeo = new THREE.RingGeometry(cornerArcRadius - 0.05, cornerArcRadius, 16, 1, 0, Math.PI/2);
    const arc = new THREE.Mesh(arcGeo, this.materials.marking);
    arc.rotation.x = -Math.PI/2;
    arc.name = `cornerArc${index}`;
    return arc;
  }

  addTo(scene) {
    scene.add(this.group);
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

  // Track player activity for grass wear
  recordPlayerActivity(x, z, activityType = 'walk', intensity = 1.0) {
    this.grassShader.recordPlayerActivity(x, z, activityType, intensity);
  }

  // Update grass shader (call this in your game loop)
  update(deltaTime, windDirection = { x: 1, y: 0.5 }, windStrength = 0.02) {
    this.grassShader.update(deltaTime, windDirection, windStrength);
  }

  // Get wear intensity at a position (for gameplay effects)
  getWearAt(x, z) {
    return this.grassShader.getWearAt(x, z);
  }

  // Reset wear for new match
  resetWear() {
    this.grassShader.resetWear();
  }

  // Get field bounds for collision detection and wear testing
  getBounds() {
    return {
      minX: -this.dimensions.width / 2,
      maxX: this.dimensions.width / 2,
      minZ: -this.dimensions.height / 2,
      maxZ: this.dimensions.height / 2
    };
  }

  // Get field dimensions
  getDimensions() {
    return { ...this.dimensions };
  }

  // Create visual debug helpers
  createVisualHelpers() {
    console.log('🔍 DEBUG: Creating visual debug helpers...');
    this.debugHelpers = new THREE.Group();
    this.debugHelpers.name = 'debugHelpers';
    this.debugHelpers.visible = false; // Hidden by default

    // Create coordinate system axes
    this.createCoordinateAxes();

    // Create UV mapping grid
    this.createUVGrid();

    // Create displacement visualization points
    this.createDisplacementPoints();

    // Create field orientation markers
    this.createOrientationMarkers();

    this.group.add(this.debugHelpers);
    console.log('🔍 DEBUG: Debug helpers created and added to group');
    console.log('🔍 DEBUG: Debug helpers children count:', this.debugHelpers.children.length);
  }

  createCoordinateAxes() {
    // X-axis (red) - left to right
    const xAxisGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-this.dimensions.width/2, 0.5, 0),
      new THREE.Vector3(this.dimensions.width/2, 0.5, 0)
    ]);
    const xAxisMaterial = new THREE.LineBasicMaterial({ color: 0xff0000, linewidth: 3 });
    const xAxis = new THREE.Line(xAxisGeometry, xAxisMaterial);
    xAxis.name = 'xAxis';
    this.debugHelpers.add(xAxis);

    // Z-axis (blue) - front to back
    const zAxisGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0.5, -this.dimensions.height/2),
      new THREE.Vector3(0, 0.5, this.dimensions.height/2)
    ]);
    const zAxisMaterial = new THREE.LineBasicMaterial({ color: 0x0000ff, linewidth: 3 });
    const zAxis = new THREE.Line(zAxisGeometry, zAxisMaterial);
    zAxis.name = 'zAxis';
    this.debugHelpers.add(zAxis);

    // Y-axis (green) - up
    const yAxisGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 5, 0)
    ]);
    const yAxisMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00, linewidth: 3 });
    const yAxis = new THREE.Line(yAxisGeometry, yAxisMaterial);
    yAxis.name = 'yAxis';
    this.debugHelpers.add(yAxis);
  }

  createUVGrid() {
    // Create a grid showing UV coordinates
    const gridSize = 8;
    const stepX = this.dimensions.width / gridSize;
    const stepZ = this.dimensions.height / gridSize;

    for (let i = 0; i <= gridSize; i++) {
      for (let j = 0; j <= gridSize; j++) {
        const x = -this.dimensions.width/2 + i * stepX;
        const z = -this.dimensions.height/2 + j * stepZ;

        // Calculate UV coordinates
        const u = i / gridSize;
        const v = j / gridSize;

        // Create a small sphere at each grid point
        const sphereGeometry = new THREE.SphereGeometry(0.3, 8, 8);
        const sphereMaterial = new THREE.MeshBasicMaterial({
          color: new THREE.Color(u, v, 0.5) // Color based on UV
        });
        const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
        sphere.position.set(x, 1, z);
        sphere.name = `uvPoint_${u.toFixed(2)}_${v.toFixed(2)}`;
        this.debugHelpers.add(sphere);
      }
    }
  }

  createDisplacementPoints() {
    // Create points that show displacement values
    // Updated for new field dimensions: width=52.5 (goal to goal), height=34 (sideline to sideline)
    const testPoints = [
      { x: 0, z: 0, name: 'Center' },
      { x: 25, z: 0, name: 'Right_Goal_Area' },
      { x: -25, z: 0, name: 'Left_Goal_Area' },
      { x: 0, z: 15, name: 'Top_Sideline' },
      { x: 0, z: -15, name: 'Bottom_Sideline' }
    ];

    testPoints.forEach(point => {
      const geometry = new THREE.ConeGeometry(1, 3, 8);
      const material = new THREE.MeshBasicMaterial({ color: 0xffff00 });
      const cone = new THREE.Mesh(geometry, material);
      cone.position.set(point.x, 2, point.z);
      cone.name = `displacementPoint_${point.name}`;
      this.debugHelpers.add(cone);
    });
  }

  createOrientationMarkers() {
    // Create text-like markers showing field orientation
    const markerGeometry = new THREE.BoxGeometry(2, 0.5, 4);

    // Blue team side marker (left)
    const blueMarker = new THREE.Mesh(markerGeometry,
      new THREE.MeshBasicMaterial({ color: 0x0066cc }));
    blueMarker.position.set(-this.dimensions.width/4, 1.5, 0);
    blueMarker.name = 'blueTeamMarker';
    this.debugHelpers.add(blueMarker);

    // Red team side marker (right)
    const redMarker = new THREE.Mesh(markerGeometry,
      new THREE.MeshBasicMaterial({ color: 0xcc0000 }));
    redMarker.position.set(this.dimensions.width/4, 1.5, 0);
    redMarker.name = 'redTeamMarker';
    this.debugHelpers.add(redMarker);
  }

  // Toggle debug helpers visibility
  toggleDebugHelpers() {
    if (this.debugHelpers) {
      this.debugHelpers.visible = !this.debugHelpers.visible;
      console.log(`🔍 DEBUG HELPERS: ${this.debugHelpers.visible ? 'ENABLED' : 'DISABLED'}`);
      return this.debugHelpers.visible;
    }
    return false;
  }

  // Dispose of resources
  dispose() {
    this.grassShader.dispose();
  }
}
