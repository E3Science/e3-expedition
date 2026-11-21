const BLOCK_SIZE = 64;
const BLOCK_RISE = 32;
const MAX_BUILD_LAYER = 7;
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
  ["crate", "Storage crate", 12, true], ["cave", "Igneous rock", 13, true],
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
  {key:"habitat_wall",label:"Habitat wall",frame:10,solid:true,kind:"prop",asset:"assets/tiles/isometric/alien-expansion/collection-v2/individual/habitat-exterior/habitat_command_middle.png"},
  {key:"sedimentary",label:"Sedimentary rock",frame:2,solid:true,kind:"sedimentary"},
  {key:"ice",label:"Ice",frame:8,solid:true,kind:"ice",transparent:true},
  {key:"magma",label:"Magma",frame:8,solid:true,kind:"magma",animated:true},
  {key:"fossil_plant",label:"Ancient plant fossil",frame:2,solid:true,kind:"fossil"},
  {key:"fossil_creature",label:"Ancient creature fossil",frame:2,solid:true,kind:"fossil"},
  {key:"seismograph",label:"Seismograph",frame:10,solid:true,kind:"furniture",nonStackable:true},
  {key:"core_sampler",label:"Core sampler",frame:10,solid:true,kind:"coreSampler",nonStackable:true,asset:"assets/blocks/core-sampler-v2.png"},
  {key:"core_clearance",label:"Core sampler clearance",frame:10,solid:true,kind:"invisible",nonStackable:true,hidden:true}
  ,{key:"kayak_kit",label:"3×1 kayak",frame:10,solid:true,kind:"vehicleKit"}
  ,{key:"boat_kit",label:"3×6×2 boat",frame:10,solid:true,kind:"vehicleKit"}
  ,{key:"tree_sprout",label:"Tree sprout",frame:7,solid:false,kind:"sprout",nonStackable:true}
  ,{key:"tool_bulldozer",label:"Bulldozer · drag to level",frame:2,solid:false,kind:"editorTool",nonStackable:true,asset:"assets/blocks/expedition-kit/bulldozer.png"}
  ,{key:"tool_hill",label:"Hill tool · hold to grow",frame:5,solid:false,kind:"editorTool",nonStackable:true}
  ,{key:"tool_mountain",label:"Mountain tool · hold to grow",frame:13,solid:false,kind:"editorTool",nonStackable:true}
  ,{key:"tool_digging",label:"Excavator · hold to dig",frame:1,solid:false,kind:"editorTool",nonStackable:true,asset:"assets/blocks/expedition-kit/excavator.png"}
  ,{key:"solar_panel",label:"Solar panel",frame:10,solid:true,kind:"furniture",nonStackable:true,asset:"assets/blocks/expedition-kit/solar-panel.png"}
  ,{key:"satellite",label:"Satellite dish",frame:10,solid:true,kind:"furniture",nonStackable:true,asset:"assets/blocks/expedition-kit/satellite.png"}
  ,{key:"water_pump",label:"Water pump",frame:10,solid:true,kind:"furniture",nonStackable:true,asset:"assets/blocks/expedition-kit/water-pump.png"}
  ,{key:"pipe_straight_up",label:"Pipe · diagonal up",frame:10,solid:true,kind:"furniture",asset:"assets/blocks/expedition-kit/pipe-straight-up.png"}
  ,{key:"pipe_straight_down",label:"Pipe · diagonal down",frame:10,solid:true,kind:"furniture",asset:"assets/blocks/expedition-kit/pipe-straight-down.png"}
  ,{key:"pipe_elbow",label:"Pipe · elbow",frame:10,solid:true,kind:"furniture",asset:"assets/blocks/expedition-kit/pipe-elbow.png"}
  ,{key:"pipe_junction",label:"Pipe · junction",frame:10,solid:true,kind:"furniture",asset:"assets/blocks/expedition-kit/pipe-junction.png"}
  ,{key:"pipe_cross",label:"Pipe · cross",frame:10,solid:true,kind:"furniture",asset:"assets/blocks/expedition-kit/pipe-cross.png"}
  ,{key:"conveyor_up",label:"Conveyor · diagonal up",frame:10,solid:true,kind:"conveyor",asset:"assets/blocks/expedition-kit/conveyor.png"}
  ,{key:"conveyor_down",label:"Conveyor · diagonal down",frame:10,solid:true,kind:"conveyor",asset:"assets/blocks/expedition-kit/conveyor.png"}
  ,{key:"processor_io",label:"Processing input/output",frame:10,solid:true,kind:"furniture",nonStackable:true,asset:"assets/blocks/expedition-kit/processor.png"}
  ,{key:"hydroponic_cultivator",label:"Hydroponic plant cultivator",frame:10,solid:true,kind:"cultivator",nonStackable:true,asset:"assets/tiles/isometric/alien-expansion/collection-v2/individual/habitat-interior/interior_hydroponic_planter.png"}
  ,{key:"habitat_kit",label:"5×5 habitat",frame:10,solid:true,kind:"habitat",nonStackable:true,asset:"assets/blocks/habitat-mega-v3.svg"}
]);

const materialByKey = new Map(BLOCK_MATERIALS.map((entry) => [entry.key, entry]));
const blockKey = (x, y, z) => `${x}:${y}:${z}`;

function drawContainedAsset(ctx,asset,padding=2){const probe=document.createElement("canvas");probe.width=asset.width;probe.height=asset.height;const probeCtx=probe.getContext("2d");probeCtx.drawImage(asset,0,0);const pixels=probeCtx.getImageData(0,0,probe.width,probe.height).data;let minX=probe.width,minY=probe.height,maxX=-1,maxY=-1;for(let y=0;y<probe.height;y+=1){for(let x=0;x<probe.width;x+=1){if(pixels[(y*probe.width+x)*4+3]>8){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}}}if(maxX<minX)return;const width=maxX-minX+1;const height=maxY-minY+1;const scale=Math.min((BLOCK_SIZE-padding*2)/width,(BLOCK_SIZE-padding*2)/height);const drawWidth=width*scale;const drawHeight=height*scale;ctx.drawImage(asset,minX,minY,width,height,(BLOCK_SIZE-drawWidth)/2,(BLOCK_SIZE-drawHeight)/2,drawWidth,drawHeight);}

function createCoreSamplerPartTexture(scene,block){
  const part=Math.max(0,Math.min(2,Number(block.corePart)||0));
  const key=`e3_core_sampler_part_${part}`;
  if(scene.textures.exists(key))return key;
  const canvas=document.createElement("canvas");canvas.width=canvas.height=BLOCK_SIZE;
  const ctx=canvas.getContext("2d");ctx.imageSmoothingEnabled=true;
  const asset=scene.textures.get("e3_block_asset_core_sampler")?.getSourceImage?.();
  if(!asset){scene.textures.addCanvas(key,canvas);return key;}
  // The source is one continuous machine. Each crop deliberately overlaps the
  // neighboring crop so the drill column remains visually joined when stacked.
  const crops=[
    {x:.035,y:.515,w:.93,h:.485,pad:0},
    {x:.29,y:.255,w:.50,h:.43,pad:9},
    {x:.32,y:0,w:.46,h:.34,pad:10}
  ];
  const crop=crops[part];
  const sx=Math.round(asset.width*crop.x),sy=Math.round(asset.height*crop.y);
  const sw=Math.round(asset.width*crop.w),sh=Math.round(asset.height*crop.h);
  const available=BLOCK_SIZE-crop.pad*2;
  const scale=Math.min(available/sw,BLOCK_SIZE/sh);
  const dw=sw*scale,dh=sh*scale;
  ctx.drawImage(asset,sx,sy,sw,sh,(BLOCK_SIZE-dw)/2,BLOCK_SIZE-dh,dw,dh);
  scene.textures.addCanvas(key,canvas);return key;
}

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

  if(material.kind==="plant"||material.kind==="furniture"||material.kind==="conveyor"||material.kind==="cultivator"){
    const asset=scene.textures.get(`e3_block_asset_${material.key}`)?.getSourceImage?.();
    if(asset){if(material.kind==="plant")ctx.drawImage(asset,0,0,BLOCK_SIZE,BLOCK_SIZE);else drawContainedAsset(ctx,asset);}
    if(material.kind==="conveyor"){ctx.fillStyle="#f39a35";ctx.beginPath();if(material.key==="conveyor_up"){ctx.moveTo(32,5);ctx.lineTo(43,20);ctx.lineTo(36,19);ctx.lineTo(36,34);ctx.lineTo(28,34);ctx.lineTo(28,19);ctx.lineTo(21,20);}else{ctx.moveTo(32,59);ctx.lineTo(21,44);ctx.lineTo(28,45);ctx.lineTo(28,30);ctx.lineTo(36,30);ctx.lineTo(36,45);ctx.lineTo(43,44);}ctx.closePath();ctx.fill();}
    scene.textures.addCanvas(key,canvas);return key;
  }
  if(material.kind==="invisible"){scene.textures.addCanvas(key,canvas);return key;}
  if(material.kind==="spawnPoint"){ctx.strokeStyle="#ff9e2f";ctx.lineWidth=4;ctx.beginPath();ctx.ellipse(32,45,22,11,0,0,Math.PI*2);ctx.stroke();ctx.fillStyle="rgba(255,158,47,.28)";ctx.fill();ctx.fillStyle="#fff4d7";ctx.beginPath();ctx.moveTo(32,7);ctx.lineTo(44,27);ctx.lineTo(36,27);ctx.lineTo(36,45);ctx.lineTo(28,45);ctx.lineTo(28,27);ctx.lineTo(20,27);ctx.closePath();ctx.fill();scene.textures.addCanvas(key,canvas);return key;}
  if(material.kind==="coreSampler"){
    ctx.fillStyle="#263c47";ctx.fillRect(18,30,30,25);ctx.fillStyle="#d6e4e6";ctx.fillRect(25,8,14,36);ctx.fillStyle="#5d7780";ctx.fillRect(28,4,8,40);ctx.fillStyle="#f39a35";ctx.fillRect(20,38,26,5);ctx.strokeStyle="#90e5e8";ctx.lineWidth=2;ctx.strokeRect(18,30,30,25);scene.textures.addCanvas(key,canvas);return key;
  }
  if(material.kind==="vehicleKit"){
    ctx.fillStyle="#d9dfe1";ctx.beginPath();ctx.moveTo(0,22);ctx.lineTo(32,4);ctx.lineTo(64,22);ctx.lineTo(54,54);ctx.lineTo(32,64);ctx.lineTo(10,54);ctx.closePath();ctx.fill();ctx.strokeStyle="#f47b20";ctx.lineWidth=5;ctx.stroke();ctx.fillStyle="#173a50";ctx.beginPath();ctx.ellipse(32,34,15,9,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#77dfe5";ctx.lineWidth=2;ctx.stroke();scene.textures.addCanvas(key,canvas);return key;
  }
  if(material.kind==="sprout"){ctx.fillStyle="#75452d";ctx.fillRect(30,32,4,25);ctx.fillStyle="#58b83f";ctx.fillRect(18,27,14,8);ctx.fillRect(33,21,14,9);ctx.fillStyle="#91de58";ctx.fillRect(21,26,8,3);ctx.fillRect(36,21,8,3);scene.textures.addCanvas(key,canvas);return key;}
  if(material.kind==="biome")paintBiomeTexture(textureCtx,material.key);
  if(material.kind==="sedimentary"){textureCtx.fillStyle="#9d795b";textureCtx.fillRect(0,0,32,32);for(let y=3;y<32;y+=6){textureCtx.fillStyle=y%12===3?"#c3a077":"#705542";textureCtx.fillRect(0,y,32,3);}}
  if(material.kind==="ice"){textureCtx.fillStyle="#bfeaf2";textureCtx.fillRect(0,0,32,32);textureCtx.strokeStyle="#efffff";for(let i=0;i<5;i++){textureCtx.beginPath();textureCtx.moveTo(i*8,0);textureCtx.lineTo(4+i*6,32);textureCtx.stroke();}}
  if(material.kind==="magma"){textureCtx.fillStyle="#f02a13";textureCtx.fillRect(0,0,32,32);textureCtx.strokeStyle="#ffb000";textureCtx.lineWidth=4;for(let i=0;i<4;i++){textureCtx.beginPath();textureCtx.moveTo(0,4+i*8);textureCtx.bezierCurveTo(8,10+i*6,20,i*8,32,6+i*7);textureCtx.stroke();}}
  if(material.kind==="fossil"){textureCtx.fillStyle="#8c7154";textureCtx.fillRect(0,0,32,32);textureCtx.strokeStyle="#e2cf9b";textureCtx.lineWidth=2;textureCtx.beginPath();if(material.key==="fossil_plant"){textureCtx.moveTo(16,29);textureCtx.lineTo(16,5);textureCtx.moveTo(16,12);textureCtx.lineTo(8,7);textureCtx.moveTo(16,18);textureCtx.lineTo(25,12);}else{textureCtx.arc(16,16,9,0,Math.PI*1.7);textureCtx.lineTo(19,16);}textureCtx.stroke();}

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

function createHabitatPartTexture(scene, block) {
  const lx=block.habitatLocalX,ly=block.habitatLocalY,lz=block.habitatLocalZ;const key=`e3_habitat_part_${block.orientation}_${lx}_${ly}_${lz}`;
  if(scene.textures.exists(key))return key;const canvas=document.createElement("canvas");canvas.width=canvas.height=64;const ctx=canvas.getContext("2d");ctx.imageSmoothingEnabled=false;
  const face=(points,fill,stroke="#59646d")=>{ctx.beginPath();ctx.moveTo(...points[0]);points.slice(1).forEach((point)=>ctx.lineTo(...point));ctx.closePath();ctx.fillStyle=fill;ctx.fill();ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke();};
  const left=[[0,16],[32,32],[32,64],[0,48]],right=[[32,32],[64,16],[64,48],[32,64]],top=[[0,16],[32,0],[64,16],[32,32]];
  face(left,"#c6ccd0");face(right,"#929da5");face(top,"#eef0ef");
  ctx.strokeStyle="rgba(68,78,87,.65)";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(16,24);ctx.lineTo(16,56);ctx.moveTo(48,24);ctx.lineTo(48,56);ctx.stroke();
  const seDoor=block.orientation==="se"&&ly===4&&lx>=1&&lx<=2&&lz<3;const swDoor=block.orientation==="sw"&&lx===4&&ly>=2&&ly<=3&&lz<3;
  if(seDoor){face(left,"#3d4850","#f17820");ctx.strokeStyle="#f6a04b";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(5,23);ctx.lineTo(27,34);ctx.lineTo(27,57);ctx.lineTo(5,46);ctx.closePath();ctx.stroke();if(lz===1){ctx.fillStyle="#f17820";ctx.fillRect(12,38,5,5);}}
  if(swDoor){face(right,"#3d4850","#f17820");ctx.strokeStyle="#f6a04b";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(37,34);ctx.lineTo(59,23);ctx.lineTo(59,46);ctx.lineTo(37,57);ctx.closePath();ctx.stroke();if(lz===1){ctx.fillStyle="#f17820";ctx.fillRect(47,38,5,5);}}
  const seWindow=block.orientation==="se"&&lx===4&&ly>=1&&ly<=3&&lz===1;const swWindow=block.orientation==="sw"&&ly===4&&lx>=1&&lx<=3&&lz===1;
  if(seWindow){face(right,"#24343e","#46515a");ctx.fillStyle="#138fc0";ctx.beginPath();ctx.moveTo(38,34);ctx.lineTo(58,24);ctx.lineTo(58,42);ctx.lineTo(38,52);ctx.closePath();ctx.fill();ctx.strokeStyle="#9eeeff";ctx.lineWidth=2;ctx.stroke();}
  if(swWindow){face(left,"#24343e","#46515a");ctx.fillStyle="#138fc0";ctx.beginPath();ctx.moveTo(6,24);ctx.lineTo(26,34);ctx.lineTo(26,52);ctx.lineTo(6,42);ctx.closePath();ctx.fill();ctx.strokeStyle="#9eeeff";ctx.lineWidth=2;ctx.stroke();}
  if(lz===3){ctx.strokeStyle="#f17820";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(22,11);ctx.lineTo(32,6);ctx.lineTo(42,11);ctx.stroke();}
  const roofAccessory=block.roofAccessory||(lz===3&&lx===1&&ly===1?"solar_panel":lz===3&&lx===3&&ly===3?"satellite":null);if(roofAccessory){const asset=scene.textures.get(`e3_block_asset_${roofAccessory}`)?.getSourceImage?.();if(asset)drawContainedAsset(ctx,asset,5);}
  scene.textures.addCanvas(key,canvas);return key;
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

export function createIsometricBlockSystem({ scene, atlasKey, getMapKey, getGridSize, tileToDisplayPosition, tileToLogicalPosition, pointerToTilePosition, logicalWorldToTilePosition, getPlayer, getPlayerDirection, getSelectedTool, getInventoryMaterial, onPlaceInventoryBlock, onProcessInventory, onPlantSeed, syncWorldBlocks, syncWorldVehicles, syncCoreTimers, onCollectSample, onToolAction, onStatus, onEnterHabitat, onPlanetEdge, enabled = () => true }) {
  const blocks = new Map();
  const sprites = new Map();
  const entityPhysics = new Map();
  const groundSprites = [];
  let active = false;
  let selectedMaterial = "dirt";
  let habitatOrientation = "se";
  let assetMirrored = false;
  let habitatPreview = null;
  let actionTarget = null;
  let lastHabitatEntryAt = 0;
  let lastWorldUpdateAt = 0;
  let lastConveyorUpdateAt = 0;
  const grassRegrowth = new Map();
  const exposedDirtRepair = new Map();
  const waterSpread = new Map();
  let lastTerrainScanAt = 0;
  let growthPausedAt = 0;
  let blockEraseDragging = false;
  let blockErasePointer = null;
  let lastEraseRepeatAt = 0;
  let terrainDrag = null;
  let lastTerrainEditAt = 0;
  let lastDragTarget = "";
  const actionProgress = new Map();
  const coreTimers = new Map();
  const timerGraphics = [];
  const vehicleDriveState = new Map();
  let lastStaticRenderSignature = "";
  let mountedVehicleId = null;
  let nearbyKayakId = null;
  let lastKayakExitAt = 0;
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
  toolbar.innerHTML = `<header><div><small>VOXEL BUILD MODE</small><strong>Expedition Blocks</strong></div><button type="button" data-close aria-label="Close block builder">×</button></header><p>V toggles · R mirrors directional assets · click a surface to place · right-click digs · middle-click picks · Space / Shift / Z jumps</p><div class="block-materials"></div><footer><span class="block-builder-status">Dirt</span><button type="button" data-clear>Regenerate world</button></footer>`;
  document.body.appendChild(toolbar);

  const materialsRoot = toolbar.querySelector(".block-materials");
  BLOCK_MATERIALS.filter((material) => material.key !== "bedrock"&&!material.hidden).forEach((material) => {
    const button = document.createElement("button");button.type = "button";button.dataset.material = material.key;button.title = material.label;
    button.innerHTML = `<i style="--atlas-x:${material.frame % 4};--atlas-y:${Math.floor(material.frame / 4)};${material.asset?`background-image:url('/${material.asset}');background-size:contain;background-position:center;background-repeat:no-repeat`:""}"></i><span>${material.label}</span>`;
    button.addEventListener("click", () => { selectedMaterial = material.key;if(selectedMaterial!=="habitat_kit"&&habitatPreview){habitatPreview=null;render();}refreshToolbar(); });materialsRoot.appendChild(button);
  });

  const storageKey = () => `e3:block-world:v4:${getMapKey() || "default"}`;
  const getSnapshot=()=>[...blocks.values()].map(({fallFromZ,...block})=>({...block}));
  const save = () => {
    const key=storageKey(),payload=JSON.stringify(getSnapshot());
    try{localStorage.setItem(key,payload);return true;}catch(error){
      if(error?.name!=="QuotaExceededError"){console.warn("Voxel map cache could not be written.",error);return false;}
      try{
        Object.keys(localStorage).filter((candidate)=>candidate.startsWith("e3:block-world:v4:")&&candidate!==key).forEach((candidate)=>localStorage.removeItem(candidate));
        localStorage.setItem(key,payload);return true;
      }catch(retryError){console.warn("Voxel map exceeds the optional browser cache; continuing with database storage.",retryError);return false;}
    }
  };
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
  const habitatEntranceTiles=(originX,originY,orientation)=>orientation==="se"?[{x:originX+1,y:originY+5},{x:originX+2,y:originY+5}]:[{x:originX+5,y:originY+2},{x:originX+5,y:originY+3}];
  const addHabitatParts=(originX,originY,orientation,habitatId,falling=false)=>{for(let lz=0;lz<4;lz+=1){for(let ly=0;ly<5;ly+=1){for(let lx=0;lx<5;lx+=1){const x=originX+lx,y=originY+ly,z=2+lz;const roofAccessory=lz===3&&lx===1&&ly===1?"solar_panel":lz===3&&lx===3&&ly===3?"satellite":null;blocks.set(blockKey(x,y,z),{x,y,z,material:"habitat_kit",habitatId,habitatOriginX:originX,habitatOriginY:originY,habitatLocalX:lx,habitatLocalY:ly,habitatLocalZ:lz,orientation,roofAccessory,fallFromZ:falling?z+6+(lx+ly+lz)%3:undefined});}}}};
  const waterSurfaceZ=(x,y)=>{let height=0;for(let z=1;z<=MAX_BUILD_LAYER;z+=1)if(blocks.get(blockKey(x,y,z))?.material==="water")height=z;return height;};
  const vehicleDirection=(orientation)=>[[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1]][((orientation%8)+8)%8];
  const vehicleParts=(type,cx,cy,orientation)=>{const [fx,fy]=vehicleDirection(orientation),[wx,wy]=[-fy,fx];const parts=[];if(type==="kayak"){for(let length=-1;length<=1;length+=1)parts.push({x:cx+fx*length,y:cy+fy*length,layer:0,length,width:0});}else{for(let length=-2;length<=3;length+=1)for(let width=-1;width<=1;width+=1){parts.push({x:cx+fx*length+wx*width,y:cy+fy*length+wy*width,layer:0,length,width});if(length<3)parts.push({x:cx+fx*length+wx*width,y:cy+fy*length+wy*width,layer:1,length,width});}}return parts;};
  const canPlaceVehicle=(type,cx,cy,orientation,ignoreId=null)=>{const size=getGridSize(),parts=vehicleParts(type,cx,cy,orientation);const requiredWater=type==="kayak"?[{x:cx,y:cy}]:parts.filter((part)=>part.layer===0&&part.width===0);if(requiredWater.some((part)=>!waterSurfaceZ(part.x,part.y)))return false;return parts.every((part)=>{if(part.x<0||part.y<0||part.x>=size.width||part.y>=size.height)return false;const z=Math.max(1,waterSurfaceZ(part.x,part.y)||waterSurfaceZ(cx,cy))+1+part.layer;const occupied=blocks.get(blockKey(part.x,part.y,z));return !occupied||occupied.vehicleId===ignoreId;});};
  const buildVehicle=(type,cx,cy)=>{const orientation=0;if(!canPlaceVehicle(type,cx,cy,orientation)){onStatus?.(`${type==="kayak"?"Kayak center":"Boat middle column"} must be placed in water.`);return false;}const id=`${type}-${Date.now()}-${cx}-${cy}`;vehicleParts(type,cx,cy,orientation).forEach((part,index)=>{const waterZ=waterSurfaceZ(part.x,part.y)||waterSurfaceZ(cx,cy);const z=waterZ+1+part.layer;blocks.set(blockKey(part.x,part.y,z),{x:part.x,y:part.y,z,material:`${type}_kit`,vehicleId:id,vehicleType:type,vehicleCenterX:cx,vehicleCenterY:cy,vehicleOrientation:orientation,vehiclePart:index,vehicleLength:part.length,vehicleWidth:part.width,vehicleLayer:part.layer,floating:true});});save();render();return true;};
  const vehicleCenterBlock=(id)=>[...blocks.values()].find((block)=>block.vehicleId===id&&block.vehicleLength===0&&block.vehicleLayer===0)||[...blocks.values()].find((block)=>block.vehicleId===id);
  const nearestKayak=()=>{const player=getPlayer();if(!player)return null;let nearest=null;const seen=new Set();blocks.forEach((block)=>{if(block.vehicleType!=="kayak"||seen.has(block.vehicleId))return;seen.add(block.vehicleId);const center=vehicleCenterBlock(block.vehicleId);const logical=center&&tileToLogicalPosition(center.vehicleCenterX,center.vehicleCenterY);if(!logical)return;const distance=Math.hypot(player.x-logical.x,player.y-logical.y);if(distance<=BLOCK_SIZE*1.35&&(!nearest||distance<nearest.distance))nearest={block:center,logical,distance};});return nearest;};
  const enterNearbyKayak=()=>{if(mountedVehicleId)return false;const nearby=nearestKayak();if(!nearby)return false;const player=getPlayer();mountedVehicleId=nearby.block.vehicleId;player.x=nearby.logical.x;player.y=nearby.logical.y;currentElevation=terrainHeight(nearby.block.vehicleCenterX,nearby.block.vehicleCenterY);currentSupportTile={tileX:nearby.block.vehicleCenterX,tileY:nearby.block.vehicleCenterY};visualFloorOffset=currentElevation*BLOCK_RISE-16;fallActive=false;onStatus?.("Kayak entered · Space or Z to exit");return true;};
  const exitKayak=()=>{if(!mountedVehicleId)return false;const player=getPlayer(),center=vehicleCenterBlock(mountedVehicleId);if(!player||!center){mountedVehicleId=null;lastKayakExitAt=Date.now();return true;}const size=getGridSize();const candidates=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]];const vehicleTiles=new Set([...blocks.values()].filter((block)=>block.vehicleId===mountedVehicleId).map((block)=>`${block.x}:${block.y}`));const spot=candidates.map(([dx,dy])=>({x:center.vehicleCenterX+dx,y:center.vehicleCenterY+dy})).find(({x,y})=>x>=0&&y>=0&&x<size.width&&y<size.height&&!vehicleTiles.has(`${x}:${y}`));if(spot){const logical=tileToLogicalPosition(spot.x,spot.y);player.x=logical.x;player.y=logical.y;currentElevation=terrainHeight(spot.x,spot.y);currentSupportTile={tileX:spot.x,tileY:spot.y};visualFloorOffset=currentElevation*BLOCK_RISE;}mountedVehicleId=null;lastKayakExitAt=Date.now();fallActive=false;onStatus?.("Kayak exited");return true;};
  const migrateAssembledHabitats=()=>{let changed=false;const legacyGroups=new Map();blocks.forEach((block)=>{if(block.structure){if(!legacyGroups.has(block.structure))legacyGroups.set(block.structure,[]);legacyGroups.get(block.structure).push(block);}});legacyGroups.forEach((parts,id)=>{const originX=Math.min(...parts.map((part)=>part.x));const originY=Math.min(...parts.map((part)=>part.y));const door=parts.find((part)=>part.habitatDoor);const orientation=door&&door.x-originX>2?"sw":"se";parts.forEach((part)=>blocks.delete(blockKey(part.x,part.y,part.z)));addHabitatParts(originX,originY,orientation,`habitat-${id}`);changed=true;});[...blocks.values()].filter((block)=>block.megaHabitat).forEach((block)=>{blocks.delete(blockKey(block.x,block.y,block.z));addHabitatParts(block.x,block.y,block.orientation||"se",`habitat-${Date.now()}-${block.x}-${block.y}`);changed=true;});if(changed)save();};
  const addGeneratedTree=(x,y,baseZ,treeId)=>{const add=(tx,ty,z,material,part,floating=false)=>{if(z<1||z>MAX_BUILD_LAYER||blocks.has(blockKey(tx,ty,z)))return;blocks.set(blockKey(tx,ty,z),{x:tx,y:ty,z,material,generated:true,treeId,treePart:part,floating});};for(let z=1;z<=3;z+=1)add(x,y,baseZ+z,"bark","trunk");for(let oy=-1;oy<=1;oy+=1)for(let ox=-1;ox<=1;ox+=1)add(x+ox,y+oy,baseZ+4,"leaves","leaves",true);for(const [ox,oy] of [[0,0],[1,0],[-1,0],[0,1],[0,-1]])add(x+ox,y+oy,baseZ+5,"leaves","leaves",true);};
  const generateWorld=()=>{lastStaticRenderSignature="";blocks.clear();grassRegrowth.clear();coreTimers.clear();const size=getGridSize();const random=seededRandom();const face=String(getMapKey()||"cube_fault");const polar=/polar|antarctic|cube_bottom/.test(face);for(let y=0;y<size.height;y+=1){for(let x=0;x<size.width;x+=1){const ore=random()<.025?"crystal":random()<.085?"iron":polar?"ice":"dirt";blocks.set(blockKey(x,y,1),{x,y,z:1,material:ore,generated:true,protectedGround:ore==="iron"||ore==="crystal"});blocks.set(blockKey(x,y,2),{x,y,z:2,material:polar?"ice":"grass",generated:true});}}
    const setWater=(x,y)=>{if(x<0||y<0||x>=size.width||y>=size.height)return false;for(let z=1;z<=2;z+=1)blocks.set(blockKey(x,y,z),{x,y,z,material:"water",generated:true,protectedWater:true});return true;};
    const paintPond=(cx,cy)=>{const water=new Set();const frontier=[];for(let oy=0;oy<2;oy+=1){for(let ox=0;ox<2;ox+=1){const x=cx+ox,y=cy+oy;if(setWater(x,y)){water.add(`${x}:${y}`);frontier.push({x,y,depth:0});}}}while(frontier.length&&water.size<42){const cell=frontier.shift();for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const x=cell.x+dx,y=cell.y+dy,key=`${x}:${y}`;if(water.has(key)||x<1||y<1||x>=size.width-1||y>=size.height-1)continue;const probability=.62*Math.pow(.72,cell.depth);if(random()>probability)continue;if(setWater(x,y)){water.add(key);frontier.push({x,y,depth:cell.depth+1});}}}};
    for(let i=0;i<Math.max(2,Math.floor(size.width*size.height/450));i+=1)paintPond(2+Math.floor(random()*Math.max(2,size.width-5)),2+Math.floor(random()*Math.max(2,size.height-5)));
    const paintMountain=(cx,cy,radius)=>{for(let y=Math.max(1,cy-radius);y<=Math.min(size.height-2,cy+radius);y+=1)for(let x=Math.max(1,cx-radius);x<=Math.min(size.width-2,cx+radius);x+=1){const distance=Math.hypot(x-cx,y-cy);if(distance>radius+.2)continue;const height=Math.min(MAX_BUILD_LAYER,2+Math.max(1,Math.floor(radius-distance)+1));for(let z=3;z<=height;z+=1){const top=z===height,roll=random();blocks.set(blockKey(x,y,z),{x,y,z,material:top?(polar?"ice":"grass"):roll<.04?"crystal":roll<.12?"iron":"dirt",generated:true});}}};
    for(let i=0;i<Math.max(3,Math.floor(size.width*size.height/550));i+=1)paintMountain(3+Math.floor(random()*Math.max(2,size.width-6)),3+Math.floor(random()*Math.max(2,size.height-6)),3+Math.floor(random()*3));
    const cx=Math.floor(size.width/2),cy=Math.floor(size.height/2);if(/ridge|cube_east/.test(face)){for(let y=2;y<size.height-2;y+=1)for(let dx=-1;dx<=1;dx+=1){const x=cx+dx;blocks.set(blockKey(x,y,3),{x,y,z:3,material:dx?"cave":"magma",generated:true});}for(const x of [2,size.width-3]){blocks.set(blockKey(x,cy,2),{x,y:cy,z:2,material:"fossil_plant",generated:true});blocks.set(blockKey(x,cy+2,2),{x,y:cy+2,z:2,material:"fossil_creature",generated:true});}}
    if(/convergent|cube_south/.test(face)){for(let y=3;y<size.height-3;y+=1)setWater(cx,y);for(const [x,y] of [[cx+4,cy],[cx+6,cy-3],[cx+7,cy+4]]){paintMountain(x,y,4);blocks.set(blockKey(x,y,Math.min(MAX_BUILD_LAYER,terrainHeight(x,y))),{x,y,z:Math.min(MAX_BUILD_LAYER,terrainHeight(x,y)),material:"magma",generated:true});}}
    if(/rift|cube_west/.test(face))for(let y=2;y<size.height-2;y+=1){for(const x of [cx-2,cx+2])paintMountain(x,y,2);blocks.delete(blockKey(cx,y,2));}
    if(/hotspot|cube_top/.test(face))for(let i=0;i<5;i+=1){const x=4+i*3,y=4+i*2;paintMountain(x,y,2+i%2);blocks.set(blockKey(x,y,Math.min(MAX_BUILD_LAYER,terrainHeight(x,y))),{x,y,z:Math.min(MAX_BUILD_LAYER,terrainHeight(x,y)),material:"magma",generated:true});}
    if(/fault|default_room|cube_north/.test(face))for(let y=2;y<size.height-2;y+=1){const x=cx+(y%5<2?-1:1);blocks.set(blockKey(x,y,2),{x,y,z:2,material:"cave",generated:true,fault:true});}
    if(polar){for(let y=0;y<size.height;y+=1)for(let x=0;x<size.width;x+=1){const edge=Math.min(x,y,size.width-1-x,size.height-1-y);if(edge<3)setWater(x,y);else if(edge<6)blocks.set(blockKey(x,y,1),{x,y,z:1,material:"sedimentary",generated:true,indestructible:true});}blocks.set(blockKey(cx,cy,2),{x:cx,y:cy,z:2,material:"fossil_creature",generated:true});}
    let trees=0;for(let attempts=0;!polar&&attempts<size.width*size.height&&trees<Math.max(5,Math.floor(size.width*size.height/260));attempts+=1){const x=2+Math.floor(random()*Math.max(2,size.width-4)),y=2+Math.floor(random()*Math.max(2,size.height-4));if(terrainHeight(x,y)!==2||blocks.get(blockKey(x,y,2))?.material!=="grass")continue;addGeneratedTree(x,y,2,`generated-tree-${trees}`);trees+=1;}save();};
  const load = () => { lastStaticRenderSignature="";blocks.clear();coreTimers.clear();currentElevation=null;try{const saved=JSON.parse(localStorage.getItem(storageKey())||"[]");saved.forEach((block)=>{if(materialByKey.has(block.material)&&block.z>=1&&block.z<=MAX_BUILD_LAYER)blocks.set(blockKey(block.x,block.y,block.z),block);if(block.coreSamplerId&&block.coreStartedAt)coreTimers.set(block.coreSamplerId,{x:block.x,y:block.y,startedAt:block.coreStartedAt});});migrateAssembledHabitats();if(!blocks.size&&getMapKey()!=="lab_entrance")generateWorld();else settleBlocks();}catch{if(getMapKey()!=="lab_entrance")generateWorld();}render(); };
  const loadSnapshot=(snapshot)=>{lastStaticRenderSignature="";blocks.clear();coreTimers.clear();currentElevation=null;(Array.isArray(snapshot)?snapshot:[]).forEach((raw)=>{const block={...raw};if(!Number.isInteger(block.x)||!Number.isInteger(block.y)||!Number.isInteger(block.z)||block.z<1||block.z>MAX_BUILD_LAYER||!materialByKey.has(block.material))return;blocks.set(blockKey(block.x,block.y,block.z),block);if(block.coreSamplerId&&block.coreStartedAt)coreTimers.set(block.coreSamplerId,{x:block.x,y:block.y,startedAt:block.coreStartedAt});});migrateAssembledHabitats();settleBlocks();save();render();};
  const isMirrorable=(material)=>material&&(material.kind==="plant"||material.kind==="furniture"||material.kind==="conveyor"||material.kind==="cultivator");
  const refreshToolbar = () => {const material=materialByKey.get(selectedMaterial);toolbar.querySelector(".block-builder-status").textContent=(material?.label||selectedMaterial)+(selectedMaterial==="habitat_kit"?` · door ${habitatOrientation.toUpperCase()}`:isMirrorable(material)?` · ${assetMirrored?"mirrored right":"facing left"}`:"");toolbar.querySelectorAll("[data-material]").forEach((button)=>button.classList.toggle("active",button.dataset.material===selectedMaterial)); };

  function render() {
    const staticSignature=[...blocks.values()].filter((block)=>!block.vehicleId).map((block)=>`${block.x}:${block.y}:${block.z}:${block.material}:${block.flipX?1:0}:${block.grown?1:0}:${block.fallFromZ||0}`).sort().join("|")+`|${active}:${selectedMaterial}:${habitatPreview?.x??""}:${habitatPreview?.y??""}`;
    if(staticSignature===lastStaticRenderSignature&&sprites.size){syncWorldVehicles?.([...blocks.values()].filter((block)=>block.vehicleId).map((block)=>{const display=tileToDisplayPosition(block.x,block.y);return {id:blockKey(block.x,block.y,block.z),x:display.x,y:display.y-(block.z-1)*BLOCK_RISE,z:block.z,sortY:display.y,vehicleId:block.vehicleId,vehicleType:block.vehicleType,vehicleOrientation:block.vehicleOrientation??0,vehicleLength:block.vehicleLength??null,vehicleWidth:block.vehicleWidth??null};}));return;}
    lastStaticRenderSignature=staticSignature;
    sprites.forEach((sprite) => sprite.destroy());sprites.clear();
    timerGraphics.forEach((graphic)=>graphic.destroy());timerGraphics.length=0;
    groundSprites.forEach((sprite) => sprite.destroy());groundSprites.length=0;
    const size=getGridSize();const dirtGroundTexture=createGroundTexture(scene,atlasKey,materialByKey.get("dirt"));const stoneGroundTexture=createGroundTexture(scene,atlasKey,materialByKey.get("stone"));
    for(let y=0;y<size.height;y+=1){for(let x=0;x<size.width;x+=1){const display=tileToDisplayPosition(x,y);const groundTexture=blocks.get(blockKey(x,y,1))?.material==="water"?stoneGroundTexture:dirtGroundTexture;const ground=scene.add.image(display.x,display.y,groundTexture);ground.setOrigin(.5,1);ground.setDepth(1+(x+y)*.01);groundSprites.push(ground);}}
    [...blocks.values()].sort((a,b)=>(a.x+a.y)-(b.x+b.y)||a.z-b.z).forEach((block) => {
      const material=materialByKey.get(block.material);if(!material)return;const display=tileToDisplayPosition(block.x,block.y);
      const textureKey=block.habitatId?createHabitatPartTexture(scene,block):block.material==="core_sampler"?createCoreSamplerPartTexture(scene,block):createBlockTexture(scene,atlasKey,material);const sprite=scene.add.image(display.x,display.y-(block.z-1)*BLOCK_RISE,textureKey);sprite.setOrigin(.5,1);sprite.setFlipX(!!block.flipX);sprite.setDepth(material.kind==="spawnPoint"?5000:10+display.y*.001+block.z*.0001);sprite.setAlpha(material.kind==="invisible"?0:material.kind==="spawnPoint"?(active?1:0):syncWorldBlocks?0.001:1);sprite.setData("e3Block",block);sprites.set(blockKey(block.x,block.y,block.z),sprite);
    });
    if(active&&selectedMaterial==="habitat_kit"&&habitatPreview){const center=tileToDisplayPosition(habitatPreview.x+2,habitatPreview.y+2);const bottom=tileToDisplayPosition(habitatPreview.x+4,habitatPreview.y+4);const previewBlock={x:habitatPreview.x,y:habitatPreview.y,z:2,material:"habitat_kit",previewHabitat:true,megaHabitat:true,orientation:habitatOrientation};const sprite=scene.add.image(center.x,bottom.y-BLOCK_RISE,createHabitatPreviewTexture(scene));sprite.setOrigin(.5,1);sprite.setDepth(2000);sprite.setAlpha(syncWorldBlocks?0.001:1);sprite.setData("e3Block",previewBlock);sprites.set("habitat-preview",sprite);}
    coreTimers.forEach((timer)=>{const display=tileToDisplayPosition(timer.x,timer.y);const progress=Math.min(1,(Date.now()-timer.startedAt)/10000);const graphic=scene.add.graphics();graphic.lineStyle(4,0x74efe8,.95);graphic.beginPath();graphic.arc(display.x,display.y-150,15,-Math.PI/2,-Math.PI/2+Math.PI*2*progress,false);graphic.strokePath();graphic.setDepth(4000);timerGraphics.push(graphic);});
    if(syncWorldBlocks){syncWorldBlocks([...sprites.values()].filter((sprite)=>materialByKey.get(sprite.getData("e3Block")?.material)?.kind!=="invisible").map((sprite)=>{const block=sprite.getData("e3Block");const material=materialByKey.get(block.material);const display=block.previewHabitat?tileToDisplayPosition(block.x+4,block.y+4):tileToDisplayPosition(block.x,block.y);return {id:block.previewHabitat?"habitat-preview":blockKey(block.x,block.y,block.z),x:sprite.x,y:sprite.y,z:block.z,startY:block.previewHabitat?sprite.y:display.y-((block.fallFromZ||block.z)-1)*BLOCK_RISE,sortY:block.previewHabitat?999999:display.y,canvas:scene.textures.get(sprite.texture.key).getSourceImage(),width:block.previewHabitat?320:64,height:block.previewHabitat?288:64,flipX:block.previewHabitat&&block.orientation==="sw",materialKey:block.material,transparent:block.previewHabitat||!!material?.transparent||block.material==="water"||block.material==="portal",opacity:block.previewHabitat?.34:undefined,preview:!!block.previewHabitat,animated:block.material==="water"||block.material==="portal"||block.material==="magma",waterBob:!!block.vehicleId,vehicleId:block.vehicleId||null,vehicleType:block.vehicleType||null,vehicleOrientation:block.vehicleOrientation??null,vehicleLength:block.vehicleLength??null,vehicleWidth:block.vehicleWidth??null};}));blocks.forEach((block)=>delete block.fallFromZ);}
  }

  function buildHabitat(tileX,tileY){const size=getGridSize();const originX=tileX-2,originY=tileY-2;if(originX<0||originY<0||originX+4>=size.width||originY+4>=size.height)return;const replacedHabitats=new Set();for(let y=originY;y<=originY+4;y+=1){for(let x=originX;x<=originX+4;x+=1){for(let z=2;z<=MAX_BUILD_LAYER;z+=1){const existing=blocks.get(blockKey(x,y,z));if(existing?.habitatId)replacedHabitats.add(existing.habitatId);blocks.delete(blockKey(x,y,z));}}}if(replacedHabitats.size)blocks.forEach((part,key)=>{if(replacedHabitats.has(part.habitatId))blocks.delete(key);});addHabitatParts(originX,originY,habitatOrientation,`habitat-${Date.now()}-${originX}-${originY}`,true);save();render();}
  function place(tileX,tileY,targetZ=1,materialOverride=null) {
    const materialKey=materialOverride||selectedMaterial;
    if(materialKey==="habitat_kit"){if(materialOverride&&!onPlaceInventoryBlock?.(materialKey))return false;buildHabitat(tileX,tileY);return true;}
    if(materialKey==="kayak_kit"||materialKey==="boat_kit"){if(materialOverride&&!onPlaceInventoryBlock?.(materialKey))return false;return buildVehicle(materialKey==="kayak_kit"?"kayak":"boat",tileX,tileY);}
    const size=getGridSize();if(tileX<0||tileY<0||tileX>=size.width||tileY>=size.height)return false;
    if(materialKey==="water_pump"&&!waterSurfaceZ(tileX,tileY)){onStatus?.("The water pump must be placed over water.");return false;}
    const z=Math.max(1,Math.min(MAX_BUILD_LAYER,targetZ));
    if(blocks.has(blockKey(tileX,tileY,z)))return false;
    const below=blocks.get(blockKey(tileX,tileY,z-1));if(below&&materialByKey.get(below.material)?.nonStackable)return false;if(materialOverride&&!onPlaceInventoryBlock?.(materialKey))return false;
    if(materialKey==="core_sampler"){if(z+3>MAX_BUILD_LAYER)return false;const id=`core-${Date.now()}-${tileX}-${tileY}`,startedAt=Date.now();for(let dz=0;dz<3;dz+=1)blocks.set(blockKey(tileX,tileY,z+dz),{x:tileX,y:tileY,z:z+dz,material:"core_sampler",coreSamplerId:id,coreStartedAt:startedAt,corePart:dz,fallFromZ:z+dz+3});blocks.set(blockKey(tileX,tileY,z+3),{x:tileX,y:tileY,z:z+3,material:"core_clearance",coreSamplerId:id,coreStartedAt:startedAt,corePart:3});coreTimers.set(id,{x:tileX,y:tileY,startedAt});save();render();return true;}
    const block={x:tileX,y:tileY,z,material:materialKey,flipX:isMirrorable(materialByKey.get(materialKey))&&assetMirrored,fallFromZ:Math.min(MAX_BUILD_LAYER+1,z+1)};if(materialKey==="tree_sprout")block.plantedAt=Date.now();blocks.set(blockKey(tileX,tileY,z),block);settleBlocks();save();render();return true;
  }
  function getCollectionRule(block,tool){const material=block.material;if(block.indestructible)return {tool:"pickaxe",action:"mine",actions:999};if(block.habitatId)return {tool:"pickaxe",action:"mine",actions:4,reward:"habitat_kit_block"};if(material==="water")return {tool:"fishing_pole",action:"fish",actions:3,reward:"water_block",preserve:true};if(material==="grass"&&tool==="hoe")return {tool:"hoe",action:"hoe",actions:2,till:true};if(["bark","leaves"].includes(material))return {tool:"axe",action:"chop",actions:material==="bark"?3:1,reward:`${material}_block`};if(material.startsWith("flora_"))return {tool:"shovel",action:"dig",actions:2,reward:`${material}_seed`};if(["dirt","grass","sand","alien","tree_sprout"].includes(material))return {tool:"shovel",action:"dig",actions:material==="dirt"?1:2,reward:`${material}_block`};if(material==="iron")return {tool:"pickaxe",action:"mine",actions:5,reward:"iron_block"};if(material==="crystal")return {tool:"pickaxe",action:"mine",actions:7,reward:"crystal_block"};if(["stone","cave","sedimentary","ice","magma","fossil_plant","fossil_creature"].includes(material)||material.startsWith("biome_"))return {tool:"pickaxe",action:"mine",actions:{ice:2,magma:6,sedimentary:4}[material]||4,reward:`${material}_block`};return {tool:"pickaxe",action:"mine",actions:3,reward:`${material}_block`};}
  function creativeDestroy(tileX,tileY,z){const targetZ=z||terrainHeight(tileX,tileY);const key=blockKey(tileX,tileY,targetZ);const block=blocks.get(key);if(!block)return;if(block.vehicleId)blocks.forEach((part,partKey)=>{if(part.vehicleId===block.vehicleId)blocks.delete(partKey);});else if(block.habitatId)blocks.forEach((part,partKey)=>{if(part.habitatId===block.habitatId)blocks.delete(partKey);});else{if(block.treeId&&block.treePart==="trunk")blocks.forEach((part)=>{if(part.treeId===block.treeId)part.floating=false;});blocks.delete(key);}settleBlocks();save();render();}
  function columnHasStructure(x,y){for(let z=1;z<=MAX_BUILD_LAYER;z+=1){const block=blocks.get(blockKey(x,y,z));if(block&&(block.habitatId||block.vehicleId||block.coreSamplerId))return true;}return false;}
  function validTerrainColumn(x,y){const size=getGridSize();return x>=0&&y>=0&&x<size.width&&y<size.height&&!columnHasStructure(x,y);}
  function bulldozeColumn(x,y,height,material){if(!validTerrainColumn(x,y))return false;height=Math.max(1,Math.min(MAX_BUILD_LAYER,height));let changed=false;for(let z=1;z<=MAX_BUILD_LAYER;z+=1){const key=blockKey(x,y,z),existing=blocks.get(key);if(existing?.indestructible)continue;if(z>height){if(existing){blocks.delete(key);changed=true;}continue;}if(existing?.material!==material){blocks.set(key,{x,y,z,material,generated:true,protectedWater:material==="water"});changed=true;}}return changed;}
  function growTerrainColumn(x,y,height,mode){if(!validTerrainColumn(x,y))return false;height=Math.max(1,Math.min(MAX_BUILD_LAYER,height));let changed=false;let current=terrainHeight(x,y);for(let z=current+1;z<=height;z+=1){if(blocks.has(blockKey(x,y,z)))continue;if(mode==="hill"&&z>1){const below=blocks.get(blockKey(x,y,z-1));if(below?.material==="grass")below.material="dirt";}blocks.set(blockKey(x,y,z),{x,y,z,material:mode==="mountain"?"cave":z===height?"grass":"dirt",generated:true});changed=true;}return changed;}
  function digTerrainColumn(x,y,targetHeight){if(!validTerrainColumn(x,y))return false;let changed=false;for(let z=MAX_BUILD_LAYER;z>Math.max(1,targetHeight);z-=1){const key=blockKey(x,y,z),block=blocks.get(key);if(!block||block.indestructible||block.protectedGround)continue;blocks.delete(key);changed=true;}return changed;}
  function applyTerrainDrag(tileX,tileY,now=Date.now()){if(!terrainDrag||now-lastTerrainEditAt<120)return;lastTerrainEditAt=now;let changed=false;if(terrainDrag.tool==="tool_bulldozer"){const key=`${tileX}:${tileY}`;if(key===lastDragTarget)return;lastDragTarget=key;for(let dy=-1;dy<=1;dy+=1)for(let dx=-1;dx<=1;dx+=1)changed=bulldozeColumn(tileX+dx,tileY+dy,terrainDrag.targetZ,terrainDrag.sourceMaterial)||changed;}else{const held=now-terrainDrag.startedAt;const radius=Math.min(5,1+Math.floor(held/850));const amount=1+Math.floor(held/700);for(let dy=-radius;dy<=radius;dy+=1)for(let dx=-radius;dx<=radius;dx+=1){const distance=Math.ceil(Math.hypot(dx,dy));if(distance>radius)continue;const x=terrainDrag.x+dx,y=terrainDrag.y+dy;if(terrainDrag.tool==="tool_digging"){const key=`${x}:${y}`;if(!terrainDrag.originalHeights.has(key))terrainDrag.originalHeights.set(key,terrainHeight(x,y));const target=terrainDrag.originalHeights.get(key)-Math.max(1,amount-distance);changed=digTerrainColumn(x,y,target)||changed;}else{const peak=Math.min(MAX_BUILD_LAYER,terrainDrag.baseZ+amount);const desired=Math.max(terrainDrag.baseZ,peak-distance);changed=growTerrainColumn(x,y,desired,terrainDrag.tool==="tool_mountain"?"mountain":"hill")||changed;}}}if(changed){save();render();}}
  function maintainSurfaceGrowth(now){if(now-lastTerrainScanAt<1000)return false;lastTerrainScanAt=now;const size=getGridSize();let changed=false,waterAdds=0;for(let y=0;y<size.height;y+=1)for(let x=0;x<size.width;x+=1){let topSolid=null;for(let z=MAX_BUILD_LAYER;z>=1;z-=1){const block=blocks.get(blockKey(x,y,z));if(block&&materialByKey.get(block.material)?.solid){topSolid=block;break;}}const dirtKey=`${x}:${y}`;if(topSolid?.material==="dirt"){if(!exposedDirtRepair.has(dirtKey))exposedDirtRepair.set(dirtKey,now+30000);else if(now>=exposedDirtRepair.get(dirtKey)){topSolid.material="grass";exposedDirtRepair.delete(dirtKey);changed=true;}}else exposedDirtRepair.delete(dirtKey);}
    blocks.forEach((block)=>{if(block.material!=="grass")return;const enclosed=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1]].every(([dx,dy,dz])=>materialByKey.get(blocks.get(blockKey(block.x+dx,block.y+dy,block.z+dz))?.material)?.solid);if(enclosed){block.material="dirt";changed=true;}});
    const candidates=[];blocks.forEach((block)=>{if(block.material!=="water")return;[[1,0],[-1,0],[0,1],[0,-1]].forEach(([dx,dy])=>{const x=block.x+dx,y=block.y+dy,z=block.z;if(x<0||y<0||x>=size.width||y>=size.height||blocks.has(blockKey(x,y,z)))return;const key=blockKey(x,y,z);if(!waterSpread.has(key))waterSpread.set(key,{x,y,z,at:now+30000});else if(now>=waterSpread.get(key).at)candidates.push(waterSpread.get(key));});});for(const entry of candidates){if(waterAdds>=8)break;const key=blockKey(entry.x,entry.y,entry.z);if(!blocks.has(key)){blocks.set(key,{x:entry.x,y:entry.y,z:entry.z,material:"water",generated:true,protectedWater:true});changed=true;waterAdds+=1;}waterSpread.delete(key);}waterSpread.forEach((entry,key)=>{if(blocks.has(key))waterSpread.delete(key);});return changed;}
  function completeCollection(block,key,rule){actionProgress.delete(key);if(rule.reward)onCollectSample?.(rule.reward);if(rule.preserve)return;if(rule.till){block.material="dirt";delete block.protectedGround;save();render();return;}if(block.vehicleId){blocks.forEach((part,partKey)=>{if(part.vehicleId===block.vehicleId)blocks.delete(partKey);});settleBlocks();save();render();return;}if(block.habitatId){blocks.forEach((part,partKey)=>{if(part.habitatId===block.habitatId)blocks.delete(partKey);});settleBlocks();save();render();return;}if(block.protectedGround){block.material="dirt";delete block.protectedGround;grassRegrowth.set(`${block.x}:${block.y}`,{x:block.x,y:block.y,z:block.z,at:Date.now()+30000});save();render();return;}if(block.treeId&&block.treePart==="trunk")blocks.forEach((part)=>{if(part.treeId===block.treeId)part.floating=false;});if(block.generated&&block.material==="grass")grassRegrowth.set(`${block.x}:${block.y}`,{x:block.x,y:block.y,z:block.z,at:Date.now()+30000});if(blocks.delete(key)){settleBlocks();save();render();}}
  function destroy(tileX,tileY,z) {const targetZ=z||terrainHeight(tileX,tileY);const key=blockKey(tileX,tileY,targetZ);const block=blocks.get(key);if(!block)return;const selectedTool=getSelectedTool?.()||null;const rule=getCollectionRule(block,selectedTool);if(block.indestructible){onStatus?.("This sedimentary foundation cannot be removed.");return;}if(selectedTool!==rule.tool){onStatus?.(`Select the ${rule.tool.replaceAll("_"," ")} to work this material.`);return;}const progressKey=block.habitatId?`habitat:${block.habitatId}`:key;const count=(actionProgress.get(progressKey)||0)+1;actionProgress.set(progressKey,count);onToolAction?.(rule.action,{tool:selectedTool,current:count,required:rule.actions,material:block.material,x:block.x,y:block.y,z:block.z,debris:["water","ice"].includes(block.material)?"light":"dark"});if(count<rule.actions){onStatus?.(`${count}/${rule.actions} ${rule.action} actions`);return;}actionProgress.delete(progressKey);completeCollection(block,key,rule);}
  function pick(tileX,tileY,z) { const block=blocks.get(blockKey(tileX,tileY,z||terrainHeight(tileX,tileY)));if(block){selectedMaterial=block.material;refreshToolbar();} }
  const pointInPolygon=(x,y,points)=>points.reduce((inside,[xi,yi],index)=>{const [xj,yj]=points[(index+points.length-1)%points.length];return ((yi>y)!==(yj>y))&&(x<(xj-xi)*(y-yi)/(yj-yi)+xi)?!inside:inside;},false);
  function getClickedFace(pointer){for(const sprite of [...sprites.values()].sort((a,b)=>b.depth-a.depth)){const block=sprite.getData("e3Block");if(block?.previewHabitat)continue;const left=sprite.x-BLOCK_SIZE/2;const top=sprite.y-BLOCK_SIZE;const x=pointer.worldX-left;const y=pointer.worldY-top;if(x<0||x>BLOCK_SIZE||y<0||y>BLOCK_SIZE)continue;const faces={top:[[0,16],[32,0],[64,16],[32,32]],left:[[0,16],[32,32],[32,64],[0,48]],right:[[32,32],[64,16],[64,48],[32,64]]};for(const face of ["top","left","right"]){if(pointInPolygon(x,y,faces[face]))return {block,face};}}return null;}
  function handlePointer(pointer) { const inventoryMaterial=getInventoryMaterial?.()||null;if((!active&&!inventoryMaterial)||!enabled())return false;if(pointer.event?.target?.closest?.(".block-builder-panel"))return true;if(nearbyKayakId||mountedVehicleId)return true;const hit=getClickedFace(pointer);const tile=hit?.block||pointerToTilePosition(pointer.worldX,pointer.worldY);if(!tile)return true;const tileX=hit?.block.x??tile.tileX;const tileY=hit?.block.y??tile.tileY;if(active&&pointer.rightButtonDown()){blockEraseDragging=true;blockErasePointer=pointer;lastEraseRepeatAt=Date.now();lastDragTarget="";creativeDestroy(tileX,tileY,hit?.block.z);}else if(active&&pointer.middleButtonDown())pick(tileX,tileY,hit?.block.z);else if(pointer.leftButtonDown()){if(active&&materialByKey.get(selectedMaterial)?.kind==="editorTool"){const source=hit?.block||blocks.get(blockKey(tileX,tileY,terrainHeight(tileX,tileY)));terrainDrag={tool:selectedMaterial,x:tileX,y:tileY,targetZ:Math.max(1,hit?.block.z||terrainHeight(tileX,tileY)),baseZ:Math.max(1,terrainHeight(tileX,tileY)),sourceMaterial:materialByKey.has(source?.material)?source.material:"grass",originalHeights:new Map(),startedAt:Date.now()};lastDragTarget="";lastTerrainEditAt=0;applyTerrainDrag(tileX,tileY);return true;}const materialOverride=active?null:inventoryMaterial;if(!hit)place(tileX,tileY,1,materialOverride);else if(hit.face==="top")place(tileX,tileY,hit.block.z+1,materialOverride);else if(hit.face==="left")place(tileX,tileY+1,hit.block.z,materialOverride);else place(tileX+1,tileY,hit.block.z,materialOverride);}return true; }
  function handlePointerMove(pointer){if(!active||!enabled())return false;const hit=getClickedFace(pointer);const tile=hit?.block||pointerToTilePosition(pointer.worldX,pointer.worldY);if(blockEraseDragging&&pointer.rightButtonDown()){if(!tile)return true;const x=hit?.block.x??tile.tileX,y=hit?.block.y??tile.tileY,key=`${x}:${y}:${hit?.block.z||"top"}`;if(key!==lastDragTarget){lastDragTarget=key;creativeDestroy(x,y,hit?.block.z);}return true;}if(terrainDrag&&pointer.leftButtonDown()){if(tile)applyTerrainDrag(hit?.block.x??tile.tileX,hit?.block.y??tile.tileY);return true;}if(selectedMaterial!=="habitat_kit"){if(habitatPreview){habitatPreview=null;render();}return false;}if(!tile)return true;const next={x:tile.tileX-2,y:tile.tileY-2};if(!habitatPreview||next.x!==habitatPreview.x||next.y!==habitatPreview.y){habitatPreview=next;render();}return true;}
  function handlePointerUp(){blockEraseDragging=false;blockErasePointer=null;terrainDrag=null;lastDragTarget="";}
  function getHabitats(){const habitats=new Map();blocks.forEach((block)=>{if(block.habitatId&&!habitats.has(block.habitatId))habitats.set(block.habitatId,{id:block.habitatId,x:block.habitatOriginX,y:block.habitatOriginY,orientation:block.orientation});});return [...habitats.values()];}
  function isElevatedCanopyLeaf(tileX,tileY,z){if(blocks.get(blockKey(tileX,tileY,z))?.material!=="leaves")return false;let probe=z-1;while(probe>=1&&blocks.get(blockKey(tileX,tileY,probe))?.material==="leaves")probe-=1;let clearance=0;while(probe>=1&&!materialByKey.get(blocks.get(blockKey(tileX,tileY,probe))?.material)?.solid){clearance+=1;probe-=1;}return clearance>=2;}
  function terrainHeight(tileX,tileY) { let solidHeight=0,waterHeight=0,topMaterial=null,topBlock=null;for(let z=1;z<=MAX_BUILD_LAYER;z+=1){const block=blocks.get(blockKey(tileX,tileY,z));if(!block)continue;if(block.material==="water")waterHeight=z;if(materialByKey.get(block.material)?.solid&&!isElevatedCanopyLeaf(tileX,tileY,z)){solidHeight=z;topBlock=block;topMaterial=materialByKey.get(block.material);}}const height=solidHeight||waterHeight;return height+(solidHeight&&topMaterial?.nonStackable&&!topBlock?.habitatId?1:0); }
  function collisionHalfSize(tileX,tileY,currentFloor,defaultSize){for(let z=currentFloor+1;z<=MAX_BUILD_LAYER;z+=1)if(blocks.get(blockKey(tileX,tileY,z))?.material==="bark")return Math.min(11,defaultSize/2);return defaultSize/2;}
  function hasClearance(tileX,tileY,floor) { for(let z=floor+1;z<=Math.min(MAX_BUILD_LAYER,floor+2);z+=1){const block=blocks.get(blockKey(tileX,tileY,z));if(block&&materialByKey.get(block.material)?.solid)return false;}return true; }
  function getFootprintTiles(worldX,worldY) { const samples=[[0,0],[-PLAYER_COLLISION_RADIUS,0],[PLAYER_COLLISION_RADIUS,0],[0,-PLAYER_COLLISION_RADIUS],[0,PLAYER_COLLISION_RADIUS]];const unique=new Map();samples.forEach(([dx,dy])=>{const tile=logicalWorldToTilePosition(worldX+dx,worldY+dy);if(tile)unique.set(`${tile.tileX}:${tile.tileY}`,tile);});return [...unique.values()]; }
  function ensureElevation(worldX,worldY){const tile=logicalWorldToTilePosition(worldX,worldY);if(currentElevation===null){currentElevation=tile?terrainHeight(tile.tileX,tile.tileY):0;currentSupportTile=tile;}return tile;}
  function overlapsTile(worldX,worldY,tile,radius=EDGE_DROP_CLEARANCE){const logical=tile&&tileToLogicalPosition(tile.tileX,tile.tileY);if(!logical)return false;const half=logical.size/2;const closestX=Math.max(logical.x-half,Math.min(worldX,logical.x+half));const closestY=Math.max(logical.y-half,Math.min(worldY,logical.y+half));return Math.hypot(worldX-closestX,worldY-closestY)<radius;}
  function getSupportFloorOffset(worldX,worldY){ensureElevation(worldX,worldY);return currentElevation*BLOCK_RISE;}
  function finishLanding(tile){const player=getPlayer();const logical=tile&&tileToLogicalPosition(tile.tileX,tile.tileY);if(!player||!logical)return;const half=logical.size/2-.75;player.x=Math.max(logical.x-half,Math.min(player.x,logical.x+half));player.y=Math.max(logical.y-half,Math.min(player.y,logical.y+half));}
  function getTileCollision(worldX,worldY,currentFloor,radius=PLAYER_COLLISION_RADIUS,maxStep=0){const center=logicalWorldToTilePosition(worldX,worldY);if(!center)return {hard:true};let best=null;for(let y=center.tileY-1;y<=center.tileY+1;y+=1){for(let x=center.tileX-1;x<=center.tileX+1;x+=1){const height=terrainHeight(x,y);if(height<=currentFloor+maxStep)continue;const logical=tileToLogicalPosition(x,y);if(!logical)continue;const half=collisionHalfSize(x,y,currentFloor,logical.size);const closestX=Math.max(logical.x-half,Math.min(worldX,logical.x+half));const closestY=Math.max(logical.y-half,Math.min(worldY,logical.y+half));let nx=worldX-closestX;let ny=worldY-closestY;const distance=Math.hypot(nx,ny);if(distance>=radius)continue;if(distance<.001){const dx=worldX-logical.x;const dy=worldY-logical.y;if(Math.abs(dx)>Math.abs(dy)){nx=Math.sign(dx)||1;ny=0;}else{nx=0;ny=Math.sign(dy)||1;}}else{nx/=distance;ny/=distance;}const penetration=radius-distance;if(!best||penetration>best.penetration)best={tileX:x,tileY:y,height,nx,ny,penetration};}}return best;}
  function resolveMovement(startX,startY,dx,dy,jumping=false,radius=PLAYER_COLLISION_RADIUS,playerControlled=true){if(!dx&&!dy)return {x:startX,y:startY};if(playerControlled&&fallActive)return {x:startX,y:startY};const currentTile=ensureElevation(startX,startY);if(!currentTile)return {x:startX,y:startY};let targetX=startX+dx;let targetY=startY+dy;if(playerControlled&&jumping){const movementLength=Math.hypot(dx,dy);if(!jumpTargetChecked&&movementLength){jumpTargetChecked=true;const logical=tileToLogicalPosition(currentTile.tileX,currentTile.tileY);const lookAhead=(logical?.size||64)*.7;const landingTile=logicalWorldToTilePosition(startX+dx/movementLength*lookAhead,startY+dy/movementLength*lookAhead);if(landingTile&&terrainHeight(landingTile.tileX,landingTile.tileY)===currentElevation+1)jumpLandingTile=landingTile;}const travelX=targetX-jumpStartX;const travelY=targetY-jumpStartY;const travel=Math.hypot(travelX,travelY);if(travel>JUMP_TRAVEL_LIMIT){targetX=jumpStartX+travelX/travel*JUMP_TRAVEL_LIMIT;targetY=jumpStartY+travelY/travel*JUMP_TRAVEL_LIMIT;}}const currentFloor=playerControlled?currentElevation:terrainHeight(currentTile.tileX,currentTile.tileY);const stepAllowance=jumping&&playerControlled?1:0;const collision=getTileCollision(targetX,targetY,currentFloor,radius,stepAllowance);if(!collision)return {x:targetX,y:targetY};const inward=dx*collision.nx+dy*collision.ny;const slideX=inward<0?dx-collision.nx*inward:dx;const slideY=inward<0?dy-collision.ny*inward:dy;const slideTargetX=startX+slideX+collision.nx*.2;const slideTargetY=startY+slideY+collision.ny*.2;if(!getTileCollision(slideTargetX,slideTargetY,currentFloor,radius,stepAllowance))return {x:slideTargetX,y:slideTargetY};return {x:startX+collision.nx*.2,y:startY+collision.ny*.2};}
  function canMoveTo(worldX,worldY,jumping=false) { const player=getPlayer();if(!player)return false;const resolved=resolveMovement(player.x,player.y,worldX-player.x,worldY-player.y,jumping);return Math.abs(resolved.x-worldX)<.01&&Math.abs(resolved.y-worldY)<.01; }
  function driveVehicle(dx,dy,isScreenDiagonal=false){const player=getPlayer();if(!player||(!dx&&!dy))return null;const tile=logicalWorldToTilePosition(player.x,player.y);if(!tile)return null;const height=terrainHeight(tile.tileX,tile.tileY),part=blocks.get(blockKey(tile.tileX,tile.tileY,height));if(!part?.vehicleId)return null;const id=part.vehicleId,type=part.vehicleType,orientation=Number(part.vehicleOrientation)||0;const desired=[[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1]].findIndex(([vx,vy])=>vx===Math.sign(dx)&&vy===Math.sign(dy));const now=Date.now();const state=vehicleDriveState.get(id)||{lastMove:0,lastTurn:0};if(!isScreenDiagonal&&desired>=0&&desired!==orientation){const turnDelay=type==="kayak"?1000:2000;if(now-state.lastTurn>=turnDelay){const clockwise=(desired-orientation+8)%8;const nextOrientation=(orientation+(clockwise<=4?1:-1)+8)%8;const cx=part.vehicleCenterX,cy=part.vehicleCenterY;if(canPlaceVehicle(type,cx,cy,nextOrientation,id)){const old=[...blocks.entries()].filter(([,block])=>block.vehicleId===id);old.forEach(([key])=>blocks.delete(key));vehicleParts(type,cx,cy,nextOrientation).forEach((next,index)=>{const z=(waterSurfaceZ(next.x,next.y)||waterSurfaceZ(cx,cy))+1+next.layer;blocks.set(blockKey(next.x,next.y,z),{...part,x:next.x,y:next.y,z,vehicleOrientation:nextOrientation,vehiclePart:index,vehicleLength:next.length,vehicleWidth:next.width,vehicleLayer:next.layer});});state.lastTurn=now;save();render();}}vehicleDriveState.set(id,state);return {x:player.x,y:player.y,turning:true};}const moveDelay=type==="kayak"?320:480;if(now-state.lastMove<moveDelay)return {x:player.x,y:player.y};const stepX=Math.sign(dx),stepY=Math.sign(dy),cx=part.vehicleCenterX+stepX,cy=part.vehicleCenterY+stepY;if(!canPlaceVehicle(type,cx,cy,orientation,id))return {x:player.x,y:player.y};[...blocks.entries()].filter(([,block])=>block.vehicleId===id).forEach(([key])=>blocks.delete(key));vehicleParts(type,cx,cy,orientation).forEach((next,index)=>{const z=(waterSurfaceZ(next.x,next.y)||waterSurfaceZ(cx,cy))+1+next.layer;blocks.set(blockKey(next.x,next.y,z),{...part,x:next.x,y:next.y,z,vehicleCenterX:cx,vehicleCenterY:cy,vehiclePart:index,vehicleLength:next.length,vehicleWidth:next.width,vehicleLayer:next.layer});});state.lastMove=now;vehicleDriveState.set(id,state);save();render();return {x:player.x+stepX*BLOCK_SIZE,y:player.y+stepY*BLOCK_SIZE};}
  function driveMountedVehicle(dx,dy,isScreenDiagonal=false){
    const player=getPlayer(),part=vehicleCenterBlock(mountedVehicleId);
    if(!player||!part||(!dx&&!dy))return null;
    const id=part.vehicleId,type=part.vehicleType,orientation=Number(part.vehicleOrientation)||0;
    const directions=[[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1]];
    const desired=directions.findIndex(([vx,vy])=>vx===Math.sign(dx)&&vy===Math.sign(dy));
    const now=Date.now(),state=vehicleDriveState.get(id)||{lastMove:0,lastTurn:0};
    if(!isScreenDiagonal&&desired>=0&&desired!==orientation){
      const turnDelay=type==="kayak"?1000:2000;
      if(now-state.lastTurn>=turnDelay){
        const clockwise=(desired-orientation+8)%8,nextOrientation=(orientation+(clockwise<=4?1:-1)+8)%8;
        const cx=part.vehicleCenterX,cy=part.vehicleCenterY;
        if(canPlaceVehicle(type,cx,cy,nextOrientation,id)){
          [...blocks.entries()].filter(([,block])=>block.vehicleId===id).forEach(([key])=>blocks.delete(key));
          vehicleParts(type,cx,cy,nextOrientation).forEach((next,index)=>{const z=(waterSurfaceZ(next.x,next.y)||waterSurfaceZ(cx,cy))+1+next.layer;blocks.set(blockKey(next.x,next.y,z),{...part,x:next.x,y:next.y,z,vehicleOrientation:nextOrientation,vehiclePart:index,vehicleLength:next.length,vehicleWidth:next.width,vehicleLayer:next.layer});});
          state.lastTurn=now;save();render();
        }
      }
      vehicleDriveState.set(id,state);return {x:player.x,y:player.y,turning:true};
    }
    const moveDelay=type==="kayak"?320:480;if(now-state.lastMove<moveDelay)return {x:player.x,y:player.y};
    const stepX=Math.sign(dx),stepY=Math.sign(dy),cx=part.vehicleCenterX+stepX,cy=part.vehicleCenterY+stepY;
    if(!canPlaceVehicle(type,cx,cy,orientation,id))return {x:player.x,y:player.y};
    [...blocks.entries()].filter(([,block])=>block.vehicleId===id).forEach(([key])=>blocks.delete(key));
    vehicleParts(type,cx,cy,orientation).forEach((next,index)=>{const z=(waterSurfaceZ(next.x,next.y)||waterSurfaceZ(cx,cy))+1+next.layer;blocks.set(blockKey(next.x,next.y,z),{...part,x:next.x,y:next.y,z,vehicleCenterX:cx,vehicleCenterY:cy,vehiclePart:index,vehicleLength:next.length,vehicleWidth:next.width,vehicleLayer:next.layer});});
    const logical=tileToLogicalPosition(cx,cy);player.x=logical.x;player.y=logical.y;state.lastMove=now;vehicleDriveState.set(id,state);save();render();return {x:logical.x,y:logical.y};
  }
  function requestJump() { if(exitKayak()||Date.now()-lastKayakExitAt<250)return;const player=getPlayer();if(jumpStartedAt||fallActive||!player)return;const tile=ensureElevation(player.x,player.y);jumpLandingTile=null;jumpTargetChecked=false;jumpHorizontalLocked=false;jumpStartX=player.x;jumpStartY=player.y;jumpStartFloorOffset=currentElevation*BLOCK_RISE;currentSupportTile=tile;visualFloorOffset=jumpStartFloorOffset;fallVelocity=0;fallActive=false;jumpStartedAt=performance.now(); }
  function getPlayerOffsets(worldX,worldY) { const tile=ensureElevation(worldX,worldY);const now=performance.now();const dt=Math.min(.05,Math.max(0,(now-lastVerticalUpdateAt)/1000));lastVerticalUpdateAt=now;if(jumpStartedAt){const elapsed=(now-jumpStartedAt)/JUMP_DURATION_MS;if(elapsed<1){const plannedTile=jumpLandingTile||tile;const landingHeight=plannedTile?terrainHeight(plannedTile.tileX,plannedTile.tileY):currentElevation;const nextElevation=landingHeight<=currentElevation+1?landingHeight:currentElevation;const landingOffset=nextElevation*BLOCK_RISE;const desiredElevation=jumpStartFloorOffset+(landingOffset-jumpStartFloorOffset)*elapsed+Math.sin(elapsed*Math.PI)*JUMP_HEIGHT;visualFloorOffset=landingOffset;return {floor:landingOffset,jump:desiredElevation-landingOffset,supportTile:tile||currentSupportTile,elevation:nextElevation};}jumpStartedAt=0;const landingHeight=tile?terrainHeight(tile.tileX,tile.tileY):currentElevation;if(landingHeight<=currentElevation+1){currentElevation=landingHeight;currentSupportTile=tile;}jumpLandingTile=null;visualFloorOffset=currentElevation*BLOCK_RISE;fallVelocity=0;}const groundElevation=tile?terrainHeight(tile.tileX,tile.tileY):0;const swimming=!!tile&&waterSurfaceZ(tile.tileX,tile.tileY)===groundElevation&&!blocks.get(blockKey(tile.tileX,tile.tileY,groundElevation+1));const mountedBlock=tile&&blocks.get(blockKey(tile.tileX,tile.tileY,groundElevation));const mountedVehicle=mountedBlock?.vehicleId?{id:mountedBlock.vehicleId,type:mountedBlock.vehicleType,orientation:Number(mountedBlock.vehicleOrientation)||0}:null;const targetFloorOffset=groundElevation*BLOCK_RISE-(swimming?14:mountedVehicle?16:0);if(groundElevation>currentElevation){currentElevation=groundElevation;visualFloorOffset=targetFloorOffset;fallActive=false;}else if(groundElevation<currentElevation){if(!fallActive&&overlapsTile(worldX,worldY,currentSupportTile)){visualFloorOffset=currentElevation*BLOCK_RISE;fallVelocity=0;return {floor:visualFloorOffset,jump:0,supportTile:currentSupportTile,elevation:currentElevation};}fallActive=true;currentSupportTile=tile;fallVelocity+=FALL_ACCELERATION*dt;visualFloorOffset=Math.max(targetFloorOffset,visualFloorOffset-fallVelocity*dt);if(visualFloorOffset===targetFloorOffset){currentElevation=groundElevation;fallVelocity=0;fallActive=false;}}else{visualFloorOffset=targetFloorOffset;currentSupportTile=tile;fallVelocity=0;fallActive=false;}return {floor:visualFloorOffset,jump:swimming?Math.sin(now*.004)*2:0,supportTile:currentSupportTile||tile,elevation:currentElevation,swimming,mountedVehicle}; }
  function refreshActionTarget(){const tool=getSelectedTool?.();const player=getPlayer();const tile=player&&logicalWorldToTilePosition(player.x,player.y);let next=null;if(tile&&tool&&tool!=="spacegun"){const direction=getPlayerDirection?.()||"down";const delta={up:[-1,-1],down:[1,1],left:[-1,1],right:[1,-1],left_up:[-1,0],right_up:[0,-1],left_down:[0,1],right_down:[1,0]}[direction]||[1,1];next={x:tile.tileX+delta[0],y:tile.tileY+delta[1]};const size=getGridSize();if(next.x<0||next.y<0||next.x>=size.width||next.y>=size.height)next=null;}actionTarget=next;}
  function performSelectedAction(){if(enterNearbyKayak())return true;refreshActionTarget();if(!actionTarget)return false;let target=null;for(let z=MAX_BUILD_LAYER;z>=1;z-=1){const block=blocks.get(blockKey(actionTarget.x,actionTarget.y,z));if(block){target=block;break;}}if(!target)return false;if(target.material==="processor_io"){const processed=onProcessInventory?.();onStatus?.(processed?`Processed ${processed}.`:"The processor needs a block in inventory.");return true;}if(target.material==="hydroponic_cultivator"){if(target.grown&&target.seedType){onCollectSample?.(target.seedType);onStatus?.("Cultivated seeds collected.");delete target.seedType;delete target.plantedAt;delete target.grown;save();render();return true;}if(target.seedType){onStatus?.("The hydroponic seed is still growing.");return true;}const seed=onPlantSeed?.();if(!seed){onStatus?.("Select or collect a plant seed first.");return true;}target.seedType=seed;target.plantedAt=Date.now();target.grown=false;onStatus?.("Seed added to the hydroponic cultivator.");save();render();return true;}destroy(target.x,target.y,target.z);return true;}
  function updateKayakPrompt(){if(mountedVehicleId){nearbyKayakId=null;return;}const nearby=nearestKayak();const nextId=nearby?.block?.vehicleId||null;if(nextId&&nextId!==nearbyKayakId)onStatus?.("E · Enter kayak");nearbyKayakId=nextId;}
  function updateConveyors(now){if(now-lastConveyorUpdateAt<700)return false;lastConveyorUpdateAt=now;let changed=false;const moved=new Set();const conveyors=[...blocks.values()].filter((block)=>materialByKey.get(block.material)?.kind==="conveyor");for(const conveyor of conveyors){const cargoKey=blockKey(conveyor.x,conveyor.y,conveyor.z+1),cargo=blocks.get(cargoKey);if(!cargo||moved.has(cargoKey)||cargo.habitatId||cargo.vehicleId||cargo.coreSamplerId||materialByKey.get(cargo.material)?.kind==="conveyor")continue;const delta=conveyor.material==="conveyor_up"?(conveyor.flipX?[0,-1]:[-1,0]):conveyor.flipX?[0,1]:[1,0];const nx=conveyor.x+delta[0],ny=conveyor.y+delta[1];const nextConveyor=blocks.get(blockKey(nx,ny,conveyor.z));if(materialByKey.get(nextConveyor?.material)?.kind!=="conveyor")continue;const destination=blockKey(nx,ny,nextConveyor.z+1);if(blocks.has(destination))continue;blocks.delete(cargoKey);cargo.x=nx;cargo.y=ny;cargo.z=nextConveyor.z+1;blocks.set(destination,cargo);moved.add(destination);changed=true;}return changed;}
  function updateSystems(){updateKayakPrompt();const now=Date.now();if(blockEraseDragging&&blockErasePointer?.rightButtonDown?.()&&now-lastEraseRepeatAt>=140){lastEraseRepeatAt=now;lastDragTarget="";handlePointerMove(blockErasePointer);}if(terrainDrag&&["tool_hill","tool_mountain","tool_digging"].includes(terrainDrag.tool))applyTerrainDrag(terrainDrag.x,terrainDrag.y,now);if(active){if(!growthPausedAt)growthPausedAt=now;return;}if(growthPausedAt){const pausedFor=now-growthPausedAt;grassRegrowth.forEach((entry)=>entry.at+=pausedFor);exposedDirtRepair.forEach((at,key)=>exposedDirtRepair.set(key,at+pausedFor));waterSpread.forEach((entry)=>entry.at+=pausedFor);growthPausedAt=0;}const surfaceChanged=maintainSurfaceGrowth(now),conveyorChanged=updateConveyors(now);updateWorld();if(surfaceChanged||conveyorChanged){save();render();}}
  function getPlayerDisplayOffsets(worldX,worldY){const offsets=getPlayerOffsets(worldX,worldY);if(offsets.swimming)offsets.floor-=18;if(!mountedVehicleId&&offsets.mountedVehicle){offsets.mountedVehicle=null;offsets.floor+=16;}else if(mountedVehicleId){const center=vehicleCenterBlock(mountedVehicleId);offsets.mountedVehicle=center?{id:mountedVehicleId,type:center.vehicleType,orientation:Number(center.vehicleOrientation)||0}:null;}return offsets;}
  function updateWorld(){refreshActionTarget();const now=Date.now();if(now-lastWorldUpdateAt<250)return;lastWorldUpdateAt=now;let changed=false;blocks.forEach((block,key)=>{if(block.material==="hydroponic_cultivator"&&block.seedType&&block.plantedAt&&!block.grown&&now-block.plantedAt>=10000){block.grown=true;changed=true;}if(block.material!=="tree_sprout"||!block.plantedAt||now-block.plantedAt<10000)return;blocks.delete(key);addGeneratedTree(block.x,block.y,Math.max(0,block.z-1),`planted-tree-${now}-${block.x}-${block.y}`);changed=true;});grassRegrowth.forEach((entry,key)=>{if(now<entry.at)return;const z=Math.min(MAX_BUILD_LAYER,terrainHeight(entry.x,entry.y)+1);if(z>=1&&!blocks.has(blockKey(entry.x,entry.y,z))){blocks.set(blockKey(entry.x,entry.y,z),{x:entry.x,y:entry.y,z,material:"grass",generated:true,fallFromZ:MAX_BUILD_LAYER+1});changed=true;}grassRegrowth.delete(key);});coreTimers.forEach((timer,id)=>{if(now-timer.startedAt<10000)return;const face=String(getMapKey()||"");const source=[];for(let z=MAX_BUILD_LAYER;z>=1&&source.length<4;z-=1){const material=blocks.get(blockKey(timer.x,timer.y,z))?.material;if(material&&!source.includes(material)&&material!=="core_clearance"&&material!=="core_sampler")source.push(material);}blocks.forEach((block,key)=>{if(block.coreSamplerId===id||block.x===timer.x&&block.y===timer.y)blocks.delete(key);});const profile=/polar|antarctic|cube_bottom/.test(face)?["cave","sedimentary","sedimentary","ice","ice"]:/ridge|hotspot|convergent|cube_(east|south|top)/.test(face)?["cave","cave","sedimentary","sedimentary",source[0]||"grass"]:["cave","sedimentary","sedimentary","dirt",source[0]||"grass"];const size=getGridSize();const sampleSpot=[[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dy])=>({x:timer.x+dx,y:timer.y+dy})).filter((spot)=>spot.x>=0&&spot.y>=0&&spot.x<size.width&&spot.y<size.height).sort((a,b)=>terrainHeight(a.x,a.y)-terrainHeight(b.x,b.y))[0];if(sampleSpot){const baseZ=Math.max(1,Math.min(MAX_BUILD_LAYER-4,terrainHeight(sampleSpot.x,sampleSpot.y)+1));for(let z=baseZ;z<=MAX_BUILD_LAYER;z+=1)blocks.delete(blockKey(sampleSpot.x,sampleSpot.y,z));profile.forEach((material,index)=>blocks.set(blockKey(sampleSpot.x,sampleSpot.y,baseZ+index),{x:sampleSpot.x,y:sampleSpot.y,z:baseZ+index,material,coreSample:true,fallFromZ:MAX_BUILD_LAYER+index+1}));}coreTimers.delete(id);onStatus?.("Core sample complete: five layers recovered.");changed=true;});const player=getPlayer();const tile=player&&logicalWorldToTilePosition(player.x,player.y);if(tile){const atEntrance=getHabitats().some((habitat)=>habitatEntranceTiles(habitat.x,habitat.y,habitat.orientation).some((door)=>tile.tileX===door.x&&tile.tileY===door.y));if(atEntrance&&now-lastHabitatEntryAt>2500){lastHabitatEntryAt=now;onEnterHabitat?.();}}if(/fault|cube_north/.test(String(getMapKey()))&&now%1800000<300){const epicenter=tileToDisplayPosition(Math.floor(getGridSize().width/2),Math.floor(getGridSize().height/2));scene.cameras?.main?.shake?.(240,.004);onStatus?.(`Seismic activity detected near ${Math.round(epicenter.x)}, ${Math.round(epicenter.y)}.`);}if(changed){settleBlocks();save();render();}syncCoreTimers?.([...coreTimers.entries()].map(([id,timer])=>{const display=tileToDisplayPosition(timer.x,timer.y);return {id,x:display.x,y:display.y-150,progress:Math.min(1,(now-timer.startedAt)/10000)};}));}
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
    if (event.code === "KeyR" && enabled() && active) {event.preventDefault();if(selectedMaterial==="habitat_kit"){habitatOrientation=habitatOrientation==="se"?"sw":"se";if(habitatPreview)render();}else if(isMirrorable(materialByKey.get(selectedMaterial)))assetMirrored=!assetMirrored;refreshToolbar();return; }
    if (["Space","ShiftLeft","ShiftRight","KeyZ"].includes(event.code) && enabled()) { event.preventDefault();if(event.code==="Space")spaceKeyCaptured=true;requestJump();return; }
    if (!active) return;
  };
  window.addEventListener("keydown",handleKey,true);
  const handleKeyUp=(event)=>{if(event.code!=="Space")return;if(enabled()&&!spaceKeyCaptured)requestJump();spaceKeyCaptured=false;};
  window.addEventListener("keyup",handleKeyUp,true);

  toolbar.querySelector("[data-close]").addEventListener("click",()=>toggle(false));toolbar.querySelector("[data-clear]").addEventListener("click",()=>{if(confirm("Regenerate this map and replace all placed blocks?")){generateWorld();render();}});
  load();refreshToolbar();
  return { toggle, isActive:()=>active, isJumping:()=>!!jumpStartedAt, isFalling:()=>fallActive, isVehicleMounted:()=>!!mountedVehicleId, isWaterAt:(worldX,worldY)=>{const tile=logicalWorldToTilePosition(worldX,worldY);return !!tile&&waterSurfaceZ(tile.tileX,tile.tileY)>0;}, handlePointer, handlePointerMove, handlePointerUp, performSelectedAction, render, load, loadSnapshot, getSnapshot, update:updateSystems, requestJump, getPlayerOffsets:getPlayerDisplayOffsets, updateEntityPhysics, canMoveTo, resolveMovement, driveVehicle:driveMountedVehicle, notifyPlanetEdge:(edge)=>onPlanetEdge?.(edge), resolveEntityMovement:(x,y,dx,dy,radius=5)=>resolveMovement(x,y,dx,dy,false,radius,false), terrainHeight, regenerate:()=>{generateWorld();render();}, destroy:()=>{window.removeEventListener("keydown",handleKey,true);window.removeEventListener("keyup",handleKeyUp,true);toolbar.remove();syncWorldBlocks?.([]);syncCoreTimers?.([]);sprites.forEach((sprite)=>sprite.destroy());sprites.clear();timerGraphics.forEach((graphic)=>graphic.destroy());groundSprites.forEach((sprite)=>sprite.destroy());groundSprites.length=0;} };
}
