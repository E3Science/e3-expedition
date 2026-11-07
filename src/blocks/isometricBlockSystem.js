const BLOCK_SIZE = 64;
const BLOCK_RISE = 32;
const MAX_BUILD_LAYER = 4;

export const BLOCK_MATERIALS = [
  ["bedrock", "Bedrock", 0, true], ["dirt", "Dirt", 1, true],
  ["stone", "Stone", 2, true], ["iron", "Iron ore", 3, true],
  ["crystal", "Crystal ore", 4, true], ["grass", "Grass", 5, true],
  ["bark", "Tree trunk", 6, true], ["leaves", "Leaves", 7, true],
  ["water", "Water", 8, false], ["sand", "Sand", 9, true],
  ["panel", "Utility panel", 10, true], ["computer", "Computer", 11, true],
  ["crate", "Storage crate", 12, true], ["cave", "Cave stone", 13, true],
  ["alien", "Alien soil", 14, true], ["portal", "Portal block", 15, false]
].map(([key, label, frame, solid]) => ({ key, label, frame, solid }));

const materialByKey = new Map(BLOCK_MATERIALS.map((entry) => [entry.key, entry]));
const blockKey = (x, y, z) => `${x}:${y}:${z}`;

function createBlockTexture(scene, atlasKey, material, rotation) {
  const key = `e3_block_${material.key}_${rotation}`;
  if (scene.textures.exists(key)) return key;
  const source = scene.textures.get(atlasKey).getSourceImage();
  const cell = source.width / 4;
  const sourceX = (material.frame % 4) * cell;
  const sourceY = Math.floor(material.frame / 4) * cell;
  const canvas = document.createElement("canvas");
  canvas.width = BLOCK_SIZE;
  canvas.height = BLOCK_SIZE;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  const texture = document.createElement("canvas");
  texture.width = texture.height = 32;
  const textureCtx = texture.getContext("2d");
  textureCtx.imageSmoothingEnabled = false;
  textureCtx.save();
  textureCtx.translate(16, 16);
  textureCtx.rotate(rotation * Math.PI / 2);
  textureCtx.drawImage(source, sourceX, sourceY, cell, cell, -16, -16, 32, 32);
  textureCtx.restore();

  const drawFace = (points, shade) => {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(...points[0]);points.slice(1).forEach((point) => ctx.lineTo(...point));ctx.closePath();ctx.clip();
    const bounds = points.reduce((result, [x, y]) => ({ minX: Math.min(result.minX, x), maxX: Math.max(result.maxX, x), minY: Math.min(result.minY, y), maxY: Math.max(result.maxY, y) }), { minX: 64, maxX: 0, minY: 64, maxY: 0 });
    ctx.drawImage(texture, bounds.minX, bounds.minY, bounds.maxX - bounds.minX, bounds.maxY - bounds.minY);
    ctx.fillStyle = shade;ctx.fillRect(bounds.minX, bounds.minY, bounds.maxX - bounds.minX, bounds.maxY - bounds.minY);ctx.restore();
  };
  drawFace([[0,16],[32,32],[32,64],[0,48]], "rgba(8,20,35,.28)");
  drawFace([[32,32],[64,16],[64,48],[32,64]], "rgba(0,5,15,.42)");
  drawFace([[0,16],[32,0],[64,16],[32,32]], "rgba(255,255,255,.04)");
  scene.textures.addCanvas(key, canvas);
  return key;
}

export function createIsometricBlockSystem({ scene, atlasKey, getMapKey, tileToDisplayPosition, worldToTilePosition, getPlayer, enabled = () => true }) {
  const blocks = new Map();
  const sprites = new Map();
  let active = false;
  let selectedMaterial = "dirt";
  let selectedLayer = 1;
  let rotation = 0;
  let jumpStartedAt = 0;
  let playerFloor = 0;
  const toolbar = document.createElement("aside");
  toolbar.className = "block-builder-panel";
  toolbar.hidden = true;
  toolbar.innerHTML = `<header><div><small>VOXEL BUILD MODE</small><strong>Expedition Blocks</strong></div><button type="button" data-close aria-label="Close block builder">×</button></header><p>V toggles · click places · right-click destroys · middle-click picks · Q/R rotates · [ / ] changes height · Space jumps</p><div class="block-layer-controls"><button type="button" data-down>−</button><span>Layer <b>1</b> / 4</span><button type="button" data-up>+</button><button type="button" data-rotate>Turn ↻</button></div><div class="block-materials"></div><footer><span class="block-builder-status">Dirt · layer 1 · 0°</span><button type="button" data-clear>Clear this map</button></footer>`;
  document.body.appendChild(toolbar);

  const materialsRoot = toolbar.querySelector(".block-materials");
  BLOCK_MATERIALS.filter((material) => material.key !== "bedrock").forEach((material) => {
    const button = document.createElement("button");button.type = "button";button.dataset.material = material.key;button.title = material.label;
    button.innerHTML = `<i style="--atlas-x:${material.frame % 4};--atlas-y:${Math.floor(material.frame / 4)}"></i><span>${material.label}</span>`;
    button.addEventListener("click", () => { selectedMaterial = material.key; refreshToolbar(); });materialsRoot.appendChild(button);
  });

  const storageKey = () => `e3:block-world:v1:${getMapKey() || "default"}`;
  const save = () => localStorage.setItem(storageKey(), JSON.stringify([...blocks.values()]));
  const load = () => { blocks.clear();try{const saved=JSON.parse(localStorage.getItem(storageKey())||"[]");saved.forEach((block)=>{if(materialByKey.has(block.material)&&block.z>=1&&block.z<=MAX_BUILD_LAYER)blocks.set(blockKey(block.x,block.y,block.z),block);});}catch{}render(); };
  const refreshToolbar = () => { toolbar.querySelector(".block-layer-controls b").textContent=String(selectedLayer);toolbar.querySelector(".block-builder-status").textContent=`${materialByKey.get(selectedMaterial)?.label||selectedMaterial} · layer ${selectedLayer} · ${rotation*90}°`;toolbar.querySelectorAll("[data-material]").forEach((button)=>button.classList.toggle("active",button.dataset.material===selectedMaterial)); };
  const setLayer = (value) => { selectedLayer=Math.max(1,Math.min(MAX_BUILD_LAYER,value));refreshToolbar(); };
  const turn = () => { rotation=(rotation+1)%4;refreshToolbar(); };

  function render() {
    sprites.forEach((sprite) => sprite.destroy());sprites.clear();
    [...blocks.values()].sort((a,b)=>(a.x+a.y)-(b.x+b.y)||a.z-b.z).forEach((block) => {
      const material=materialByKey.get(block.material);if(!material)return;const display=tileToDisplayPosition(block.x,block.y);
      const sprite=scene.add.image(display.x,display.y-(block.z-1)*BLOCK_RISE,createBlockTexture(scene,atlasKey,material,block.rotation||0));
      sprite.setOrigin(.5,1);sprite.setDepth(10+display.y*.001+block.z*.0001);sprite.setData("e3Block",block);sprites.set(blockKey(block.x,block.y,block.z),sprite);
    });
  }

  function place(tileX,tileY) { const block={x:tileX,y:tileY,z:selectedLayer,material:selectedMaterial,rotation};blocks.set(blockKey(tileX,tileY,selectedLayer),block);save();render(); }
  function destroy(tileX,tileY) { for(let z=MAX_BUILD_LAYER;z>=1;z-=1){const key=blockKey(tileX,tileY,z);if(blocks.delete(key)){save();render();return;}} }
  function pick(tileX,tileY) { for(let z=MAX_BUILD_LAYER;z>=1;z-=1){const block=blocks.get(blockKey(tileX,tileY,z));if(block){selectedMaterial=block.material;selectedLayer=block.z;rotation=block.rotation||0;refreshToolbar();return;}} }
  function handlePointer(pointer) { if(!active||!enabled())return false;if(pointer.event?.target?.closest?.(".block-builder-panel"))return true;const tile=worldToTilePosition(pointer.worldX,pointer.worldY);if(!tile)return true;if(pointer.rightButtonDown())destroy(tile.tileX,tile.tileY);else if(pointer.middleButtonDown())pick(tile.tileX,tile.tileY);else if(pointer.leftButtonDown())place(tile.tileX,tile.tileY);return true; }
  function terrainHeight(tileX,tileY) { let height=0;for(let z=1;z<=MAX_BUILD_LAYER;z+=1){const block=blocks.get(blockKey(tileX,tileY,z));if(!block||!materialByKey.get(block.material)?.solid)break;height=z;}return height; }
  function hasClearance(tileX,tileY,floor) { for(let z=floor+1;z<=Math.min(MAX_BUILD_LAYER,floor+2);z+=1){const block=blocks.get(blockKey(tileX,tileY,z));if(block&&materialByKey.get(block.material)?.solid)return false;}return true; }
  function canMoveTo(worldX,worldY,jumping=false) { const tile=worldToTilePosition(worldX,worldY);if(!tile)return false;const targetFloor=terrainHeight(tile.tileX,tile.tileY);return targetFloor-playerFloor<=(jumping?1.5:.15)&&hasClearance(tile.tileX,tile.tileY,targetFloor); }
  function requestJump() { if(jumpStartedAt||!getPlayer())return;jumpStartedAt=performance.now(); }
  function getPlayerOffset(worldX,worldY) { const tile=worldToTilePosition(worldX,worldY);playerFloor=tile?terrainHeight(tile.tileX,tile.tileY):0;let arc=0;if(jumpStartedAt){const elapsed=(performance.now()-jumpStartedAt)/650;if(elapsed>=1)jumpStartedAt=0;else arc=Math.sin(elapsed*Math.PI)*BLOCK_RISE*1.5;}return playerFloor*BLOCK_RISE+arc; }
  function toggle(force) { active=typeof force==="boolean"?force:!active;toolbar.hidden=!active;refreshToolbar();return active; }

  const handleKey = (event) => {
    if (["INPUT","TEXTAREA","SELECT"].includes(document.activeElement?.tagName)) return;
    if (event.code === "KeyV" && enabled()) { event.preventDefault();toggle();return; }
    if (event.code === "Space" && enabled()) { event.preventDefault();requestJump();return; }
    if (!active) return;
    if (event.code === "KeyQ") { event.preventDefault();rotation=(rotation+3)%4;refreshToolbar(); }
    if (event.code === "KeyR") { event.preventDefault();turn(); }
    if (event.code === "BracketLeft") { event.preventDefault();setLayer(selectedLayer-1); }
    if (event.code === "BracketRight") { event.preventDefault();setLayer(selectedLayer+1); }
  };
  window.addEventListener("keydown",handleKey);

  toolbar.querySelector("[data-close]").addEventListener("click",()=>toggle(false));toolbar.querySelector("[data-down]").addEventListener("click",()=>setLayer(selectedLayer-1));toolbar.querySelector("[data-up]").addEventListener("click",()=>setLayer(selectedLayer+1));toolbar.querySelector("[data-rotate]").addEventListener("click",turn);toolbar.querySelector("[data-clear]").addEventListener("click",()=>{if(confirm("Remove all placed blocks from this map?")){blocks.clear();save();render();}});
  load();refreshToolbar();
  return { toggle, isActive:()=>active, isJumping:()=>!!jumpStartedAt, handlePointer, render, load, turn, setLayer, requestJump, getPlayerOffset, canMoveTo, terrainHeight, destroy:()=>{window.removeEventListener("keydown",handleKey);toolbar.remove();sprites.forEach((sprite)=>sprite.destroy());sprites.clear();} };
}
