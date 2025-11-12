import * as THREE from 'https://unpkg.com/three@0.168.0/build/three.module.js';
import { GLTFLoader } from './GLTFLoader.js';

// ----------------------
// Scene Setup
// ----------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(4, 3, 6);
camera.lookAt(0, 1, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Lights
const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.0);
scene.add(hemiLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
dirLight.position.set(3, 10, 10);
scene.add(dirLight);

scene.add(new THREE.AmbientLight(0xffffff, 0.8));

// ----------------------
// Load glTF Model
// ----------------------
const loader = new GLTFLoader();
let mixer;
let model;

loader.load(
  'baseball_batter.glb',
  (gltf) => {
    model = gltf.scene;
    scene.add(model);

    // Traverse meshes
    model.traverse((child) => {
      if (child.isSkinnedMesh) {
        child.material.skinning = true; // REQUIRED
        child.material.side = THREE.DoubleSide;
        child.castShadow = true;
        child.receiveShadow = true;
      } else if (child.isMesh) {
        child.material.side = THREE.DoubleSide;
      }
    });

    // Animation
    if (gltf.animations.length) {
      // Use the armature if it exists
      const armature = model.getObjectByName('Armature001') || model;
      mixer = new THREE.AnimationMixer(armature);
      const action = mixer.clipAction(gltf.animations[0]);
      action.play();
    }

    // Skeleton helper for debugging
    const helper = new THREE.SkeletonHelper(model);
    scene.add(helper);
  },
  undefined,
  (error) => {
    console.error('Error loading glTF model:', error);
  }
);

// ----------------------
// Animation Loop
// ----------------------
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  if (mixer) mixer.update(delta);

  renderer.render(scene, camera);
}

animate();

// ----------------------
// Handle Window Resize
// ----------------------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
