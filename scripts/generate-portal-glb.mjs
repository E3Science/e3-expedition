import * as THREE from "three";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

class NodeFileReader {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((result) => {
      this.result = result;
      this.onloadend?.({ target: this });
    }).catch((error) => this.onerror?.(error));
  }

  readAsDataURL(blob) {
    blob.arrayBuffer().then((result) => {
      this.result = `data:${blob.type};base64,${Buffer.from(result).toString("base64")}`;
      this.onloadend?.({ target: this });
    }).catch((error) => this.onerror?.(error));
  }
}

globalThis.FileReader = NodeFileReader;

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const outputDirectory = path.resolve(scriptDirectory, "../public/assets/models/portals");
const outputPath = path.join(outputDirectory, "expedition-portal.glb");

const root = new THREE.Group();
root.name = "ExpeditionPortal";

const rig = new THREE.Group();
rig.name = "PortalRig";
root.add(rig);

const frameMaterial = new THREE.MeshStandardMaterial({
  name: "PortalFrame",
  color: 0x748ba1,
  roughness: 0.24,
  metalness: 0.82
});
const insetMaterial = new THREE.MeshStandardMaterial({
  name: "PortalInset",
  color: 0x182a3c,
  roughness: 0.4,
  metalness: 0.65
});
const energyMaterial = new THREE.MeshStandardMaterial({
  name: "PortalEnergy",
  color: 0x29d9f6,
  emissive: 0x087bba,
  emissiveIntensity: 3.5,
  roughness: 0.18,
  metalness: 0.12,
  transparent: true,
  opacity: 0.88,
  side: THREE.DoubleSide
});

const outerRing = new THREE.Mesh(new THREE.TorusGeometry(1.62, 0.25, 20, 72), frameMaterial);
outerRing.name = "OuterRing";
rig.add(outerRing);

const insetRing = new THREE.Mesh(new THREE.TorusGeometry(1.34, 0.1, 16, 72), insetMaterial);
insetRing.name = "InsetRing";
insetRing.position.z = 0.015;
rig.add(insetRing);

const energy = new THREE.Mesh(new THREE.CircleGeometry(1.25, 72), energyMaterial);
energy.name = "Energy";
energy.position.z = -0.04;
rig.add(energy);

for (let index = 0; index < 12; index += 1) {
  const angle = (index / 12) * Math.PI * 2;
  const block = new THREE.Mesh(new THREE.BoxGeometry(0.27, 0.48, 0.36, 2, 2, 2), frameMaterial);
  block.name = `FrameSegment${String(index + 1).padStart(2, "0")}`;
  block.position.set(Math.cos(angle) * 1.63, Math.sin(angle) * 1.63, 0);
  block.rotation.z = angle;
  rig.add(block);
}

const base = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.34, 0.9, 4, 2, 2), frameMaterial);
base.name = "PortalBase";
base.position.set(0, -1.78, -0.02);
rig.add(base);

const rotationTimes = [0, 2.5, 5];
const rotationValues = [];
[0, Math.PI, Math.PI * 2].forEach((angle) => {
  const quaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, angle));
  rotationValues.push(quaternion.x, quaternion.y, quaternion.z, quaternion.w);
});
const rotateTrack = new THREE.QuaternionKeyframeTrack(
  "InsetRing.quaternion",
  rotationTimes,
  rotationValues
);
const energyScaleTrack = new THREE.VectorKeyframeTrack(
  "Energy.scale",
  [0, 0.8, 1.6],
  [1, 1, 1, 1.045, 1.045, 1.045, 1, 1, 1]
);
const portalAnimation = new THREE.AnimationClip(
  "PortalActive",
  5,
  [rotateTrack, energyScaleTrack]
);

const exporter = new GLTFExporter();
const binary = await new Promise((resolve, reject) => {
  exporter.parse(root, resolve, reject, {
    binary: true,
    animations: [portalAnimation],
    onlyVisible: true
  });
});

await mkdir(outputDirectory, { recursive: true });
await writeFile(outputPath, new Uint8Array(binary));
console.log(`Generated ${outputPath} (${binary.byteLength} bytes)`);
