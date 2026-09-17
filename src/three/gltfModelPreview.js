import * as THREE from "three";
import { acquireGLTFAsset } from "./gltfAssetCache";

function frameObject(camera, object) {
  let box = new THREE.Box3().setFromObject(object);
  if (box.isEmpty()) throw new Error("The model does not contain visible geometry.");

  const initialSphere = box.getBoundingSphere(new THREE.Sphere());
  object.position.sub(initialSphere.center);
  object.updateMatrixWorld(true);
  box = new THREE.Box3().setFromObject(object);
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  const radius = Math.max(sphere.radius, 0.1);
  const verticalFov = THREE.MathUtils.degToRad(camera.fov);
  const distance = (radius / Math.sin(verticalFov / 2)) * 1.15;

  camera.near = Math.max(distance / 100, 0.01);
  camera.far = distance * 100;
  camera.position.set(sphere.center.x, sphere.center.y + radius * 0.18, sphere.center.z + distance);
  camera.updateProjectionMatrix();
}

/** Creates an animated, draggable preview for a GLB or GLTF asset. */
export function createGLTFModelPreview(container, { url, onStatus } = {}) {
  if (!container) return null;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.01, 1000);
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.domElement.setAttribute("aria-label", "Interactive 3D model preview");
  Object.assign(renderer.domElement.style, {
    width: "100%", height: "100%", display: "block", cursor: "grab", touchAction: "none"
  });
  container.replaceChildren(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0xd7eaff, 0x111722, 2.2));
  const keyLight = new THREE.DirectionalLight(0xffffff, 3.2);
  keyLight.position.set(4, 6, 7);
  scene.add(keyLight);
  const rimLight = new THREE.DirectionalLight(0x46ccff, 2.2);
  rimLight.position.set(-5, 2, -4);
  scene.add(rimLight);

  const modelRoot = new THREE.Group();
  scene.add(modelRoot);
  let asset = null;
  let mixer = null;
  let disposed = false;
  let dragging = false;
  let pointerX = 0;
  let targetRotation = 0;
  let frameId = 0;

  onStatus?.("loading", `Loading ${url.split("/").pop()}…`);
  acquireGLTFAsset(url).then((loadedAsset) => {
    if (disposed) {
      loadedAsset.release();
      return;
    }
    asset = loadedAsset;
    modelRoot.add(asset.scene);
    frameObject(camera, asset.scene);
    if (asset.animations.length > 0) {
      mixer = new THREE.AnimationMixer(asset.scene);
      asset.animations.forEach((clip) => mixer.clipAction(clip).play());
    }
    onStatus?.("ready", `${url.split("/").pop()} • ${asset.animations.length} animation${asset.animations.length === 1 ? "" : "s"}`);
  }).catch((error) => {
    if (!disposed) onStatus?.("error", `Could not load model: ${error.message || error}`);
  });

  renderer.domElement.addEventListener("pointerdown", (event) => {
    dragging = true;
    pointerX = event.clientX;
    renderer.domElement.setPointerCapture(event.pointerId);
    renderer.domElement.style.cursor = "grabbing";
  });
  renderer.domElement.addEventListener("pointermove", (event) => {
    if (!dragging) return;
    targetRotation += (event.clientX - pointerX) * 0.015;
    pointerX = event.clientX;
  });
  const stopDragging = () => {
    dragging = false;
    renderer.domElement.style.cursor = "grab";
  };
  renderer.domElement.addEventListener("pointerup", stopDragging);
  renderer.domElement.addEventListener("pointercancel", stopDragging);

  function resize() {
    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  const timer = new THREE.Timer();
  timer.connect(document);
  function render(timestamp) {
    timer.update(timestamp);
    const delta = timer.getDelta();
    if (!dragging) targetRotation += delta * 0.3;
    modelRoot.rotation.y += (targetRotation - modelRoot.rotation.y) * 0.09;
    mixer?.update(delta);
    renderer.render(scene, camera);
    frameId = window.requestAnimationFrame(render);
  }

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  resize();
  render();

  return {
    dispose() {
      disposed = true;
      window.cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      timer.dispose();
      mixer?.stopAllAction();
      asset?.release();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    }
  };
}
