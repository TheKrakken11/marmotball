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
camera.position.set(0, 3, 6);
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
let batTipSphere;
const lastPointer = new THREE.Vector2();
let lastTime = performance.now();

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

    const batBone = model.getObjectByName('bat');
    const batLength = 0.95;
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
    batTipSphere.position.set(0, batLength, 0);
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
  pointer.x = (event.touches[0].clientX / window.innerWidth) * 2 - 1;
  pointer.y = - (event.touches[0].clientY / window.innerHeight) * 2 + 1;
}
function onPointerMove(event) {
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = (event.clientY / window.innerHeight) * 2 + 1;
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
// ----------------------
// Animation Loop
// ----------------------
let action
const clock = new THREE.Clock();
let mouseenter;
function animate() {
  requestAnimationFrame(animate);
  if (model && !action) action = mixer.clipAction(model.animations[0]);
  const delta = clock.getDelta();
  if (pointer.x >= -0.25 && pointer.x <= 0.25) {
    if (!mouseenter) {
      if (action) action.play();
      mouseenter = true;
    }
    if (mixer) {
      mixer.timeScale = THREE.MathUtils.lerp(mixer.timeScale, getPointerSpeed() * 2, 0.2);
      mixer.update(delta);
    }
  } else {
    if (action) action.reset();
    mouseenter = false;
  }
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

window.addEventListener('mousemove', onPointerMove);
window.addEventListener('touchmove', onTouchMove);
