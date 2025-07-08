import * as THREE from 'https://unpkg.com/three@0.156.1/build/three.module.js';

export class Player3D {
  constructor(color=0x0000ff, x=0, z=0, playerData = {}) {
    this.color = color;
    this.velocity = new THREE.Vector3();
    this.speed = 5;
    this.playerData = playerData;

    // Create realistic player model
    this.group = new THREE.Group();
    this.createPlayerModel(color, playerData);

    this.group.position.set(x, 0, z);
    this.mesh = this.group; // For compatibility
  }

  createPlayerModel(color, playerData) {
    // Player dimensions
    const height = 1.75 + (Math.random() - 0.5) * 0.2; // 1.65-1.85m
    const bodyWidth = 0.35;
    const headRadius = 0.12;

    // Materials
    const skinColor = 0xfdbcb4;
    const shirtColor = color;
    const shortsColor = this.darkenColor(color, 0.3);
    const socksColor = this.darkenColor(color, 0.5);
    const shoeColor = 0x000000;

    // Head
    const headGeo = new THREE.SphereGeometry(headRadius, 8, 6);
    const headMat = new THREE.MeshStandardMaterial({ color: skinColor });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = height - headRadius;
    head.castShadow = true;
    this.head = head;

    // Hair
    const hairGeo = new THREE.SphereGeometry(headRadius * 1.1, 8, 6);
    const hairColors = [0x8B4513, 0x000000, 0xFFD700, 0x654321];
    const hairColor = hairColors[Math.floor(Math.random() * hairColors.length)];
    const hairMat = new THREE.MeshStandardMaterial({ color: hairColor });
    const hair = new THREE.Mesh(hairGeo, hairMat);
    hair.position.y = height - headRadius + 0.02;
    hair.scale.y = 0.6;
    hair.castShadow = true;

    // Torso (shirt)
    const torsoGeo = new THREE.CylinderGeometry(bodyWidth * 0.8, bodyWidth, height * 0.4, 8);
    const torsoMat = new THREE.MeshStandardMaterial({ color: shirtColor });
    const torso = new THREE.Mesh(torsoGeo, torsoMat);
    torso.position.y = height * 0.6;
    torso.castShadow = true;
    this.torso = torso;

    // Arms
    const armGeo = new THREE.CylinderGeometry(0.06, 0.08, height * 0.35, 6);
    const armMat = new THREE.MeshStandardMaterial({ color: skinColor });

    const leftArm = new THREE.Mesh(armGeo, armMat);
    leftArm.position.set(-bodyWidth * 0.9, height * 0.65, 0);
    leftArm.rotation.z = 0.2;
    leftArm.castShadow = true;

    const rightArm = new THREE.Mesh(armGeo, armMat);
    rightArm.position.set(bodyWidth * 0.9, height * 0.65, 0);
    rightArm.rotation.z = -0.2;
    rightArm.castShadow = true;

    // Shorts
    const shortsGeo = new THREE.CylinderGeometry(bodyWidth * 0.9, bodyWidth * 0.8, height * 0.15, 8);
    const shortsMat = new THREE.MeshStandardMaterial({ color: shortsColor });
    const shorts = new THREE.Mesh(shortsGeo, shortsMat);
    shorts.position.y = height * 0.35;
    shorts.castShadow = true;

    // Legs
    const legGeo = new THREE.CylinderGeometry(0.08, 0.1, height * 0.35, 6);
    const legMat = new THREE.MeshStandardMaterial({ color: skinColor });

    const leftLeg = new THREE.Mesh(legGeo, legMat);
    leftLeg.position.set(-bodyWidth * 0.3, height * 0.175, 0);
    leftLeg.castShadow = true;
    this.leftLeg = leftLeg;

    const rightLeg = new THREE.Mesh(legGeo, legMat);
    rightLeg.position.set(bodyWidth * 0.3, height * 0.175, 0);
    rightLeg.castShadow = true;
    this.rightLeg = rightLeg;

    // Socks
    const sockGeo = new THREE.CylinderGeometry(0.09, 0.11, height * 0.15, 6);
    const sockMat = new THREE.MeshStandardMaterial({ color: socksColor });

    const leftSock = new THREE.Mesh(sockGeo, sockMat);
    leftSock.position.set(-bodyWidth * 0.3, height * 0.075, 0);
    leftSock.castShadow = true;

    const rightSock = new THREE.Mesh(sockGeo, sockMat);
    rightSock.position.set(bodyWidth * 0.3, height * 0.075, 0);
    rightSock.castShadow = true;

    // Shoes
    const shoeGeo = new THREE.BoxGeometry(0.25, 0.08, 0.15);
    const shoeMat = new THREE.MeshStandardMaterial({ color: shoeColor });

    const leftShoe = new THREE.Mesh(shoeGeo, shoeMat);
    leftShoe.position.set(-bodyWidth * 0.3, 0.04, 0.05);
    leftShoe.castShadow = true;

    const rightShoe = new THREE.Mesh(shoeGeo, shoeMat);
    rightShoe.position.set(bodyWidth * 0.3, 0.04, 0.05);
    rightShoe.castShadow = true;

    // Jersey number (if provided)
    if (playerData.number) {
      this.addJerseyNumber(playerData.number, torso);
    }

    // Add all parts to group
    this.group.add(head, hair, torso, leftArm, rightArm);
    this.group.add(shorts, leftLeg, rightLeg, leftSock, rightSock);
    this.group.add(leftShoe, rightShoe);

    // Store references for animation
    this.bodyParts = {
      head, torso, leftArm, rightArm, leftLeg, rightLeg
    };
  }

  darkenColor(color, factor) {
    const r = (color >> 16) & 0xff;
    const g = (color >> 8) & 0xff;
    const b = color & 0xff;

    return ((r * (1 - factor)) << 16) |
           ((g * (1 - factor)) << 8) |
           (b * (1 - factor));
  }

  addJerseyNumber(number, torso) {
    // Create number texture
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = 'white';
    ctx.font = 'bold 40px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(number.toString(), 32, 45);

    const numberTexture = new THREE.CanvasTexture(canvas);
    const numberMat = new THREE.MeshBasicMaterial({
      map: numberTexture,
      transparent: true
    });

    const numberGeo = new THREE.PlaneGeometry(0.2, 0.2);
    const numberMesh = new THREE.Mesh(numberGeo, numberMat);
    numberMesh.position.set(0, 0.1, 0.18);
    torso.add(numberMesh);
  }

  addTo(scene) {
    scene.add(this.group);
  }

  update(dt) {
    this.velocity.multiplyScalar(0.9); // friction
    this.group.position.add(this.velocity.clone().multiplyScalar(dt));
    this.group.position.y = 0; // keep on ground

    // Simple walking animation
    if (this.velocity.length() > 0.1) {
      const time = Date.now() * 0.01;
      const walkCycle = Math.sin(time) * 0.3;

      if (this.bodyParts) {
        this.bodyParts.leftLeg.rotation.x = walkCycle;
        this.bodyParts.rightLeg.rotation.x = -walkCycle;
        this.bodyParts.leftArm.rotation.x = -walkCycle * 0.5;
        this.bodyParts.rightArm.rotation.x = walkCycle * 0.5;
      }
    }
  }
}
