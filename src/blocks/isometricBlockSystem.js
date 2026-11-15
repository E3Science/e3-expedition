const BLOCK_SIZE = 64;
const BLOCK_RISE = 32;
const MAX_BUILD_LAYER = 5;
const JUMP_DURATION_MS = 560;
const JUMP_HEIGHT = 38;
const JUMP_TRAVEL_LIMIT = 44;
const PLAYER_COLLISION_RADIUS = 6;
const EDGE_DROP_CLEARANCE = 10;
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
].map(([key, label, frame, solid]) => ({ key, label, frame, solid })).concat([
  {key:"biome_cyan",label:"Cyan fungal mountain top",frame:14,solid:true,kind:"biome",asset:"assets/blocks/cyan-fungal-solid-cube-v2.png"},
  {key:"biome_violet",label:"Blue-violet moss face",frame:15,solid:true,kind:"biome",asset:"assets/tiles/isometric/alien-expansion/collection-v2/individual/biome-violet/violet_mountain_face.png"},
  {key:"biome_coral",label:"Coral mineral face",frame:3,solid:true,kind:"biome",asset:"assets/blocks/coral-mineral-solid-cube-v2.png"},
  {key:"biome_indigo",label:"Indigo large cliff top",frame:13,solid:true,kind:"biome",asset:"assets/blocks/indigo-volcanic-solid-cube-v2.png"},
  {key:"flora_cyan",label:"Cyan fungal flora",frame:14,solid:false,kind:"plant",nonStackable:true,asset:"assets/tiles/isometric/alien-expansion/collection-v2/individual/flora-cyan-violet-v2/cyan_flora_01.png"},
  {key:"flora_violet",label:"Blue-violet moss",frame:15,solid:false,kind:"plant",nonStackable:true,asset:"assets/tiles/isometric/alien-expansion/collection-v2/individual/flora-cyan-violet-v2/violet_flora_02.png"},
  {key:"flora_coral",label:"Coral mineral flora",frame:3,solid:false,kind:"plant",nonStackable:true,asset:"assets/blocks/coral-flora-clean-v2.png"},
  {key:"flora_indigo",label:"Indigo volcanic flora",frame:13,solid:false,kind:"plant",nonStackable:true,asset:"assets/tiles/isometric/alien-expansion/collection-v2/individual/flora-coral-indigo-v2/indigo_flora_01.png"},
  {key:"flora_cyan_2",label:"Cyan fungal flora 2",frame:14,solid:false,kind:"plant",nonStackable:true,asset:"assets/tiles/isometric/alien-expansion/collection-v2/individual/flora-cyan-violet-v2/cyan_flora_03.png"},
  {key:"flora_violet_2",label:"Blue-violet flora 2",frame:15,solid:false,kind:"plant",nonStackable:true,asset:"assets/tiles/isometric/alien-expansion/collection-v2/individual/flora-cyan-violet-v2/violet_flora_03.png"},
  {key:"flora_coral_2",label:"Coral mineral flora 2",frame:3,solid:false,kind:"plant",nonStackable:true,asset:"assets/tiles/isometric/alien-expansion/collection-v2/individual/flora-coral-indigo-v2/coral_flora_03.png"},
  {key:"flora_indigo_2",label:"Indigo volcanic flora 2",frame:13,solid:false,kind:"plant",nonStackable:true,asset:"assets/tiles/isometric/alien-expansion/collection-v2/individual/flora-coral-indigo-v2/indigo_flora_04.png"},
  ...[
    ["supply_crate","Sealed supply crate","cargo_supply_crate.png"],["power_generator","Compact power generator","hardware_generator.png"],["atmosphere_processor","Atmospheric processor","hardware_atmosphere_processor.png"],["water_recycler","Water recycler","hardware_water_recycler.png"],["communications_rack","Communications rack","hardware_communications_rack.png"],["oxygen_rack","Oxygen cylinder rack","hardware_oxygen_rack.png"],["liquid_tank","Liquid storage tanks","hardware_liquid_tank.png"],["work_light","Portable work light","hardware_work_light.png"],["tool_cart","Tool cart","hardware_tool_cart.png"],["hose_bundle","Hose and cable bundle","hardware_hose_bundle.png"],["maintenance_robot","Maintenance robot","hardware_maintenance_robot.png"]
  ].map(([key,label,file])=>({key,label,frame:10,solid:true,kind:"furniture",nonStackable:true,asset:`assets/tiles/isometric/alien-expansion/collection-v2/individual/hardware-cargo/${file}`})),
  {key:"glass",label:"Framed glass block",frame:10,solid:true,kind:"glass",transparent:true},
  {key:"laboratory",label:"Laboratory block",frame:10,solid:true,kind:"prop",asset:"assets/tiles/isometric/alien-expansion/collection-v2/individual/habitat-interior/interior_lab_bench.png"},
  {key:"command_console",label:"Command console",frame:11,solid:true,kind:"prop",asset:"assets/tiles/isometric/alien-expansion/collection-v2/individual/habitat-interior/interior_command_console.png"},
  {key:"habitat_wall",label:"Habitat wall",frame:10,solid:true,kind:"prop",asset:"assets/tiles/isometric/alien-expansion/collection-v2/individual/habitat-exterior/habitat_command_middle.png"}
  ,{key:"tree_sprout",label:"Tree sprout",frame:7,solid:false,kind:"sprout",nonStackable:true}
  ,{key:"habitat_kit",label:"5×5 habitat",frame:10,solid:true,kind:"habitat",nonStackable:true,asset:"assets/blocks/habitat-mega-v3.svg"}
]);

const materialByKey = new Map(BLOCK_MATERIALS.map((entry) => [entry.key, entry]));
const blockKey = (x, y, z) => `${x}:${y}:${z}`;

function drawContainedAsset(ctx,asset,padding=2){const probe=document.createElement("canvas");probe.width=asset.width;probe.height=asset.height;const probeCtx=probe.getContext("2d");probeCtx.drawImage(asset,0,0);const pixels=probeCtx.getImageData(0,0,probe.width,probe.height).data;let minX=probe.width,minY=probe.height,maxX=-1,maxY=-1;for(let y=0;y<probe.height;y+=1){for(let x=0;x<probe.width;x+=1){if(pixels[(y*probe.width+x)*4+3]>8){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}}}if(maxX<minX)return;const width=maxX-minX+1;const height=maxY-minY+1;const scale=Math.min((BLOCK_SIZE-padding*2)/width,(BLOCK_SIZE-padding*2)/height);const drawWidth=width*scale;const drawHeight=height*scale;ctx.drawImage(asset,minX,minY,width,height,(BLOCK_SIZE-drawWidth)/2,(BLOCK_SIZE-drawHeight)/2,drawWidth,drawHeight);}

function paintBiomeTexture(ctx,key){ctx.clearRect(0,0,32,32);if(key==="biome_cyan"){ctx.fillStyle="#075f67";ctx.fillRect(0,0,32,32);for(let i=0;i<18;i+=1){const x=(i*11+3)%31,y=(i*7+5)%31,r=2+(i%3);ctx.fillStyle=i%2?"#098b8d":"#19c8bd";ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();ctx.fillStyle="#75f0dc";ctx.fillRect(x,y,1,1);}ctx.strokeStyle="#06434e";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,23);ctx.bezierCurveTo(8,15,15,29,32,18);ctx.stroke();return;}if(key==="biome_violet"){ctx.fillStyle="#25205e";ctx.fillRect(0,0,32,32);for(let y=1;y<32;y+=5){for(let x=(y%3);x<32;x+=6){ctx.fillStyle=(x+y)%2?"#3e2b83":"#7250bd";ctx.fillRect(x,y,5,3);ctx.fillStyle="#b378e0";ctx.fillRect(x+1,y,2,1);}}ctx.strokeStyle="#9c65d2";ctx.lineWidth=1;for(let i=0;i<4;i+=1){ctx.beginPath();ctx.arc(5+i*8,15+(i%2)*7,4,0,Math.PI*1.6);ctx.stroke();}return;}if(key==="biome_coral"){ctx.fillStyle="#873a3f";ctx.fillRect(0,0,32,32);for(let i=0;i<14;i+=1){const x=(i*13+2)%30,y=(i*9+4)%29,size=2+(i%3);ctx.fillStyle=i%2?"#ed704d":"#bd4b42";ctx.beginPath();ctx.moveTo(x,y-size);ctx.lineTo(x+size,y);ctx.lineTo(x,y+size);ctx.lineTo(x-size,y);ctx.closePath();ctx.fill();if(i%3===0){ctx.fillStyle="#ffb34f";ctx.fillRect(x,y-1,1,2);}}return;}ctx.fillStyle="#11183f";ctx.fillRect(0,0,32,32);for(let y=0;y<32;y+=4){ctx.fillStyle=y%8?"#23245f":"#343487";ctx.fillRect(0,y,32,3);}ctx.strokeStyle="#20a9c2";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(5,0);ctx.lineTo(10,8);ctx.lineTo(7,16);ctx.lineTo(16,23);ctx.lineTo(13,32);ctx.moveTo(25,0);ctx.lineTo(21,10);ctx.lineTo(27,18);ctx.lineTo(23,32);ctx.stroke();ctx.fillStyle="#67e5e6";ctx.fillRect(9,8,1,3);ctx.fillRect(26,17,1,3);}

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

  if(material.kind==="plant"||material.kind==="furniture"){
    const asset=scene.textures.get(`e3_block_asset_${material.key}`)?.getSourceImage?.();
    if(asset){if(material.kind==="furniture")drawContainedAsset(ctx,asset);else ctx.drawImage(asset,0,0,BLOCK_SIZE,BLOCK_SIZE);}
    scene.textures.addCanvas(key,canvas);return key;
  }
  if(material.kind==="sprout"){ctx.fillStyle="#75452d";ctx.fillRect(30,32,4,25);ctx.fillStyle="#58b83f";ctx.fillRect(18,27,14,8);ctx.fillRect(33,21,14,9);ctx.fillStyle="#91de58";ctx.fillRect(21,26,8,3);ctx.fillRect(36,21,8,3);scene.textures.addCanvas(key,canvas);return key;}
  if(material.kind==="biome")paintBiomeTexture(textureCtx,material.key);

  if(material.kind==="glass"){
    ctx.fillStyle="rgba(102,225,238,.18)";ctx.beginPath();ctx.moveTo(0,16);ctx.lineTo(32,0);ctx.lineTo(64,16);ctx.lineTo(64,48);ctx.lineTo(32,64);ctx.lineTo(0,48);ctx.closePath();ctx.fill();
    ctx.strokeStyle="#8feaf0";ctx.lineWidth=3;[[[0,16],[32,0],[64,16],[64,48],[32,64],[0,48],[0,16]],[[0,16],[32,32],[64,16]],[[32,32],[32,64]]].forEach((line)=>{ctx.beginPath();ctx.moveTo(...line[0]);line.slice(1).forEach((point)=>ctx.lineTo(...point));ctx.stroke();});
    scene.textures.addCanvas(key,canvas);return key;
  }

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
  if(material.kind==="prop"&&material.asset){const asset=scene.textures.get(`e3_block_asset_${material.key}`)?.getSourceImage?.();if(asset)ctx.drawImage(asset,6,-8,52,52);}
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

function createHabitatPreviewTexture(scene) {
  const key="e3_habitat_placement_preview";if(scene.textures.exists(key))return key;
  const canvas=document.createElement("canvas");canvas.width=320;canvas.height=288;const ctx=canvas.getContext("2d");
  ctx.strokeStyle="rgba(99,245,239,.92)";ctx.fillStyle="rgba(75,225,220,.1)";ctx.lineWidth=2;
  const polygon=(points,fill=true)=>{ctx.beginPath();ctx.moveTo(...points[0]);points.slice(1).forEach((point)=>ctx.lineTo(...point));ctx.closePath();if(fill)ctx.fill();ctx.stroke();};
  polygon([[160,0],[320,80],[160,160],[0,80]]);polygon([[0,80],[160,160],[160,288],[0,208]]);polygon([[160,160],[320,80],[320,208],[160,288]]);
  ctx.globalAlpha=.68;for(let i=1;i<5;i+=1){const step=i*32;ctx.beginPath();ctx.moveTo(step,80-step/2);ctx.lineTo(step+160,160-step/2);ctx.stroke();ctx.beginPath();ctx.moveTo(160+step,step/2);ctx.lineTo(step,80+step/2);ctx.stroke();}
  for(let i=1;i<4;i+=1){const y=i*32;ctx.beginPath();ctx.moveTo(0,80+y);ctx.lineTo(160,160+y);ctx.lineTo(320,80+y);ctx.stroke();}
  for(let i=1;i<5;i+=1){const x=i*32;ctx.beginPath();ctx.moveTo(x,80+x/2);ctx.lineTo(x,208+x/2);ctx.stroke();ctx.beginPath();ctx.moveTo(160+x,160-x/2);ctx.lineTo(160+x,288-x/2);ctx.stroke();}
  scene.textures.addCanvas(key,canvas);return key;
}

export function createIsometricBlockSystem({ scene, atlasKey, getMapKey, getGridSize, tileToDisplayPosition, tileToLogicalPosition, pointerToTilePosition, logicalWorldToTilePosition, getPlayer, syncWorldBlocks, onCollectSample, onEnterHabitat, enabled = () => true }) {
  const blocks = new Map();
  const sprites = new Map();
  const entityPhysics = new Map();
  const groundSprites = [];
  let active = false;
  let selectedMaterial = "dirt";
  let habitatOrientation = "se";
  let habitatPreview = null;
  let lastHabitatEntryAt = 0;
  let lastWorldUpdateAt = 0;
  const grassRegrowth = new Map();
  let jumpStartedAt = 0;
  let jumpStartFloorOffset = 0;
  let jumpStartX = 0;
  let jumpStartY = 0;
  let jumpTargetChecked = false;
  let currentElevation = null;
  let currentSupportTile = null;
  let jumpLandingTile = null;
  let supportTileOverride = null;
  let jumpHorizontalLocked = false;
  let visualFloorOffset = 0;
  let fallVelocity = 0;
  let fallActive = false;
  let lastVerticalUpdateAt = performance.now();
  let spaceKeyCaptured = false;
  const toolbar = document.createElement("aside");
  toolbar.className = "block-builder-panel";
  toolbar.hidden = true;
  toolbar.innerHTML = `<header><div><small>VOXEL BUILD MODE</small><strong>Expedition Blocks</strong></div><button type="button" data-close aria-label="Close block builder">×</button></header><p>V toggles · R rotates habitat · click a surface to place · right-click digs · middle-click picks · Space / Shift / Z jumps</p><div class="block-materials"></div><footer><span class="block-builder-status">Dirt</span><button type="button" data-clear>Regenerate world</button></footer>`;
  document.body.appendChild(toolbar);

  const materialsRoot = toolbar.querySelector(".block-materials");
  BLOCK_MATERIALS.filter((material) => material.key !== "bedrock").forEach((material) => {
    const button = document.createElement("button");button.type = "button";button.dataset.material = material.key;button.title = material.label;
    button.innerHTML = `<i style="--atlas-x:${material.frame % 4};--atlas-y:${Math.floor(material.frame / 4)};${material.asset?`background-image:url('/${material.asset}');background-size:contain;background-position:center;background-repeat:no-repeat`:""}"></i><span>${material.label}</span>`;
    button.addEventListener("click", () => { selectedMaterial = material.key;if(selectedMaterial!=="habitat_kit"&&habitatPreview){habitatPreview=null;render();}refreshToolbar(); });materialsRoot.appendChild(button);
  });

  const storageKey = () => `e3:block-world:v3:${getMapKey() || "default"}`;
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
      if(!block.floating)block.z = index + 1;
      if(previousZ>block.z)block.fallFromZ=Math.max(block.fallFromZ||0,previousZ);
      delete block.rotation;
      if (block.z <= MAX_BUILD_LAYER) blocks.set(blockKey(block.x, block.y, block.z), block);
    }));
  };
  const seededRandom=()=>{let seed=[...String(getMapKey()||"default")].reduce((value,char)=>(value*31+char.charCodeAt(0))>>>0,2166136261);return()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};};
  const habitatDoorTiles=(originX,originY,orientation)=>{const startX=originX+(orientation==="se"?1:2);return [{x:startX,y:originY+4},{x:startX+1,y:originY+4}];};
  const migrateAssembledHabitats=()=>{const groups=new Map();blocks.forEach((block)=>{if(!block.structure)return;if(!groups.has(block.structure))groups.set(block.structure,[]);groups.get(block.structure).push(block);});groups.forEach((parts)=>{const originX=Math.min(...parts.map((part)=>part.x));const originY=Math.min(...parts.map((part)=>part.y));const door=parts.find((part)=>part.habitatDoor);const orientation=door&&door.x-originX>2?"sw":"se";parts.forEach((part)=>blocks.delete(blockKey(part.x,part.y,part.z)));blocks.set(blockKey(originX,originY,2),{x:originX,y:originY,z:2,material:"habitat_kit",megaHabitat:true,orientation,width:5,height:5,levels:4,doorTiles:habitatDoorTiles(originX,originY,orientation)});});if(groups.size)save();};
  const addGeneratedTree=(x,y,baseZ,treeId)=>{const add=(tx,ty,z,material,part,floating=false)=>{if(z<1||z>MAX_BUILD_LAYER||blocks.has(blockKey(tx,ty,z)))return;blocks.set(blockKey(tx,ty,z),{x:tx,y:ty,z,material,generated:true,treeId,treePart:part,floating});};add(x,y,baseZ+1,"bark","trunk");add(x,y,baseZ+2,"bark","trunk");add(x,y,baseZ+3,"leaves","leaves",true);add(x,y,baseZ+4,"leaves","leaves",true);for(let oy=-1;oy<=1;oy+=1){for(let ox=-1;ox<=1;ox+=1){if(!ox&&!oy)continue;add(x+ox,y+oy,baseZ+3,"leaves","leaves",true);}}};
  const generateWorld=()=>{blocks.clear();grassRegrowth.clear();const size=getGridSize();const random=seededRandom();for(let y=0;y<size.height;y+=1){for(let x=0;x<size.width;x+=1)blocks.set(blockKey(x,y,1),{x,y,z:1,material:"grass",generated:true});}
    const setWater=(x,y)=>{if(x<1||y<1||x>=size.width-1||y>=size.height-1)return false;blocks.set(blockKey(x,y,1),{x,y,z:1,material:"water",generated:true,protectedWater:true});return true;};
    const paintPond=(cx,cy)=>{const water=new Set();const frontier=[];for(let oy=0;oy<2;oy+=1){for(let ox=0;ox<2;ox+=1){const x=cx+ox,y=cy+oy;if(setWater(x,y)){water.add(`${x}:${y}`);frontier.push({x,y,depth:0});}}}while(frontier.length&&water.size<42){const cell=frontier.shift();for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const x=cell.x+dx,y=cell.y+dy,key=`${x}:${y}`;if(water.has(key)||x<1||y<1||x>=size.width-1||y>=size.height-1)continue;const probability=.62*Math.pow(.72,cell.depth);if(random()>probability)continue;if(setWater(x,y)){water.add(key);frontier.push({x,y,depth:cell.depth+1});}}}};
    for(let i=0;i<Math.max(2,Math.floor(size.width*size.height/450));i+=1)paintPond(2+Math.floor(random()*Math.max(2,size.width-5)),2+Math.floor(random()*Math.max(2,size.height-5)));
    const paintMountain=(cx,cy,radius)=>{const heights=new Map();for(let y=Math.max(1,cy-radius);y<=Math.min(size.height-2,cy+radius);y+=1){for(let x=Math.max(1,cx-radius);x<=Math.min(size.width-2,cx+radius);x+=1){const distance=Math.hypot(x-cx,y-cy);if(distance>radius+.2)continue;heights.set(`${x}:${y}`,Math.max(1,Math.min(MAX_BUILD_LAYER-1,1+Math.floor(radius-distance))));}}heights.forEach((height,key)=>{const [x,y]=key.split(":").map(Number);for(let z=1;z<=height;z+=1){const top=z===height;const roll=random();const material=top?"grass":roll<.035?"crystal":roll<.1?"iron":"dirt";blocks.set(blockKey(x,y,z),{x,y,z,material,generated:true,protectedGround:z===1&&(material==="iron"||material==="crystal")});}});};
    for(let i=0;i<Math.max(2,Math.floor(size.width*size.height/650));i+=1)paintMountain(3+Math.floor(random()*Math.max(2,size.width-6)),3+Math.floor(random()*Math.max(2,size.height-6)),2+Math.floor(random()*3));let trees=0;for(let attempts=0;attempts<size.width*size.height&&trees<Math.max(4,Math.floor(size.width*size.height/300));attempts+=1){const x=2+Math.floor(random()*Math.max(2,size.width-4)),y=2+Math.floor(random()*Math.max(2,size.height-4));if(terrainHeight(x,y)!==1||blocks.get(blockKey(x,y,1))?.material!=="grass")continue;addGeneratedTree(x,y,1,`generated-tree-${trees}`);trees+=1;}save();};
  const load = () => { blocks.clear();try{const saved=JSON.parse(localStorage.getItem(storageKey())||"[]");saved.forEach((block)=>{if(materialByKey.has(block.material)&&block.z>=1&&block.z<=MAX_BUILD_LAYER)blocks.set(blockKey(block.x,block.y,block.z),block);});migrateAssembledHabitats();if(!blocks.size&&getMapKey()==="default_room")generateWorld();else settleBlocks();}catch{if(getMapKey()==="default_room")generateWorld();}render(); };
  const refreshToolbar = () => { toolbar.querySelector(".block-builder-status").textContent=(materialByKey.get(selectedMaterial)?.label||selectedMaterial)+(selectedMaterial==="habitat_kit"?` · door ${habitatOrientation.toUpperCase()}`:"");toolbar.querySelectorAll("[data-material]").forEach((button)=>button.classList.toggle("active",button.dataset.material===selectedMaterial)); };

  function render() {
    sprites.forEach((sprite) => sprite.destroy());sprites.clear();
    groundSprites.forEach((sprite) => sprite.destroy());groundSprites.length=0;
    const size=getGridSize();const dirtGroundTexture=createGroundTexture(scene,atlasKey,materialByKey.get("dirt"));const stoneGroundTexture=createGroundTexture(scene,atlasKey,materialByKey.get("stone"));
    for(let y=0;y<size.height;y+=1){for(let x=0;x<size.width;x+=1){const display=tileToDisplayPosition(x,y);const groundTexture=blocks.get(blockKey(x,y,1))?.material==="water"?stoneGroundTexture:dirtGroundTexture;const ground=scene.add.image(display.x,display.y,groundTexture);ground.setOrigin(.5,1);ground.setDepth(1+(x+y)*.01);groundSprites.push(ground);}}
    [...blocks.values()].sort((a,b)=>(a.x+a.y)-(b.x+b.y)||a.z-b.z).forEach((block) => {
      const material=materialByKey.get(block.material);if(!material)return;if(block.megaHabitat){const center=tileToDisplayPosition(block.x+2,block.y+2);const bottom=tileToDisplayPosition(block.x+4,block.y+4);const textureKey=`e3_block_asset_${block.material}`;const sprite=scene.add.image(center.x,bottom.y-(block.z-1)*BLOCK_RISE,textureKey);sprite.setOrigin(.5,1);sprite.setDisplaySize(320,288);sprite.setFlipX(block.orientation==="sw");sprite.setDepth(10+bottom.y*.001+block.z*.0001);sprite.setAlpha(syncWorldBlocks?0.001:1);sprite.setData("e3Block",block);sprites.set(blockKey(block.x,block.y,block.z),sprite);return;}const display=tileToDisplayPosition(block.x,block.y);
      const textureKey=createBlockTexture(scene,atlasKey,material);const sprite=scene.add.image(display.x,display.y-(block.z-1)*BLOCK_RISE,textureKey);sprite.setOrigin(.5,1);sprite.setDepth(10+display.y*.001+block.z*.0001);sprite.setAlpha(syncWorldBlocks?0.001:1);sprite.setData("e3Block",block);sprites.set(blockKey(block.x,block.y,block.z),sprite);
    });
    if(active&&selectedMaterial==="habitat_kit"&&habitatPreview){const center=tileToDisplayPosition(habitatPreview.x+2,habitatPreview.y+2);const bottom=tileToDisplayPosition(habitatPreview.x+4,habitatPreview.y+4);const previewBlock={x:habitatPreview.x,y:habitatPreview.y,z:2,material:"habitat_kit",previewHabitat:true,megaHabitat:true,orientation:habitatOrientation};const sprite=scene.add.image(center.x,bottom.y-BLOCK_RISE,createHabitatPreviewTexture(scene));sprite.setOrigin(.5,1);sprite.setDepth(2000);sprite.setAlpha(syncWorldBlocks?0.001:1);sprite.setData("e3Block",previewBlock);sprites.set("habitat-preview",sprite);}
    if(syncWorldBlocks){syncWorldBlocks([...sprites.values()].map((sprite)=>{const block=sprite.getData("e3Block");const material=materialByKey.get(block.material);const display=block.megaHabitat?tileToDisplayPosition(block.x+4,block.y+4):tileToDisplayPosition(block.x,block.y);return {id:block.previewHabitat?"habitat-preview":blockKey(block.x,block.y,block.z),x:sprite.x,y:sprite.y,z:block.z,startY:block.megaHabitat?sprite.y:display.y-((block.fallFromZ||block.z)-1)*BLOCK_RISE,sortY:block.previewHabitat?999999:display.y,canvas:scene.textures.get(sprite.texture.key).getSourceImage(),width:block.megaHabitat?320:64,height:block.megaHabitat?288:64,flipX:block.megaHabitat&&block.orientation==="sw",materialKey:block.material,transparent:block.previewHabitat||!!material?.transparent||block.material==="water"||block.material==="portal",opacity:block.previewHabitat?.34:undefined,preview:!!block.previewHabitat,ditherBounds:block.megaHabitat&&!block.previewHabitat?{halfWidth:160,top:160,bottom:24}:undefined,animated:block.material==="water"||block.material==="portal"};}));blocks.forEach((block)=>delete block.fallFromZ);}
  }

  function buildHabitat(tileX,tileY){const size=getGridSize();const originX=tileX-2,originY=tileY-2;if(originX<0||originY<0||originX+4>=size.width||originY+4>=size.height)return;for(let y=originY;y<=originY+4;y+=1){for(let x=originX;x<=originX+4;x+=1){for(let z=2;z<=MAX_BUILD_LAYER;z+=1)blocks.delete(blockKey(x,y,z));}}const block={x:originX,y:originY,z:2,material:"habitat_kit",megaHabitat:true,orientation:habitatOrientation,width:5,height:5,levels:4,doorTiles:habitatDoorTiles(originX,originY,habitatOrientation)};blocks.set(blockKey(originX,originY,2),block);save();render();}
  function place(tileX,tileY,targetZ=1) { if(selectedMaterial==="habitat_kit"){buildHabitat(tileX,tileY);return;}const size=getGridSize();if(tileX<0||tileY<0||tileX>=size.width||tileY>=size.height)return;const z=Math.max(1,Math.min(MAX_BUILD_LAYER,targetZ));if(blocks.has(blockKey(tileX,tileY,z)))return;const below=blocks.get(blockKey(tileX,tileY,z-1));if(below&&materialByKey.get(below.material)?.nonStackable)return;const block={x:tileX,y:tileY,z,material:selectedMaterial,fallFromZ:Math.min(MAX_BUILD_LAYER+1,z+1)};if(selectedMaterial==="tree_sprout")block.plantedAt=Date.now();blocks.set(blockKey(tileX,tileY,z),block);settleBlocks();save();render(); }
  function destroy(tileX,tileY,z) { const targetZ=z||terrainHeight(tileX,tileY);const key=blockKey(tileX,tileY,targetZ);const block=blocks.get(key);if(!block)return;if(block.protectedWater){onCollectSample?.("water_sample");return;}if(block.protectedGround){block.material="dirt";delete block.protectedGround;grassRegrowth.set(`${tileX}:${tileY}`,{x:tileX,y:tileY,z:targetZ,at:Date.now()+30000});save();render();return;}if(block.treeId&&block.treePart==="trunk"){blocks.forEach((part)=>{if(part.treeId===block.treeId)part.floating=false;});}if(block.generated&&block.material==="grass")grassRegrowth.set(`${tileX}:${tileY}`,{x:tileX,y:tileY,z:targetZ,at:Date.now()+30000});if(blocks.delete(key)){settleBlocks();save();render();} }
  function pick(tileX,tileY,z) { const block=blocks.get(blockKey(tileX,tileY,z||terrainHeight(tileX,tileY)));if(block){selectedMaterial=block.material;refreshToolbar();} }
  const pointInPolygon=(x,y,points)=>points.reduce((inside,[xi,yi],index)=>{const [xj,yj]=points[(index+points.length-1)%points.length];return ((yi>y)!==(yj>y))&&(x<(xj-xi)*(y-yi)/(yj-yi)+xi)?!inside:inside;},false);
  function getClickedFace(pointer){for(const sprite of [...sprites.values()].sort((a,b)=>b.depth-a.depth)){const block=sprite.getData("e3Block");if(block?.previewHabitat)continue;if(block?.megaHabitat){if(pointer.worldX>=sprite.x-160&&pointer.worldX<=sprite.x+160&&pointer.worldY>=sprite.y-288&&pointer.worldY<=sprite.y)return {block,face:"top"};continue;}const left=sprite.x-BLOCK_SIZE/2;const top=sprite.y-BLOCK_SIZE;const x=pointer.worldX-left;const y=pointer.worldY-top;if(x<0||x>BLOCK_SIZE||y<0||y>BLOCK_SIZE)continue;const faces={top:[[0,16],[32,0],[64,16],[32,32]],left:[[0,16],[32,32],[32,64],[0,48]],right:[[32,32],[64,16],[64,48],[32,64]]};for(const face of ["top","left","right"]){if(pointInPolygon(x,y,faces[face]))return {block,face};}}return null;}
  function handlePointer(pointer) { if(!active||!enabled())return false;if(pointer.event?.target?.closest?.(".block-builder-panel"))return true;const hit=getClickedFace(pointer);const tile=hit?.block||pointerToTilePosition(pointer.worldX,pointer.worldY);if(!tile)return true;const tileX=hit?.block.x??tile.tileX;const tileY=hit?.block.y??tile.tileY;if(pointer.rightButtonDown())destroy(tileX,tileY,hit?.block.z);else if(pointer.middleButtonDown())pick(tileX,tileY,hit?.block.z);else if(pointer.leftButtonDown()){if(!hit)place(tileX,tileY,1);else if(hit.face==="top")place(tileX,tileY,hit.block.z+1);else if(hit.face==="left")place(tileX,tileY+1,hit.block.z);else place(tileX+1,tileY,hit.block.z);}return true; }
  function handlePointerMove(pointer){if(!active||!enabled()||selectedMaterial!=="habitat_kit"){if(habitatPreview){habitatPreview=null;render();}return false;}const tile=pointerToTilePosition(pointer.worldX,pointer.worldY);if(!tile)return true;const next={x:tile.tileX-2,y:tile.tileY-2};if(!habitatPreview||next.x!==habitatPreview.x||next.y!==habitatPreview.y){habitatPreview=next;render();}return true;}
  function getHabitatAt(tileX,tileY){return [...blocks.values()].find((block)=>block.megaHabitat&&tileX>=block.x&&tileX<block.x+5&&tileY>=block.y&&tileY<block.y+5)||null;}
  function terrainHeight(tileX,tileY) { const habitat=getHabitatAt(tileX,tileY);if(habitat){const doors=habitat.doorTiles||habitatDoorTiles(habitat.x,habitat.y,habitat.orientation);if(doors.some((door)=>tileX===door.x&&tileY===door.y))return 1;return habitat.z+habitat.levels-1;}let height=0;let topMaterial=null;for(let z=1;z<=MAX_BUILD_LAYER;z+=1){const block=blocks.get(blockKey(tileX,tileY,z));if(!block||!materialByKey.get(block.material)?.solid)break;height=z;topMaterial=materialByKey.get(block.material);}return height+(topMaterial?.nonStackable?1:0); }
  function hasClearance(tileX,tileY,floor) { for(let z=floor+1;z<=Math.min(MAX_BUILD_LAYER,floor+2);z+=1){const block=blocks.get(blockKey(tileX,tileY,z));if(block&&materialByKey.get(block.material)?.solid)return false;}return true; }
  function getFootprintTiles(worldX,worldY) { const samples=[[0,0],[-PLAYER_COLLISION_RADIUS,0],[PLAYER_COLLISION_RADIUS,0],[0,-PLAYER_COLLISION_RADIUS],[0,PLAYER_COLLISION_RADIUS]];const unique=new Map();samples.forEach(([dx,dy])=>{const tile=logicalWorldToTilePosition(worldX+dx,worldY+dy);if(tile)unique.set(`${tile.tileX}:${tile.tileY}`,tile);});return [...unique.values()]; }
  function ensureElevation(worldX,worldY){const tile=logicalWorldToTilePosition(worldX,worldY);if(currentElevation===null){currentElevation=tile?terrainHeight(tile.tileX,tile.tileY):0;currentSupportTile=tile;}return tile;}
  function overlapsTile(worldX,worldY,tile,radius=EDGE_DROP_CLEARANCE){const logical=tile&&tileToLogicalPosition(tile.tileX,tile.tileY);if(!logical)return false;const half=logical.size/2;const closestX=Math.max(logical.x-half,Math.min(worldX,logical.x+half));const closestY=Math.max(logical.y-half,Math.min(worldY,logical.y+half));return Math.hypot(worldX-closestX,worldY-closestY)<radius;}
  function getSupportFloorOffset(worldX,worldY){ensureElevation(worldX,worldY);return currentElevation*BLOCK_RISE;}
  function finishLanding(tile){const player=getPlayer();const logical=tile&&tileToLogicalPosition(tile.tileX,tile.tileY);if(!player||!logical)return;const half=logical.size/2-.75;player.x=Math.max(logical.x-half,Math.min(player.x,logical.x+half));player.y=Math.max(logical.y-half,Math.min(player.y,logical.y+half));}
  function getTileCollision(worldX,worldY,currentFloor,radius=PLAYER_COLLISION_RADIUS,maxStep=0){const center=logicalWorldToTilePosition(worldX,worldY);if(!center)return {hard:true};let best=null;for(let y=center.tileY-1;y<=center.tileY+1;y+=1){for(let x=center.tileX-1;x<=center.tileX+1;x+=1){const height=terrainHeight(x,y);if(height<=currentFloor+maxStep)continue;const logical=tileToLogicalPosition(x,y);if(!logical)continue;const half=logical.size/2;const closestX=Math.max(logical.x-half,Math.min(worldX,logical.x+half));const closestY=Math.max(logical.y-half,Math.min(worldY,logical.y+half));let nx=worldX-closestX;let ny=worldY-closestY;const distance=Math.hypot(nx,ny);if(distance>=radius)continue;if(distance<.001){const dx=worldX-logical.x;const dy=worldY-logical.y;if(Math.abs(dx)>Math.abs(dy)){nx=Math.sign(dx)||1;ny=0;}else{nx=0;ny=Math.sign(dy)||1;}}else{nx/=distance;ny/=distance;}const penetration=radius-distance;if(!best||penetration>best.penetration)best={tileX:x,tileY:y,height,nx,ny,penetration};}}return best;}
  function resolveMovement(startX,startY,dx,dy,jumping=false,radius=PLAYER_COLLISION_RADIUS,playerControlled=true){if(!dx&&!dy)return {x:startX,y:startY};if(playerControlled&&fallActive)return {x:startX,y:startY};const currentTile=ensureElevation(startX,startY);if(!currentTile)return {x:startX,y:startY};let targetX=startX+dx;let targetY=startY+dy;if(playerControlled&&jumping){const movementLength=Math.hypot(dx,dy);if(!jumpTargetChecked&&movementLength){jumpTargetChecked=true;const logical=tileToLogicalPosition(currentTile.tileX,currentTile.tileY);const lookAhead=(logical?.size||64)*.7;const landingTile=logicalWorldToTilePosition(startX+dx/movementLength*lookAhead,startY+dy/movementLength*lookAhead);if(landingTile&&terrainHeight(landingTile.tileX,landingTile.tileY)===currentElevation+1)jumpLandingTile=landingTile;}const travelX=targetX-jumpStartX;const travelY=targetY-jumpStartY;const travel=Math.hypot(travelX,travelY);if(travel>JUMP_TRAVEL_LIMIT){targetX=jumpStartX+travelX/travel*JUMP_TRAVEL_LIMIT;targetY=jumpStartY+travelY/travel*JUMP_TRAVEL_LIMIT;}}const currentFloor=playerControlled?currentElevation:terrainHeight(currentTile.tileX,currentTile.tileY);const stepAllowance=jumping&&playerControlled?1:0;const collision=getTileCollision(targetX,targetY,currentFloor,radius,stepAllowance);if(!collision)return {x:targetX,y:targetY};const inward=dx*collision.nx+dy*collision.ny;const slideX=inward<0?dx-collision.nx*inward:dx;const slideY=inward<0?dy-collision.ny*inward:dy;const slideTargetX=startX+slideX+collision.nx*.2;const slideTargetY=startY+slideY+collision.ny*.2;if(!getTileCollision(slideTargetX,slideTargetY,currentFloor,radius,stepAllowance))return {x:slideTargetX,y:slideTargetY};return {x:startX+collision.nx*.2,y:startY+collision.ny*.2};}
  function canMoveTo(worldX,worldY,jumping=false) { const player=getPlayer();if(!player)return false;const resolved=resolveMovement(player.x,player.y,worldX-player.x,worldY-player.y,jumping);return Math.abs(resolved.x-worldX)<.01&&Math.abs(resolved.y-worldY)<.01; }
  function requestJump() { const player=getPlayer();if(jumpStartedAt||fallActive||!player)return;const tile=ensureElevation(player.x,player.y);jumpLandingTile=null;jumpTargetChecked=false;jumpHorizontalLocked=false;jumpStartX=player.x;jumpStartY=player.y;jumpStartFloorOffset=currentElevation*BLOCK_RISE;currentSupportTile=tile;visualFloorOffset=jumpStartFloorOffset;fallVelocity=0;fallActive=false;jumpStartedAt=performance.now(); }
  function getPlayerOffsets(worldX,worldY) { const tile=ensureElevation(worldX,worldY);const now=performance.now();const dt=Math.min(.05,Math.max(0,(now-lastVerticalUpdateAt)/1000));lastVerticalUpdateAt=now;if(jumpStartedAt){const elapsed=(now-jumpStartedAt)/JUMP_DURATION_MS;if(elapsed<1){const plannedTile=jumpLandingTile||tile;const landingHeight=plannedTile?terrainHeight(plannedTile.tileX,plannedTile.tileY):currentElevation;const nextElevation=landingHeight<=currentElevation+1?landingHeight:currentElevation;const landingOffset=nextElevation*BLOCK_RISE;const desiredElevation=jumpStartFloorOffset+(landingOffset-jumpStartFloorOffset)*elapsed+Math.sin(elapsed*Math.PI)*JUMP_HEIGHT;visualFloorOffset=landingOffset;return {floor:landingOffset,jump:desiredElevation-landingOffset,supportTile:tile||currentSupportTile,elevation:nextElevation};}jumpStartedAt=0;const landingHeight=tile?terrainHeight(tile.tileX,tile.tileY):currentElevation;if(landingHeight<=currentElevation+1){currentElevation=landingHeight;currentSupportTile=tile;}jumpLandingTile=null;visualFloorOffset=currentElevation*BLOCK_RISE;fallVelocity=0;}const groundElevation=tile?terrainHeight(tile.tileX,tile.tileY):0;const targetFloorOffset=groundElevation*BLOCK_RISE;if(groundElevation>currentElevation){currentElevation=groundElevation;visualFloorOffset=targetFloorOffset;fallActive=false;}else if(groundElevation<currentElevation){if(!fallActive&&overlapsTile(worldX,worldY,currentSupportTile)){visualFloorOffset=currentElevation*BLOCK_RISE;fallVelocity=0;return {floor:visualFloorOffset,jump:0,supportTile:currentSupportTile,elevation:currentElevation};}fallActive=true;currentSupportTile=tile;fallVelocity+=FALL_ACCELERATION*dt;visualFloorOffset=Math.max(targetFloorOffset,visualFloorOffset-fallVelocity*dt);if(visualFloorOffset===targetFloorOffset){currentElevation=groundElevation;fallVelocity=0;fallActive=false;}}else{visualFloorOffset=targetFloorOffset;currentSupportTile=tile;fallVelocity=0;fallActive=false;}return {floor:visualFloorOffset,jump:0,supportTile:currentSupportTile||tile,elevation:currentElevation}; }
  function updateWorld(){const now=Date.now();if(now-lastWorldUpdateAt<250)return;lastWorldUpdateAt=now;let changed=false;blocks.forEach((block,key)=>{if(block.material!=="tree_sprout"||!block.plantedAt||now-block.plantedAt<10000)return;blocks.delete(key);addGeneratedTree(block.x,block.y,Math.max(0,block.z-1),`planted-tree-${now}-${block.x}-${block.y}`);changed=true;});grassRegrowth.forEach((entry,key)=>{if(now<entry.at)return;const z=Math.min(MAX_BUILD_LAYER,terrainHeight(entry.x,entry.y)+1);if(z>=1&&!blocks.has(blockKey(entry.x,entry.y,z))){blocks.set(blockKey(entry.x,entry.y,z),{x:entry.x,y:entry.y,z,material:"grass",generated:true,fallFromZ:MAX_BUILD_LAYER+1});changed=true;}grassRegrowth.delete(key);});const player=getPlayer();const tile=player&&logicalWorldToTilePosition(player.x,player.y);if(tile){const habitat=getHabitatAt(tile.tileX,tile.tileY);const doors=habitat&&(habitat.doorTiles||habitatDoorTiles(habitat.x,habitat.y,habitat.orientation));if(habitat&&doors.some((door)=>tile.tileX===door.x&&tile.tileY===door.y)&&now-lastHabitatEntryAt>2500){lastHabitatEntryAt=now;onEnterHabitat?.();}}if(changed){save();render();}}
  function updateEntityPhysics(id,worldX,worldY,dx,dy,radius=5){
    const now=performance.now();let state=entityPhysics.get(id);let tile=logicalWorldToTilePosition(worldX,worldY);if(!tile)return {x:worldX,y:worldY,floor:0,jump:0,elevation:0};
    if(!state){const elevation=terrainHeight(tile.tileX,tile.tileY);state={elevation,floor:elevation*BLOCK_RISE,supportTile:tile,jumpStartedAt:0,jumpStartFloor:0,falling:false,fallVelocity:0,lastAt:now};entityPhysics.set(id,state);}
    const dt=Math.min(.05,Math.max(0,(now-state.lastAt)/1000));state.lastAt=now;
    if(state.falling){const ground=terrainHeight(tile.tileX,tile.tileY);const target=ground*BLOCK_RISE;state.fallVelocity+=FALL_ACCELERATION*dt;state.floor=Math.max(target,state.floor-state.fallVelocity*dt);if(state.floor===target){state.elevation=ground;state.falling=false;state.fallVelocity=0;state.supportTile=tile;}return {x:worldX,y:worldY,floor:state.floor,jump:0,supportTile:state.supportTile,elevation:state.elevation,falling:true};}
    let stepAllowance=state.jumpStartedAt?1:0;let targetX=worldX+dx;let targetY=worldY+dy;let collision=getTileCollision(targetX,targetY,state.elevation,radius,stepAllowance);
    if(collision&&collision.height===state.elevation+1&&!state.jumpStartedAt){state.jumpStartedAt=now;state.jumpStartFloor=state.elevation*BLOCK_RISE;stepAllowance=1;collision=getTileCollision(targetX,targetY,state.elevation,radius,stepAllowance);}
    if(!collision){worldX=targetX;worldY=targetY;}else{const inward=dx*collision.nx+dy*collision.ny;const slideX=inward<0?dx-collision.nx*inward:dx;const slideY=inward<0?dy-collision.ny*inward:dy;const slideXTarget=worldX+slideX+collision.nx*.2;const slideYTarget=worldY+slideY+collision.ny*.2;if(!getTileCollision(slideXTarget,slideYTarget,state.elevation,radius,stepAllowance)){worldX=slideXTarget;worldY=slideYTarget;}}
    tile=logicalWorldToTilePosition(worldX,worldY)||tile;const ground=terrainHeight(tile.tileX,tile.tileY);
    if(state.jumpStartedAt){const elapsed=(now-state.jumpStartedAt)/JUMP_DURATION_MS;const landingElevation=ground<=state.elevation+1?ground:state.elevation;const landingFloor=landingElevation*BLOCK_RISE;if(elapsed<1){const desired=state.jumpStartFloor+(landingFloor-state.jumpStartFloor)*elapsed+Math.sin(elapsed*Math.PI)*JUMP_HEIGHT;state.floor=landingFloor;return {x:worldX,y:worldY,floor:landingFloor,jump:desired-landingFloor,supportTile:tile,elevation:landingElevation,jumping:true};}state.jumpStartedAt=0;state.elevation=landingElevation;state.floor=landingFloor;state.supportTile=tile;}
    if(ground<state.elevation){if(!overlapsTile(worldX,worldY,state.supportTile,radius+4)){state.falling=true;state.fallVelocity=0;state.supportTile=tile;}}else if(ground===state.elevation){state.supportTile=tile;state.floor=ground*BLOCK_RISE;}
    return {x:worldX,y:worldY,floor:state.floor,jump:0,supportTile:state.supportTile,elevation:state.elevation,falling:state.falling};
  }
  function toggle(force) { active=typeof force==="boolean"?force:!active;toolbar.hidden=!active;if(!active&&habitatPreview){habitatPreview=null;render();}refreshToolbar();return active; }

  const handleKey = (event) => {
    if (["INPUT","TEXTAREA","SELECT"].includes(document.activeElement?.tagName)) return;
    if (event.code === "KeyV" && enabled()) { event.preventDefault();toggle();return; }
    if (event.code === "KeyR" && enabled() && selectedMaterial==="habitat_kit") { event.preventDefault();habitatOrientation=habitatOrientation==="se"?"sw":"se";refreshToolbar();if(habitatPreview)render();return; }
    if (["Space","ShiftLeft","ShiftRight","KeyZ"].includes(event.code) && enabled()) { event.preventDefault();if(event.code==="Space")spaceKeyCaptured=true;requestJump();return; }
    if (!active) return;
  };
  window.addEventListener("keydown",handleKey,true);
  const handleKeyUp=(event)=>{if(event.code!=="Space")return;if(enabled()&&!spaceKeyCaptured)requestJump();spaceKeyCaptured=false;};
  window.addEventListener("keyup",handleKeyUp,true);

  toolbar.querySelector("[data-close]").addEventListener("click",()=>toggle(false));toolbar.querySelector("[data-clear]").addEventListener("click",()=>{if(confirm("Regenerate this map and replace all placed blocks?")){generateWorld();render();}});
  load();refreshToolbar();
  return { toggle, isActive:()=>active, isJumping:()=>!!jumpStartedAt, isFalling:()=>fallActive, handlePointer, handlePointerMove, render, load, update:updateWorld, requestJump, getPlayerOffsets, updateEntityPhysics, canMoveTo, resolveMovement, resolveEntityMovement:(x,y,dx,dy,radius=5)=>resolveMovement(x,y,dx,dy,false,radius,false), terrainHeight, regenerate:()=>{generateWorld();render();}, destroy:()=>{window.removeEventListener("keydown",handleKey,true);window.removeEventListener("keyup",handleKeyUp,true);toolbar.remove();syncWorldBlocks?.([]);sprites.forEach((sprite)=>sprite.destroy());sprites.clear();groundSprites.forEach((sprite)=>sprite.destroy());groundSprites.length=0;} };
}
