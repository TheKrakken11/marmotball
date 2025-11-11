import * as THREE from 'https://unpkg.com/three@0.168.0/build/three.module.js';
import { GLTFLoader } from './GLTFLoader.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x202020);
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(2, 1.5, 3);
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
  scene.add(model);

  // Make sure all meshes are visible both sides (if normals flipped)
  model.traverse((child) => {
    if (child.isMesh) {
      child.material.side = THREE.DoubleSide;
      child.material.needsUpdate = true;
    }
  });
  const debugMat = new THREE.MeshStandardMaterial({ color: 0xff5533, side: THREE.DoubleSide });
  model.traverse((child) => {
    if (child.isMesh) {
      child.material = debugMat;
    }
  });
  // Try all animations, sometimes the second one is the swing
  if (gltf.animations.length) {
    mixer = new THREE.AnimationMixer(gltf.scene);
    const action = mixer.clipAction(gltf.animations[1] || gltf.animations[0]);
    action.play();
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
