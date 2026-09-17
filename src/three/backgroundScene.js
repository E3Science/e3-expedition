import * as THREE from "three";

const STAR_COUNT = 900;

/**
 * Mounts the Three.js layer that sits behind the Phaser world.
 * Keeping this renderer isolated lets the 2D game migrate incrementally.
 */
export function createThreeBackground(container) {
  if (!container) return null;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x080b12);
  scene.fog = new THREE.FogExp2(0x080b12, 0.018);

  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 300);
  camera.position.set(0, 7, 28);

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.id = "three-background";
  renderer.domElement.setAttribute("aria-hidden", "true");
  Object.assign(renderer.domElement.style, {
    position: "absolute",
    inset: "0",
    width: "100%",
    height: "100%",
    pointerEvents: "none",
    zIndex: "0"
  });
  container.prepend(renderer.domElement);

  const positions = new Float32Array(STAR_COUNT * 3);
  for (let index = 0; index < STAR_COUNT; index += 1) {
    const radius = 35 + Math.random() * 90;
    const theta = Math.random() * Math.PI * 2;
    const y = (Math.random() - 0.5) * 75;
    positions[index * 3] = Math.cos(theta) * radius;
    positions[index * 3 + 1] = y;
    positions[index * 3 + 2] = Math.sin(theta) * radius;
  }

  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const stars = new THREE.Points(
    starGeometry,
    new THREE.PointsMaterial({ color: 0x8fb9ff, size: 0.18, sizeAttenuation: true })
  );
  scene.add(stars);

  const timer = new THREE.Timer();
  timer.connect(document);
  let frameId = 0;

  function resize() {
    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function render(timestamp) {
    timer.update(timestamp);
    const elapsed = timer.getElapsed();
    stars.rotation.y = elapsed * 0.008;
    stars.rotation.x = Math.sin(elapsed * 0.08) * 0.025;
    renderer.render(scene, camera);
    frameId = window.requestAnimationFrame(render);
  }

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  resize();
  render();

  return {
    scene,
    camera,
    renderer,
    dispose() {
      window.cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      timer.dispose();
      starGeometry.dispose();
      stars.material.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    }
  };
}
