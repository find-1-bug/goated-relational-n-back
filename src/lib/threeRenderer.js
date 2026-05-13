import * as THREE from 'three';
import { renderRelationship } from './relationshipRenderer';

// 3D shapes using Three.js
const SHAPES_3D = ['cube', 'sphere', 'pyramid', 'cone', 'torus', 'octahedron'];

function createShape3D(shapeType, size, color) {
  let geometry;
  switch (shapeType) {
    case 'cube':
      geometry = new THREE.BoxGeometry(size, size, size);
      break;
    case 'sphere':
      geometry = new THREE.SphereGeometry(size / 2, 16, 12);
      break;
    case 'pyramid':
      geometry = new THREE.TetrahedronGeometry(size);
      break;
    case 'cone':
      geometry = new THREE.ConeGeometry(size / 2, size, 16);
      break;
    case 'torus':
      geometry = new THREE.TorusGeometry(size / 2, size / 4, 8, 32);
      break;
    case 'octahedron':
      geometry = new THREE.OctahedronGeometry(size);
      break;
    default:
      geometry = new THREE.BoxGeometry(size, size, size);
  }
  const material = new THREE.MeshStandardMaterial({ 
    color, 
    metalness: 0.2, 
    roughness: 0.5,
    side: THREE.FrontSide
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  return mesh;
}

function createRelationPanelTexture(relationship, stimulus) {
  const panelCanvas = document.createElement('canvas');
  panelCanvas.width = 900;
  panelCanvas.height = 560;
  const ctx = panelCanvas.getContext('2d');

  ctx.fillStyle = 'rgba(8, 13, 22, 0.92)';
  ctx.fillRect(0, 0, panelCanvas.width, panelCanvas.height);
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(18, 18, panelCanvas.width - 36, panelCanvas.height - 36, 22);
  ctx.stroke();

  renderRelationship(ctx, panelCanvas.width, panelCanvas.height, relationship, null, stimulus);

  const texture = new THREE.CanvasTexture(panelCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function setupScene(canvas) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x020617);

  const starGeometry = new THREE.BufferGeometry();
  const starPositions = [];
  for (let i = 0; i < 120; i++) {
    starPositions.push((Math.random() - 0.5) * 28, (Math.random() - 0.5) * 18, -Math.random() * 24);
  }
  starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
  const starMaterial = new THREE.PointsMaterial({ color: 0x94a3b8, size: 0.035, transparent: true, opacity: 0.65 });
  scene.add(new THREE.Points(starGeometry, starMaterial));

  const camera = new THREE.PerspectiveCamera(72, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
  camera.position.set(0, 0.85, 3.15);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
  renderer.shadowMap.enabled = false;

  // Lighting
  const light1 = new THREE.DirectionalLight(0xffffff, 1);
  light1.position.set(8, 10, 8);
  light1.castShadow = false;
  scene.add(light1);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);


  return { scene, camera, renderer };
}

export function render3DRelationship(canvas, relationship, colors, rintChain = null, stimulus = null) {
  const { scene, camera, renderer } = setupScene(canvas);

  const toThreeColor = (c) => {
    if (typeof c === 'number') return c;
    if (typeof c === 'string' && c.startsWith('#')) return parseInt(c.slice(1), 16);
    return 0xffffff;
  };

  let meshes = [];

  if (stimulus?.cubePosition) {
    const cubeGroup = new THREE.Group();
    scene.add(cubeGroup);

    cubeGroup.rotation.set(
      (Math.random() - 0.5) * 1.3,
      (Math.random() - 0.5) * 1.6,
      (Math.random() - 0.5) * 0.7
    );
    cubeGroup.userData.rotationSpeed = {
      x: 0.003 + Math.random() * 0.006,
      y: 0.004 + Math.random() * 0.007,
    };

    const gridMaterial = new THREE.LineBasicMaterial({ color: 0x9aa8ff, transparent: true, opacity: 0.22 });
    for (let i = -1.5; i <= 1.5; i += 1) {
      for (let j = -1.5; j <= 1.5; j += 1) {
        [[[-1.5, i, j], [1.5, i, j]], [[i, -1.5, j], [i, 1.5, j]], [[i, j, -1.5], [i, j, 1.5]]].forEach(([a, b]) => {
          const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...a), new THREE.Vector3(...b)]);
          cubeGroup.add(new THREE.Line(geometry, gridMaterial));
        });
      }
    }

    const shell = new THREE.Mesh(
      new THREE.BoxGeometry(3, 3, 3),
      new THREE.MeshBasicMaterial({ color: 0x6d7cff, transparent: true, opacity: 0.045, side: THREE.BackSide })
    );
    cubeGroup.add(shell);

    const p = stimulus.cubePosition;
    const axisConfigs = [
      { color: 0xff4d6d, points: [new THREE.Vector3(-1.5, p.y, p.z), new THREE.Vector3(1.5, p.y, p.z)] },
      { color: 0x35f2a9, points: [new THREE.Vector3(p.x, -1.5, p.z), new THREE.Vector3(p.x, 1.5, p.z)] },
      { color: 0x4da3ff, points: [new THREE.Vector3(p.x, p.y, -1.5), new THREE.Vector3(p.x, p.y, 1.5)] },
    ];

    axisConfigs.forEach(({ color, points }) => {
      const axis = new THREE.Mesh(
        new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 2, 0.022, 8, false),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 })
      );
      cubeGroup.add(axis);
    });
    const texture = createRelationPanelTexture(relationship, stimulus);
    const relPanel = new THREE.Mesh(
      new THREE.PlaneGeometry(2.65, 1.65),
      new THREE.MeshBasicMaterial({ map: texture, transparent: false, side: THREE.DoubleSide })
    );
    relPanel.position.set(p.x, p.y, p.z);
    relPanel.lookAt(camera.position);

    const glow = new THREE.Mesh(
      new THREE.BoxGeometry(2.18, 1.34, 0.08),
      new THREE.MeshBasicMaterial({ color: toThreeColor(colors[0]), transparent: true, opacity: 0.18 })
    );
    glow.position.copy(relPanel.position);
    cubeGroup.add(glow);
    cubeGroup.add(relPanel);
    meshes = [cubeGroup, relPanel];
  } else if (rintChain && rintChain.length > 0) {
    // RINT mode: show entity chain (A > B, B > C)
    const ENTITY_COLORS = {
      alpha: 0x22d3ee,  // cyan
      beta:  0xa78bfa,  // purple
      gamma: 0x34d399,  // emerald
    };
    
    const entities = ['alpha', 'beta', 'gamma'];
    const positions = [
      { x: -3.5, y: 0, z: 0 },
      { x: 0, y: 0, z: 0 },
      { x: 3.5, y: 0, z: 0 },
    ];

    entities.forEach((entity, idx) => {
      const mesh = createShape3D('sphere', 1.2, ENTITY_COLORS[entity]);
      mesh.position.set(positions[idx].x, positions[idx].y, positions[idx].z);
      scene.add(mesh);
      meshes.push(mesh);
    });

    // Draw relationship lines
    const lineGeometry = new THREE.BufferGeometry();
    lineGeometry.setFromPoints([
      new THREE.Vector3(-3.5, 0, 0),
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(3.5, 0, 0),
    ]);
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0x64748b, linewidth: 2 });
    const lines = new THREE.Line(lineGeometry, lineMaterial);
    scene.add(lines);
  } else {
    // Normal mode: use saved 3D attributes so preview/replay stays identical
    const shape1 = stimulus?.shape3DA || SHAPES_3D[0];
    const shape2 = stimulus?.shape3DB || SHAPES_3D[1];
    const size1 = stimulus?.size3DA || 2.5;
    const size2 = stimulus?.size3DB || 2.5;

    const mesh1 = createShape3D(shape1, size1, toThreeColor(colors[0]));
    const mesh2 = createShape3D(shape2, size2, toThreeColor(colors[1]));
    meshes = [mesh1, mesh2];
  }

  // Position based on relationship (only for normal 3D relationships)
  if (!stimulus?.cubePosition && (!rintChain || rintChain.length === 0)) {
    const mesh1 = meshes[0];
    const mesh2 = meshes[1];
    
    switch (relationship) {
      case 'DEPTH_LAYERED':
        mesh1.position.z = -2;
        mesh2.position.z = 2;
        break;
      case 'ORBITING':
        mesh1.position.set(0, 0, 0);
        mesh2.position.set(3, 0, 0);
        break;
      case 'ROTATING_PAIR':
        mesh1.position.set(-2, 0, 0);
        mesh2.position.set(2, 0, 0);
        break;
      case 'NESTED_VOLUME':
        mesh1.position.set(0, 0, 0);
        mesh2.position.set(0, 0, 0);
        mesh2.scale.set(0.5, 0.5, 0.5);
        break;
      case 'ASCENDING_SPIRAL':
        mesh1.position.set(0, -2, 0);
        mesh2.position.set(2, 2, 0);
        break;
      case 'COLLIDING':
        mesh1.position.set(-1.5, 0, 0);
        mesh2.position.set(1.5, 0, 0);
        break;
      case 'REPELLING':
        mesh1.position.set(-3, 0, 0);
        mesh2.position.set(3, 0, 0);
        break;
      case 'BOUND_BY_GRAVITY':
        mesh1.position.set(0, 0, 0);
        mesh2.position.set(0, -3, 0);
        break;
      case 'INTERSECTING_PLANES':
        mesh1.position.set(-1, 0, 0);
        mesh2.position.set(1, 0, 0);
        mesh2.rotation.z = Math.PI / 4;
        break;
      case 'IN_FRONT_OF':
        mesh1.position.z = 2;
        mesh2.position.z = -1;
        break;
      case 'BEHIND':
        mesh1.position.z = -2;
        mesh2.position.z = 1;
        break;
      case 'STACKED_3D':
        mesh1.position.set(0, 0.8, 0);
        mesh2.position.set(0, -0.8, 0);
        break;
      case 'LEANING_AGAINST':
        mesh1.position.set(-1.5, 0, 0);
        mesh1.rotation.z = 0.3;
        mesh2.position.set(1.5, 0, 0);
        break;
      case 'FLOATING_ABOVE':
        mesh1.position.set(0, 2, 0);
        mesh2.position.set(0, -1, 0);
        break;
      case 'CASTING_SHADOW':
        mesh1.position.set(-1, 1.5, 1);
        mesh2.position.set(-1, -1.5, -2);
        break;
    }
    
    scene.add(mesh1);
    scene.add(mesh2);
  }

  // Animation loop: capped to reduce GPU load during fast multi-stream sessions
  let animationId;
  let frameCount = 0;
  const maxFrames = 90;
  const animate = () => {
    if (frameCount >= maxFrames) {
      renderer.render(scene, camera);
      return;
    }
    frameCount += 1;
    animationId = requestAnimationFrame(animate);

    meshes.forEach((mesh, index) => {
      if (stimulus?.cubePosition && index === 1) return;
      const speed = mesh.userData?.rotationSpeed;
      mesh.rotation.x += speed?.x || 0.003;
      mesh.rotation.y += speed?.y || 0.005;
    });

    if (stimulus?.cubePosition && meshes[1]) {
      meshes[1].lookAt(camera.position);
    }

    if (!stimulus?.cubePosition && (!rintChain || rintChain.length === 0)) {
      const mesh1 = meshes[0];
      const mesh2 = meshes[1];
      
      if (relationship === 'ORBITING') {
        const angle = performance.now() * 0.0005;
        mesh2.position.x = Math.cos(angle) * 4;
        mesh2.position.z = Math.sin(angle) * 3;
      } else if (relationship === 'ROTATING_PAIR') {
        const angle = performance.now() * 0.0005;
        mesh1.position.x = Math.cos(angle) * 2.5;
        mesh2.position.x = -Math.cos(angle) * 2.5;
      }
    }

    renderer.render(scene, camera);
  };

  animate();

  // Cleanup function
  return () => {
    cancelAnimationFrame(animationId);
    scene.traverse((object) => {
      if (object.geometry) object.geometry.dispose();
      if (object.material) {
        if (Array.isArray(object.material)) object.material.forEach(material => material.dispose());
        else object.material.dispose();
      }
    });
    renderer.dispose();
  };
}