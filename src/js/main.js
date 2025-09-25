import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let scene, camera, renderer, cube, controls, model;

scene = new THREE.Scene();
camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0,0,5);

renderer = new THREE.WebGLRenderer({
    canvas: document.getElementById('three-canvas'),
    antialias: true }
);
renderer.setSize(window.innerWidth, window.innerHeight);

//Controls
controls = new OrbitControls( camera, renderer.domElement );
controls.update();

//Light
//const light = new THREE.DirectionalLight(0xffffff, 1.2);
const light = new THREE.DirectionalLight( 0x444444, 1);
const light2 = new THREE.HemisphereLight(0xffffff, 0x444444, 2);
light.position.set(0,0,1);
light2.position.set(0,0,-1);
scene.add(light, light2);

//Load Model
const loader = new GLTFLoader();

//const dracoLoader = new THREE.DRACOLoader();
//dracoLoader.setDecoderPath( '../assets/leg_prosthesis-gltf' );
//loader.setDRACOLoader( dracoLoader );

loader.load('../assets/leg.glb',
    function (gltf) {
        model = gltf.scene;
        scene.add(model);
        console.log(model);
    },
    function ( xhr ) {
        console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
    },
    // called when loading has errors
    function ( error ) {
        console.log( 'An error happened' );
    }
);

//Materials
const material_01 = new THREE.MeshPhongMaterial( { color: 0x00ff00, side: THREE.DoubleSide} );
const material_02 = new THREE.MeshPhongMaterial( { color: 0xff0000, side: THREE.DoubleSide} );
const material_03 = new THREE.MeshPhongMaterial( { color: 0x0000ff, side: THREE.DoubleSide} );

//Cube creation
//const geometry = new THREE.BoxGeometry( 2, 2, 2 );
// const material = new THREE.MeshBasicMaterial( { color: 0x0000ff } );
//const texture = new THREE.TextureLoader().load('../textures/dirty_crate_texture.jpg');
//const material = new THREE.MeshBasicMaterial( { map: texture } );
//model = new THREE.Mesh( geometry, material_01 );
//scene.add(model);
//console.log(model);

//Button Events
document.getElementById('mat1').onclick = () => applyMaterial(material_01);
document.getElementById('mat2').onclick = () => applyMaterial(material_02);
document.getElementById('mat3').onclick = () => applyMaterial(material_03);

//Apply material function
function applyMaterial(material){
    if (!model) return;
    model.traverse((child) => {
        if (child.isMesh) child.material = material;
    })
}

//Resize
function onWindowResize()
{
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener('resize', onWindowResize);

//Animation loop
function animate()
{
    requestAnimationFrame(animate);
    controls.update();
//    cube.rotation.x += 0.001;
//    cube.rotation.y += 0.001;
    renderer.render(scene, camera);
}
animate();

//Plane creation
//const planeGeometry = new THREE.PlaneGeometry(2,2);
//const planeMaterial = new THREE.MeshPhongMaterial( {
//    color: 0x0000ff,
//    side: THREE.DoubleSide,
//},);
//const planeMesh = new THREE.Mesh(planeGeometry, planeMaterial);