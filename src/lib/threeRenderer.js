import * as THREE from 'three';

// 3D shapes using Three.js
const SHAPES_3D = ['cube', 'sphere', 'pyramid', 'cone', 'torus', 'octahedron'];

function createShape3D(shapeType, size, color) {
  let geometry;
  switch (shapeType) {
    case 'cube':
      geometry = new THREE.BoxGeometry(size, size, size);
      break;
    case 'sphere':
      geometry = new THREE.SphereGeometry(size / 2, 32, 32);
      break;
    case 'pyramid':
      geometry = new THREE.TetrahedronGeometry(size);
      break;
    case 'cone':
      geometry = new THREE.ConeGeometry(size / 2, size, 32);
      break;
    case 'torus':
      geometry = new THREE.TorusGeometry(size / 2, size / 4, 16, 100);
      break;
    case 'octahedron':
      geometry = new THREE.OctahedronGeometry(size);
      break;
    default:
      geometry = new THREE.BoxGeometry(size, size, size);
  }
  const material = new THREE.MeshStandardMaterial({ color, metalness: 0.3, roughness: 0.4 });
  return new THREE.Mesh(geometry, material);
}

function setupScene(canvas) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0f172a);

  const camera = new THREE.PerspectiveCamera(75, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
  camera.position.z = 10;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(canvas.clientWidth, canvas.clientHeight);
  renderer.shadowMap.enabled = true;

  // Lighting
  const light1 = new THREE.DirectionalLight(0xffffff, 0.8);
  light1.position.set(10, 10, 10);
  light1.castShadow = true;
  light1.shadow.mapSize.width = 2048;
  light1.shadow.mapSize.height = 2048;
  scene.add(light1);

  const light2 = new THREE.PointLight(0x22d3ee, 0.5);
  light2.position.set(-10, -10, 10);
  scene.add(light2);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
  scene.add(ambientLight);

  return { scene, camera, renderer };
}

export function render3DRelationship(canvas, relationship, colors) {
  const { scene, camera, renderer } = setupScene(canvas);

  // Random 3D shapes
  const shape1 = SHAPES_3D[Math.floor(Math.random() * SHAPES_3D.length)];
  const shape2 = SHAPES_3D[Math.floor(Math.random() * SHAPES_3D.length)];
  const size1 = 2 + Math.random() * 1.5;
  const size2 = 2 + Math.random() * 1.5;

  // Convert color numbers to hex strings
  const color1 = typeof colors[0] === 'number' ? '#' + colors[0].toString(16).padStart(6, '0') : colors[0];
  const color2 = typeof colors[1] === 'number' ? '#' + colors[1].toString(16).padStart(6, '0') : colors[1];

  const mesh1 = createShape3D(shape1, size1, color1);
  const mesh2 = createShape3D(shape2, size2, color2);

  // Position based on relationship
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
  }

  scene.add(mesh1);
  scene.add(mesh2);

  // Animation loop
  let animationId;
  const animate = () => {
    animationId = requestAnimationFrame(animate);

    mesh1.rotation.x += 0.003;
    mesh1.rotation.y += 0.005;

    mesh2.rotation.x -= 0.002;
    mesh2.rotation.y += 0.007;

    if (relationship === 'ORBITING') {
      const angle = Date.now() * 0.0005;
      mesh2.position.x = Math.cos(angle) * 4;
      mesh2.position.z = Math.sin(angle) * 3;
    } else if (relationship === 'ROTATING_PAIR') {
      const angle = Date.now() * 0.0005;
      mesh1.position.x = Math.cos(angle) * 2.5;
      mesh2.position.x = -Math.cos(angle) * 2.5;
    }

    renderer.render(scene, camera);
  };

  animate();

  // Cleanup function
  return () => {
    cancelAnimationFrame(animationId);
    renderer.dispose();
  };
}