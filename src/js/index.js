import * as THREE from 'three';
import './noise.js';

const vshader = ` 
varying vec2 v_uv;
varying vec3 v_position;

void main(){
    v_uv = uv;
    v_position = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4( position * 0.25, 1.0 );
}`;

const fshader = `
    #include <noise>
    uniform vec2 u_resolution;
    uniform vec2 u_mouse;
    uniform vec3 u_color;
    uniform vec3 u_color_a;
    uniform vec3 u_color_b;
    uniform float u_time;
    uniform vec3 u_LightColor;
    uniform vec3 u_DarkColor ;
    uniform float u_Frequency ;
    uniform float u_NoiseScale;
    uniform float u_RingScale ;
    uniform float u_Contrast ;
    
    varying vec2 v_uv;
    varying vec3 v_position;

    void main(){
    float n = snoise(v_position);
    float ring = fract(u_NoiseScale * n);
    ring *= u_Contrast * (1.0 - ring);
    float lerp = pow(ring, u_RingScale) + n;
    vec3 color = mix(u_DarkColor, u_LightColor, lerp);
 
    vec2 center = vec2(0.5);
    float inRect = circle(v_position.xy, vec2(0.0), 0.5, 0.02);
    vec2 uv_fract = fract(v_uv * 10.0);
    vec2 st = v_uv;

    gl_FragColor = vec4(color, 1.0);
}
`;

const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(1, -1, 1, -1, 0.1, 10);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const clock = new THREE.Clock();

const geometry = new THREE.PlaneGeometry(2, 2);

const uniforms = {
    u_time: {value: 0.0},
    u_mouse: {value: {x: 0.0, y: 0.0}},
    u_color: {value: new THREE.Color(0x00ff00)},
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
const material = new THREE.ShaderMaterial(
    {
        uniforms: uniforms,
        vertexShader: vshader,
        fragmentShader: fshader
    }
);
const plane = new THREE.Mesh(geometry, material);

scene.add(plane);

camera.position.z = 1;

if ('ontouchstart' in window){
    document.addEventListener('touchmove', move);
}
else{
    window.addEventListener("resize", onWindowResize, false);
    document.addEventListener('mousemove', move);
}


onWindowResize();
animate();

function move(evt) {
    uniforms.u_mouse.value.x = (evt.touches) ? evt.touches[0].clientX : evt.clientX;
    uniforms.u_mouse.value.y = (evt.touches)? evt.touches[0].clientY : evt.clientY;
}
//End of your code
function animate() {
    requestAnimationFrame( animate );
    renderer.render( scene, camera );
    uniforms.u_time.value = clock.getElapsedTime();
}

function onWindowResize( event ) {
    const aspectRatio = window.innerWidth/window.innerHeight;
    let width, height;
    if (aspectRatio>=1){
        width = 1;
        height = (window.innerHeight/window.innerWidth) * width;
    }else{
        width = aspectRatio;
        height = 1;
    }
    camera.left = -width;
    camera.right = width;
    camera.top = height;
    camera.bottom = -height;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
    if (uniforms.u_resolution !== undefined){
        uniforms.u_resolution.value.x = window.innerWidth;
        uniforms.u_resolution.value.y = window.innerHeight;
    }
}
