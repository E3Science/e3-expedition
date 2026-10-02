import * as THREE from "three";
import { acquireGLTFAsset } from "../gltfAssetCache";

export const ASTRONAUT_MODEL_URL = "/assets/models/astronaut/stylized-astronaut.glb";

const TARGET_HEIGHT = 4.28;
const MODEL_BOTTOM = -2.14;

function findBone(root, names) {
  let result = null;
  root.traverse((object) => {
    if (result || !object.isBone) return;
    const normalized = object.name.toLowerCase();
    if (names.some((name) => normalized.includes(name))) result = object;
  });
  return result;
}

function prepareModel(scene, isLocalPlayer) {
  const instanceMaterials = [];
  scene.updateMatrixWorld(true);
  let bounds = new THREE.Box3().setFromObject(scene);
  const size = bounds.getSize(new THREE.Vector3());
  const scale = TARGET_HEIGHT / Math.max(size.y, 0.001);
  scene.scale.setScalar(scale);
  scene.updateMatrixWorld(true);
  bounds = new THREE.Box3().setFromObject(scene);
  const center = bounds.getCenter(new THREE.Vector3());
  scene.position.x -= center.x;
  scene.position.z -= center.z;
  scene.position.y += MODEL_BOTTOM - bounds.min.y;

  scene.traverse((object) => {
    if (!object.isMesh) return;
    object.castShadow = true;
    object.receiveShadow = true;
    const sourceMaterials = Array.isArray(object.material) ? object.material : [object.material];
    const materials = sourceMaterials.filter(Boolean).map((source) => source.clone());
    materials.forEach((material) => {
      if (material.map) material.map.colorSpace = THREE.SRGBColorSpace;
      if (!isLocalPlayer && material.color) material.color.multiplyScalar(0.88);
      instanceMaterials.push(material);
    });
    object.material = Array.isArray(object.material) ? materials : materials[0];
  });
  return instanceMaterials;
}

function createBoneAnimator(scene) {
  const bones = {
    hips: findBone(scene, ["hips"]),
    chest: findBone(scene, ["chest"]),
    head: findBone(scene, ["head"]),
    leftArm: findBone(scene, ["left arm"]),
    rightArm: findBone(scene, ["right arm"]),
    leftElbow: findBone(scene, ["left elbow"]),
    rightElbow: findBone(scene, ["right elbow"]),
    leftLeg: findBone(scene, ["left leg"]),
    rightLeg: findBone(scene, ["right leg"]),
    leftKnee: findBone(scene, ["left knee"]),
    rightKnee: findBone(scene, ["right knee"])
  };
  const rest = new Map();
  Object.values(bones).filter(Boolean).forEach((bone) => rest.set(bone, bone.quaternion.clone()));
  const offset = new THREE.Quaternion();
  const euler = new THREE.Euler();

  function pose(bone, x = 0, y = 0, z = 0) {
    if (!bone) return;
    euler.set(x, y, z, "XYZ");
    offset.setFromEuler(euler);
    bone.quaternion.copy(rest.get(bone)).multiply(offset);
  }

  return {
    update(elapsed, { moving = false, actionActive = false } = {}) {
      const phase = elapsed * 8.7;
      const stride = moving ? Math.sin(phase) : 0;
      const liftLeft = moving ? Math.max(0, Math.sin(phase)) : 0;
      const liftRight = moving ? Math.max(0, -Math.sin(phase)) : 0;
      const breathe = Math.sin(elapsed * 1.65);

      pose(bones.hips, moving ? Math.abs(Math.sin(phase * 2)) * 0.035 : 0, 0, moving ? stride * 0.035 : breathe * 0.008);
      pose(bones.chest, moving ? -0.035 : breathe * 0.014, 0, moving ? -stride * 0.035 : 0);
      pose(bones.head, moving ? 0.02 : -breathe * 0.012, 0, 0);
      pose(bones.leftLeg, stride * 0.52, 0, 0);
      pose(bones.rightLeg, -stride * 0.52, 0, 0);
      pose(bones.leftKnee, -liftLeft * 0.48, 0, 0);
      pose(bones.rightKnee, -liftRight * 0.48, 0, 0);
      pose(bones.leftArm, actionActive ? -1.0 : -stride * 0.44, 0, actionActive ? -0.2 : 0);
      pose(bones.rightArm, actionActive ? -1.0 : stride * 0.44, 0, actionActive ? 0.2 : 0);
      pose(bones.leftElbow, actionActive ? -0.58 : -0.12 - liftRight * 0.14, 0, 0);
      pose(bones.rightElbow, actionActive ? -0.58 : -0.12 - liftLeft * 0.14, 0, 0);
    }
  };
}

/** Loads a normalized, independently rigged astronaut instance. */
export async function loadAnimatedAstronaut({ isLocalPlayer = true } = {}) {
  const asset = await acquireGLTFAsset(ASTRONAUT_MODEL_URL);
  const root = new THREE.Group();
  const instanceMaterials = prepareModel(asset.scene, isLocalPlayer);
  root.add(asset.scene);
  const animator = createBoneAnimator(asset.scene);
  let released = false;

  return {
    root,
    animator,
    animations: asset.animations,
    dispose() {
      if (released) return;
      released = true;
      root.remove(asset.scene);
      instanceMaterials.forEach((material) => material.dispose());
      asset.release();
    }
  };
}
