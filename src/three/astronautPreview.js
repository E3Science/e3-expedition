import * as THREE from "three";
import { loadAnimatedAstronaut } from "./models/animatedAstronautModel";

/** Creates a self-contained, interactive preview of the production avatar. */
export function createAstronautPreview(container, equipment = {}) {
  if (!container) return null;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  camera.position.set(0, 0.05, 7.35);
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.domElement.setAttribute("aria-label", "Interactive 3D astronaut preview");
  Object.assign(renderer.domElement.style, {
    width: "100%", height: "100%", display: "block", cursor: "grab", touchAction: "none"
  });
  const loadingStatus = document.createElement("div");
  loadingStatus.textContent = "Loading astronaut…";
  loadingStatus.setAttribute("role", "status");
  Object.assign(loadingStatus.style, {
    position: "absolute",
    inset: "0",
    display: "grid",
    placeItems: "center",
    color: "#246b69",
    fontSize: "12px",
    fontWeight: "700",
    pointerEvents: "none"
  });
  if (getComputedStyle(container).position === "static") container.style.position = "relative";
  container.replaceChildren(renderer.domElement, loadingStatus);

  const astronautRoot = new THREE.Group();
  astronautRoot.rotation.x = -0.045;
  scene.add(astronautRoot);
  scene.add(new THREE.HemisphereLight(0xd9ecff, 0x121720, 2.45));
  const keyLight = new THREE.DirectionalLight(0xffffff, 4.2);
  keyLight.position.set(3, 4, 5);
  scene.add(keyLight);
  const rimLight = new THREE.PointLight(0x35d7ff, 5.5, 12);
  rimLight.position.set(-3, 1, -2);
  scene.add(rimLight);

  let astronautModel = null;
  let disposed = false;
  let targetRotation = -0.3;
  let dragging = false;
  let pointerX = 0;
  let frameId = 0;

  loadAnimatedAstronaut({ isLocalPlayer: true, equipment }).then((model) => {
    if (disposed) {
      model.dispose();
      return;
    }
    astronautModel = model;
    astronautRoot.add(model.root);
    loadingStatus.remove();
  }).catch((error) => {
    if (!disposed) {
      console.warn("Could not load astronaut avatar.", error);
      loadingStatus.textContent = `Astronaut could not load: ${error?.message || "unknown error"}`;
      loadingStatus.style.color = "#a72d32";
      loadingStatus.style.padding = "16px";
      loadingStatus.style.textAlign = "center";
    }
  });

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
    astronautRoot.rotation.y += (targetRotation - astronautRoot.rotation.y) * 0.08;
    astronautRoot.position.y = Math.sin(elapsed * 1.5) * 0.035;
    astronautModel?.animator.update(elapsed, { moving: false });
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
      astronautModel?.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    }
  };
}
