import * as THREE from 'https://unpkg.com/three@0.168.0/build/three.module.js';
import { GLTFLoader } from './GLTFLoader.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(4, 3, 6);
camera.lookAt(0, 1, 0);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.0));
const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(3, 10, 10);
scene.add(dirLight);

const loader = new GLTFLoader();

let mixer;
let model;

loader.load('baseball_batter.glb', (gltf) => {
  model = gltf.scene;

  // Add model to scene
  scene.add(model);

  // Ensure all meshes are visible and double-sided
  model.traverse((child) => {
    if (child.isMesh || child.isSkinnedMesh) {
      child.visible = true;
      child.material.side = THREE.DoubleSide;
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  model.traverse((child) => {
    if (child.isSkinnedMesh) {
      child.material = new THREE.MeshBasicMaterial({ color: 0xff5533, skinning: true });
    }
  });

  // Set up animation mixer for the top-level model
  if (gltf.animations.length) {
    mixer = new THREE.AnimationMixer(model);
    const clip = gltf.animations[0]; // your swing animation
    mixer.clipAction(clip).play();
  }
});


const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  if (mixer) mixer.update(delta);
  renderer.render(scene, camera);
}

animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
