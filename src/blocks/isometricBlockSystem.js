const BLOCK_SIZE = 64;
const BLOCK_RISE = 32;
const MAX_BUILD_LAYER = 4;
const JUMP_DURATION_MS = 700;
const JUMP_HEIGHT = BLOCK_RISE;
const PLAYER_COLLISION_RADIUS = 12;
const FALL_ACCELERATION = 420;

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

export function createIsometricBlockSystem({ scene, atlasKey, getMapKey, getGridSize, tileToDisplayPosition, pointerToTilePosition, logicalWorldToTilePosition, getPlayer, syncWorldBlocks, enabled = () => true }) {
  const blocks = new Map();
  const sprites = new Map();
  const groundSprites = [];
  let active = false;
  let selectedMaterial = "dirt";
  let jumpStartedAt = 0;
  let jumpStartFloorOffset = 0;
  let visualFloorOffset = 0;
  let fallVelocity = 0;
  let lastVerticalUpdateAt = performance.now();
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
  const save = () => localStorage.setItem(storageKey(), JSON.stringify([...blocks.values()].map(({fallFromZ,...block})=>block)));
  const settleBlocks = () => {
    const columns = new Map();
    [...blocks.values()].sort((a,b)=>a.z-b.z).forEach((block) => {
      const key = `${block.x}:${block.y}`;
      if (!columns.has(key)) columns.set(key, []);
      columns.get(key).push(block);
    });
    blocks.clear();
    columns.forEach((column) => column.forEach((block, index) => {
      const previousZ=block.z;
      block.z = index + 1;
      if(previousZ>block.z)block.fallFromZ=Math.max(block.fallFromZ||0,previousZ);
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
      const textureKey=createBlockTexture(scene,atlasKey,material);const sprite=scene.add.image(display.x,display.y-(block.z-1)*BLOCK_RISE,textureKey);
      sprite.setOrigin(.5,1);sprite.setDepth(10+display.y*.001+block.z*.0001);sprite.setAlpha(syncWorldBlocks?0.001:1);sprite.setData("e3Block",block);sprites.set(blockKey(block.x,block.y,block.z),sprite);
    });
    if(syncWorldBlocks){syncWorldBlocks([...sprites.values()].map((sprite)=>{const block=sprite.getData("e3Block");const display=tileToDisplayPosition(block.x,block.y);return {id:blockKey(block.x,block.y,block.z),x:sprite.x,y:sprite.y,startY:display.y-((block.fallFromZ||block.z)-1)*BLOCK_RISE,sortY:display.y,canvas:scene.textures.get(sprite.texture.key).getSourceImage()};}));blocks.forEach((block)=>delete block.fallFromZ);}
  }

  function place(tileX,tileY,targetZ=1) { const size=getGridSize();if(tileX<0||tileY<0||tileX>=size.width||tileY>=size.height)return;const z=Math.max(1,Math.min(MAX_BUILD_LAYER,targetZ));if(blocks.has(blockKey(tileX,tileY,z)))return;const block={x:tileX,y:tileY,z,material:selectedMaterial,fallFromZ:Math.min(MAX_BUILD_LAYER+1,z+1)};blocks.set(blockKey(tileX,tileY,z),block);settleBlocks();save();render(); }
  function destroy(tileX,tileY,z) { const targetZ=z||terrainHeight(tileX,tileY);if(targetZ&&blocks.delete(blockKey(tileX,tileY,targetZ))){settleBlocks();save();render();} }
  function pick(tileX,tileY,z) { const block=blocks.get(blockKey(tileX,tileY,z||terrainHeight(tileX,tileY)));if(block){selectedMaterial=block.material;refreshToolbar();} }
  const pointInPolygon=(x,y,points)=>points.reduce((inside,[xi,yi],index)=>{const [xj,yj]=points[(index+points.length-1)%points.length];return ((yi>y)!==(yj>y))&&(x<(xj-xi)*(y-yi)/(yj-yi)+xi)?!inside:inside;},false);
  function getClickedFace(pointer){for(const sprite of [...sprites.values()].sort((a,b)=>b.depth-a.depth)){const left=sprite.x-BLOCK_SIZE/2;const top=sprite.y-BLOCK_SIZE;const x=pointer.worldX-left;const y=pointer.worldY-top;if(x<0||x>BLOCK_SIZE||y<0||y>BLOCK_SIZE)continue;const faces={top:[[0,16],[32,0],[64,16],[32,32]],left:[[0,16],[32,32],[32,64],[0,48]],right:[[32,32],[64,16],[64,48],[32,64]]};for(const face of ["top","left","right"]){if(pointInPolygon(x,y,faces[face]))return {block:sprite.getData("e3Block"),face};}}return null;}
  function handlePointer(pointer) { if(!active||!enabled())return false;if(pointer.event?.target?.closest?.(".block-builder-panel"))return true;const hit=getClickedFace(pointer);const tile=hit?.block||pointerToTilePosition(pointer.worldX,pointer.worldY);if(!tile)return true;const tileX=hit?.block.x??tile.tileX;const tileY=hit?.block.y??tile.tileY;if(pointer.rightButtonDown())destroy(tileX,tileY,hit?.block.z);else if(pointer.middleButtonDown())pick(tileX,tileY,hit?.block.z);else if(pointer.leftButtonDown()){if(!hit)place(tileX,tileY,1);else if(hit.face==="top")place(tileX,tileY,hit.block.z+1);else if(hit.face==="left")place(tileX,tileY+1,hit.block.z);else place(tileX+1,tileY,hit.block.z);}return true; }
  function terrainHeight(tileX,tileY) { let height=0;for(let z=1;z<=MAX_BUILD_LAYER;z+=1){const block=blocks.get(blockKey(tileX,tileY,z));if(!block||!materialByKey.get(block.material)?.solid)break;height=z;}return height; }
  function hasClearance(tileX,tileY,floor) { for(let z=floor+1;z<=Math.min(MAX_BUILD_LAYER,floor+2);z+=1){const block=blocks.get(blockKey(tileX,tileY,z));if(block&&materialByKey.get(block.material)?.solid)return false;}return true; }
  function getFootprintTiles(worldX,worldY) { const samples=[[0,0],[-PLAYER_COLLISION_RADIUS,0],[PLAYER_COLLISION_RADIUS,0],[0,-PLAYER_COLLISION_RADIUS],[0,PLAYER_COLLISION_RADIUS]];const unique=new Map();samples.forEach(([dx,dy])=>{const tile=logicalWorldToTilePosition(worldX+dx,worldY+dy);if(tile)unique.set(`${tile.tileX}:${tile.tileY}`,tile);});return [...unique.values()]; }
  function getSupportFloorOffset(worldX,worldY){const tiles=getFootprintTiles(worldX,worldY);return Math.max(0,...tiles.map((tile)=>terrainHeight(tile.tileX,tile.tileY)))*BLOCK_RISE;}
  function canMoveTo(worldX,worldY,jumping=false) { const player=getPlayer();if(!player)return false;const currentTile=logicalWorldToTilePosition(player.x,player.y);const targetTiles=getFootprintTiles(worldX,worldY);if(!currentTile||!targetTiles.length)return false;const currentFloor=terrainHeight(currentTile.tileX,currentTile.tileY);const targetFloor=Math.max(0,...targetTiles.map((tile)=>terrainHeight(tile.tileX,tile.tileY)));if(targetFloor-currentFloor>(jumping?1:.15))return false;return targetTiles.every((tile)=>hasClearance(tile.tileX,tile.tileY,terrainHeight(tile.tileX,tile.tileY))); }
  function requestJump() { const player=getPlayer();if(jumpStartedAt||!player)return;jumpStartFloorOffset=getSupportFloorOffset(player.x,player.y);visualFloorOffset=jumpStartFloorOffset;fallVelocity=0;jumpStartedAt=performance.now(); }
  function getPlayerOffsets(worldX,worldY) { const targetFloorOffset=getSupportFloorOffset(worldX,worldY);const now=performance.now();const dt=Math.min(.05,Math.max(0,(now-lastVerticalUpdateAt)/1000));lastVerticalUpdateAt=now;if(jumpStartedAt){const elapsed=(now-jumpStartedAt)/JUMP_DURATION_MS;if(elapsed<1){const delta=targetFloorOffset-jumpStartFloorOffset;const desiredElevation=jumpStartFloorOffset+delta*elapsed+Math.sin(elapsed*Math.PI)*Math.max(0,JUMP_HEIGHT-delta/2);visualFloorOffset=targetFloorOffset;return {floor:targetFloorOffset,jump:desiredElevation-targetFloorOffset};}jumpStartedAt=0;visualFloorOffset=targetFloorOffset;fallVelocity=0;}if(targetFloorOffset>=visualFloorOffset){visualFloorOffset=targetFloorOffset;fallVelocity=0;}else{fallVelocity+=FALL_ACCELERATION*dt;visualFloorOffset=Math.max(targetFloorOffset,visualFloorOffset-fallVelocity*dt);if(visualFloorOffset===targetFloorOffset)fallVelocity=0;}return {floor:visualFloorOffset,jump:0}; }
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
  return { toggle, isActive:()=>active, isJumping:()=>!!jumpStartedAt, handlePointer, render, load, requestJump, getPlayerOffsets, canMoveTo, terrainHeight, destroy:()=>{window.removeEventListener("keydown",handleKey);toolbar.remove();syncWorldBlocks?.([]);sprites.forEach((sprite)=>sprite.destroy());sprites.clear();groundSprites.forEach((sprite)=>sprite.destroy());groundSprites.length=0;} };
}
