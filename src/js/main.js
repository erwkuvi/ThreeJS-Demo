import * as THREE from 'three';
import './noise.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import CustomShaderMaterial from 'three-custom-shader-material/vanilla'; // Allows to use MeshPhysicalMaterial as base
import { CCDIKSolver } from 'three/addons/animation/CCDIKSolver.js';

let scene, camera, renderer, cube, controls, model;

const vshader = `

void main(){
    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`;

const fshader = `
    void main(){
        gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
    }
`;

scene = new THREE.Scene();
//scene.background = new THREE.Color(0xffffff); // deactivated background for transparency settings at renderer
camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0,0,5);

renderer = new THREE.WebGLRenderer({
    alpha: true,// transparency
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

loader.load(
    '../assets/prothese-rigging2.glb',
    //"https://threejs.org/examples/models/gltf/RobotExpressive/RobotExpressive.glb",
    function (gltf) {
        const model = gltf.scene;
        scene.add(model);
        //console.log(model);
        let skinnedMesh;
        model.traverse((obj) => {
            if (obj.isSkinnedMesh) skinnedMesh = obj;
        });
        console.log(skinnedMesh);
        // store original materials
        model.traverse((child) =>{
            if (child.isMesh){
                child.userData.originalMaterial = child.material.clone();
            }
        });

        const bones = skinnedMesh.skeleton.bones;
        console.log("Bones indices: ", bones.map((b, i) => ({ i, name: b.name })));
    },
    function ( xhr ) {
        console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
    },
  // called when loading has errors
    function ( error ) {
        console.log( 'An error happened' );
    }
);

let ikSolver;
//// if the model has animations, you can set up the IK solver like this
//let bones = []
//// "root"
//let rootBone = new Bone();
//rootBone.name = "RootBone";


const uniforms = {
    u_color_a: { value: new THREE.Color(0xff0000) },
    u_color_b: { value: new THREE.Color(0xffff00) },
    u_resolution : { value: new THREE.Vector2() },
    u_LightColor : { value: new THREE.Color(0xbb905d) },
    u_DarkColor : { value: new THREE.Color(0x7d490b) },
    u_Frequency : { value: 2.0 },
    u_NoiseScale : { value: 6.0 },
    u_RingScale : { value: 0.2 },
    u_Contrast : { value: 4.0 },
};
//Materials
const material_03 = new THREE.MeshStandardMaterial({
    wireframe: true,
    wireframeLinewidth: 0.5,
    color: 0x000000,
    metalness: 0.0,
    roughness: 1.0,
    // side: THREE.DoubleSide
});

const material_00 = new CustomShaderMaterial({
    baseMaterial: THREE.MeshPhysicalMaterial,
    color: new THREE.Color(0x7d490b),
    // metalness: 0.6,
    roughness: 0.4,
    uniforms : {
        u_resolution : { value: new THREE.Vector2() },
        u_LightColor : { value: new THREE.Color(0xbb905d) },
        u_DarkColor : { value: new THREE.Color(0x7d490b) },
        u_Frequency : { value: 2.0 },
        u_NoiseScale : { value: 6.0 },
        u_RingScale : { value: 0.2 },
        u_Contrast : { value: 4.0 },
    },
    fragmentShader: document.getElementById('fragmentshader').textContent,
    vertexShader: document.getElementById('vertexshader').textContent
});

const material_01 = new THREE.MeshStandardMaterial({ color: 0xffffff });

material_01.onBeforeCompile = (shader) => {
    // Add uniforms
    shader.uniforms.u_LightColor = { value: new THREE.Color(0.73, 0.56, 0.36) };
    shader.uniforms.u_DarkColor = { value: new THREE.Color(0.49, 0.28, 0.04) };
    shader.uniforms.u_Frequency = { value: 2.0 };
    shader.uniforms.u_NoiseScale = { value: 6.0 };
    shader.uniforms.u_RingScale = { value: 0.2 };
    shader.uniforms.u_Contrast = { value: 4.0 };

    // Inject noise include
    shader.fragmentShader = shader.fragmentShader.replace(
        '#include <common>',
        `
    #include <common>
    #include <noise>
    uniform vec3 u_LightColor;
    uniform vec3 u_DarkColor;
    uniform float u_Frequency;
    uniform float u_NoiseScale;
    uniform float u_RingScale;
    uniform float u_Contrast;
    `
    );

    // Insert noise logic inside main()
    shader.fragmentShader = shader.fragmentShader.replace(
        '#include <dithering_fragment>',
        `
    // --- custom noise logic ---
    float n = snoise(vViewPosition * u_Frequency);
    float ring = fract(u_NoiseScale * n);
    ring *= u_Contrast * (1.0 - ring);
    float lerpValue = pow(ring, u_RingScale) + n;
    vec3 noiseColor = mix(u_DarkColor, u_LightColor, lerpValue);

    //csm_DiffuseColor = vec4(noiseColor, 1.0);
    //diffuseColor.rgb = mix(diffuseColor.rgb, noiseColor, 0.9);
    gl_FragColor = vec4(noiseColor.rgb, 1.0);

    #include <dithering_fragment>
    `
    );

    material_01.userData.shader = shader;
};

const material_02 = new THREE.MeshPhongMaterial( { color: 0xff0000, side: THREE.DoubleSide} );
//const material_03 = new THREE.MeshPhongMaterial( { color: 0x0000ff, side: THREE.DoubleSide} );

//Button Events
document.getElementById('mat1').onclick = () => applyMaterialToMeshByName(names, material_00);
document.getElementById('mat2').onclick = () => applyMaterialToMeshByName(names, material_03);
// document.getElementById('mat2').onclick = () => applyMaterial(material_03);
document.getElementById('mat3').onclick = () => restoreOriginalMaterials();

//function to reset original materials
function restoreOriginalMaterials(){
    if(!model) return;
    model.traverse((child) =>{
        if (child.isMesh && child.userData.originalMaterial){
            child.material = child.userData.originalMaterial;
        }
    })
}
const names = ['ShinBoneProtectionPiece', 'QuadProtectionPiece'];
//Apply material function
function applyMaterial(material){
    if (!model) return;

    model.traverse((child) => {
        if (child.isMesh) child.material = material;
    })
}
function applyMaterialToMeshByName(meshNames, material) {
    if (!model) return;
    const namesSet = new Set(meshNames);
    model.traverse((child) => {
        if (child.isMesh && namesSet.has(child.name)){
          child.material = material;
        }
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

controls.target.set(0, 2.5, 0);
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