import * as THREE from "three";

/** Creates an interactive animated portal preview for the object pipeline. */
export function createPortalPreview(container) {
  if (!container) return null;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 50);
  camera.position.set(0, 0.15, 6.2);

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.setAttribute("aria-label", "Interactive 3D portal preview");
  Object.assign(renderer.domElement.style, {
    width: "100%", height: "100%", display: "block", cursor: "grab", touchAction: "none"
  });
  container.replaceChildren(renderer.domElement);

  const portal = new THREE.Group();
  portal.rotation.x = -0.12;
  scene.add(portal);

  const frameMaterial = new THREE.MeshStandardMaterial({
    color: 0x7f93a8, roughness: 0.24, metalness: 0.82
  });
  const energyMaterial = new THREE.MeshBasicMaterial({
    color: 0x2de5ff, transparent: true, opacity: 0.72, side: THREE.DoubleSide
  });
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: 0x7d4dff, transparent: true, opacity: 0.28,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
  });

  const outerRing = new THREE.Mesh(new THREE.TorusGeometry(1.62, 0.25, 16, 64), frameMaterial);
  portal.add(outerRing);
  const innerRing = new THREE.Mesh(new THREE.TorusGeometry(1.31, 0.08, 12, 64), energyMaterial);
  portal.add(innerRing);

  const energy = new THREE.Mesh(new THREE.CircleGeometry(1.25, 64), energyMaterial);
  energy.position.z = -0.04;
  portal.add(energy);
  const glow = new THREE.Mesh(new THREE.CircleGeometry(1.55, 64), glowMaterial);
  glow.position.z = -0.09;
  portal.add(glow);

  for (let index = 0; index < 12; index += 1) {
    const angle = (index / 12) * Math.PI * 2;
    const block = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.48, 0.34), frameMaterial);
    block.position.set(Math.cos(angle) * 1.63, Math.sin(angle) * 1.63, 0);
    block.rotation.z = angle;
    portal.add(block);
  }

  const particlePositions = new Float32Array(120 * 3);
  for (let index = 0; index < 120; index += 1) {
    const radius = Math.sqrt(Math.random()) * 1.18;
    const angle = Math.random() * Math.PI * 2;
    particlePositions[index * 3] = Math.cos(angle) * radius;
    particlePositions[index * 3 + 1] = Math.sin(angle) * radius;
    particlePositions[index * 3 + 2] = 0.06 + Math.random() * 0.12;
  }
  const particleGeometry = new THREE.BufferGeometry();
  particleGeometry.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
  const particleMaterial = new THREE.PointsMaterial({
    color: 0xd9fbff, size: 0.055, transparent: true, opacity: 0.92,
    blending: THREE.AdditiveBlending, depthWrite: false
  });
  const particles = new THREE.Points(particleGeometry, particleMaterial);
  portal.add(particles);

  scene.add(new THREE.HemisphereLight(0xbcecff, 0x111522, 2));
  const rim = new THREE.PointLight(0x45ddff, 12, 15);
  rim.position.set(0, 0, 3);
  scene.add(rim);

  let dragging = false;
  let pointerX = 0;
  let targetY = -0.3;
  let frameId = 0;

  renderer.domElement.addEventListener("pointerdown", (event) => {
    dragging = true;
    pointerX = event.clientX;
    renderer.domElement.setPointerCapture(event.pointerId);
    renderer.domElement.style.cursor = "grabbing";
  });
  renderer.domElement.addEventListener("pointermove", (event) => {
    if (!dragging) return;
    targetY += (event.clientX - pointerX) * 0.015;
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
    if (!dragging) targetY = Math.sin(elapsed * 0.45) * 0.42;
    portal.rotation.y += (targetY - portal.rotation.y) * 0.08;
    innerRing.rotation.z = elapsed * -0.65;
    particles.rotation.z = elapsed * 0.32;
    energy.scale.setScalar(0.96 + Math.sin(elapsed * 2.8) * 0.035);
    glow.material.opacity = 0.22 + Math.sin(elapsed * 2.2) * 0.08;
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
      scene.traverse((object) => object.geometry?.dispose?.());
      [frameMaterial, energyMaterial, glowMaterial, particleMaterial].forEach((material) => material.dispose());
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    }
  };
}
