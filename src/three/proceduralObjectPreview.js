import * as THREE from "three";
import { createMobModel } from "./models/mobModels";
import { createResourceModel } from "./models/resourceModels";

function disposeObject(root) {
  root.traverse((object) => {
    object.geometry?.dispose?.();
    if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose());
    else object.material?.dispose?.();
  });
}

export function createProceduralObjectPreview(container, { category, kind, tier = 1 } = {}) {
  if (!container) return null;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.01, 100);
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  Object.assign(renderer.domElement.style, {
    width: "100%", height: "100%", display: "block", cursor: "grab", touchAction: "none"
  });
  renderer.domElement.setAttribute("aria-label", `Interactive 3D ${kind} preview`);
  container.replaceChildren(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0xd8efff, 0x111722, 2.4));
  const key = new THREE.DirectionalLight(0xffffff, 3.4);
  key.position.set(4, 6, 8);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x3bdcff, 2.2);
  rim.position.set(-5, 2, -3);
  scene.add(rim);

  const model = category === "mob_anchor"
    ? createMobModel(kind, tier)
    : createResourceModel(kind, tier);
  const turntable = new THREE.Group();
  turntable.add(model.root);
  scene.add(turntable);

  model.root.updateMatrixWorld(true);
  let box = new THREE.Box3().setFromObject(model.root);
  const initialSphere = box.getBoundingSphere(new THREE.Sphere());
  model.root.position.sub(initialSphere.center);
  model.root.updateMatrixWorld(true);
  box = new THREE.Box3().setFromObject(model.root);
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  const distance = (Math.max(0.1, sphere.radius) / Math.sin(THREE.MathUtils.degToRad(camera.fov) / 2)) * 1.2;
  camera.position.set(0, sphere.radius * 0.12, distance);
  camera.near = Math.max(0.01, distance / 100);
  camera.far = distance * 100;
  camera.updateProjectionMatrix();

  let dragging = false;
  let pointerX = 0;
  let targetRotation = -0.35;
  let frameId = 0;
  renderer.domElement.addEventListener("pointerdown", (event) => {
    dragging = true;
    pointerX = event.clientX;
    renderer.domElement.setPointerCapture(event.pointerId);
    renderer.domElement.style.cursor = "grabbing";
  });
  renderer.domElement.addEventListener("pointermove", (event) => {
    if (!dragging) return;
    targetRotation += (event.clientX - pointerX) * 0.016;
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
    const elapsed = timer.getElapsed();
    if (!dragging) targetRotation += 0.004;
    turntable.rotation.y += (targetRotation - turntable.rotation.y) * 0.09;

    if (model.legs) {
      const stride = Math.sin(elapsed * 5) * 0.35;
      model.legs.forEach((leg, index) => {
        leg.rotation.x = index % 2 === 0 ? stride : -stride;
      });
    } else if (kind === "pond") {
      model.animatedPart.scale.setScalar(0.96 + Math.sin(elapsed * 2.4) * 0.035);
    } else if (kind === "plant") {
      model.root.rotation.z = Math.sin(elapsed * 1.8) * 0.08;
    }

    renderer.render(scene, camera);
    frameId = window.requestAnimationFrame(render);
  }

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  resize();
  render();

  return {
    dispose() {
      window.cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      timer.dispose();
      disposeObject(model.root);
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    }
  };
}
