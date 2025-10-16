import * as THREE from 'three';
import './noise.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import CustomShaderMaterial from 'three-custom-shader-material/vanilla'; // Allows to use MeshPhysicalMaterial as base
import { CCDIKSolver } from 'three/addons/animation/CCDIKSolver.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import {TransformControls} from "three/addons";


let scene, camera, renderer, controls, model;
let skinnedMeshes = [];
let IKSolver;

//Shaders
const vshader = `

void main(){
    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`;
const fshader = `
    void main(){
        gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
    }
`;

//Scene
scene = new THREE.Scene();
//scene.fog = new THREE.FogExp2( 0xffffff, .11 );

//Camera
camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(4,2,0);

//Renderer
renderer = new THREE.WebGLRenderer({
    alpha: true,// transparency
    canvas: document.getElementById('three-canvas'),
    antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);

//Light
const light = new THREE.DirectionalLight( 0x444444, 1);
const light2 = new THREE.HemisphereLight(0xffffff, 0x444444, 2);
light.position.set(0,0,1);
light2.position.set(0,0,-1);
scene.add(light, light2);

//Load Model
const loader = new GLTFLoader();
const gltf = await loader.loadAsync('../assets/prothese-rigging4.glb');
model = gltf.scene;
console.log(model); // Model is a Group
model.traverse((obj) =>
    {
        if (obj.isSkinnedMesh){
            skinnedMeshes[obj.name] = obj;
            console.log(obj.type, obj.name);
        }
    }); // Store skinned meshes by name
scene.add(model);
// console.log(skinnedMeshes.foot.type, skinnedMeshes.FootPiece.name, targetPosition);
if (!skinnedMeshes.QuadPiece) {
    console.error("No SkinnedMesh found in loaded model!");
} else {
    const bones = skinnedMeshes.QuadPiece.skeleton.bones; // Use the first one, or iterate if needed
    bones.forEach((b, i) => console.log(i, b.name));
}
const targetPosition = skinnedMeshes.FootPiece.skeleton.bones[3].getWorldPosition(new THREE.Vector3());

// skinnedMeshes.foot.add(skinnedMeshes.foot.skeleton.bones[0]); // add root bone to skinned mesh to make it work

// Bones hierarchy:
//
//   bonequad (0)
//     ├── boneshin (1)  <- effector
//     └── bonetarget (3) <- target
//IK Setup
const iks = [
    {
        target: 3, // "target"
        effector: 2,
        links:
            [
                {
                    index: 1,
                    rotationMin: new THREE.Vector3(-Math.PI / 2.5, 0, 0),
                    rotationMax: new THREE.Vector3(-Math.PI / 9.9, 0, 0)
                },
                {
                    index: 0,
                    // limitation: new THREE.Vector3(1, 0, 0), // (optional) restrict rotation axis
                    rotationMin: new THREE.Vector3(-Math.PI / 4, 0, 0), // (optional)
                    rotationMax: new THREE.Vector3(Math.PI / 2, 0, 0)   // (optional)
                },
            ]
    }
];
const ikSolver = new CCDIKSolver(skinnedMeshes.FootPiece, iks);
let helper = ikSolver.createHelper(0.05);
// scene.add(helper);

//GUI
// let conf = {
//     ik_solver: true,
//     update: updateIK
// };
// let gui = new GUI();
// gui.add( conf, 'ik_solver' ).name( 'IK auto update' );
// gui.add( conf, 'update' ).name( 'IK manual update()' );
// gui.open();

//Controls
controls = new OrbitControls( camera, renderer.domElement );
controls.minDistance = 1;
controls.maxDistance = 5;
controls.enableDamping = true;
// controls.target.copy( targetPosition );
controls.target.set( 0,2.2,0 );
controls.update();

//Transform Controls
// const bones = skinnedMeshes.QuadPiece.skeleton.bones;
const transformControls = new TransformControls( camera, renderer.domElement );
transformControls.size = 0.35;
transformControls.showX = false;
transformControls.mode = 'translate';
transformControls.attach( model.getObjectByName("bonetarget") );
scene.add( transformControls.getHelper() );

transformControls.addEventListener( 'mouseDown', () => controls.enabled = false );
transformControls.addEventListener( 'mouseUp', () => controls.enabled = true );
let lastTargetPos = new THREE.Vector3();
let targetChanged = false;

transformControls.addEventListener('change', () => {
    // Get the new world position of your transform target
    const targetObj = model.getObjectByName("bonetarget");
    const targetPosition = targetObj.getWorldPosition(new THREE.Vector3());

    // Update the IK target’s position
    iks[0].target = 3; // already set, but ensure target index is correct
    skinnedMeshes.QuadPiece.skeleton.bones[iks[0].target].position.copy(
        skinnedMeshes.QuadPiece.worldToLocal(targetPosition.clone())
    );

    // Update the IK solver
    ikSolver.update();
});




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
model.traverse((child) => { if (child.isMesh){ child.userData.originalMaterial = child.material.clone();} });
// Wireframe material
const material_03 = new THREE.MeshStandardMaterial({
    wireframe: true,
    wireframeLinewidth: 0.5,
    color: 0x000000,
    metalness: 0.0,
    roughness: 1.0,
    // side: THREE.DoubleSide
});
// Custom shader material based on MeshPhysicalMaterial
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
// Standard material with onBeforeCompile
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
// Red material
const material_02 = new THREE.MeshPhongMaterial( { color: 0xff0000, side: THREE.DoubleSide} );
//const material_03 = new THREE.MeshPhongMaterial( { color: 0x0000ff, side: THREE.DoubleSide} );

//Button Events
document.getElementById('mat1').onclick = () => applyMaterialToMeshByName(names, material_00);
document.getElementById('mat2').onclick = () => applyMaterialToMeshByName(names, material_03);
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
//Apply material function
const names = ['ShinBoneProtectionPiece', 'QuadProtectionPiece'];
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

// Update IK and target position if moved
// function updateTargetAndIK() {
//     if (!targetChanged) return; // Only run when target moved
//     targetChanged = false;
//
//     const targetObj = model.getObjectByName("bonetarget");
//     if (!targetObj) return;
//
//     // Get new world position
//     const targetPos = targetObj.getWorldPosition(new THREE.Vector3());
//
//     // Update IK target (convert to local space if necessary)
//     const localTarget = skinnedMeshes.QuadPiece.worldToLocal(targetPos.clone());
//     skinnedMeshes.QuadPiece.skeleton.bones[iks[0].target].position.copy(localTarget);
//
//     // Run IK
//     ikSolver.update();
//
//     // (Optional) update helper visualization
//     if (helper) helper.updateMatrixWorld(true);
//
//     lastTargetPos.copy(targetPos);
// }

function updateIK() {
    if ( IKSolver ) IKSolver.update();
    // scene.traverse( function ( object ) {
    //     if ( object.isSkinnedMesh ) object.computeBoundingSphere();
    // } );
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

    // updateTargetAndIK();

    // if (conf.ik_solver)
    ikSolver.update();
    renderer.render(scene, camera);
}
animate();
