import * as THREE from 'https://unpkg.com/three@0.168.0/build/three.module.js';
import { GLTFLoader } from './GLTFLoader.js';
import { RoomEnvironment } from 'https://unpkg.com/three@0.168.0/examples/jsm/environments/RoomEnvironment.js?module';

// ----------------------
// Scene + Renderer
// ----------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb)

const geometry = new THREE.PlaneGeometry(2000, 2000);
const material = new THREE.MeshStandardMaterial({
  color: 0x06402b,
  roughness: 1.0,
  metalness: 0.0,
});
const ground = new THREE.Mesh(geometry, material);
ground.rotation.x = -Math.PI / 2;
ground.position.set(0, 0, 0);
scene.add(ground);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
document.body.appendChild(renderer.domElement);

// Environment (soft IBL lighting)
const pmremGenerator = new THREE.PMREMGenerator(renderer);
scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 1.0).texture;

// ----------------------
// Camera
// ----------------------
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 3, 10);
camera.lookAt(0, 1, 0);

// ----------------------
// Lighting
// ----------------------
const dirLight = new THREE.DirectionalLight(0xffffff, 2.0);
dirLight.position.set(5, 10, 7.5);
scene.add(dirLight);

const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.0);
hemiLight.position.set(0, 20, 0);
scene.add(hemiLight);

// ----------------------
// Load Model
// ----------------------
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const loader = new GLTFLoader();
let mixer;
let model;
let action;
let batTipSphere;
const lastPointer = new THREE.Vector2();
let lastTime = performance.now();
let isInteracting = false;
let pointerActive = false;
let batBone;
let batRotation = 0;          // accumulated rotation
let lastPointerY = 0;         // previous pointer Y for delta calculation
let batRotationSpeed = 1.2;   // sensitivity
let ball;


loader.load(
  'baseball_batter.glb',
  (gltf) => {
    model = gltf.scene;
    scene.add(model);

    // Normalize scale and transforms
    model.scale.set(1, 1, 1);
    model.position.set(0, 0, 0);
    model.updateMatrixWorld(true);

    // Optional: disable frustum culling for skinned meshes
    model.traverse((child) => {
      if (child.isSkinnedMesh) child.frustumCulled = false;
    });

    // Center camera on model
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    camera.lookAt(center);

    // Animation setup (same as glTF viewer)
    if (gltf.animations && gltf.animations.length > 0) {
      mixer = new THREE.AnimationMixer(model);
      gltf.animations.forEach((clip) => mixer.clipAction(clip).play());
    }

    // Debug helper (optional)
    const helper = new THREE.SkeletonHelper(model);
    helper.visible = false; // set to true if needed
    scene.add(helper);

    batBone = model.getObjectByName('bat');
    const batLength = 0.95;
    const sphereGeo = new THREE.SphereGeometry(0.125, 16, 16);
    const sphereMat = new THREE.MeshStandardMaterial({
      color: 0x0000ff,
      transparent: true,
      opacity: 0.0,
      emissive: 0x0000ff,
      emissiveIntensity: 0.3,
    });
    batTipSphere = new THREE.Mesh(sphereGeo, sphereMat);
    batBone.add(batTipSphere);
    batTipSphere.position.set(0, batLength, 0);

    action = mixer.clipAction(gltf.animations[0]);
    action.loop = THREE.LoopOnce;        // ← stop looping
    action.clampWhenFinished = true;     // ← hold the last frame
  },
  undefined,
  (error) => {
    console.error('Error loading baseball_batter.glb:', error);
  }
);

// ----------------------
// Other Code
// ----------------------
function onTouchMove(event) {
  event.preventDefault();
  pointer.x = (event.touches[0].clientX / window.innerWidth) * 2 - 1;
  pointer.y = - (event.touches[0].clientY / window.innerHeight) * 2 + 1;
}
function onPointerMove(event) {
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = - (event.clientY / window.innerHeight) * 2 + 1;
}
function getPointerSpeed() {
  const now = performance.now();
  const deltaTime = (now - lastTime) / 1000;
  const distance = pointer.x - lastPointer.x;
  const speed = distance / deltaTime;
  lastPointer.copy(pointer);
  lastTime = now;
  return speed;
}
function spawnBaseball(scene, position = new THREE.Vector3(0, 1, -5)) {
    const radius = 0.0365; // 1 unit = 1 meter
    const segments = 16;   // smooth enough for a small sphere
    const geometry = new THREE.SphereGeometry(radius, segments, segments);

    const material = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.5,
        metalness: 0.1
    });

    const baseball = new THREE.Mesh(geometry, material);
    baseball.position.copy(position);

    // Optional: give a custom property to track velocity
    baseball.userData.velocity = new THREE.Vector3(-0.05, 0, 0); 

    scene.add(baseball);
    return baseball;
}
function disposeBaseball(baseball) {
    if (!baseball) return null;

    // Remove from scene
    if (baseball.parent) baseball.parent.remove(baseball);

    // Dispose geometry
    baseball.geometry?.dispose();

    // Dispose material(s)
    if (Array.isArray(baseball.material)) {
        baseball.material.forEach(mat => mat.dispose());
    } else {
        baseball.material?.dispose();
    }

    // Clear userData
    baseball.userData = {};

    return null;
}
// ----------------------
// Animation Loop
// ----------------------
const clock = new THREE.Clock();
let mouseenter;
function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  if (mixer) mixer.update(delta);
  // Interaction based ONLY on touch/mouse down
  if (isInteracting) {
    if (mixer) {
      const speed = getPointerSpeed();
      mixer.timeScale = THREE.MathUtils.lerp(mixer.timeScale, speed * 2, 0.2);
    }
  } else {
    // Reset animation when finger/mouse released
    if (action) {
      action.reset();
    }
    if (mixer) mixer.update(0);
  }
  // ----- Bat pointer offset (non-accumulating) -----
  if (batBone && isInteracting) {
    const dy = pointer.y - lastPointerY;  // change in pointer Y
    lastPointerY = pointer.y;

    const batOffset = dy * 0.4;          // adjust sensitivity
    const animatedX = batBone.rotation.x; // current animation rotation

    batBone.rotation.x = animatedX + batOffset;
  }
  if (ball) ball.position.add(ball.userData.velocity.clone());
  renderer.render(scene, camera);
}
animate();

// ----------------------
// Resize Handling
// ----------------------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// MOUSE
window.addEventListener('mousedown', (e) => {
  isInteracting = true;
  lastPointerY = pointer.y;
  ball = spawnBaseball(scene, new THREE.Vector3(2, 1, 0));
  if (action) action.reset().play();
});

window.addEventListener('mouseup', () => {
  pointerActive = false;
  isInteracting = false;
  batRotation = 0;
  if (batBone) batBone.rotation.x = 0;
  disposeBaseball(ball);
  if (action) {
    action.reset();
    mixer.update(0);
  }
});

// TOUCH
window.addEventListener('touchstart', (e) => {
  e.preventDefault();
  isInteracting = true;
  onTouchMove(e);
  lastPointerY = pointer.y;
  ball = spawnBaseball(scene, new THREE.Vector3(2, 1, 0));
  if (action) action.reset().play();
});

window.addEventListener('touchend', (e) => {
  e.preventDefault();
  pointerActive = false;
  isInteracting = false;
  batRotation = 0;
  if (batBone) batBone.rotation.x = 0;
  disposeBaseball(ball);
  if (action) {
    action.reset();
    mixer.update(0);
  }
});
window.addEventListener('mousemove', onPointerMove, { passive: false });
window.addEventListener('touchmove', onTouchMove);
