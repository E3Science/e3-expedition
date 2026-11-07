import * as THREE from "three";

const MODEL_BOTTOM = -2.14;

function createMaterial(color, emissive = 0x000000, emissiveIntensity = 0) {
  return new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity, roughness: 0.72, metalness: 0.08, flatShading: true });
}

function addBox(parent, geometries, size, position, material, name) {
  const geometry = new THREE.BoxGeometry(size[0], size[1], size[2]);
  geometries.push(geometry);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.position.set(position[0], position[1], position[2]);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function createBlockAstronaut(isLocalPlayer) {
  const root = new THREE.Group();
  root.name = "e3_block_astronaut";
  const geometries = [];
  const materials = [];
  const material = (color, emissive, intensity) => {
    const value = createMaterial(color, emissive, intensity);
    materials.push(value);
    return value;
  };
  const suit = material(isLocalPlayer ? 0xe7f2ef : 0xc9d5d3);
  const suitShade = material(isLocalPlayer ? 0xa9c8c3 : 0x91aaa7);
  const joint = material(0x314b53);
  const boot = material(0x172b34);
  const helmet = material(isLocalPlayer ? 0xd7ece8 : 0xb6cbc8);
  const helmetTrim = material(isLocalPlayer ? 0x21b8ad : 0xcf8b45);
  const visor = material(0x071b2b, isLocalPlayer ? 0x0e8790 : 0x7a461c, 1.35);
  const panel = material(0x183945, 0x1de1d0, isLocalPlayer ? 1.7 : 0.55);
  const pack = material(0x49646a);

  const torso = new THREE.Group();
  torso.name = "torso";
  torso.position.y = 0.86;
  root.add(torso);
  addBox(torso, geometries, [1.56, 1.72, 0.86], [0, 0, 0], suit, "suit_torso");
  addBox(torso, geometries, [0.82, 0.48, 0.16], [0, 0.18, 0.51], panel, "chest_computer");
  addBox(torso, geometries, [0.18, 0.18, 0.12], [-0.22, 0.18, 0.61], helmetTrim, "chest_status");
  addBox(torso, geometries, [1.18, 1.38, 0.48], [0, 0.06, -0.64], pack, "backpack");
  addBox(torso, geometries, [0.74, 0.32, 0.34], [0, 0.74, -0.73], suitShade, "pack_top");

  const head = new THREE.Group();
  head.name = "head";
  head.position.y = 2.34;
  root.add(head);
  addBox(head, geometries, [1.48, 1.34, 1.28], [0, 0, 0], helmet, "helmet");
  addBox(head, geometries, [1.12, 0.66, 0.14], [0, 0.03, 0.71], visor, "visor");
  addBox(head, geometries, [1.58, 0.18, 1.38], [0, -0.58, 0], helmetTrim, "helmet_ring");
  addBox(head, geometries, [0.22, 0.22, 0.18], [0.48, 0.5, 0.66], panel, "helmet_light");

  const createArm = (side) => {
    const direction = side === "left" ? -1 : 1;
    const pivot = new THREE.Group();
    pivot.name = `${side}_arm`;
    pivot.position.set(direction * 0.96, 1.52, 0);
    root.add(pivot);
    addBox(pivot, geometries, [0.48, 1.46, 0.54], [0, -0.64, 0], suitShade, `${side}_sleeve`);
    addBox(pivot, geometries, [0.54, 0.42, 0.58], [0, -1.39, 0.02], joint, `${side}_glove`);
    addBox(pivot, geometries, [0.18, 0.5, 0.08], [direction * 0.29, -0.5, 0.31], helmetTrim, `${side}_arm_stripe`);
    return pivot;
  };

  const createLeg = (side) => {
    const direction = side === "left" ? -1 : 1;
    const pivot = new THREE.Group();
    pivot.name = `${side}_leg`;
    pivot.position.set(direction * 0.42, 0.03, 0);
    root.add(pivot);
    addBox(pivot, geometries, [0.66, 1.55, 0.72], [0, -0.67, 0], suitShade, `${side}_leg_block`);
    addBox(pivot, geometries, [0.74, 0.5, 1.0], [0, -1.56, 0.14], boot, `${side}_boot`);
    addBox(pivot, geometries, [0.7, 0.16, 0.76], [0, -0.02, 0], joint, `${side}_hip_joint`);
    return pivot;
  };

  const limbs = { leftArm: createArm("left"), rightArm: createArm("right"), leftLeg: createLeg("left"), rightLeg: createLeg("right") };
  root.position.y = MODEL_BOTTOM + 1.56;
  return { root, torso, head, limbs, geometries, materials };
}

function createBlockAnimator(model) {
  return {
    update(elapsed, { moving = false, actionActive = false } = {}) {
      const phase = elapsed * 8;
      const stride = moving ? Math.sin(phase) : 0;
      const bob = moving ? Math.abs(Math.sin(phase * 2)) * 0.035 : Math.sin(elapsed * 1.8) * 0.012;
      model.root.position.y = MODEL_BOTTOM + 1.56 + bob;
      model.torso.rotation.z = moving ? -stride * 0.025 : 0;
      model.head.rotation.z = moving ? stride * 0.018 : 0;
      model.limbs.leftLeg.rotation.x = stride * 0.58;
      model.limbs.rightLeg.rotation.x = -stride * 0.58;
      model.limbs.leftArm.rotation.x = actionActive ? -1.05 : -stride * 0.5;
      model.limbs.rightArm.rotation.x = actionActive ? -1.05 : stride * 0.5;
      model.limbs.leftArm.rotation.z = actionActive ? -0.12 : 0;
      model.limbs.rightArm.rotation.z = actionActive ? 0.12 : 0;
    }
  };
}

/** Creates a two-block-tall, code-native astronaut with no external model asset. */
export async function loadAnimatedAstronaut({ isLocalPlayer = true } = {}) {
  const model = createBlockAstronaut(isLocalPlayer);
  let disposed = false;
  return {
    root: model.root,
    animator: createBlockAnimator(model),
    animations: [],
    dispose() {
      if (disposed) return;
      disposed = true;
      model.root.removeFromParent();
      model.geometries.forEach((geometry) => geometry.dispose());
      model.materials.forEach((material) => material.dispose());
    }
  };
}
