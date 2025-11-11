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
  console.log('Scene Graph:');
  model.traverse((child) => {
    if (child.isSkinnedMesh || child.isMesh) {
      child.visible = true;
      child.material.side = THREE.DoubleSide;
      child.material.needsUpdate = true;
    }
    if (child.name.toLowerCase().includes('cylinder')) {
      console.log('Found body:', child.name, child.position, child.scale);
    }
  });
  model.rotation.set(0, 0, 0);
  scene.add(model);
  model.traverse((child) => {
    if (child.isMesh) {
      child.material.side = THREE.FrontSide;
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  model.position.set(0, 0, 0);
  model.scale.set(1, 1, 1);
  scene.add(new THREE.AmbientLight(0xffffff, 0.8));
  console.log('Animations:', gltf.animations.map(a => a.name));
  console.log('Scene contents:', model);
  const armature = model.getObjectByName('Armature.001') || model;
  if (gltf.animations.length) {
    mixer = new THREE.AnimationMixer(armature);
    const clip = gltf.animations[1] || gltf.animations[0];
    const action = mixer.clipAction(clip);
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
