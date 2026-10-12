const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function createPlateMotionLab({ onBack = () => {}, onComplete = async () => {} } = {}) {
  const root = document.createElement("div");
  root.className = "plate-model-lab";
  root.innerHTML = `<header class="plate-model-header"><button type="button" class="plate-model-back">← Learning Labs</button><div><span class="eyebrow">Plate Motion · Model Builder</span><h2>Regional Plate Laboratory</h2><p>Draw continents, position a transect, then test how mantle consistency affects plate motion.</p></div><div class="plate-mode-switch"><button type="button" class="active" data-mode="build">BUILD</button><button type="button" data-mode="run">RUN</button></div></header><section class="plate-map-card"><div class="plate-map-toolbar"><div><strong>Top-down map</strong><small>Draw thicker continental crust on either plate.</small></div><div class="plate-tools"><button type="button" class="active" data-tool="draw" title="Draw continental crust">✎ <span>Draw continent</span></button><button type="button" data-tool="erase" title="Erase continental crust">⌫ <span>Eraser</span></button><button type="button" data-tool="section" title="Move cross-section line">↕ <span>Move transect</span></button><button type="button" data-action="clear">Clear map</button></div></div><div class="plate-map-wrap"><canvas class="plate-map-canvas" width="960" height="410" aria-label="Editable top-down plate map"></canvas><div class="plate-map-legend"><span><i class="ocean"></i>Oceanic crust</span><span><i class="continent"></i>Continental crust</span><span><i class="boundary"></i>Plate boundary</span><span><i class="transect"></i>Cross-section transect</span></div></div></section><section class="plate-cross-card"><div class="plate-cross-heading"><div><strong>Cross-section view</strong><small>The profile follows the horizontal transect on the map.</small></div><span class="plate-motion-readout">Model paused</span></div><canvas class="plate-cross-canvas" width="960" height="230" aria-label="Plate cross-section model"></canvas><div class="mantle-control"><label><strong>Mantle consistency</strong><span><em>HARD SOLID</em><input type="range" min="0" max="100" value="78" aria-label="Mantle consistency"><em>SOFT SOLID</em></span></label></div></section><aside class="plate-model-controls"><div><span class="eyebrow">Boundary motion</span><div class="boundary-buttons"><button type="button" class="active" data-boundary="convergent">→ │ ←<small>Convergent</small></button><button type="button" data-boundary="divergent">← │ →<small>Divergent</small></button></div></div><div class="plate-evidence-tools"><span class="eyebrow">Drag evidence to map</span><div class="fossil-palette"><button type="button" draggable="true" data-stamp="leaf" title="Leaf imprints">☘<small>Leaves</small></button><button type="button" draggable="true" data-stamp="track" title="Dinosaur foot imprints">♣<small>Tracks</small></button><button type="button" draggable="true" data-stamp="bone" title="Dinosaur bones">🦴<small>Bones</small></button></div><div class="marker-palette"><button type="button" draggable="true" data-stamp="marker-1">1</button><button type="button" draggable="true" data-stamp="marker-2">2</button><button type="button" draggable="true" data-stamp="marker-3">3</button></div></div><div class="plate-event-toggles"><span class="eyebrow">Boundary evidence</span><label><input type="checkbox" data-event="volcano"> Volcanoes</label><label><input type="checkbox" data-event="earthquake"> Earthquakes</label></div><div class="plate-observation"><span class="eyebrow">Live observation</span><strong>Build a region and place the transect.</strong><p>Draw continental crust, then switch to Run to observe the boundary.</p></div><button type="button" class="plate-rebuild">Restart model</button></aside>`;

  root.querySelector(".plate-model-back").remove(); root.querySelector(".plate-model-header").classList.add("no-back"); root.querySelector(".plate-map-toolbar strong").textContent="Map view";
  root.querySelector('[data-mode="run"]').insertAdjacentHTML("afterend", '<button type="button" data-mode="pause">PAUSE</button>');
  const modeSwitch=root.querySelector(".plate-mode-switch");const runControls=document.createElement("div");runControls.className="plate-run-controls";modeSwitch.replaceWith(runControls);runControls.append(modeSwitch,root.querySelector(".plate-motion-readout"));
  root.querySelectorAll('[data-boundary]').forEach((button)=>button.classList.remove('active'));
  root.querySelector('[data-mode="run"]').disabled = true;
  const map = root.querySelector(".plate-map-canvas"); const mapCtx = map.getContext("2d");
  const markerReadout = document.createElement("div"); markerReadout.className = "plate-marker-readout"; markerReadout.hidden = true; map.parentElement.append(markerReadout);
  const cross = root.querySelector(".plate-cross-canvas"); const crossCtx = cross.getContext("2d");
  const cols = 120; const rows = 52; const land = Array.from({ length: rows }, () => new Uint8Array(cols));
  const fossils = []; const markers = [];
  let tool = "draw"; let mode = "build"; let boundaryType = null; let transect = 29; let drawing = false; let progress = 0; let runElapsed = 0; let lastTime = performance.now(); let animationFrame = 0; let nextVolcanoEventAt = 0; let nextEarthquakeEventAt = 0; let boundaryEvents = []; let selectedMarkerNumber = null; let completionReported = false;
  const RUN_DURATION = 30000; const GEOLOGIC_YEARS = 200; const DISPLAY_TRAVEL_KM = 2250; const DISPLAY_TRAVEL_FRACTION = .45; const CONVERGENT_COLLISION_SPEED = .35; const DIVERGENT_BREAK_PROGRESS = .12; const SEA_LEVEL = 124;
  const mantle = root.querySelector('.mantle-control input'); const readout = root.querySelector('.plate-motion-readout'); const crustState=document.createElement('span');crustState.className='plate-motion-readout plate-crust-state';crustState.textContent='Crust at boundary: —';readout.insertAdjacentElement('beforebegin',crustState);

  function boundaryX(row) { return Math.round(cols / 2 + Math.sin(row * .33) * 2.1 + Math.sin(row * .11) * 1.4); }
  function travelProgress() { return progress; }
  function convergentContactProgress() { return clamp(convergentContactCells()/(cols*DISPLAY_TRAVEL_FRACTION),.04,1); }
  function convergenceApproachProgress() { return clamp(progress/convergentContactProgress(),0,1); }
  function deformationProgress() { const contact=convergentContactProgress();return boundaryType === "convergent" ? clamp((progress-contact)/Math.max(.001,1-contact),0,1) : progress; }
  function divergentStretchProgress() { return clamp(progress / DIVERGENT_BREAK_PROGRESS, 0, 1); }
  function divergentSpreadProgress() { const phase=clamp((progress-DIVERGENT_BREAK_PROGRESS)/(1-DIVERGENT_BREAK_PROGRESS),0,1);return phase*phase*(3-2*phase); }
  function divergentTravelProgress() { return progress; }
  function divergentGeneratedWidth(width) { return 20+Math.max(0,divergentTravelProgress()-DIVERGENT_BREAK_PROGRESS)*width*DISPLAY_TRAVEL_FRACTION; }
  function divergentWaterProgress(row=null) { const localThreshold=.72+(row==null?0:Math.sin(row*.61+1.3)*.025);return Math.max(divergentSpreadProgress(),clamp((divergentStretchProgress()-localThreshold)/Math.max(.08,1-localThreshold),0,1)); }
  function convergentContactCells() { let closest=Infinity;for(let y=0;y<rows;y+=1){const boundary=boundaryX(y);let left=-1;let right=cols;for(let x=0;x<boundary;x+=1)if(land[y][x])left=x;for(let x=boundary;x<cols;x+=1)if(land[y][x]){right=x;break;}if(left>=0&&right<cols)closest=Math.min(closest,Math.max(0,(right-left-1)/2));}return Number.isFinite(closest)?closest:cols*DISPLAY_TRAVEL_FRACTION; }
  function convergentTravelCells() { const contact=convergentContactCells();const freeTravel=progress*cols*DISPLAY_TRAVEL_FRACTION;return freeTravel<=contact?freeTravel:contact+(freeTravel-contact)*CONVERGENT_COLLISION_SPEED; }
  function plateShift(x, y, width = map.width) { if (!["run","paused","complete"].includes(mode)) return 0; const row=clamp(Math.floor(y),0,rows-1);const side=x<boundaryX(row)?-1:1;if(boundaryType==="divergent")return side*divergentTravelProgress()*width*DISPLAY_TRAVEL_FRACTION;return -side*convergentTravelCells()/cols*width; }
  function platePixelX(x,y,width=map.width){return x/cols*width+plateShift(x,y,width);}
  function movedPixelX(x, y, width = map.width) { const raw=x/cols*width+plateShift(x,y,width); if(boundaryType!=="convergent"||!["run","paused","complete"].includes(mode))return raw; const row=clamp(Math.floor(y),0,rows-1);const edge=boundaryX(row)/cols*width;const side=x<boundaryX(row)?-1:1;const collision=deformationProgress();const compressed=edge+(raw-edge)*(1-collision*.2);const cellWidth=width/cols;return side<0?Math.min(compressed,edge-cellWidth):Math.max(compressed,edge); }
  function connectedLand(startX, startY) {
    if (!land[startY]?.[startX]) return [];
    const found = []; const queue = [[startX, startY]]; const seen = new Set([`${startX},${startY}`]);
    while (queue.length) { const [x, y] = queue.shift(); found.push([x, y]); [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dx,dy]) => { const nx=x+dx; const ny=y+dy; const key=`${nx},${ny}`; if (land[ny]?.[nx] && !seen.has(key)) { seen.add(key); queue.push([nx,ny]); } }); }
    return found;
  }
  function placeStamp(type, x, y) {
    if (type.startsWith("marker-")) { const number = Number(type.slice(-1)); const existing = markers.find((entry) => entry.number === number); if (existing) Object.assign(existing, { x, y }); else markers.push({ number, x, y }); drawAll(); return; }
    if (fossils.some((entry) => entry.type === type)) return;
    const component = connectedLand(x, y); if (!component.length) return;
    for (let index = 0; index < Math.min(18, Math.max(7, Math.floor(component.length / 28))); index += 1) { const cell = component[Math.floor(Math.random() * component.length)]; fossils.push({ type, x: cell[0] + Math.random() * .7, y: cell[1] + Math.random() * .7 }); }
    drawAll();
  }
  function markerAtPosition(canvasX, canvasY) {
    let closest = null; let closestDistance = 24;
    markers.forEach((item) => { const dx=platePixelX(item.x,item.y,map.width)-canvasX;const dy=item.y/rows*map.height-canvasY;const distance=Math.hypot(dx,dy);if(distance<closestDistance){closest=item;closestDistance=distance;} });
    return closest;
  }
  function updateMarkerReadout() {
    const selected=markers.find((item)=>item.number===selectedMarkerNumber);
    if(!selected){markerReadout.hidden=true;return;}
    const px=platePixelX(selected.x,selected.y,map.width);const py=selected.y/rows*map.height;const startX=selected.x/cols*map.width;const kmPerPixel=DISPLAY_TRAVEL_KM/(map.width*DISPLAY_TRAVEL_FRACTION);const traveled=Math.round(Math.abs(px-startX)*kmPerPixel);
    const separations=markers.filter((item)=>item!==selected).map((item)=>{const otherX=platePixelX(item.x,item.y,map.width);const otherY=item.y/rows*map.height;return `<span>To marker ${item.number}: <b>${Math.round(Math.hypot(px-otherX,py-otherY)*kmPerPixel).toLocaleString()} km</b></span>`;}).join("");
    markerReadout.innerHTML=`<strong>Marker ${selected.number}</strong><span>Distance traveled: <b>${traveled.toLocaleString()} km</b></span>${separations}<small>Plate rate: 4 cm/year</small>`;
    markerReadout.style.left=`${clamp(px/map.width*100,8,84)}%`;markerReadout.style.top=`${clamp(py/map.height*100,8,78)}%`;markerReadout.hidden=false;
  }
  function seedContinents() {
    for (let y = 10; y < 40; y += 1) for (let x = 10; x < cols - 10; x += 1) {
      const left = x < boundaryX(y) - 4 && (((x - 30) / 26) ** 2 + ((y - 25) / 14) ** 2 < 1);
      const right = x > boundaryX(y) + 4 && (((x - 88) / 25) ** 2 + ((y - 25) / 14) ** 2 < 1);
      if (left || right) land[y][x] = 1;
    }
  }
  function paintAt(event, value) {
    const rect = map.getBoundingClientRect(); const x = Math.floor((event.clientX - rect.left) / rect.width * cols); const y = Math.floor((event.clientY - rect.top) / rect.height * rows);
    if (tool === "section") { transect = clamp(y, 2, rows - 3); progress = 0; runElapsed = 0; drawAll(); return; }
    const radius = value ? 2 : 4; progress = 0; runElapsed = 0;
    for (let oy = -radius; oy <= radius; oy += 1) for (let ox = -radius; ox <= radius; ox += 1) if (ox * ox + oy * oy <= radius * radius + 1) {
      const px = x + ox; const py = y + oy; if (py >= 0 && py < rows && px >= 0 && px < cols) land[py][px] = value;
    }
    drawAll();
  }
  function drawMap() {
    const w = map.width; const h = map.height; const cw = w / cols; const ch = h / rows;
    const water = mapCtx.createLinearGradient(0, 0, 0, h); water.addColorStop(0, "#176b86"); water.addColorStop(1, "#0c4965"); mapCtx.fillStyle = water; mapCtx.fillRect(0, 0, w, h);
    mapCtx.fillStyle = "rgba(255,255,255,.035)"; for (let y = 0; y < h; y += 18) mapCtx.fillRect(0, y, w, 1);
    for (let y = 0; y < rows; y += 1) for (let x = 0; x < cols; x += 1) if (land[y][x]) { const px = movedPixelX(x, y, w); mapCtx.fillStyle = (x + y) % 4 ? "#718b55" : "#78945a"; mapCtx.fillRect(px - .5, y * ch - .5, cw + 1, ch + 1); }
    if(boundaryType==="divergent"&&["run","paused","complete"].includes(mode)){const retainedRiftLand=Math.max(0,DIVERGENT_BREAK_PROGRESS*w*DISPLAY_TRAVEL_FRACTION-cw)*.65;for(let y=0;y<rows;y+=1){const boundary=boundaryX(y);if(!land[y][boundary-1]||!land[y][boundary])continue;const leftEdge=movedPixelX(boundary-1,y,w)+cw;const rightEdge=movedPixelX(boundary,y,w);if(rightEdge<=leftEdge)continue;const waterEntry=divergentWaterProgress(y);const boundaryPx=boundary*cw;const lockedLeftCoast=leftEdge+retainedRiftLand;const lockedRightCoast=rightEdge-retainedRiftLand;const leftCoast=boundaryPx+(lockedLeftCoast-boundaryPx)*waterEntry;const rightCoast=boundaryPx+(lockedRightCoast-boundaryPx)*waterEntry;let tile=0;for(let px=leftEdge-.5;px<leftCoast;px+=cw,tile+=1){mapCtx.fillStyle=(boundary+y+tile)%4?"#718b55":"#78945a";mapCtx.fillRect(px,y*ch-.5,Math.min(cw+1,leftCoast-px+1),ch+1);}tile=0;for(let px=rightCoast;px<rightEdge;px+=cw,tile+=1){mapCtx.fillStyle=(boundary+y-tile)%4?"#718b55":"#78945a";mapCtx.fillRect(px,y*ch-.5,Math.min(cw+1,rightEdge-px+1),ch+1);}}}
    const traceBoundary=()=>{mapCtx.beginPath();for(let y=0;y<rows;y+=1){const x=boundaryX(y)*cw;if(!y)mapCtx.moveTo(x,0);else mapCtx.lineTo(x,y*ch);}mapCtx.stroke();}; if(boundaryType==="divergent"&&["run","paused","complete"].includes(mode)&&progress>0){const newCrust=divergentSpreadProgress();if(newCrust>0){mapCtx.strokeStyle="#e47c32";mapCtx.lineWidth=2+newCrust*6;traceBoundary();}} mapCtx.strokeStyle = "#9fff38"; mapCtx.lineWidth = 3; traceBoundary();
    mapCtx.strokeStyle = "#e952b4"; mapCtx.lineWidth = 3; mapCtx.setLineDash([13, 7]); mapCtx.beginPath(); mapCtx.moveTo(0, (transect + .5) * ch); mapCtx.lineTo(w, (transect + .5) * ch); mapCtx.stroke(); mapCtx.setLineDash([]);
    const fossilGlyphs = { leaf: "☘", track: "♣", bone: "●" }; mapCtx.textAlign = "center"; mapCtx.textBaseline = "middle";
    fossils.forEach((item) => { if (!land[Math.floor(item.y)]?.[Math.floor(item.x)]) return; const px = movedPixelX(item.x, item.y, w); mapCtx.fillStyle = item.type === "bone" ? "#f3e7bd" : "#fff6c9"; mapCtx.font = item.type === "bone" ? "900 11px sans-serif" : "900 14px serif"; mapCtx.fillText(fossilGlyphs[item.type], px, item.y * ch); });
    markers.forEach((item) => { const px = platePixelX(item.x, item.y, w); const py = item.y * ch; mapCtx.fillStyle = "#fff"; mapCtx.strokeStyle = "#71359c"; mapCtx.lineWidth = 3; mapCtx.beginPath(); mapCtx.arc(px, py, 14, 0, Math.PI * 2); mapCtx.fill(); mapCtx.stroke(); mapCtx.fillStyle = "#71359c"; mapCtx.font = "900 14px sans-serif"; mapCtx.fillText(String(item.number), px, py); });
    updateMarkerReadout();
    if (["run","paused","complete"].includes(mode) && progress > 0) { const showVolcano=root.querySelector('[data-event="volcano"]').checked; const showQuake=root.querySelector('[data-event="earthquake"]').checked; boundaryEvents.forEach((event)=>{const age=runElapsed-event.startedAt;if(age<0||age>event.duration)return;const fadeIn=Math.min(1,age/550);const fadeOut=Math.min(1,(event.duration-age)/900);const opacity=Math.max(0,Math.min(fadeIn,fadeOut));const y=Math.floor(event.y);const bx=boundaryX(y)*cw+(Number(event.xOffset)||0);mapCtx.save();mapCtx.globalAlpha=opacity;if(event.kind==="volcano"&&showVolcano){mapCtx.fillStyle="#ff6d2d";mapCtx.font="900 18px sans-serif";mapCtx.fillText("▲",bx,event.y*ch);}if(event.kind==="earthquake"&&showQuake){mapCtx.fillStyle="#fff066";mapCtx.font="900 16px sans-serif";mapCtx.fillText("✦",bx,event.y*ch);}mapCtx.restore();}); }
    mapCtx.textAlign = "start"; mapCtx.textBaseline = "alphabetic";
  }
  function crossLandAt(x) { let total = 0; for (let y = transect - 1; y <= transect + 1; y += 1) total += land[clamp(y, 0, rows - 1)][x]; return total >= 2; }
  function subductingSide() { let leftLand=0,rightLand=0,leftArea=0,rightArea=0;for(let y=0;y<rows;y+=1)for(let x=0;x<cols;x+=1){if(x<boundaryX(y)){leftArea+=1;if(land[y][x])leftLand+=1;}else{rightArea+=1;if(land[y][x])rightLand+=1;}}const leftOceanic=1-leftLand/Math.max(1,leftArea);const rightOceanic=1-rightLand/Math.max(1,rightArea);return leftOceanic>=rightOceanic?-1:1;}
  function drawCrossSection() {
    const w = cross.width; const h = cross.height; const center = boundaryX(transect) / cols * w; const soft = Number(mantle.value) / 100; const activity = mode === "build" ? 0 : mode === "ready" ? .08 : progress; const deformation = mode === "build" ? 0 : boundaryType === "convergent" ? .12 + deformationProgress() * .88 : activity;
    crossCtx.clearRect(0, 0, w, h);
    const sky = crossCtx.createLinearGradient(0, 0, 0, SEA_LEVEL); sky.addColorStop(0, "#91c9e5"); sky.addColorStop(1, "#d9eef5"); crossCtx.fillStyle = sky; crossCtx.fillRect(0, 0, w, SEA_LEVEL); crossCtx.fillStyle = "#217a9b"; crossCtx.fillRect(0, SEA_LEVEL, w, 178-SEA_LEVEL);
    const mantleColor = `rgb(${Math.round(105 + soft * 134)},${Math.round(68 + soft * 47)},${Math.round(47 - soft * 14)})`; crossCtx.fillStyle = mantleColor; crossCtx.fillRect(0, 178, w, h - 178); crossCtx.fillStyle = `rgba(255,170,72,${soft * .28})`; for (let x = 0; x < w; x += 70) crossCtx.fillRect(x, 199 + Math.sin(x) * 8, 48, 3);
    const boundaryCell = boundaryX(transect);
    const sample = Array.from({ length: cols }, (_, x) => crossLandAt(x));
    const leftContinental = sample.slice(0, boundaryCell).some(Boolean);
    const rightContinental = sample.slice(boundaryCell).some(Boolean);
    const surfaceTotals = new Float32Array(cols);
    const surfaceCounts = new Float32Array(cols);
    const landMass = new Float32Array(cols);
    const moving = ["run", "paused", "complete"].includes(mode);
    const terrainNoise = (source) => Math.sin(source * .57 + transect * .19) * .58 + Math.sin(source * .16 + transect * .41) * .42;
    const shoreDistance = (source) => {
      if (!sample[source]) return 0;
      let left = 0; let right = 0;
      while (left < 7 && sample[source - left]) left += 1;
      while (right < 7 && sample[source + right]) right += 1;
      return Math.min(left, right, 7);
    };
    const sourceTop = (source) => {
      const noise = terrainNoise(source);
      if (!sample[source]) return 146 + noise * 3.5;
      const edge = clamp(shoreDistance(source) / 5, 0, 1);
      const roundedShore = edge * edge * (3 - 2 * edge);
      return SEA_LEVEL + 1 - roundedShore * 39 + noise * (2.2 + roundedShore * 2.8);
    };
    for (let source = 0; source < cols; source += 1) {
      const projected = moving ? movedPixelX(source, transect, w) : source / cols * w;
      const targetPosition = clamp(projected / w * cols, 0, cols - 1);
      const lower = Math.floor(targetPosition); const upper = Math.min(cols - 1, lower + 1); const upperWeight = targetPosition - lower; const lowerWeight = 1 - upperWeight;
      surfaceTotals[lower] += sourceTop(source) * lowerWeight; surfaceCounts[lower] += lowerWeight; if (sample[source]) landMass[lower] += lowerWeight;
      if (upper !== lower) { surfaceTotals[upper] += sourceTop(source) * upperWeight; surfaceCounts[upper] += upperWeight; if (sample[source]) landMass[upper] += upperWeight; }
    }
    const surfaces = new Float32Array(cols);
    for (let index = 0; index < cols; index += 1) surfaces[index] = surfaceCounts[index] ? surfaceTotals[index] / surfaceCounts[index] : 146 + terrainNoise(index) * 2;
    const initialCells = sample.reduce((total, value) => total + (value ? 1 : 0), 0);
    let occupiedCells = 0;
    for (let index = 0; index < cols; index += 1) occupiedCells += Math.min(1, landMass[index]);
    let leftProjectedEdge=-1;let rightProjectedEdge=cols;for(let index=0;index<boundaryCell;index+=1)if(landMass[index]>.2)leftProjectedEdge=index;for(let index=boundaryCell;index<cols;index+=1)if(landMass[index]>.2){rightProjectedEdge=index;break;}
    const transectGap=Math.max(0,rightProjectedEdge-leftProjectedEdge-1);const transectContact=leftProjectedEdge>=0&&rightProjectedEdge<cols&&transectGap<=1;
    const shortenedCells = Math.max(0, initialCells - occupiedCells);
    const subductSide = subductingSide();
    const subductedCells = (subductSide < 0 ? sample.slice(0, boundaryCell) : sample.slice(boundaryCell)).filter(Boolean).length;
    const runDeformation = deformationProgress();
    const continentalCollision=transectContact&&leftContinental&&rightContinental;
    const arrivalRaw=continentalCollision?clamp((runDeformation-.08)/.92,0,1):0;const continentalArrival=arrivalRaw*arrivalRaw*(3-2*arrivalRaw);
    crustState.textContent=boundaryType==='convergent'?(continentalCollision?'Continental crust · thrusting':'Oceanic crust · subducting'):boundaryType==='divergent'?'New oceanic crust forming':'Crust at boundary: —';
    const transferredHeight = Math.min(88,shortenedCells*7.2)*continentalArrival;
    const subductLoss = Math.min(12+continentalArrival*22,subductedCells*runDeformation*(.28+continentalArrival*.42));
    const underthrustTransfer = continentalCollision?Math.min(72,continentalArrival*(38+subductedCells*.55)):Math.min(12,runDeformation*14);
    const overthrustPixels=continentalArrival*92;
    function topY(x) {
      const position=clamp(x/w*(cols-1),0,cols-1);const lower=Math.floor(position);const upper=Math.min(cols-1,lower+1);const mix=position-lower;
      let y = surfaces[lower] * (1 - mix) + surfaces[upper] * mix;
      if(boundaryType==="divergent"){let smoothed=0;let weightTotal=0;for(let offset=-7;offset<=7;offset+=1){const weight=8-Math.abs(offset);smoothed+=surfaces[clamp(Math.round(position)+offset,0,cols-1)]*weight;weightTotal+=weight;}y=smoothed/weightTotal;}
      if (boundaryType === "convergent" && deformation > 0) {
        const distance = Math.abs(x - center);
        const contactClosure = clamp((convergenceApproachProgress() - .9) / .1, 0, 1);
        if(continentalCollision&&contactClosure>0){const leftShoulder=surfaces[clamp(boundaryCell-8,0,cols-1)];const rightShoulder=surfaces[clamp(boundaryCell+8,0,cols-1)];const joinedHeight=(leftShoulder+rightShoulder)/2;const joinInfluence=Math.max(0,1-distance/68)*contactClosure;y=y*(1-joinInfluence)+joinedHeight*joinInfluence;}
        const influence = Math.max(0, 1 - distance / 235);
        const smoothInfluence = influence * influence * (3 - 2 * influence);
        const side=x<center?-1:1;
        if (side === subductSide) { const bendInfluence=Math.max(0,1-distance/112);const descendingSurface=151+continentalArrival*22;y=y*(1-bendInfluence)+descendingSurface*bendInfluence;y+=smoothInfluence*subductLoss*.18; }
        else {
          const mountainBand = Math.max(0, 1 - Math.abs(distance - 72) / 175);
          const smoothMountain = mountainBand * mountainBand * (3 - 2 * mountainBand);
          const overthrustTaper=clamp(distance/58,0,1);
          const overridingPlate = Math.max(0, 1 - Math.abs(distance - 88) / 190);
          const smoothOverride = overridingPlate * overridingPlate * (3 - 2 * overridingPlate);
          y -= (smoothMountain * transferredHeight + smoothOverride * underthrustTransfer) * overthrustTaper;
        }
        if(transectContact&&continentalArrival<.05){const contactBlend=Math.max(0,1-distance/42)*(1-continentalArrival/.05);const contactSurface=(surfaces[clamp(boundaryCell-5,0,cols-1)]+surfaces[clamp(boundaryCell+5,0,cols-1)])/2+subductLoss*.18;y=y*(1-contactBlend)+contactSurface*contactBlend;}
      }
      if(boundaryType==="divergent"){const distance=Math.abs(x-center);const stretch=divergentStretchProgress();const riftStage=mode==="ready"?.12:stretch;const spreading=divergentSpreadProgress();const waterOpening=divergentWaterProgress(transect);const halfOpening=divergentTravelProgress()*w*DISPLAY_TRAVEL_FRACTION;const riftWidth=Math.max(82,halfOpening+34);const riftInfluence=Math.max(0,1-distance/riftWidth);const smoothRift=riftInfluence*riftInfluence*(3-2*riftInfluence);const continuousContinent=sample[Math.max(0,boundaryCell-1)]&&sample[Math.min(cols-1,boundaryCell)];if(continuousContinent){const joinedSurface=(sourceTop(Math.max(0,boundaryCell-1))+sourceTop(Math.min(cols-1,boundaryCell)))/2;const bridgeTexture=(terrainNoise(x/w*(cols-1))*3.2+Math.sin(x*.043+transect)*1.4)*(1-riftStage*.72);const taperedSurface=Math.min(151,joinedSurface+(151-joinedSurface)*riftStage)+bridgeTexture;const oceanicSurface=151+terrainNoise(x/w*(cols-1))*1.5;const transitionSurface=taperedSurface*(1-waterOpening)+oceanicSurface*waterOpening;const bridgeInfluence=clamp((halfOpening+28-distance)/28,0,1);y=y*(1-bridgeInfluence)+transitionSurface*bridgeInfluence;}y-=smoothRift*(2+10*spreading);const shoulderInfluence=clamp((halfOpening+150-distance)/150,0,1);const submergedAmount=clamp((y-(SEA_LEVEL-4))/14,0,1);y=Math.min(156,y+shoulderInfluence*submergedAmount*6);}
      return y;
    }
    const incomingContinentalSources=[];for(let source=0;source<cols;source+=1){const sourceSide=source<boundaryCell?-1:1;if(sourceSide===subductSide&&sample[source])incomingContinentalSources.push(source);}const incomingContinentalTop=incomingContinentalSources.length?Math.min(...incomingContinentalSources.map((source)=>sourceTop(source))):146;const incomingContinentalThickness=Math.max(0,178-incomingContinentalTop);
    function drawRigidConvergentPlate(side,isSubducting){
      const sources=[];for(let source=0;source<cols;source+=1){if((source<boundaryCell?-1:1)===side)sources.push(source);}
      const direction=subductSide<0?1:-1;const stackHeight=continentalArrival*Math.min(82,incomingContinentalThickness);
      const continentalProximity=(source)=>{if(!continentalCollision)return 0;let nearest=8;for(let offset=-7;offset<=7;offset+=1)if(sample[source+offset])nearest=Math.min(nearest,Math.abs(offset));const raw=clamp(1-nearest/8,0,1);return raw*raw*(3-2*raw);};
      const transform=(source,bottom=false)=>{const x=platePixelX(source,transect,w);let y=bottom?178:sourceTop(source);if(isSubducting){const penetration=Math.max(0,(x-center)*direction);const proximity=Math.max(0,1-Math.abs(x-center)/62);const preview=mode==="ready"?proximity*15:proximity*(1-runDeformation)*6;const oceanicDescent=penetration>0?Math.pow(penetration/Math.max(1,w*.19),1.22)*(h*.78):0;const continentalThrust=penetration>0?Math.min(30,penetration*.13+continentalArrival*10):0;const thrustMix=continentalProximity(source)*(mode==="ready"?1:clamp(.18+continentalArrival*.82,0,1));const descent=oceanicDescent*(1-thrustMix)+continentalThrust*thrustMix;y+=preview+descent;}else if(!bottom){const overlapBand=Math.max(0,1-Math.abs(x-center)/(w*.3));const smoothBand=overlapBand*overlapBand*(3-2*overlapBand);y-=stackHeight*smoothBand;}return{x,y};};
      const top=sources.map((source)=>transform(source,false));const bottom=sources.map((source)=>transform(source,true));if(!top.length)return;if(isSubducting){const innerIndex=side<0?top.length-1:0;for(let step=0;step<Math.min(9,top.length);step+=1){const index=innerIndex+(side<0?-step:step);const amount=1-step/9;const smooth=amount*amount*(3-2*amount);top[index].y=top[index].y*(1-smooth)+(bottom[index].y-16)*smooth;}}
      const innerTop={...(side<0?top[top.length-1]:top[0])};const innerBottom={...(side<0?bottom[bottom.length-1]:bottom[0])};
      if(side<0&&top[0].x>0){top.unshift({x:0,y:top[0].y});bottom.unshift({x:0,y:bottom[0].y});}if(side>0&&top[top.length-1].x<w){top.push({x:w,y:top[top.length-1].y});bottom.push({x:w,y:bottom[bottom.length-1].y});}
      if(!isSubducting){const underlapX=center-side*w*.14;const taperEndY=Math.min(172,Math.max(150,innerTop.y+30));const taperPoints=[.2,.4,.6,.8,1].map((amount)=>{const smooth=amount*amount*(3-2*amount);return{x:innerTop.x+(underlapX-innerTop.x)*amount,y:innerTop.y+(taperEndY-innerTop.y)*smooth};});const taperBottom=taperPoints.map((point)=>({x:point.x,y:178}));if(side<0){top.push(...taperPoints);bottom.push(...taperBottom);}else{top.unshift(...taperPoints.slice().reverse());bottom.unshift(...taperBottom.slice().reverse());}}
      const plateFill=crossCtx.createLinearGradient(0,90,0,220);plateFill.addColorStop(0,isSubducting?"#625b55":"#746c64");plateFill.addColorStop(1,isSubducting?"#292725":"#332f2c");
      let slabShape=null,slabTop=null,slabBottom=null;if(isSubducting){const slabThickness=16;const thrustBlend=continentalCollision?(mode==="ready"?.65:clamp(.25+continentalArrival*.75,0,1)):0;const armEndX=center+direction*w*(.34-thrustBlend*.08);const armEndY=h+32;const control1X=center+direction*w*.055;const control1Y=innerTop.y+18-thrustBlend*8;const control2X=center+direction*w*(.2-thrustBlend*.055);const control2Y=h*.81*(1-thrustBlend)+190*thrustBlend;slabShape=new Path2D();slabShape.moveTo(innerTop.x,innerTop.y);slabShape.bezierCurveTo(control1X,control1Y,control2X,control2Y,armEndX,armEndY);slabShape.lineTo(armEndX,armEndY+slabThickness);slabShape.bezierCurveTo(control2X,control2Y+slabThickness,control1X,control1Y+slabThickness,innerBottom.x,innerBottom.y);slabShape.closePath();slabTop=new Path2D();slabTop.moveTo(innerTop.x,innerTop.y);slabTop.bezierCurveTo(control1X,control1Y,control2X,control2Y,armEndX,armEndY);slabBottom=new Path2D();slabBottom.moveTo(innerBottom.x,innerBottom.y);slabBottom.bezierCurveTo(control1X,control1Y+slabThickness,control2X,control2Y+slabThickness,armEndX,armEndY+slabThickness);}
      crossCtx.beginPath();crossCtx.moveTo(top[0].x,top[0].y);for(let index=1;index<top.length;index+=1)crossCtx.lineTo(top[index].x,top[index].y);for(let index=bottom.length-1;index>=0;index-=1)crossCtx.lineTo(bottom[index].x,bottom[index].y);crossCtx.closePath();crossCtx.fillStyle=plateFill;crossCtx.fill();crossCtx.strokeStyle="#171717";crossCtx.lineWidth=2;crossCtx.beginPath();crossCtx.moveTo(top[0].x,top[0].y);for(let index=1;index<top.length;index+=1)crossCtx.lineTo(top[index].x,top[index].y);crossCtx.stroke();crossCtx.beginPath();crossCtx.moveTo(bottom[0].x,bottom[0].y);for(let index=1;index<bottom.length;index+=1)crossCtx.lineTo(bottom[index].x,bottom[index].y);crossCtx.stroke();
      if(slabShape){crossCtx.fillStyle=plateFill;crossCtx.fill(slabShape);crossCtx.strokeStyle="#171717";crossCtx.lineWidth=2;crossCtx.lineJoin="round";crossCtx.stroke(slabTop);crossCtx.stroke(slabBottom);}
    }
    if(boundaryType==="convergent"){drawRigidConvergentPlate(-subductSide,false);drawRigidConvergentPlate(subductSide,true);}else{
    const rock = crossCtx.createLinearGradient(0, 100, 0, 178); rock.addColorStop(0, "#6d655e"); rock.addColorStop(1, "#302c2a");crossCtx.fillStyle=rock;crossCtx.strokeStyle="#171717";crossCtx.lineWidth=2;crossCtx.lineJoin="round";crossCtx.lineCap="round";if(boundaryType==="divergent"){const generatedWidth=Math.min(w*.47,divergentGeneratedWidth(w)*divergentWaterProgress(transect));const segments=generatedWidth>1?[[0,center-generatedWidth],[center+generatedWidth,w]]:[[0,w]];segments.forEach(([start,end])=>{if(end<=start)return;crossCtx.beginPath();crossCtx.moveTo(start,topY(start));for(let x=start+3;x<end;x+=3)crossCtx.lineTo(x,topY(x));crossCtx.lineTo(end,topY(end));crossCtx.lineTo(end,178);crossCtx.lineTo(start,178);crossCtx.closePath();crossCtx.fill();crossCtx.beginPath();crossCtx.moveTo(start,topY(start));for(let x=start+3;x<end;x+=3)crossCtx.lineTo(x,topY(x));crossCtx.lineTo(end,topY(end));crossCtx.stroke();});}else{crossCtx.beginPath();crossCtx.moveTo(0,topY(0));for(let x=3;x<=w;x+=3)crossCtx.lineTo(x,topY(x));crossCtx.lineTo(w,178);crossCtx.lineTo(0,178);crossCtx.closePath();crossCtx.fill();crossCtx.beginPath();crossCtx.moveTo(0,topY(0));for(let x=3;x<=w;x+=3)crossCtx.lineTo(x,topY(x));crossCtx.stroke();}
    if (boundaryType === "convergent" && deformation > 0) {
      const direction = subductSide < 0 ? 1 : -1;
      const runAmount = deformationProgress();
      const reach = .72 + runAmount * .48;
      const startX = center - direction * 18;
      const startY = Math.min(158, topY(startX) + 1);
      const entryThickness=Math.max(28,178-startY);const underthrustThickness=16+(entryThickness-16)*.3;const tipThickness=12;
      const lowerStartY = 178;
      const endX = center + direction * 210 * reach;
      const endY = h + 5 + runAmount * 30;
      const underthrustX = center + direction * (82 + runAmount * 54);
      const underthrustY = 184 + runAmount * 12;
      crossCtx.beginPath();
      crossCtx.moveTo(startX, startY);
      crossCtx.bezierCurveTo(center - direction * 7, startY + 9, underthrustX, underthrustY, endX, endY);
      crossCtx.lineTo(endX - direction * tipThickness, endY + tipThickness * .35);
      crossCtx.bezierCurveTo(underthrustX - direction * underthrustThickness * .65, underthrustY + underthrustThickness, center - direction * 3, lowerStartY + runAmount * 2, startX, lowerStartY);
      crossCtx.closePath();
      const slab = crossCtx.createLinearGradient(startX, startY, endX, endY);
      slab.addColorStop(0, "#4c4641"); slab.addColorStop(1, "#292725");
      crossCtx.fillStyle = slab; crossCtx.fill();
      crossCtx.strokeStyle = "#171717"; crossCtx.lineWidth = 2;
      crossCtx.beginPath(); crossCtx.moveTo(startX, startY); crossCtx.bezierCurveTo(center - direction * 7, startY + 9, underthrustX, underthrustY, endX, endY); crossCtx.stroke();
      crossCtx.beginPath(); crossCtx.moveTo(startX, lowerStartY); crossCtx.bezierCurveTo(center - direction * 2, lowerStartY + runAmount * 3, underthrustX - direction * underthrustThickness * .65, underthrustY + underthrustThickness, endX - direction * tipThickness, endY + tipThickness * .35); crossCtx.stroke();
      if(continentalArrival>0){const inlandX=center+direction*170;const crestX=center+direction*72;const noseX=center-direction*overthrustPixels;const inlandTop=topY(inlandX);const crestTop=topY(crestX);const noseTop=Math.min(startY-5,crestTop+24);const seamY=Math.min(176,startY+12+continentalArrival*8);crossCtx.beginPath();crossCtx.moveTo(inlandX,inlandTop);crossCtx.quadraticCurveTo(crestX,crestTop,noseX,noseTop);crossCtx.lineTo(noseX,seamY);crossCtx.quadraticCurveTo(center+direction*38,166+continentalArrival*8,inlandX,178);crossCtx.closePath();const upperRock=crossCtx.createLinearGradient(0,90,0,178);upperRock.addColorStop(0,"#756d65");upperRock.addColorStop(1,"#332f2c");crossCtx.fillStyle=upperRock;crossCtx.fill();crossCtx.strokeStyle="#171717";crossCtx.lineWidth=2;crossCtx.beginPath();crossCtx.moveTo(inlandX,inlandTop);crossCtx.quadraticCurveTo(crestX,crestTop,noseX,noseTop);crossCtx.stroke();crossCtx.beginPath();crossCtx.moveTo(noseX,seamY);crossCtx.quadraticCurveTo(center+direction*38,166+continentalArrival*8,inlandX,178);crossCtx.stroke();}
    }}
    if (boundaryType === "divergent" && activity > 0 && divergentWaterProgress(transect)>.001) {
      const ridgeActivity=mode==="ready"?.04:.04+divergentSpreadProgress()*.96;
      const newWidth = Math.min(w*.47,divergentGeneratedWidth(w)*divergentWaterProgress(transect));
      const riftTop=Math.max(140,146-ridgeActivity*5);const ridgeBottom=riftTop+15;
      const edgeTop={[-1]:topY(center-newWidth),[1]:topY(center+newWidth)};
      const ridgeZone=Math.min(72,Math.max(24,newWidth*.45));const crestDistance=Math.min(18,newWidth*.22);
      const plateTop=(side,age)=>{const distance=age*newWidth;const ridgeT=clamp(distance/ridgeZone,0,1);const ridgeEase=ridgeT*ridgeT*(3-2*ridgeT);const variation=(Math.sin(distance*.055+transect*.37+side)+Math.sin(distance*.12+transect*.11-side)*.55)*1.8;const oceanFloor=151+variation;const ridgeCrest=9*Math.exp(-Math.pow((distance-crestDistance)/Math.max(5,crestDistance*.48),2));let y=distance<ridgeZone?riftTop+(oceanFloor-riftTop)*ridgeEase-ridgeCrest:oceanFloor;const edgeBlend=clamp((distance-(newWidth-38))/38,0,1);y=y*(1-edgeBlend)+edgeTop[side]*edgeBlend;return Math.max(134,y);};
      const plateBottom=(side,age)=>{const distance=age*newWidth;const ridgeT=clamp(distance/ridgeZone,0,1);const ridgeEase=ridgeT*ridgeT*(3-2*ridgeT);const thicknessVariation=(Math.sin(distance*.07+transect*.21+side*1.7)+Math.sin(distance*.15+side))*.9;let y=ridgeBottom+(176.5+thicknessVariation-ridgeBottom)*ridgeEase;if(distance>ridgeZone)y=176.5+thicknessVariation;const edgeBlend=clamp((distance-(newWidth-38))/38,0,1);return y*(1-edgeBlend)+178*edgeBlend;};
      const youngCrust=crossCtx.createLinearGradient(0,100,0,178);youngCrust.addColorStop(0,"#6d655e");youngCrust.addColorStop(1,"#302c2a");
      [-1,1].forEach((side)=>{const steps=Math.max(8,Math.ceil(newWidth/12));crossCtx.beginPath();crossCtx.moveTo(center,plateTop(side,0));for(let step=1;step<=steps;step+=1){const age=step/steps;crossCtx.lineTo(center+side*newWidth*age,plateTop(side,age));}for(let step=steps;step>=0;step-=1){const age=step/steps;crossCtx.lineTo(center+side*newWidth*age,plateBottom(side,age));}crossCtx.closePath();crossCtx.fillStyle=youngCrust;crossCtx.fill();crossCtx.strokeStyle="#171717";crossCtx.lineWidth=2;crossCtx.beginPath();crossCtx.moveTo(center,plateTop(side,0));for(let step=1;step<=steps;step+=1){const age=step/steps;crossCtx.lineTo(center+side*newWidth*age,plateTop(side,age));}crossCtx.stroke();});
      if(newWidth>52){crossCtx.save();crossCtx.globalAlpha=.22;crossCtx.strokeStyle="#bac3c3";crossCtx.lineWidth=1;const bandPhase=26+((newWidth-26)%52);for(let offset=bandPhase;offset<newWidth-10;offset+=52){const age=offset/newWidth;[-1,1].forEach((side)=>{const bx=center+side*offset;crossCtx.beginPath();crossCtx.moveTo(bx,plateTop(side,age)+2);crossCtx.lineTo(bx,plateBottom(side,age)-2);crossCtx.stroke();});}crossCtx.restore();}
      const plumeWidth=Math.min(94,Math.max(4,newWidth*.58));const plumeTop=ridgeBottom+1;const plumeGradient=crossCtx.createRadialGradient(center,plumeTop+12,4,center,plumeTop+20,plumeWidth);plumeGradient.addColorStop(0,`rgb(${Math.min(255,Math.round(145+soft*105))},${Math.round(82+soft*48)},${Math.round(36-soft*8)})`);plumeGradient.addColorStop(1,mantleColor);crossCtx.fillStyle=plumeGradient;crossCtx.beginPath();crossCtx.moveTo(center-plumeWidth,178);crossCtx.bezierCurveTo(center-plumeWidth*.62,177,center-plumeWidth*.34,plumeTop+10,center,plumeTop);crossCtx.bezierCurveTo(center+plumeWidth*.34,plumeTop+10,center+plumeWidth*.62,177,center+plumeWidth,178);crossCtx.closePath();crossCtx.fill();
      crossCtx.fillStyle=`rgba(255,160,57,${.5+soft*.35})`;crossCtx.beginPath();crossCtx.moveTo(center-5,ridgeBottom+8);crossCtx.bezierCurveTo(center-4,ridgeBottom,center-2,riftTop+5,center,riftTop+3);crossCtx.bezierCurveTo(center+2,riftTop+5,center+4,ridgeBottom,center+5,ridgeBottom+8);crossCtx.closePath();crossCtx.fill();
      crossCtx.strokeStyle="#171717";crossCtx.lineWidth=1.5;crossCtx.beginPath();crossCtx.moveTo(center,riftTop);crossCtx.lineTo(center,ridgeBottom);crossCtx.stroke();
    }
    crossCtx.strokeStyle = "#9fff38"; crossCtx.lineWidth = 2; crossCtx.beginPath(); crossCtx.moveTo(center, 0); crossCtx.lineTo(center, h); crossCtx.stroke();
    const observation = root.querySelector(".plate-observation"); if (mode === "run") { let title = progress<DIVERGENT_BREAK_PROGRESS?"The crust is stretching and thinning.":"Plates are moving apart."; let detail = progress<DIVERGENT_BREAK_PROGRESS?"Tension lowers and weakens the boundary region before water enters and sustained seafloor spreading begins.":"Mantle material rises into the opening and begins forming new crust."; if (boundaryType === "convergent" && leftContinental && rightContinental) { title = "One continent is overriding the other."; detail = "The descending plate carries its continent into the mantle while the overriding continent rides above it, stacking their unchanged crustal thicknesses into high mountains."; } else if (boundaryType === "convergent") { title = "Denser oceanic crust is subducting."; detail = "The entire denser plate curves beneath the overriding plate and continues into the mantle."; } observation.querySelector("strong").textContent = soft < .02 ? "The plates cannot move." : title; observation.querySelector("p").textContent = soft < .02 ? "A hard mantle cannot flow, so the model remains locked." : detail; }
  }
  function drawAll() { drawMap(); drawCrossSection(); }
  function animate(now) { if (!root.isConnected && animationFrame) { animationFrame = 0; return; } const softness = Number(mantle.value) / 100; const delta = Math.min(50, now - lastTime); lastTime = now; if (mode === "run") { runElapsed = clamp(runElapsed + delta, 0, RUN_DURATION); progress = clamp(progress + delta / RUN_DURATION * softness, 0, 1); while(runElapsed>=nextVolcanoEventAt&&runElapsed<RUN_DURATION){boundaryEvents.push({y:4+Math.random()*(rows-8),xOffset:(Math.random()-.5)*12,kind:"volcano",startedAt:nextVolcanoEventAt,duration:5000});nextVolcanoEventAt+=1800+Math.random()*1700;}while(runElapsed>=nextEarthquakeEventAt&&runElapsed<RUN_DURATION){boundaryEvents.push({y:4+Math.random()*(rows-8),xOffset:(Math.random()-.5)*18,kind:"earthquake",startedAt:nextEarthquakeEventAt,duration:3000});nextEarthquakeEventAt+=400+Math.random()*700;}boundaryEvents=boundaryEvents.filter((event)=>runElapsed-event.startedAt<=event.duration); if (runElapsed >= RUN_DURATION) { mode = "complete"; root.classList.remove("running"); root.querySelectorAll("[data-mode]").forEach((entry)=>entry.classList.remove("active")); if(!completionReported){completionReported=true;Promise.resolve(onComplete({boundaryType})).catch((error)=>console.warn("Plate Motion completion could not be saved.",error));} } } drawAll(); const years = Math.round(runElapsed / RUN_DURATION * GEOLOGIC_YEARS); readout.textContent = mode === "complete" ? `${GEOLOGIC_YEARS} million years · Complete` : mode === "paused" ? `${years} million years · Paused` : mode === "run" ? `${years} million years` : mode === "ready" ? "Boundary ready" : "Model paused"; animationFrame = requestAnimationFrame(animate); }
  map.addEventListener("pointerdown", (event) => { if (mode !== "build" || map.dataset.pendingStamp) return; const rect=map.getBoundingClientRect();const canvasX=(event.clientX-rect.left)/rect.width*map.width;const canvasY=(event.clientY-rect.top)/rect.height*map.height;if(markerAtPosition(canvasX,canvasY))return; drawing = true; map.setPointerCapture(event.pointerId); paintAt(event, tool === "erase" ? 0 : 1); }); map.addEventListener("pointermove", (event) => { if (drawing && mode === "build") paintAt(event, tool === "erase" ? 0 : 1); }); map.addEventListener("pointerup", () => { drawing = false; });
  root.querySelectorAll("[data-stamp]").forEach((button) => { button.addEventListener("dragstart", (event) => event.dataTransfer.setData("text/e3-plate-stamp", button.dataset.stamp)); button.addEventListener("click", () => { const type=button.dataset.stamp; if(!type.startsWith("marker-")&&fossils.some((entry)=>entry.type===type)){ for(let index=fossils.length-1;index>=0;index-=1)if(fossils[index].type===type)fossils.splice(index,1); map.dataset.pendingStamp=""; button.classList.remove("selected"); drawAll(); return; } root.querySelectorAll("[data-stamp]").forEach((entry) => entry.classList.toggle("selected", entry === button)); map.dataset.pendingStamp = type; }); });
  map.addEventListener("dragover", (event) => { if (mode === "build") event.preventDefault(); });
  map.addEventListener("drop", (event) => { event.preventDefault(); if (mode !== "build") return; const type = event.dataTransfer.getData("text/e3-plate-stamp"); const rect = map.getBoundingClientRect(); const x = clamp(Math.floor((event.clientX - rect.left) / rect.width * cols), 0, cols - 1); const y = clamp(Math.floor((event.clientY - rect.top) / rect.height * rows), 0, rows - 1); if (type) placeStamp(type, x, y); });
  map.addEventListener("click", (event) => { const type = map.dataset.pendingStamp; if (!type || drawing || mode !== "build") return; const rect = map.getBoundingClientRect(); placeStamp(type, clamp(Math.floor((event.clientX - rect.left) / rect.width * cols),0,cols-1), clamp(Math.floor((event.clientY - rect.top) / rect.height * rows),0,rows-1)); map.dataset.pendingStamp = ""; root.querySelectorAll("[data-stamp]").forEach((entry) => entry.classList.remove("selected")); });
  map.addEventListener("click",(event)=>{if(map.dataset.pendingStamp)return;const rect=map.getBoundingClientRect();const selected=markerAtPosition((event.clientX-rect.left)/rect.width*map.width,(event.clientY-rect.top)/rect.height*map.height);selectedMarkerNumber=selected?.number??null;updateMarkerReadout();});
  root.querySelectorAll("[data-tool]").forEach((button) => button.addEventListener("click", () => { tool = button.dataset.tool; root.querySelectorAll("[data-tool]").forEach((entry) => entry.classList.toggle("active", entry === button)); }));
  root.querySelector('[data-action="clear"]').addEventListener("click", () => { land.forEach((row) => row.fill(0)); progress = 0; runElapsed = 0; drawAll(); });
  root.querySelectorAll("[data-mode]").forEach((button) => button.addEventListener("click", () => { const requested=button.dataset.mode; if(requested==="pause"&&mode!=="run")return; const resume=requested==="run"&&mode==="paused"; const startingRun=requested==="run"&&!resume; mode=requested==="pause"?"paused":requested; if(startingRun){progress=0;runElapsed=0;nextVolcanoEventAt=700+Math.random()*1200;nextEarthquakeEventAt=180+Math.random()*500;boundaryEvents=[];completionReported=false;} lastTime=performance.now(); root.querySelectorAll("[data-mode]").forEach((entry)=>entry.classList.toggle("active",entry===button)); root.classList.toggle("running",mode==="run"); drawAll(); }));
  root.querySelectorAll("[data-boundary]").forEach((button) => button.addEventListener("click", () => { if(mode!=="build")return; boundaryType = button.dataset.boundary; progress = 0; runElapsed = 0; mode="ready"; root.classList.add("model-locked"); root.querySelector('[data-mode="run"]').disabled=false; root.querySelector('[data-mode="build"]').classList.remove("active"); root.querySelectorAll("[data-boundary]").forEach((entry) => entry.classList.toggle("active", entry === button)); readout.textContent="Boundary ready"; drawAll(); }));
  root.querySelectorAll("[data-event]").forEach((input) => input.addEventListener("change", drawAll));
  mantle.addEventListener("input", drawAll); root.querySelector(".plate-rebuild").addEventListener("click", () => { progress = 0; runElapsed = 0; nextVolcanoEventAt = 0; nextEarthquakeEventAt = 0; boundaryEvents = []; mode = "build"; boundaryType=null; root.querySelector('[data-mode="run"]').disabled=true; root.querySelectorAll("[data-boundary]").forEach((entry)=>entry.classList.remove("active")); root.querySelectorAll("[data-mode]").forEach((entry) => entry.classList.toggle("active", entry.dataset.mode === "build")); root.classList.remove("running","model-locked"); root.querySelector(".plate-observation strong").textContent = "Build a region and place the transect."; root.querySelector(".plate-observation p").textContent = "Draw continental crust, choose a boundary, then switch to Run."; drawAll(); });
  seedContinents(); drawAll(); animationFrame = requestAnimationFrame(animate); return root;
}
