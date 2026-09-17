import * as THREE from "three";
import { createAstronautModel } from "./models/astronautModel";

/** Creates a self-contained, interactive 3D astronaut paperdoll. */
export function createAstronautPreview(container) {
  if (!container) return null;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  camera.position.set(0, 0.1, 7.2);

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.domElement.setAttribute("aria-label", "Interactive 3D astronaut preview");
  Object.assign(renderer.domElement.style, {
    width: "100%", height: "100%", display: "block", cursor: "grab", touchAction: "none"
  });
  container.replaceChildren(renderer.domElement);

  const astronautModel = createAstronautModel(true, { presentation: "preview" });
  const astronaut = astronautModel.root;
  astronaut.rotation.x = -0.06;
  scene.add(astronaut);

  scene.add(new THREE.HemisphereLight(0xbad9ff, 0x10141d, 2.1));
  const keyLight = new THREE.DirectionalLight(0xffffff, 3.4);
  keyLight.position.set(3, 4, 5);
  scene.add(keyLight);
  const rimLight = new THREE.PointLight(0x35d7ff, 5, 12);
  rimLight.position.set(-3, 1, -2);
  scene.add(rimLight);

  let targetRotation = -0.3;
  let dragging = false;
  let pointerX = 0;
  let frameId = 0;

  function resize() {
    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  renderer.domElement.addEventListener("pointerdown", (event) => {
    dragging = true;
    pointerX = event.clientX;
    renderer.domElement.setPointerCapture(event.pointerId);
    renderer.domElement.style.cursor = "grabbing";
  });
  renderer.domElement.addEventListener("pointermove", (event) => {
    if (!dragging) return;
    targetRotation += (event.clientX - pointerX) * 0.018;
    pointerX = event.clientX;
  });
  const stopDragging = () => {
    dragging = false;
    renderer.domElement.style.cursor = "grab";
  };
  renderer.domElement.addEventListener("pointerup", stopDragging);
  renderer.domElement.addEventListener("pointercancel", stopDragging);

  const timer = new THREE.Timer();
  timer.connect(document);
  function render(timestamp) {
    timer.update(timestamp);
    const elapsed = timer.getElapsed();
    if (!dragging) targetRotation += 0.004;
    astronaut.rotation.y += (targetRotation - astronaut.rotation.y) * 0.08;
    astronaut.position.y = Math.sin(elapsed * 1.5) * 0.035;
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
      const materials = new Set();
      astronaut.traverse((object) => {
        object.geometry?.dispose?.();
        const objectMaterials = Array.isArray(object.material)
          ? object.material
          : object.material ? [object.material] : [];
        objectMaterials.forEach((material) => materials.add(material));
      });
      materials.forEach((material) => material.dispose());
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    }
  };
}
