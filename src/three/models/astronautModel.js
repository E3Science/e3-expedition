import * as THREE from "three";

/**
 * Canonical editable source for the procedural astronaut used in the world and
 * profile paperdoll. Change geometry, materials, and proportions here.
 */
export function createAstronautModel(
  isLocalPlayer = true,
  { presentation = "world" } = {}
) {
  const isPreview = presentation === "preview";
  const suit = new THREE.MeshStandardMaterial({
    color: isPreview ? 0xe8edf2 : isLocalPlayer ? 0xf4f7fa : 0xdbe8f5,
    roughness: 0.42,
    metalness: 0.08
  });
  const trim = new THREE.MeshStandardMaterial({
    color: isLocalPlayer ? 0xf07a24 : 0x3aa9e8,
    roughness: 0.4,
    metalness: 0.12
  });
  const dark = new THREE.MeshStandardMaterial({
    color: 0x152033,
    roughness: 0.32,
    metalness: 0.45
  });
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0x163956,
    emissive: 0x071c2c,
    emissiveIntensity: 0.8,
    roughness: 0.12,
    metalness: 0.25,
    clearcoat: 1
  });
  const root = new THREE.Group();

  const addPart = (
    geometry,
    material,
    position,
    scale = [1, 1, 1],
    parent = root
  ) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...position);
    mesh.scale.set(...scale);
    mesh.castShadow = isPreview;
    parent.add(mesh);
    return mesh;
  };

  const sphereSegments = isPreview ? [32, 24] : [20, 16];
  const visorSegments = isPreview ? [32, 20] : [20, 14];
  const capsuleSegments = isPreview ? [6, 12] : [5, 10];
  const handSegments = isPreview ? [16, 12] : [12, 10];

  addPart(
    new THREE.SphereGeometry(0.82, ...sphereSegments),
    suit,
    [0, 1.35, 0],
    [1, 0.94, 0.92]
  );
  const visor = addPart(
    new THREE.SphereGeometry(
      0.66,
      ...visorSegments,
      0,
      Math.PI * 2,
      0,
      Math.PI * 0.63
    ),
    glass,
    [0, 1.3, 0.43],
    [1, 0.82, 0.42]
  );
  visor.rotation.x = -0.08;

  addPart(
    new THREE.BoxGeometry(1.35, 1.55, 0.78, isPreview ? 4 : 3, isPreview ? 4 : 3, isPreview ? 4 : 3),
    suit,
    [0, 0.05, 0]
  );
  addPart(
    new THREE.BoxGeometry(0.86, 0.48, 0.12, isPreview ? 3 : 1, isPreview ? 3 : 1, isPreview ? 2 : 1),
    dark,
    [0, 0.26, 0.46]
  );
  addPart(new THREE.BoxGeometry(0.62, 0.09, 0.14), trim, [0, 0.12, 0.54]);
  if (isPreview) {
    addPart(new THREE.BoxGeometry(1.12, 0.16, 0.86), trim, [0, -0.67, 0]);
  }
  addPart(
    new THREE.BoxGeometry(1.1, 1.25, 0.42, isPreview ? 3 : 1, isPreview ? 3 : 1, isPreview ? 3 : 1),
    dark,
    [0, 0.14, -0.5]
  );

  const limbs = { arms: [], legs: [] };
  [-1, 1].forEach((side) => {
    const arm = new THREE.Group();
    arm.position.set(side * 0.86, 0.38, 0);
    arm.rotation.z = side * -0.13;
    addPart(
      new THREE.CapsuleGeometry(0.25, 0.82, ...capsuleSegments),
      suit,
      [0, -0.42, 0],
      [1, 1, 1],
      arm
    );
    addPart(
      new THREE.SphereGeometry(0.28, ...handSegments),
      dark,
      [0, -1.02, 0],
      [1, 1, 1],
      arm
    );
    root.add(arm);
    limbs.arms.push(arm);

    const leg = new THREE.Group();
    leg.position.set(side * 0.38, -1.02, 0);
    addPart(
      new THREE.CapsuleGeometry(0.32, 0.9, ...capsuleSegments),
      suit,
      [0, -0.5, 0],
      [1, 1, 1],
      leg
    );
    addPart(
      new THREE.BoxGeometry(0.62, 0.38, 0.9, isPreview ? 3 : 1, isPreview ? 3 : 1, isPreview ? 3 : 1),
      dark,
      [0, -1.12, 0.12],
      [1, 1, 1],
      leg
    );
    root.add(leg);
    limbs.legs.push(leg);
  });

  if (isPreview) {
    addPart(new THREE.CircleGeometry(0.12, 20), trim, [0.39, 0.48, 0.43]);
  }

  return { root, limbs };
}
