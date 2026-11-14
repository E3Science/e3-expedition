import * as THREE from "three";
import { acquireGLTFAsset } from "./gltfAssetCache";
import { loadAnimatedAstronaut } from "./models/animatedAstronautModel";
import { createMobModel } from "./models/mobModels";
import { createResourceModel } from "./models/resourceModels";

const ISOMETRIC_DEPTH_BASE = -100;
const ISOMETRIC_DEPTH_STEP = 0.1;

function disposeModel(root) {
  root.traverse((object) => {
    object.geometry?.dispose?.();
    if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose());
    else object.material?.dispose?.();
  });
}

function createOverlaySprite(canvas, width, height, renderOrder, depthTest = false) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.LinearFilter;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest, depthWrite: false });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(width, height, 1);
  sprite.renderOrder = renderOrder;
  return { sprite, material, texture };
}

function createPlayerShadow() {
  const canvas = document.createElement("canvas");
  canvas.width = 96;canvas.height = 40;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "rgba(0,0,0,.34)";
  ctx.beginPath();ctx.ellipse(48,20,34,11,0,0,Math.PI*2);ctx.fill();
  return createOverlaySprite(canvas, 42, 18, 0, true);
}

function createPlayerNameplate(name) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;canvas.height = 48;
  const overlay=createOverlaySprite(canvas,128,24,3001);
  const draw=(value)=>{const ctx=canvas.getContext("2d");ctx.clearRect(0,0,canvas.width,canvas.height);ctx.fillStyle="rgba(10,16,24,.55)";ctx.fillRect(4,4,248,40);ctx.strokeStyle="rgba(114,230,209,.62)";ctx.lineWidth=2;ctx.strokeRect(4,4,248,40);ctx.fillStyle="#fff";ctx.font="bold 24px sans-serif";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(String(value||"Player").slice(0,20),128,24);overlay.texture.needsUpdate=true;};
  draw(name);return {...overlay,draw};
}

/**
 * Transparent Three.js layer aligned to a Phaser canvas and camera.
 * Phaser keeps gameplay authority; this layer only renders portal visuals.
 */
export function createWorldPortalLayer({ container, phaserCanvas, getCamera, modelUrl }) {
  if (!container || !phaserCanvas || !modelUrl) return null;

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(0, 1, 0, 1, 0.1, 4000);
  camera.position.z = 2000;

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.id = "three-world-portals";
  renderer.domElement.setAttribute("aria-hidden", "true");
  Object.assign(renderer.domElement.style, {
    position: "absolute",
    pointerEvents: "none",
    zIndex: "2"
  });
  container.appendChild(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0xd8efff, 0x111722, 2.2));
  const keyLight = new THREE.DirectionalLight(0xffffff, 3.2);
  keyLight.position.set(4, 6, 10);
  scene.add(keyLight);
  const portalLight = new THREE.DirectionalLight(0x35dcff, 2.4);
  portalLight.position.set(-4, 2, 8);
  scene.add(portalLight);

  const portalRoot = new THREE.Group();
  scene.add(portalRoot);
  const playerRoot = new THREE.Group();
  scene.add(playerRoot);
  const mobRoot = new THREE.Group();
  scene.add(mobRoot);
  const resourceRoot = new THREE.Group();
  scene.add(resourceRoot);
  const blockRoot = new THREE.Group();
  scene.add(blockRoot);
  const overlayRoot = new THREE.Group();
  scene.add(overlayRoot);

  const timer = new THREE.Timer();
  timer.connect(document);
  let entries = [];
  let generation = 0;
  let disposed = false;
  let lastBoundsKey = "";
  let interactionState = { nearbyPortalKey: null, activatingPortalKey: null };
  const playerEntries = new Map();
  const mobEntries = new Map();
  const resourceEntries = new Map();
  const blockEntries = new Map();
  let ditheringEnabled = localStorage.getItem("e3:player-mob-dithering") !== "false";
  let improvedTransparencyEnabled = localStorage.getItem("e3:improved-transparency") !== "false";

  function releaseEntries() {
    entries.forEach((entry) => {
      entry.mixer?.stopAllAction();
      entry.instanceMaterials?.forEach((material) => material.dispose());
      entry.asset?.release();
      entry.root.removeFromParent();
    });
    entries = [];
    portalRoot.clear();
  }

  async function setPortals(portals) {
    generation += 1;
    const currentGeneration = generation;
    releaseEntries();

    const nextEntries = await Promise.all(portals.map(async (portal) => {
      const asset = await acquireGLTFAsset(modelUrl);
      if (disposed || currentGeneration !== generation) {
        asset.release();
        return null;
      }

      const root = new THREE.Group();
      const scale = portal.scale || 13;
      const modelBottom = portal.modelBottom ?? -1.95;
      root.position.set(portal.worldX, -portal.worldY - modelBottom * scale, 0);
      root.scale.setScalar(scale);
      const instanceMaterials = [];
      asset.scene.traverse((object) => {
        if (!object.isMesh || !object.material) return;
        const sourceMaterials = Array.isArray(object.material) ? object.material : [object.material];
        const clonedMaterials = sourceMaterials.map((sourceMaterial) => {
          const material = sourceMaterial.clone();
          material.userData.baseColor = material.color?.clone?.() || null;
          material.userData.baseEmissive = material.emissive?.clone?.() || null;
          material.userData.baseEmissiveIntensity = material.emissiveIntensity ?? 0;
          material.userData.baseOpacity = material.opacity ?? 1;
          instanceMaterials.push(material);
          return material;
        });
        object.material = Array.isArray(object.material) ? clonedMaterials : clonedMaterials[0];
      });
      root.add(asset.scene);
      portalRoot.add(root);

      let mixer = null;
      if (asset.animations.length > 0) {
        mixer = new THREE.AnimationMixer(asset.scene);
        asset.animations.forEach((clip) => mixer.clipAction(clip).play());
        mixer.setTime((portal.tileX * 0.19 + portal.tileY * 0.11) % asset.animations[0].duration);
      }

      return { ...portal, asset, root, mixer, instanceMaterials, baseScale: scale, state: "available" };
    }));

    if (disposed || currentGeneration !== generation) {
      nextEntries.filter(Boolean).forEach((entry) => entry.asset.release());
      return;
    }
    entries = nextEntries.filter(Boolean);
  }

  function setInteractionState(nextState = {}) {
    interactionState = {
      nearbyPortalKey: nextState.nearbyPortalKey || null,
      activatingPortalKey: nextState.activatingPortalKey || null
    };
  }

  function setPlayers(players = []) {
    const nextIds = new Set(players.map((player) => player.id));
    playerEntries.forEach((entry, id) => {
      if (nextIds.has(id)) return;
      entry.model?.dispose();
      [entry.shadow,entry.nameplate].forEach((overlay)=>{overlay?.sprite.removeFromParent();overlay?.texture.dispose();overlay?.material.dispose();});
      entry.root.removeFromParent();
      playerEntries.delete(id);
    });

    players.forEach((player) => {
      let entry = playerEntries.get(player.id);
      if (!entry) {
        const root = new THREE.Group();
        root.position.set(player.x ?? 0, -(player.y ?? 0) + 2.14 * 12.5, 12);
        playerRoot.add(root);
        const shadow=createPlayerShadow();const nameplate=createPlayerNameplate(player.name);
        overlayRoot.add(shadow.sprite,nameplate.sprite);
        entry = { root, model: null, shadow, nameplate, name: player.name, x: player.x, y: player.y, surfaceY:player.surfaceY??player.y, direction: player.direction || "down", moving: false, actionActive: false };
        playerEntries.set(player.id, entry);
        loadAnimatedAstronaut({ isLocalPlayer: !!player.isLocalPlayer }).then((model) => {
          if (disposed || playerEntries.get(player.id) !== entry) {
            model.dispose();
            return;
          }
          entry.model = model;
          root.add(model.root);
        }).catch((error) => {
          if (!disposed) console.warn("Could not load world astronaut.", error);
        });
      }

      entry.x = player.x ?? 0;
      entry.y = player.y ?? 0;
      entry.direction = player.direction || entry.direction || "down";
      entry.moving = !!player.moving;
      entry.actionActive = !!player.actionActive;
      entry.sortY = player.sortY ?? entry.y;
      entry.elevation = player.elevation ?? 0;
      entry.surfaceY = player.surfaceY ?? entry.y;
      if(entry.name!==player.name){entry.name=player.name;entry.nameplate.draw(player.name);}
    });
  }

  function updatePlayers(elapsed) {
    blockEntries.forEach((block)=>{block.material.opacity=block.baseOpacity;block.material.alphaHash=block.isTransparent&&improvedTransparencyEnabled;});
    playerEntries.forEach((entry) => {
      const scale = 12.5;
      const modelBottom = -2.14;
      entry.root.position.x = entry.x;
      entry.root.position.y = -entry.y - modelBottom * scale;
      entry.root.position.z = ISOMETRIC_DEPTH_BASE + (entry.sortY || entry.y) * ISOMETRIC_DEPTH_STEP + entry.elevation * 0.1 + 0.05;
      entry.root.scale.set(scale, scale, 0.5);
      entry.shadow.sprite.position.set(entry.x,-entry.surfaceY-4,entry.root.position.z-0.01);
      entry.nameplate.sprite.position.set(entry.x,-entry.y+76,1901);
      let clipped=false;if(ditheringEnabled){blockEntries.forEach((block)=>{const overlaps=Math.abs(entry.x-block.sprite.position.x)<28&&Math.abs(entry.surfaceY-block.targetY)<38&&block.sprite.position.z>entry.root.position.z;if(overlaps){block.material.opacity=Math.min(block.baseOpacity,.46);block.material.alphaHash=true;clipped=true;}});}

      const directionRotations = {
        down: 0,
        left_down: -Math.PI / 4,
        left: -Math.PI / 2,
        left_up: -Math.PI * 0.75,
        up: Math.PI,
        right_up: Math.PI * 0.75,
        right: Math.PI / 2,
        right_down: Math.PI / 4
      };
      const targetRotation = directionRotations[entry.direction] ?? 0;
      if (!entry.model) return;
      entry.model.root.traverse((object)=>{if(!object.material)return;object.material.transparent=clipped;object.material.opacity=clipped ? .68 : 1;object.material.alphaHash=clipped;});
      const angleDelta = Math.atan2(
        Math.sin(targetRotation - entry.model.root.rotation.y),
        Math.cos(targetRotation - entry.model.root.rotation.y)
      );
      entry.model.root.rotation.y += angleDelta * 0.24;
      entry.model.animator.update(elapsed, {
        moving: entry.moving,
        actionActive: entry.actionActive
      });
    });
  }

  function setBlocks(blocks = []) {
    blockEntries.forEach((entry) => {
      entry.material.map.dispose();
      entry.material.dispose();
      entry.sprite.removeFromParent();
    });
    blockEntries.clear();
    blockRoot.clear();
    blocks.forEach((block) => {
      if (!block.canvas) return;
      const texture = new THREE.CanvasTexture(block.canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.magFilter = THREE.NearestFilter;
      texture.minFilter = THREE.NearestFilter;
      const baseOpacity=block.transparent ? .68 : 1;const material = new THREE.SpriteMaterial({ map: texture, transparent:true,opacity:baseOpacity,depthWrite:!block.transparent,alphaTest:block.transparent?0:.02 });
      if(block.animated){texture.wrapS=THREE.RepeatWrapping;texture.wrapT=THREE.RepeatWrapping;}
      const sprite = new THREE.Sprite(material);
      const startY=Number.isFinite(block.startY)?block.startY:block.y;
      sprite.position.set(block.x, -startY + 32, ISOMETRIC_DEPTH_BASE + block.sortY * ISOMETRIC_DEPTH_STEP + (block.z || 1) * 0.1);
      sprite.scale.set(64, 64, 1);
      blockRoot.add(sprite);
      material.alphaHash=!!block.transparent&&improvedTransparencyEnabled;blockEntries.set(block.id, { sprite, material, baseOpacity, isTransparent:!!block.transparent, animated:!!block.animated, phase:block.materialKey==="portal"?Math.PI:0, startY, targetY:block.y, fallStartedAt:performance.now(), duration:Math.min(850,300+Math.abs(block.y-startY)*7) });
    });
  }

  function updateBlocks(){const now=performance.now();blockEntries.forEach((entry)=>{if(entry.animated){entry.material.map.offset.x=Math.sin(now*.0022+entry.phase)*.045;entry.material.map.offset.y=Math.cos(now*.0017+entry.phase)*.018;}if(entry.startY===entry.targetY)return;const progress=Math.min(1,(now-entry.fallStartedAt)/entry.duration);const eased=progress*progress;const screenY=THREE.MathUtils.lerp(entry.startY,entry.targetY,eased);entry.sprite.position.y=-screenY+32;if(progress===1)entry.startY=entry.targetY;});}

  function setMobs(mobs = [], selectedMobId = null) {
    const nextIds = new Set(mobs.map((mob) => mob.id));
    mobEntries.forEach((entry, id) => {
      if (nextIds.has(id)) return;
      disposeModel(entry.model.root);
      entry.root.removeFromParent();
      mobEntries.delete(id);
    });

    mobs.forEach((mob) => {
      let entry = mobEntries.get(mob.id);
      if (
        !entry ||
        entry.kind !== mob.kind ||
        entry.tier !== mob.tier ||
        entry.speciesKey !== mob.speciesKey
      ) {
        if (entry) {
          disposeModel(entry.model.root);
          entry.root.removeFromParent();
        }
        const model = createMobModel(mob.kind, mob.tier, mob.speciesKey);
        const root = new THREE.Group();
        root.add(model.root);
        mobRoot.add(root);
        entry = { root, model, kind: mob.kind, tier: mob.tier, speciesKey: mob.speciesKey };
        mobEntries.set(mob.id, entry);
      }
      entry.x = mob.x ?? 0;
      entry.y = mob.y ?? 0;
      entry.facing = mob.facing || "right";
      entry.sortY = mob.sortY ?? entry.y;
      entry.elevation = mob.elevation ?? 0;
      entry.moving = mob.state === "walk";
      entry.incapacitated = !!mob.incapacitated;
      entry.selected = mob.id === selectedMobId;
    });
  }

  function updateMobs(elapsed) {
    mobEntries.forEach((entry) => {
      const scale = entry.kind === "apex_predator" ? 9.5 : entry.kind === "carnivore" ? 8.2 : 7.5;
      entry.root.position.set(entry.x, -entry.y + 1.15 * scale, ISOMETRIC_DEPTH_BASE + (entry.sortY || entry.y) * ISOMETRIC_DEPTH_STEP + entry.elevation * 0.1 + 0.04);
      let clipped=false;if(ditheringEnabled){blockEntries.forEach((block)=>{const overlaps=Math.abs(entry.x-block.sprite.position.x)<28&&Math.abs(entry.y-block.targetY)<38&&block.sprite.position.z>entry.root.position.z;if(overlaps){block.material.opacity=Math.min(block.baseOpacity,.46);block.material.alphaHash=true;clipped=true;}});}
      entry.root.scale.setScalar(scale * (entry.selected ? 1.08 : 1));
      entry.model.root.rotation.y = entry.facing === "left" ? Math.PI : 0;
      entry.model.root.rotation.z = entry.incapacitated ? -Math.PI / 2 : 0;
      entry.model.root.traverse((object) => {
        if(object.material){object.material.transparent=clipped;object.material.opacity=clipped ? .68 : 1;object.material.alphaHash=clipped;}
        if (!object.material?.emissive) return;
        object.material.emissive.set(entry.selected ? 0x155e78 : 0x000000);
        object.material.emissiveIntensity = entry.selected ? 1.4 : 0;
      });
      const stride = entry.moving && !entry.incapacitated ? Math.sin(elapsed * 10 + entry.x * 0.03) * 0.45 : 0;
      entry.model.legs.forEach((leg, index) => {
        leg.rotation.x = index % 2 === 0 ? stride : -stride;
      });
      entry.model.root.position.y = entry.incapacitated ? -0.4 : Math.abs(Math.sin(elapsed * 10)) * (entry.moving ? 0.05 : 0.015);
    });
  }

  function setResources(resources = []) {
    const nextIds = new Set(resources.map((resource) => resource.id));
    resourceEntries.forEach((entry, id) => {
      if (nextIds.has(id)) return;
      disposeModel(entry.model.root);
      entry.root.removeFromParent();
      resourceEntries.delete(id);
    });

    resources.forEach((resource) => {
      let entry = resourceEntries.get(resource.id);
      if (!entry || entry.kind !== resource.kind || entry.tier !== resource.tier) {
        if (entry) {
          disposeModel(entry.model.root);
          entry.root.removeFromParent();
        }
        const model = createResourceModel(resource.kind, resource.tier);
        const root = new THREE.Group();
        root.add(model.root);
        resourceRoot.add(root);
        entry = { root, model, kind: resource.kind, tier: resource.tier };
        resourceEntries.set(resource.id, entry);
      }
      entry.x = resource.x ?? 0;
      entry.y = resource.y ?? 0;
      entry.state = resource.state || "ready";
      entry.growthStage = Number(resource.growthStage) || 0;
    });
  }

  function updateResources(elapsed) {
    resourceEntries.forEach((entry) => {
      const scale = (
        entry.kind === "pond"
          ? 8.5
          : entry.kind === "specimen"
            ? 6.8
          : entry.kind === "communication"
            ? 6.2
            : 7.2
      ) * entry.model.tierScale;
      const groundLift = entry.kind === "plant"
        ? 0.20
        : entry.kind === "rock"
          ? 0.12
          : 0.25;
      entry.root.position.set(entry.x, -entry.y + groundLift * scale, 7);
      entry.root.scale.setScalar(scale);
      const unavailable = entry.state === "growing" || entry.state === "being_collected" || entry.state === "being_eaten";
      entry.root.visible = entry.state !== "hidden";
      entry.root.scale.multiplyScalar(unavailable ? Math.max(0.28, 0.35 + entry.growthStage * 0.12) : 1);
      if (entry.kind === "communication") {
        const pulse = 0.88 + Math.sin(elapsed * 4.8 + entry.x) * 0.16;
        entry.model.animatedPart.scale.setScalar(pulse);
        entry.model.root.rotation.y = elapsed * 0.55;
      } else if (entry.kind === "pond") {
        entry.model.animatedPart.scale.setScalar(0.96 + Math.sin(elapsed * 2.4 + entry.x) * 0.035);
      } else if (entry.kind === "specimen") {
        entry.model.animatedPart.rotation.y = elapsed * 0.7;
        entry.model.animatedPart.position.y = 1.2 + Math.sin(elapsed * 2.1 + entry.x) * 0.08;
      } else if (entry.kind === "plant") {
        entry.model.root.rotation.z = Math.sin(elapsed * 1.8 + entry.x * 0.05) * 0.08;
      } else {
        entry.model.root.rotation.y = Math.sin(elapsed * 0.35 + entry.x) * 0.12;
      }
    });
  }

  function applyPortalVisualState(entry, elapsed) {
    const state = entry.locked
      ? "locked"
      : interactionState.activatingPortalKey === entry.portalKey
        ? "activating"
        : interactionState.nearbyPortalKey === entry.portalKey
          ? "nearby"
          : "available";
    entry.state = state;

    const pulse = state === "activating"
      ? 1 + Math.sin(elapsed * 14) * 0.12
      : state === "nearby"
        ? 1.08 + Math.sin(elapsed * 5) * 0.025
        : 1;
    const desiredScale = entry.baseScale * pulse;
    const currentScale = entry.root.scale.x;
    entry.root.scale.setScalar(THREE.MathUtils.lerp(currentScale, desiredScale, 0.16));

    if (entry.mixer) {
      entry.mixer.timeScale = state === "locked" ? 0.15 : state === "activating" ? 2.5 : state === "nearby" ? 1.35 : 0.75;
    }

    entry.instanceMaterials.forEach((material) => {
      const baseColor = material.userData.baseColor;
      const baseEmissive = material.userData.baseEmissive;
      if (material.color && baseColor) {
        material.color.copy(baseColor);
        if (state === "locked") material.color.lerp(new THREE.Color(0x34404b), 0.78);
        if (state === "nearby") material.color.lerp(new THREE.Color(0x66efff), 0.18);
        if (state === "activating") material.color.lerp(new THREE.Color(0xffffff), 0.42);
      }
      if (material.emissive && baseEmissive) {
        material.emissive.copy(baseEmissive);
        if (state === "nearby") material.emissive.lerp(new THREE.Color(0x19bfe8), 0.55);
        if (state === "activating") material.emissive.lerp(new THREE.Color(0x8ff8ff), 0.82);
      }
      if ("emissiveIntensity" in material) {
        const baseIntensity = material.userData.baseEmissiveIntensity;
        material.emissiveIntensity = state === "activating"
          ? Math.max(5.5, baseIntensity * 1.8)
          : state === "nearby"
            ? Math.max(3.2, baseIntensity * 1.25)
            : state === "locked" ? baseIntensity * 0.15 : baseIntensity;
      }
      material.opacity = state === "locked" ? 0.48 : material.userData.baseOpacity;
      material.transparent = material.opacity < 1 || material.transparent;
    });
  }

  function syncCanvasBounds() {
    const canvasRect = phaserCanvas.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const left = canvasRect.left - containerRect.left;
    const top = canvasRect.top - containerRect.top;
    const width = Math.max(1, canvasRect.width);
    const height = Math.max(1, canvasRect.height);
    const boundsKey = `${left}:${top}:${width}:${height}`;
    if (boundsKey === lastBoundsKey) return;
    lastBoundsKey = boundsKey;
    Object.assign(renderer.domElement.style, {
      left: `${left}px`,
      top: `${top}px`,
      width: `${width}px`,
      height: `${height}px`
    });
    renderer.setSize(width, height, false);
  }

  function update() {
    if (disposed) return;
    const phaserCamera = getCamera?.();
    if (!phaserCamera) return;

    syncCanvasBounds();
    const view = phaserCamera.worldView;
    camera.left = view.left;
    camera.right = view.right;
    camera.top = -view.top;
    camera.bottom = -view.bottom;
    camera.updateProjectionMatrix();

    timer.update();
    const delta = timer.getDelta();
    const elapsed = timer.getElapsed();
    updatePlayers(elapsed);
    updateBlocks();
    updateMobs(elapsed);
    updateResources(elapsed);
    entries.forEach((entry) => {
      applyPortalVisualState(entry, elapsed);
      entry.mixer?.update(delta);
    });
    renderer.render(scene, camera);
  }

  return {
    setPortals,
    setPlayers,
    setBlocks,
    setMobs,
    setResources,
    setInteractionState,
    setDitheringEnabled(value){ditheringEnabled=!!value;},
    setImprovedTransparencyEnabled(value){improvedTransparencyEnabled=!!value;blockEntries.forEach((block)=>{block.material.alphaHash=block.isTransparent&&improvedTransparencyEnabled;});},
    update,
    dispose() {
      disposed = true;
      generation += 1;
      releaseEntries();
      playerEntries.forEach((entry) => {entry.model?.dispose();[entry.shadow,entry.nameplate].forEach((overlay)=>{overlay?.texture.dispose();overlay?.material.dispose();});});
      playerEntries.clear();
      mobEntries.forEach((entry) => disposeModel(entry.model.root));
      mobEntries.clear();
      resourceEntries.forEach((entry) => disposeModel(entry.model.root));
      resourceEntries.clear();
      setBlocks([]);
      timer.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    }
  };
}
