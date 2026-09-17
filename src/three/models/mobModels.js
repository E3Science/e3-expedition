import * as THREE from "three";

function material(color, { emissive = 0x000000, metalness = 0.04, roughness = 0.72 } = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive,
    emissiveIntensity: emissive ? 0.55 : 0,
    metalness,
    roughness,
    flatShading: true
  });
}

function mesh(geometry, surface, position = [0, 0, 0], rotation = [0, 0, 0]) {
  const value = new THREE.Mesh(geometry, surface);
  value.position.set(...position);
  value.rotation.set(...rotation);
  return value;
}

function addLeg(root, legs, position, surface, length = 0.62, radius = 0.14, rotationZ = 0) {
  const pivot = new THREE.Group();
  pivot.position.set(...position);
  const limb = mesh(
    new THREE.CapsuleGeometry(radius, length, 3, 6),
    surface,
    [0, -length * 0.52, 0],
    [0, 0, rotationZ]
  );
  pivot.add(limb);
  root.add(pivot);
  legs.push(pivot);
  return pivot;
}

function addEye(root, position, scale = 1) {
  const white = material(0xf5fbff, { roughness: 0.34 });
  const pupil = material(0x07111e, { roughness: 0.28 });
  const eye = mesh(new THREE.SphereGeometry(0.16 * scale, 8, 6), white, position);
  const pupilMesh = mesh(
    new THREE.SphereGeometry(0.075 * scale, 7, 5),
    pupil,
    [position[0] + 0.13 * scale, position[1], position[2]]
  );
  root.add(eye, pupilMesh);
}

function addSpotPattern(root, color, points) {
  const spot = material(color, { roughness: 0.56 });
  points.forEach(([x, y, z, scale = 1]) => {
    root.add(mesh(new THREE.SphereGeometry(0.13 * scale, 7, 5), spot, [x, y, z]));
  });
}

function createTardigradeSlug() {
  const root = new THREE.Group();
  const legs = [];
  const body = material(0x8ce6c2, { emissive: 0x123c35, roughness: 0.62 });
  const accent = material(0xffc8ed, { roughness: 0.55 });
  const dark = material(0x29465a);
  [-0.9, -0.3, 0.3, 0.9].forEach((x, index) => {
    root.add(mesh(
      new THREE.SphereGeometry(index === 3 ? 0.55 : 0.62, 9, 7),
      index % 2 ? accent : body,
      [x, 0.42 + (index % 2) * 0.06, 0],
      [0, 0, 0]
    ));
  });
  [-0.75, -0.2, 0.36].forEach((x) => {
    addLeg(root, legs, [x, 0.15, -0.42], dark, 0.42, 0.13, -0.28);
    addLeg(root, legs, [x, 0.15, 0.42], dark, 0.42, 0.13, 0.28);
  });
  addEye(root, [1.28, 0.66, -0.22], 0.9);
  addEye(root, [1.28, 0.66, 0.22], 0.9);
  [-1, 1].forEach((side) => {
    const feeler = mesh(new THREE.CylinderGeometry(0.035, 0.055, 0.58, 6), accent);
    feeler.position.set(1.35, 1.02, side * 0.28);
    feeler.rotation.z = side * 0.32;
    root.add(feeler);
  });
  return { root, legs };
}

function createBunnyElephant() {
  const root = new THREE.Group();
  const legs = [];
  const body = material(0xb6d7ff, { emissive: 0x172d4c, roughness: 0.66 });
  const accent = material(0xffb9da);
  const hoof = material(0x39445e);
  root.add(mesh(new THREE.DodecahedronGeometry(0.92, 1), body, [-0.35, 0.64, 0]));
  root.add(mesh(new THREE.SphereGeometry(0.66, 10, 8), body, [0.92, 0.86, 0]));
  [-1, 1].forEach((side) => {
    const ear = mesh(new THREE.ConeGeometry(0.26, 1.12, 7), accent, [0.76, 1.75, side * 0.35]);
    ear.rotation.z = side * -0.18;
    root.add(ear);
  });
  const trunk = mesh(new THREE.CapsuleGeometry(0.12, 0.72, 4, 7), accent, [1.51, 0.49, 0]);
  trunk.rotation.z = -0.82;
  root.add(trunk);
  addEye(root, [1.31, 1.03, -0.28]);
  addEye(root, [1.31, 1.03, 0.28]);
  [-0.85, 0.28].forEach((x) => {
    addLeg(root, legs, [x, 0.25, -0.48], hoof, 0.68, 0.17);
    addLeg(root, legs, [x, 0.25, 0.48], hoof, 0.68, 0.17);
  });
  return { root, legs };
}

function createBumbleCreature() {
  const root = new THREE.Group();
  const legs = [];
  const gold = material(0xffe681, { emissive: 0x423513, roughness: 0.48 });
  const mint = material(0x9ef4e8, { emissive: 0x124842, roughness: 0.5 });
  const dark = material(0x30384b);
  const wing = new THREE.MeshStandardMaterial({
    color: 0xc8f7ff,
    transparent: true,
    opacity: 0.58,
    roughness: 0.16,
    side: THREE.DoubleSide,
    depthWrite: false,
    flatShading: true
  });
  root.add(mesh(new THREE.SphereGeometry(0.78, 10, 8), gold, [-0.25, 0.76, 0], [0, 0, Math.PI / 2]));
  [-0.55, -0.05, 0.45].forEach((x, index) => {
    const band = mesh(new THREE.TorusGeometry(0.55, 0.09, 6, 12), index % 2 ? mint : dark, [x, 0.76, 0], [0, Math.PI / 2, 0]);
    root.add(band);
  });
  const head = mesh(new THREE.SphereGeometry(0.52, 9, 7), mint, [0.88, 0.78, 0]);
  root.add(head);
  addEye(root, [1.23, 0.92, -0.22], 0.86);
  addEye(root, [1.23, 0.92, 0.22], 0.86);
  [-1, 1].forEach((side) => {
    const wings = mesh(new THREE.CircleGeometry(0.72, 8), wing, [-0.28, 1.23, side * 0.45], [Math.PI / 2, 0, side * 0.42]);
    wings.scale.set(1.35, 0.62, 1);
    root.add(wings);
  });
  [-0.55, 0, 0.55].forEach((x) => {
    addLeg(root, legs, [x, 0.36, -0.38], dark, 0.55, 0.08, -0.65);
    addLeg(root, legs, [x, 0.36, 0.38], dark, 0.55, 0.08, 0.65);
  });
  return { root, legs };
}

function createDuckCat() {
  const root = new THREE.Group();
  const legs = [];
  const body = material(0xb9f0a8, { emissive: 0x1d4625, roughness: 0.64 });
  const cream = material(0xffe7a8);
  const bill = material(0xffa85a);
  const dark = material(0x46526d);
  root.add(mesh(new THREE.CapsuleGeometry(0.58, 1.25, 5, 9), body, [-0.25, 0.7, 0], [0, 0, Math.PI / 2]));
  root.add(mesh(new THREE.SphereGeometry(0.58, 10, 8), cream, [0.92, 0.95, 0]));
  [-1, 1].forEach((side) => {
    root.add(mesh(new THREE.ConeGeometry(0.2, 0.55, 6), body, [0.72, 1.55, side * 0.28], [0, 0, side * -0.18]));
  });
  const beak = mesh(new THREE.BoxGeometry(0.68, 0.2, 0.52), bill, [1.45, 0.78, 0]);
  beak.geometry.translate(0.16, 0, 0);
  root.add(beak);
  addEye(root, [1.28, 1.08, -0.25], 0.85);
  addEye(root, [1.28, 1.08, 0.25], 0.85);
  const tail = mesh(new THREE.ConeGeometry(0.16, 1.1, 7), dark, [-1.32, 0.86, 0], [0, 0, Math.PI / 2]);
  root.add(tail);
  [-0.72, 0.35].forEach((x) => {
    addLeg(root, legs, [x, 0.24, -0.42], dark, 0.63, 0.14);
    addLeg(root, legs, [x, 0.24, 0.42], dark, 0.63, 0.14);
  });
  return { root, legs };
}

function createTentacledShell() {
  const root = new THREE.Group();
  const legs = [];
  const shell = material(0xe05a3f, { metalness: 0.3, roughness: 0.48 });
  const plate = material(0x4a1835, { metalness: 0.22, roughness: 0.62 });
  const tentacle = material(0x46bfd0, { emissive: 0x0b3646, roughness: 0.52 });
  root.add(mesh(new THREE.DodecahedronGeometry(1.02, 1), shell, [-0.25, 0.78, 0]));
  [-0.62, -0.16, 0.3].forEach((x) => {
    root.add(mesh(new THREE.TorusGeometry(0.67, 0.12, 6, 10), plate, [x, 0.78, 0], [0, Math.PI / 2, 0]));
  });
  const face = mesh(new THREE.SphereGeometry(0.55, 9, 7), tentacle, [0.92, 0.55, 0]);
  root.add(face);
  addEye(root, [1.28, 0.72, -0.22], 0.9);
  addEye(root, [1.28, 0.72, 0.22], 0.9);
  [-0.75, -0.25, 0.25, 0.75].forEach((x, index) => {
    addLeg(root, legs, [x, 0.2, index % 2 ? -0.42 : 0.42], tentacle, 0.9, 0.11, index % 2 ? -0.45 : 0.45);
  });
  return { root, legs };
}

function createMosquitoCreature() {
  const root = new THREE.Group();
  const legs = [];
  const red = material(0xd93455, { emissive: 0x43101d, metalness: 0.12, roughness: 0.48 });
  const black = material(0x192033, { metalness: 0.22, roughness: 0.55 });
  const cyan = material(0x39d2dc, { emissive: 0x0a4d59, roughness: 0.4 });
  const wing = new THREE.MeshStandardMaterial({ color: 0xa7e8ff, transparent: true, opacity: 0.48, side: THREE.DoubleSide, depthWrite: false });
  root.add(mesh(new THREE.CapsuleGeometry(0.34, 1.5, 4, 8), red, [-0.28, 0.86, 0], [0, 0, Math.PI / 2]));
  root.add(mesh(new THREE.SphereGeometry(0.46, 9, 7), cyan, [0.78, 0.88, 0]));
  const needle = mesh(new THREE.ConeGeometry(0.07, 1.25, 6), black, [1.62, 0.75, 0], [0, 0, -Math.PI / 2]);
  root.add(needle);
  addEye(root, [1.08, 1.02, -0.24], 0.8);
  addEye(root, [1.08, 1.02, 0.24], 0.8);
  [-1, 1].forEach((side) => {
    const wings = mesh(new THREE.CircleGeometry(0.75, 7), wing, [-0.28, 1.28, side * 0.32], [Math.PI / 2, 0, side * 0.34]);
    wings.scale.set(1.45, 0.48, 1);
    root.add(wings);
  });
  [-0.6, 0, 0.58].forEach((x) => {
    addLeg(root, legs, [x, 0.45, -0.25], black, 0.9, 0.055, -0.8);
    addLeg(root, legs, [x, 0.45, 0.25], black, 0.9, 0.055, 0.8);
  });
  return { root, legs };
}

function createColorLizard() {
  const root = new THREE.Group();
  const legs = [];
  const body = material(0x6e35cc, { emissive: 0x24105b, roughness: 0.5 });
  const block = material(0xff6b38, { roughness: 0.44 });
  const lime = material(0xb7e83b, { emissive: 0x304708, roughness: 0.48 });
  const dark = material(0x252b44);
  root.add(mesh(new THREE.CapsuleGeometry(0.52, 1.55, 4, 8), body, [-0.22, 0.52, 0], [0, 0, Math.PI / 2]));
  root.add(mesh(new THREE.DodecahedronGeometry(0.58, 0), block, [0.98, 0.62, 0]));
  const tail = mesh(new THREE.ConeGeometry(0.32, 1.8, 7), lime, [-1.55, 0.55, 0], [0, 0, Math.PI / 2]);
  root.add(tail);
  addEye(root, [1.35, 0.82, -0.25], 0.86);
  addEye(root, [1.35, 0.82, 0.25], 0.86);
  [-0.7, 0.42].forEach((x) => {
    addLeg(root, legs, [x, 0.25, -0.4], dark, 0.7, 0.11, -0.48);
    addLeg(root, legs, [x, 0.25, 0.4], dark, 0.7, 0.11, 0.48);
  });
  [-0.7, -0.15, 0.4].forEach((x, index) => {
    root.add(mesh(new THREE.ConeGeometry(0.14, 0.55 + index * 0.08, 6), lime, [x, 1.04, 0]));
  });
  return { root, legs };
}

function createFrogRaccoon() {
  const root = new THREE.Group();
  const legs = [];
  const moss = material(0x294b42, { roughness: 0.68 });
  const violet = material(0x723966, { emissive: 0x250e25, roughness: 0.55 });
  const mask = material(0x111724);
  const stripe = material(0xc7795c, { roughness: 0.52 });
  root.add(mesh(new THREE.SphereGeometry(1.02, 9, 7), moss, [-0.2, 0.58, 0]));
  root.add(mesh(new THREE.SphereGeometry(0.7, 9, 7), violet, [0.86, 0.86, 0]));
  const faceMask = mesh(new THREE.BoxGeometry(0.22, 0.34, 0.92), mask, [1.37, 0.92, 0]);
  root.add(faceMask);
  addEye(root, [1.46, 1.03, -0.29], 0.9);
  addEye(root, [1.46, 1.03, 0.29], 0.9);
  [-0.68, 0.45].forEach((x) => {
    addLeg(root, legs, [x, 0.18, -0.58], violet, 0.72, 0.22, -0.42);
    addLeg(root, legs, [x, 0.18, 0.58], violet, 0.72, 0.22, 0.42);
  });
  const tail = mesh(new THREE.CapsuleGeometry(0.24, 1.35, 4, 8), stripe, [-1.38, 0.76, 0], [0, 0, Math.PI / 2]);
  root.add(tail);
  [-1.75, -1.38, -1.02].forEach((x) => {
    root.add(mesh(new THREE.TorusGeometry(0.26, 0.07, 6, 9), mask, [x, 0.76, 0], [0, Math.PI / 2, 0]));
  });
  return { root, legs };
}

function createBlueCat() {
  const root = new THREE.Group();
  const legs = [];
  const blue = material(0x173a66, { emissive: 0x07182e, metalness: 0.12, roughness: 0.5 });
  const cyan = material(0x2e8ca7, { emissive: 0x0b3343, roughness: 0.42 });
  const black = material(0x080d18, { roughness: 0.52 });
  root.add(mesh(new THREE.CapsuleGeometry(0.68, 1.6, 5, 9), blue, [-0.25, 0.72, 0], [0, 0, Math.PI / 2]));
  root.add(mesh(new THREE.DodecahedronGeometry(0.7, 1), cyan, [1.08, 0.92, 0]));
  [-1, 1].forEach((side) => {
    root.add(mesh(new THREE.ConeGeometry(0.24, 0.72, 6), black, [0.92, 1.68, side * 0.32], [0, 0, side * -0.2]));
  });
  addEye(root, [1.5, 1.06, -0.27], 0.9);
  addEye(root, [1.5, 1.06, 0.27], 0.9);
  [-0.78, 0.42].forEach((x) => {
    addLeg(root, legs, [x, 0.25, -0.48], black, 0.8, 0.17);
    addLeg(root, legs, [x, 0.25, 0.48], black, 0.8, 0.17);
  });
  const tail = mesh(new THREE.CapsuleGeometry(0.18, 1.7, 4, 8), cyan, [-1.55, 0.94, 0], [0, 0, Math.PI / 2]);
  tail.rotation.y = 0.28;
  root.add(tail);
  addSpotPattern(root, 0x060b15, [
    [-0.75, 0.96, -0.48, 1.2], [-0.25, 1.22, 0.48, 1], [0.28, 0.82, -0.59, 0.9],
    [-0.62, 0.48, 0.58, 0.8], [0.42, 1.05, 0.42, 0.75]
  ]);
  return { root, legs };
}

const BUILDERS = {
  herbivore_a: createTardigradeSlug,
  herbivore_b: createBunnyElephant,
  herbivore_c: createBumbleCreature,
  herbivore_d: createDuckCat,
  carnivore_a: createTentacledShell,
  carnivore_b: createMosquitoCreature,
  carnivore_c: createColorLizard,
  apex_predator_a: createFrogRaccoon,
  apex_predator_b: createBlueCat
};

/** Canonical editable source for all procedural 3D mob variants. */
export function createMobModel(kind = "herbivore", tier = 1, speciesKey = "") {
  const fallbackKey = kind === "apex_predator"
    ? "apex_predator_a"
    : kind === "carnivore"
      ? "carnivore_a"
      : "herbivore_a";
  const model = (BUILDERS[speciesKey] || BUILDERS[fallbackKey])();
  const tierScale = 1 + Math.max(0, Number(tier) - 1) * 0.1;
  model.root.scale.setScalar(tierScale);
  return model;
}
