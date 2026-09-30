import * as THREE from "three";
import { createAstronautModel } from "./models/astronautModel";

/** Creates a self-contained, interactive 3D astronaut paperdoll. */
export function createAstronautPreview(container, equipment = {}) {
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
  const white = new THREE.MeshStandardMaterial({ color: 0xf4f6f4, roughness: 0.34, metalness: 0.12 });
  const orange = new THREE.MeshStandardMaterial({ color: 0xf47721, roughness: 0.38, metalness: 0.16 });
  const black = new THREE.MeshStandardMaterial({ color: 0x111923, roughness: 0.27, metalness: 0.38 });
  const visor = new THREE.MeshPhysicalMaterial({ color: 0x050a11, roughness: 0.04, metalness: 0.62, clearcoat: 1, clearcoatRoughness: 0.03 });
  const addMesh = (geometry, material, position, scale = [1, 1, 1], parent = astronaut) => { const mesh = new THREE.Mesh(geometry, material); mesh.position.set(...position); mesh.scale.set(...scale); mesh.castShadow = true; parent.add(mesh); return mesh; };
  if (equipment.boots === "expedition_boots") {
    astronautModel.limbs.legs.forEach((leg) => {
      addMesh(new THREE.CapsuleGeometry(.38, .35, 6, 18), white, [0, -1.02, .2], [1, 1, 1.2], leg).rotation.x = Math.PI / 2;
      addMesh(new THREE.BoxGeometry(.7, .12, .92), black, [0, -1.28, .28], [1, 1, 1], leg);
      addMesh(new THREE.BoxGeometry(.72, .1, .76), orange, [0, -1.04, .18], [1, 1, 1], leg);
      addMesh(new THREE.BoxGeometry(.2, .42, .08), orange, [0, -.98, .66], [1, 1, 1], leg);
    });
  }
  if (equipment.helmet === "expedition_helmet") {
    addMesh(new THREE.SphereGeometry(.91, 36, 28), white, [0, 1.35, 0], [1, .96, .94]);
    const wideVisor = addMesh(new THREE.BoxGeometry(1.35, .78, .18, 8, 5, 2), visor, [0, 1.34, .78], [1, 1, 1]);
    wideVisor.geometry.translate(0, 0, 0);
    addMesh(new THREE.BoxGeometry(1.45, .09, .2), orange, [0, 1.79, .66]);
    addMesh(new THREE.TorusGeometry(.16, .06, 12, 24), orange, [.78, 1.25, .2]).rotation.y = Math.PI / 2;
    const tubeCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(.84,1.25,.05),new THREE.Vector3(1.02,.85,-.2),new THREE.Vector3(.78,.45,-.48)]);
    addMesh(new THREE.TubeGeometry(tubeCurve, 24, .065, 10, false), black, [0,0,0]);
  }
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
