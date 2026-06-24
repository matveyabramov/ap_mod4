import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';


const MODEL_SCALE = 1.08;
const MODEL_POSITION = { x: 0, y: -0.08, z: 0 };
const MODEL_ROTATION = { x: -0.12, y: 0.45, z: -0.06 };
const MODEL_TARGET_SIZE = 2.8;


const CAMERA_POSITION = { x: 3.2, y: 2.4, z: 4.8 };
const CAMERA_TARGET = { x: 0, y: 0, z: 0 };
const CAMERA_FOV = 32;


const AMBIENT_LIGHT_INTENSITY = 0.45;
const HEMISPHERE_LIGHT_INTENSITY = 1.4;

const KEY_LIGHT_INTENSITY = 3.2;
const KEY_LIGHT_POSITION = { x: 3, y: 5, z: 5 };

const FILL_LIGHT_INTENSITY = 2.2;
const FILL_LIGHT_POSITION = { x: -3, y: -2.5, z: 4 };

const BOTTOM_FILL_LIGHT_INTENSITY = 0.35;
const BOTTOM_FILL_LIGHT_POSITION = { x: 0, y: -3, z: 3 };

const RIM_LIGHT_INTENSITY = 0.8;
const RIM_LIGHT_POSITION = { x: 1, y: 3, z: -5 };

const RENDERER_EXPOSURE = 0.7;
const CONTROLS_DAMPING = 0.07;
const MODEL_PATH = '/ap_mod4/models/meteor.glb';

const USE_GLB_CAMERA_TEST = true;

function initializeMeteorModel(viewer) {
    const stage = viewer.querySelector('.model-viewer__stage');
    const canvas = stage?.querySelector('.model-viewer__canvas');
    const placeholder = stage?.querySelector('.model-viewer__placeholder');

    if (!stage || !(canvas instanceof HTMLCanvasElement)) {
        return;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(CAMERA_FOV, 1, 0.1, 100);
    let activeCamera = camera;
    const renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
    });

    camera.position.set(CAMERA_POSITION.x, CAMERA_POSITION.y, CAMERA_POSITION.z);
    camera.lookAt(CAMERA_TARGET.x, CAMERA_TARGET.y, CAMERA_TARGET.z);

    let controls = new OrbitControls(camera, canvas);
    controls.target.set(CAMERA_TARGET.x, CAMERA_TARGET.y, CAMERA_TARGET.z);
    controls.enableDamping = true;
    controls.dampingFactor = CONTROLS_DAMPING;
    controls.enablePan = false;
    controls.enableZoom = false;
    controls.update();

    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = RENDERER_EXPOSURE;

    scene.add(new THREE.AmbientLight(0xffffff, AMBIENT_LIGHT_INTENSITY));
    scene.add(new THREE.HemisphereLight(0xffffff, 0x555555, HEMISPHERE_LIGHT_INTENSITY));

    const keyLight = new THREE.DirectionalLight(0xffffff, KEY_LIGHT_INTENSITY);
    keyLight.position.set(KEY_LIGHT_POSITION.x, KEY_LIGHT_POSITION.y, KEY_LIGHT_POSITION.z);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, FILL_LIGHT_INTENSITY);
    fillLight.position.set(FILL_LIGHT_POSITION.x, FILL_LIGHT_POSITION.y, FILL_LIGHT_POSITION.z);
    scene.add(fillLight);

    const bottomFillLight = new THREE.DirectionalLight(0xffffff, BOTTOM_FILL_LIGHT_INTENSITY);
    bottomFillLight.position.set(
        BOTTOM_FILL_LIGHT_POSITION.x,
        BOTTOM_FILL_LIGHT_POSITION.y,
        BOTTOM_FILL_LIGHT_POSITION.z,
    );
    scene.add(bottomFillLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, RIM_LIGHT_INTENSITY);
    rimLight.position.set(RIM_LIGHT_POSITION.x, RIM_LIGHT_POSITION.y, RIM_LIGHT_POSITION.z);
    scene.add(rimLight);

    renderer.setAnimationLoop(() => {
        if (controls.enabled) {
            controls.update();
        }

        renderer.render(scene, activeCamera);
    });

    function resize() {
        const width = Math.max(1, stage.clientWidth);
        const height = Math.max(1, stage.clientHeight);

        if (activeCamera.isPerspectiveCamera) {
            activeCamera.aspect = width / height;
        }

        activeCamera.updateProjectionMatrix();
        renderer.setSize(width, height, false);
        renderer.render(scene, activeCamera);
    }

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(stage);
    resize();

    const loader = new GLTFLoader();

    loader.load(
        MODEL_PATH,
        (gltf) => {
            const meteor = gltf.scene;
            let hasRenderableMesh = false;

            meteor.traverse((object) => {
                if (object.isMesh && object.geometry) {
                    hasRenderableMesh = true;
                }
            });

            if (!hasRenderableMesh) {
                console.error(`Meteor model contains no renderable mesh: ${MODEL_PATH}`);
                return;
            }

            if (USE_GLB_CAMERA_TEST) {
                scene.add(meteor);

                if (gltf.cameras[0]) {
                    const meteorCenter = new THREE.Box3()
                        .setFromObject(meteor)
                        .getCenter(new THREE.Vector3());

                    activeCamera = gltf.cameras[0];
                    controls.dispose();
                    controls = new OrbitControls(activeCamera, canvas);
                    controls.target.copy(meteorCenter);
                    controls.enableDamping = true;
                    controls.dampingFactor = CONTROLS_DAMPING;
                    controls.enablePan = false;
                    controls.enableZoom = false;
                    controls.update();
                }
            } else {
                const meteorRoot = new THREE.Group();
                const bounds = new THREE.Box3().setFromObject(meteor);
                const size = bounds.getSize(new THREE.Vector3());
                const center = bounds.getCenter(new THREE.Vector3());
                const longestSide = Math.max(size.x, size.y, size.z);
                const normalizedScale = longestSide > 0 ? MODEL_TARGET_SIZE / longestSide : 1;

                meteor.position.sub(center);
                meteorRoot.add(meteor);
                meteorRoot.position.set(MODEL_POSITION.x, MODEL_POSITION.y, MODEL_POSITION.z);
                meteorRoot.rotation.set(MODEL_ROTATION.x, MODEL_ROTATION.y, MODEL_ROTATION.z);
                meteorRoot.scale.setScalar(normalizedScale * MODEL_SCALE);
                scene.add(meteorRoot);
            }

            resize();

            
            if (placeholder) {
                placeholder.hidden = true;
                placeholder.style.display = 'none';
            }
        },
        undefined,
        (error) => {
            console.error(`Unable to load meteor model: ${MODEL_PATH}`, error);
        },
    );
}

document.querySelectorAll('.model-viewer').forEach(initializeMeteorModel);
