import * as THREE from "three";

export function createKayakModel() {
  const root = new THREE.Group();
  const white = new THREE.MeshStandardMaterial({ color: 0xf2f4f5, roughness: 0.36, metalness: 0.08 });
  const pale = new THREE.MeshStandardMaterial({ color: 0xbfc8cf, roughness: 0.48, metalness: 0.12 });
  const orange = new THREE.MeshStandardMaterial({ color: 0xf47b20, roughness: 0.42, metalness: 0.04 });
  const black = new THREE.MeshStandardMaterial({ color: 0x15191e, roughness: 0.38, metalness: 0.32 });
  const materials = [white, pale, orange, black];

  const add = (geometry, material, position, rotation = [0, 0, 0], scale = [1, 1, 1]) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...position);mesh.rotation.set(...rotation);mesh.scale.set(...scale);root.add(mesh);return mesh;
  };

  // Faceted 3-block hull with pointed bow and stern.
  add(new THREE.BoxGeometry(5.7, .54, 1.35, 6, 1, 2), white, [0, .18, 0]);
  add(new THREE.ConeGeometry(.73, 1.7, 4), white, [3.65, .18, 0], [0, 0, -Math.PI / 2], [1, 1, 1.05]);
  add(new THREE.ConeGeometry(.73, 1.7, 4), white, [-3.65, .18, 0], [0, 0, Math.PI / 2], [1, 1, 1.05]);
  add(new THREE.BoxGeometry(4.1, .13, 1.04), orange, [0, .51, 0]);
  add(new THREE.BoxGeometry(2.05, .18, .82), black, [0, .61, 0]);
  add(new THREE.BoxGeometry(1.02, .16, .7), pale, [-.08, .72, 0]);

  // Rails and retention straps from the reference kayak.
  [-1, 1].forEach((side) => {
    add(new THREE.CylinderGeometry(.055, .055, 4.2, 8), black, [0, .74, side * .62], [0, 0, Math.PI / 2]);
    [-2.25, -.75, .75, 2.25].forEach((x) => add(new THREE.BoxGeometry(.16, .34, .14), black, [x, .64, side * .63]));
  });
  const seat = add(new THREE.BoxGeometry(.82, .86, .18, 2, 2, 1), black, [-.15, 1.08, .2], [-.36, 0, 0]);
  seat.geometry.translate(0, .3, 0);

  root.userData.riderPosition = new THREE.Vector3(-.12, 1.18, 0);
  return {
    root,
    dispose() {
      root.traverse((object) => object.geometry?.dispose?.());
      materials.forEach((material) => material.dispose());
    }
  };
}
