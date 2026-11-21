import * as THREE from "three";

function material(color, metalness=.25, roughness=.55, emissive=0x000000){
  return new THREE.MeshStandardMaterial({color,metalness,roughness,emissive,emissiveIntensity:emissive?1.1:0,flatShading:true});
}

function add(group,geometries,geometry,mat,position,rotation=[0,0,0]){
  geometries.push(geometry);const mesh=new THREE.Mesh(geometry,mat);mesh.position.set(...position);mesh.rotation.set(...rotation);mesh.castShadow=true;group.add(mesh);return mesh;
}

export function createAstronautTravelModels(){
  const root=new THREE.Group(),geometries=[],materials=[];
  const mat=(...args)=>{const value=material(...args);materials.push(value);return value;};
  const white=mat(0xe7edef,.32,.42),orange=mat(0xf18425,.28,.38),dark=mat(0x172832,.55,.34),blue=mat(0x168fc0,.32,.25,0x07536c),rubber=mat(0x111a20,.05,.88);

  const buggy=new THREE.Group();buggy.name="astronaut_buggy";buggy.visible=false;root.add(buggy);
  add(buggy,geometries,new THREE.BoxGeometry(3.7,.65,4.6),dark,[0,-1.05,.15]);
  add(buggy,geometries,new THREE.BoxGeometry(3.1,.55,2.4),orange,[0,-.58,.35]);
  add(buggy,geometries,new THREE.BoxGeometry(2.6,.4,1.75),white,[0,-.15,-.45]);
  add(buggy,geometries,new THREE.BoxGeometry(2.5,.22,1.15),blue,[0,.08,.18],[-.38,0,0]);
  add(buggy,geometries,new THREE.BoxGeometry(3.3,.25,.3),orange,[0,-.5,2.35]);
  for(const x of [-2.05,2.05])for(const z of [-1.55,1.55])add(buggy,geometries,new THREE.CylinderGeometry(.67,.67,.62,12),rubber,[x,-1.05,z],[0,0,Math.PI/2]);
  const rollbar=add(buggy,geometries,new THREE.TorusGeometry(1.22,.11,8,18,Math.PI),white,[0,.75,-.35],[0,0,Math.PI/2]);rollbar.scale.z=1.25;

  const jetski=new THREE.Group();jetski.name="astronaut_jetski";jetski.visible=false;root.add(jetski);
  const hull=add(jetski,geometries,new THREE.CapsuleGeometry(.78,3.7,5,10),white,[0,-1.15,.3],[Math.PI/2,0,0]);hull.scale.x=1.15;
  add(jetski,geometries,new THREE.BoxGeometry(1.65,.38,2.35),orange,[0,-.72,.2]);
  add(jetski,geometries,new THREE.BoxGeometry(1.3,.45,1.7),dark,[0,-.35,-.25],[-.16,0,0]);
  add(jetski,geometries,new THREE.BoxGeometry(1.6,.18,.25),blue,[0,.42,.65]);
  add(jetski,geometries,new THREE.BoxGeometry(2.15,.14,.16),dark,[0,.55,.7]);
  add(jetski,geometries,new THREE.BoxGeometry(.2,.75,.2),dark,[0,.2,.55],[-.35,0,0]);

  return {
    root,
    setMode(mode){buggy.visible=mode==="buggy";jetski.visible=mode==="jetski";},
    dispose(){geometries.forEach((geometry)=>geometry.dispose());materials.forEach((value)=>value.dispose());root.removeFromParent();}
  };
}
