import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { clone as cloneSkinnedScene } from "three/addons/utils/SkeletonUtils.js";

const loader = new GLTFLoader();
const entries = new Map();

function disposeMaterial(material) {
  Object.values(material).forEach((value) => {
    if (value?.isTexture) value.dispose();
  });
  material.dispose();
}

function disposeScene(scene) {
  scene.traverse((object) => {
    object.geometry?.dispose?.();
    if (Array.isArray(object.material)) object.material.forEach(disposeMaterial);
    else if (object.material) disposeMaterial(object.material);
  });
}

function loadSource(url) {
  return new Promise((resolve, reject) => {
    loader.load(url, resolve, undefined, reject);
  });
}

/**
 * Acquires a clone of a cached GLB/GLTF scene. Call release when the clone is
 * no longer displayed so shared GPU resources can be reclaimed.
 */
export async function acquireGLTFAsset(url) {
  if (!url) throw new Error("A GLB/GLTF model URL is required.");

  let entry = entries.get(url);
  if (!entry) {
    entry = { refs: 0, promise: loadSource(url), source: null };
    entries.set(url, entry);
    try {
      entry.source = await entry.promise;
    } catch (error) {
      entries.delete(url);
      throw error;
    }
  } else if (!entry.source) {
    entry.source = await entry.promise;
  }

  entry.refs += 1;
  let released = false;

  return {
    scene: cloneSkinnedScene(entry.source.scene),
    animations: entry.source.animations || [],
    release() {
      if (released) return;
      released = true;
      entry.refs = Math.max(0, entry.refs - 1);
      if (entry.refs === 0) {
        disposeScene(entry.source.scene);
        entries.delete(url);
      }
    }
  };
}

