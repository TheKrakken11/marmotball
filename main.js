import * as THREE from 'https://unpkg.com/three@0.168.0/build/three.module.js';
import { GLTFLoader } from './GLTFLoader.js';
import { RoomEnvironment } from 'https://unpkg.com/three@0.168.0/examples/jsm/environments/RoomEnvironment.js?module';

// ----------------------
// Scene + Renderer
// ----------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

const geometry = new THREE.PlaneGeometry(2000, 2000);
const material = new THREE.MeshStandardMaterial({
  color: 0x06402b,
  roughness: 1.0,
  metalness: 0.0,
});
const ground = new THREE.Mesh(geometry, material);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
document.body.appendChild(renderer.domElement);

// Environment
const pmremGenerator = new THREE.PMREMGenerator(renderer);
scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 1.0).texture;

// ----------------------
// Camera
// ----------------------
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 3, 6);
camera.lookAt(0, 1, 0);

// ----------------------
// Lighting
// ----------------------
scene.add(new THREE.DirectionalLight(0xffffff, 2.0).position.set(5, 10, 7.5));
scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.0).position.set(0, 20, 0));

// ----------------------
// Load Model
// ----------------------
const loader = new GLTFLoader();

let mixer, model, action, batBone, batTipSphere;
let isInteracting = false;

let pointer = new THREE.Vector2();
let pointerDeltaY = 0;
let lastPointerYEvent = 0;

let lastPointer = new THREE.Vector2();
let lastTime = performance.now();

// ---------------
// Load GLB
// ---------------
loader.load("baseball_batter.glb", (gltf) => {
  model = gltf.scene;
  scene.add(model);

  model.traverse(c => {
    if (c.isSkinnedMesh) c.frustumCulled = false;
  });

  // Filter animation so it does NOT touch bat bone
  gltf.animations.forEach((clip) => {
    clip.tracks = clip.tracks.filter(
      (track) => !track.name.toLowerCase().includes("bat")
    );
  });

  // Start animation
  mixer = new THREE.AnimationMixer(model);
  gltf.animations.forEach((clip) => mixer.clipAction(clip).play());

  // Skeleton helper (optional)
  const helper = new THREE.SkeletonHelper(model);
  helper.visible = false;
  scene.add(helper);

  // FIND THE BAT BONE
  batBone = model.getObjectByName("bat");

  // Add small sphere at the end of the bat
  const sphereGeo = new THREE.SphereGeometry(0.125, 16, 16);
  const sphereMat = new THREE.MeshStandardMaterial({
    color: 0x0000ff,
    transparent: true,
    opacity: 0.4,
    emissive: 0x0000ff,
    emissiveIntensity: 0.3,
  });

  batTipSphere = new THREE.Mesh(sphereGeo, sphereMat);
  batBone.add(batTipSphere);
  batTipSphere.position.set(0, 0.95, 0);

  action = mixer.clipAction(gltf.animations[0]);
  action.loop = THREE.LoopOnce;
  action.clampWhenFinished = true;
});

// ----------------------
// Pointer Events
// ----------------------
function onPointerMove(e) {
  const yNorm = -(e.clientY / window.innerHeight) * 2 + 1;
  pointerDeltaY = yNorm - lastPointerYEvent;
  lastPointerYEvent = yNorm;

  pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
  pointer.y = yNorm;
}

function onTouchMove(e) {
  e.preventDefault();
  const t = e.touches[0];
  const yNorm = -(t.clientY / window.innerHeight) * 2 + 1;
  pointerDeltaY = yNorm - lastPointerYEvent;
  lastPointerYEvent = yNorm;

  pointer.x = (t.clientX / window.innerWidth) * 2 - 1;
  pointer.y = yNorm;
}

function rotateBatWorld(bone, delta) {
  const axis = new THREE.Vector3(1, 0, 0); // world-X axis
  const q = new THREE.Quaternion().setFromAxisAngle(axis, delta);
  bone.quaternion.premultiply(q);
}

// ----------------------
// Pointer Speed (horizontal animation speed)
// ----------------------
function getPointerSpeed() {
  const now = performance.now();
  const deltaTime = (now - lastTime) / 1000;
  const distance = pointer.x - lastPointer.x;
  const speed = distance / deltaTime;
  lastPointer.copy(pointer);
  lastTime = now;
  return speed;
}

// ----------------------
// Animation Loop
// ----------------------
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();

  if (mixer) mixer.update(delta);

  if (isInteracting && mixer) {
    const speed = getPointerSpeed();
    mixer.timeScale = THREE.MathUtils.lerp(mixer.timeScale, speed * 2, 0.2);
  }

  // Apply bat rotation AFTER mixer to override animation
  if (batBone && isInteracting) {
    rotateBatWorld(batBone, pointerDeltaY * 1.2);
  }

  renderer.render(scene, camera);
}
animate();

// ----------------------
// Window Events
// ----------------------
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// MOUSE
window.addEventListener("mousedown", (e) => {
  isInteracting = true;
  onPointerMove(e);
  pointerDeltaY = 0;
});
window.addEventListener("mousemove", onPointerMove);
window.addEventListener("mouseup", () => {
  isInteracting = false;
});

// TOUCH
window.addEventListener("touchstart", (e) => {
  isInteracting = true;
  onTouchMove(e);
  pointerDeltaY = 0;
});
window.addEventListener("touchmove", onTouchMove, { passive: false });
window.addEventListener("touchend", () => {
  isInteracting = false;
});
