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

function createBlockTexture(scene, atlasKey, material) {
  const key = `e3_block_${material.key}`;
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
  textureCtx.drawImage(source, sourceX, sourceY, cell, cell, 0, 0, 32, 32);

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

function createGroundTexture(scene, atlasKey, material) {
  const key = `e3_block_ground_${material.key}`;
  if (scene.textures.exists(key)) return key;
  const source = scene.textures.get(atlasKey).getSourceImage();
  const cell = source.width / 4;
  const canvas = document.createElement("canvas");
  canvas.width = BLOCK_SIZE;
  canvas.height = BLOCK_RISE;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, BLOCK_RISE / 2);
  ctx.lineTo(BLOCK_SIZE / 2, 0);
  ctx.lineTo(BLOCK_SIZE, BLOCK_RISE / 2);
  ctx.lineTo(BLOCK_SIZE / 2, BLOCK_RISE);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(source, (material.frame % 4) * cell, Math.floor(material.frame / 4) * cell, cell, cell, 0, 0, BLOCK_SIZE, BLOCK_RISE);
  ctx.fillStyle = "rgba(255,255,255,.04)";
  ctx.fillRect(0, 0, BLOCK_SIZE, BLOCK_RISE);
  ctx.restore();
  scene.textures.addCanvas(key, canvas);
  return key;
}

export function createIsometricBlockSystem({ scene, atlasKey, getMapKey, getGridSize, tileToDisplayPosition, pointerToTilePosition, logicalWorldToTilePosition, getPlayer, enabled = () => true }) {
  const blocks = new Map();
  const sprites = new Map();
  const groundSprites = [];
  let active = false;
  let selectedMaterial = "dirt";
  let jumpStartedAt = 0;
  let playerFloor = 0;
  const toolbar = document.createElement("aside");
  toolbar.className = "block-builder-panel";
  toolbar.hidden = true;
  toolbar.innerHTML = `<header><div><small>VOXEL BUILD MODE</small><strong>Expedition Blocks</strong></div><button type="button" data-close aria-label="Close block builder">×</button></header><p>V toggles · click a surface to place · right-click destroys · middle-click picks · Space jumps</p><div class="block-materials"></div><footer><span class="block-builder-status">Dirt</span><button type="button" data-clear>Clear this map</button></footer>`;
  document.body.appendChild(toolbar);

  const materialsRoot = toolbar.querySelector(".block-materials");
  BLOCK_MATERIALS.filter((material) => material.key !== "bedrock").forEach((material) => {
    const button = document.createElement("button");button.type = "button";button.dataset.material = material.key;button.title = material.label;
    button.innerHTML = `<i style="--atlas-x:${material.frame % 4};--atlas-y:${Math.floor(material.frame / 4)}"></i><span>${material.label}</span>`;
    button.addEventListener("click", () => { selectedMaterial = material.key; refreshToolbar(); });materialsRoot.appendChild(button);
  });

  const storageKey = () => `e3:block-world:v1:${getMapKey() || "default"}`;
  const save = () => localStorage.setItem(storageKey(), JSON.stringify([...blocks.values()]));
  const settleBlocks = () => {
    const columns = new Map();
    [...blocks.values()].sort((a,b)=>a.z-b.z).forEach((block) => {
      const key = `${block.x}:${block.y}`;
      if (!columns.has(key)) columns.set(key, []);
      columns.get(key).push(block);
    });
    blocks.clear();
    columns.forEach((column) => column.forEach((block, index) => {
      block.z = index + 1;
      delete block.rotation;
      if (block.z <= MAX_BUILD_LAYER) blocks.set(blockKey(block.x, block.y, block.z), block);
    }));
  };
  const load = () => { blocks.clear();try{const saved=JSON.parse(localStorage.getItem(storageKey())||"[]");saved.forEach((block)=>{if(materialByKey.has(block.material)&&block.z>=1&&block.z<=MAX_BUILD_LAYER)blocks.set(blockKey(block.x,block.y,block.z),block);});settleBlocks();}catch{}render(); };
  const refreshToolbar = () => { toolbar.querySelector(".block-builder-status").textContent=materialByKey.get(selectedMaterial)?.label||selectedMaterial;toolbar.querySelectorAll("[data-material]").forEach((button)=>button.classList.toggle("active",button.dataset.material===selectedMaterial)); };

  function render() {
    sprites.forEach((sprite) => sprite.destroy());sprites.clear();
    groundSprites.forEach((sprite) => sprite.destroy());groundSprites.length=0;
    const size=getGridSize();const groundTexture=createGroundTexture(scene,atlasKey,materialByKey.get("grass"));
    for(let y=0;y<size.height;y+=1){for(let x=0;x<size.width;x+=1){const display=tileToDisplayPosition(x,y);const ground=scene.add.image(display.x,display.y,groundTexture);ground.setOrigin(.5,1);ground.setDepth(1+(x+y)*.01);groundSprites.push(ground);}}
    [...blocks.values()].sort((a,b)=>(a.x+a.y)-(b.x+b.y)||a.z-b.z).forEach((block) => {
      const material=materialByKey.get(block.material);if(!material)return;const display=tileToDisplayPosition(block.x,block.y);
      const sprite=scene.add.image(display.x,display.y-(block.z-1)*BLOCK_RISE,createBlockTexture(scene,atlasKey,material));
      sprite.setOrigin(.5,1);sprite.setDepth(10+display.y*.001+block.z*.0001);sprite.setData("e3Block",block);sprites.set(blockKey(block.x,block.y,block.z),sprite);
    });
  }

  function place(tileX,tileY,targetZ=1) { const z=Math.max(1,Math.min(MAX_BUILD_LAYER,targetZ));if(blocks.has(blockKey(tileX,tileY,z)))return;const block={x:tileX,y:tileY,z,material:selectedMaterial};blocks.set(blockKey(tileX,tileY,z),block);settleBlocks();save();render(); }
  function destroy(tileX,tileY,z) { const targetZ=z||terrainHeight(tileX,tileY);if(targetZ&&blocks.delete(blockKey(tileX,tileY,targetZ))){settleBlocks();save();render();} }
  function pick(tileX,tileY,z) { const block=blocks.get(blockKey(tileX,tileY,z||terrainHeight(tileX,tileY)));if(block){selectedMaterial=block.material;refreshToolbar();} }
  function getClickedBlock(pointer){return [...sprites.values()].filter((sprite)=>sprite.getBounds().contains(pointer.worldX,pointer.worldY)).sort((a,b)=>b.depth-a.depth)[0]?.getData("e3Block")||null;}
  function handlePointer(pointer) { if(!active||!enabled())return false;if(pointer.event?.target?.closest?.(".block-builder-panel"))return true;const clicked=getClickedBlock(pointer);const tile=clicked||pointerToTilePosition(pointer.worldX,pointer.worldY);if(!tile)return true;const tileX=clicked?.x??tile.tileX;const tileY=clicked?.y??tile.tileY;if(pointer.rightButtonDown())destroy(tileX,tileY,clicked?.z);else if(pointer.middleButtonDown())pick(tileX,tileY,clicked?.z);else if(pointer.leftButtonDown())place(tileX,tileY,clicked?clicked.z+1:1);return true; }
  function terrainHeight(tileX,tileY) { let height=0;for(let z=1;z<=MAX_BUILD_LAYER;z+=1){const block=blocks.get(blockKey(tileX,tileY,z));if(!block||!materialByKey.get(block.material)?.solid)break;height=z;}return height; }
  function hasClearance(tileX,tileY,floor) { for(let z=floor+1;z<=Math.min(MAX_BUILD_LAYER,floor+2);z+=1){const block=blocks.get(blockKey(tileX,tileY,z));if(block&&materialByKey.get(block.material)?.solid)return false;}return true; }
  function canMoveTo(worldX,worldY,jumping=false) { const tile=logicalWorldToTilePosition(worldX,worldY);if(!tile)return false;const targetFloor=terrainHeight(tile.tileX,tile.tileY);return targetFloor-playerFloor<=(jumping?1.5:.15)&&hasClearance(tile.tileX,tile.tileY,targetFloor); }
  function requestJump() { if(jumpStartedAt||!getPlayer())return;jumpStartedAt=performance.now(); }
  function getPlayerOffsets(worldX,worldY) { const tile=logicalWorldToTilePosition(worldX,worldY);playerFloor=tile?terrainHeight(tile.tileX,tile.tileY):0;let jump=0;if(jumpStartedAt){const elapsed=(performance.now()-jumpStartedAt)/650;if(elapsed>=1)jumpStartedAt=0;else jump=Math.sin(elapsed*Math.PI)*BLOCK_RISE*1.5;}return {floor:playerFloor*BLOCK_RISE,jump}; }
  function toggle(force) { active=typeof force==="boolean"?force:!active;toolbar.hidden=!active;refreshToolbar();return active; }

  const handleKey = (event) => {
    if (["INPUT","TEXTAREA","SELECT"].includes(document.activeElement?.tagName)) return;
    if (event.code === "KeyV" && enabled()) { event.preventDefault();toggle();return; }
    if (event.code === "Space" && enabled()) { event.preventDefault();requestJump();return; }
    if (!active) return;
  };
  window.addEventListener("keydown",handleKey);

  toolbar.querySelector("[data-close]").addEventListener("click",()=>toggle(false));toolbar.querySelector("[data-clear]").addEventListener("click",()=>{if(confirm("Remove all placed blocks from this map?")){blocks.clear();save();render();}});
  load();refreshToolbar();
  return { toggle, isActive:()=>active, isJumping:()=>!!jumpStartedAt, handlePointer, render, load, requestJump, getPlayerOffsets, canMoveTo, terrainHeight, destroy:()=>{window.removeEventListener("keydown",handleKey);toolbar.remove();sprites.forEach((sprite)=>sprite.destroy());sprites.clear();groundSprites.forEach((sprite)=>sprite.destroy());groundSprites.length=0;} };
}
