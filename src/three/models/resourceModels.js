import * as THREE from "three";

/** Canonical editable source for all procedural 3D resource-node variants. */
export function createResourceModel(kind = "rock", tier = 1) {
  const root = new THREE.Group();
  const tierScale = 1 + Math.max(0, tier - 1) * 0.15;

  if (kind === "communication") {
    const darkMetal = new THREE.MeshStandardMaterial({
      color: 0x17283f,
      metalness: 0.78,
      roughness: 0.28
    });
    const signalMaterial = new THREE.MeshStandardMaterial({
      color: 0x5af5ff,
      emissive: 0x087d9b,
      emissiveIntensity: 2.2,
      metalness: 0.18,
      roughness: 0.2
    });
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(1.15, 1.38, 0.42, 8),
      darkMetal
    );
    root.add(base);
    const mast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.22, 2.2, 8),
      darkMetal
    );
    mast.position.y = 1.15;
    root.add(mast);
    const beacon = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.48, 0),
      signalMaterial
    );
    beacon.position.y = 2.3;
    root.add(beacon);
    [0.62, 0.92].forEach((radius, index) => {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(radius, 0.055, 8, 24),
        signalMaterial
      );
      ring.position.y = 2.3;
      ring.rotation.x = Math.PI / 2;
      ring.rotation.z = index * Math.PI / 4;
      root.add(ring);
    });
    return { root, animatedPart: beacon, tierScale: 0.82 };
  }

  if (kind === "pond") {
    const surface = new THREE.Mesh(
      new THREE.CircleGeometry(1.42, 48),
      new THREE.MeshStandardMaterial({
        color: 0x050709,
        emissive: 0x000000,
        emissiveIntensity: 0,
        roughness: 0.12,
        metalness: 0.08,
        transparent: true,
        opacity: 0.16,
        depthWrite: false
      })
    );
    surface.position.z = 0.01;
    surface.scale.y = 0.42;
    root.add(surface);

    const ripplePlane = new THREE.Group();
    ripplePlane.scale.y = 0.42;
    const ripplePulse = new THREE.Group();
    [0.46, 0.86, 1.26].forEach((radius, index) => {
      const ripple = new THREE.Mesh(
        new THREE.TorusGeometry(radius, 0.045 + index * 0.008, 8, 48),
        new THREE.MeshStandardMaterial({
          color: 0x020304,
          emissive: 0x000000,
          emissiveIntensity: 0,
          roughness: 0.12,
          transparent: true,
          opacity: 0.94 - index * 0.12,
          depthWrite: false
        })
      );
      ripple.position.z = 0.03 + index * 0.01;
      ripplePulse.add(ripple);
    });
    ripplePlane.add(ripplePulse);
    root.add(ripplePlane);
    return { root, animatedPart: ripplePulse, tierScale };
  }

  if (kind === "specimen") {
    const metal = new THREE.MeshStandardMaterial({
      color: 0x172842,
      metalness: 0.78,
      roughness: 0.25
    });
    const glass = new THREE.MeshStandardMaterial({
      color: 0x72efff,
      emissive: 0x075c79,
      emissiveIntensity: 1.15,
      transparent: true,
      opacity: 0.38,
      roughness: 0.08,
      metalness: 0.08,
      depthWrite: false
    });
    const specimenMaterial = new THREE.MeshStandardMaterial({
      color: 0xe052ff,
      emissive: 0x5a0d7c,
      emissiveIntensity: 1.7,
      roughness: 0.4
    });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.9, 0.34, 10), metal);
    base.position.y = 0.17;
    root.add(base);
    const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.68, 1.75, 12), glass);
    jar.position.y = 1.16;
    root.add(jar);
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.82, 0.74, 0.28, 10), metal);
    lid.position.y = 2.16;
    root.add(lid);
    const specimen = new THREE.Group();
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.3, 0), specimenMaterial);
    specimen.add(core);
    for (let index = 0; index < 5; index += 1) {
      const tentacle = new THREE.Mesh(
        new THREE.ConeGeometry(0.08, 0.65, 6),
        specimenMaterial
      );
      const angle = index / 5 * Math.PI * 2;
      tentacle.position.set(Math.cos(angle) * 0.22, -0.33, Math.sin(angle) * 0.22);
      tentacle.rotation.z = Math.cos(angle) * 0.55;
      specimen.add(tentacle);
    }
    specimen.position.y = 1.2;
    root.add(specimen);
    return { root, animatedPart: specimen, tierScale: 0.9 };
  }

  if (kind === "plant") {
    const stemMaterial = new THREE.MeshStandardMaterial({ color: 0x3c7e55, roughness: 0.68 });
    const leafMaterial = new THREE.MeshStandardMaterial({
      color: tier >= 3 ? 0xff5b72 : tier === 2 ? 0x52d8ff : 0x77e47c,
      emissive: tier >= 2 ? 0x123b52 : 0x0b3216,
      emissiveIntensity: 1.2,
      roughness: 0.45
    });
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, 1.6, 8), stemMaterial);
    stem.position.y = 0.2;
    root.add(stem);
    for (let index = 0; index < 5; index += 1) {
      const angle = (index / 5) * Math.PI * 2;
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.36, 1.05, 7), leafMaterial);
      leaf.position.set(
        Math.cos(angle) * 0.42,
        0.85 + (index % 2) * 0.22,
        Math.sin(angle) * 0.42
      );
      leaf.rotation.z = Math.cos(angle) * 0.58;
      root.add(leaf);
    }
    return { root, animatedPart: root, tierScale };
  }

  const rockMaterial = new THREE.MeshStandardMaterial({
    color: tier >= 3 ? 0xb84b57 : tier === 2 ? 0x41bde0 : 0x77828b,
    roughness: 0.78,
    metalness: 0.18
  });
  for (let index = 0; index < 4; index += 1) {
    const rock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.55 + index * 0.09, 0),
      rockMaterial
    );
    rock.position.set(
      (index - 1.5) * 0.48,
      index % 2 === 0 ? 0 : 0.32,
      (index % 3 - 1) * 0.22
    );
    rock.rotation.set(index * 0.34, index * 0.51, index * 0.22);
    root.add(rock);
  }
  return { root, animatedPart: root, tierScale };
}
