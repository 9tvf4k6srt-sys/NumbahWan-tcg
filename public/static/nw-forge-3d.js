/*!
 * nw-forge-3d.js — the forge machine exploded view
 * Scene module for nw-3d.js (contract: references/LANDING-3D.md §10)
 * Pattern 1: scroll-scrubbed hero object. Scroll progress explodes the
 * machine into its parts and reassembles it; the pointer nudges the
 * explode amount on desktop ("Drag to explode · scroll to reassemble").
 *
 * Built from primitives on purpose: zero model download, zero Draco
 * decode, and the page stays inside its weight budget. Swap the group
 * for a compressed GLB via ctx.addons.gltf() when a real asset exists.
 */
export async function createScene(ctx) {
  const { THREE, scene, camera } = ctx;

  scene.add(new THREE.AmbientLight(0x665533, 0.7));
  const key = new THREE.DirectionalLight(0xffd9a0, 2.4);
  key.position.set(3, 4, 5);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x3355ff, 0.8);
  rim.position.set(-4, 1, -3);
  scene.add(rim);

  const steel = new THREE.MeshStandardMaterial({ color: 0x8a8f99, metalness: 0.85, roughness: 0.35 });
  const brass = new THREE.MeshStandardMaterial({ color: 0xc98a2b, metalness: 0.9, roughness: 0.3 });
  const core = new THREE.MeshStandardMaterial({
    color: 0xff6b00, emissive: 0xff4400, emissiveIntensity: 0.6, metalness: 0.2, roughness: 0.5
  });

  // The machine: a core, two housings, four bolts, a flywheel.
  // Each part stores its assembled position and an explode direction.
  const group = new THREE.Group();
  const parts = [];
  function part(mesh, dir) {
    mesh.userData.home = mesh.position.clone();
    mesh.userData.dir = dir.normalize();
    group.add(mesh);
    parts.push(mesh);
  }

  const coreMesh = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 1), core);
  part(coreMesh, new THREE.Vector3(0, 0, 0.001));

  const topHouse = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.1, 0.5, 8), steel);
  topHouse.position.y = 0.75;
  part(topHouse, new THREE.Vector3(0, 1, 0));

  const botHouse = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 0.95, 0.5, 8), steel);
  botHouse.position.y = -0.75;
  part(botHouse, new THREE.Vector3(0, -1, 0));

  const wheel = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.13, 12, 32), brass);
  wheel.rotation.x = Math.PI / 2;
  part(wheel, new THREE.Vector3(0, 0, 1));

  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.9, 6), brass);
    bolt.position.set(Math.cos(a) * 0.85, 0, Math.sin(a) * 0.85);
    part(bolt, new THREE.Vector3(Math.cos(a), 0, Math.sin(a)));
  }

  scene.add(group);
  camera.position.set(0, 0.4, 5.2);
  camera.lookAt(0, 0, 0);

  // explode = scroll term + pointer term, eased each frame
  const state = { scroll: 0, pointer: 0, target: 0, current: 0 };

  function apply(amount) {
    for (const p of parts) {
      p.position.copy(p.userData.home).addScaledVector(p.userData.dir, amount * 1.6);
    }
    group.rotation.y = state.scroll * Math.PI * 1.5;
    coreMesh.material.emissiveIntensity = 0.6 + (1 - amount) * 0.8; // core glows when assembled
  }

  return {
    setProgress(p) {
      // spec cue: assembled at p=0, exploded mid-scrub, reassembled at p=1
      state.scroll = p;
      state.target = Math.sin(p * Math.PI); // 0 → 1 → 0
    },
    setPointer(x, y) {
      state.pointer = Math.min(Math.hypot(x, y) * 1.2, 0.6); // drag toward edges explodes
    },
    update() {
      const goal = Math.min(state.target + state.pointer, 1);
      state.current += (goal - state.current) * 0.1;
      apply(state.current);
      return Math.abs(goal - state.current) > 0.002;
    },
    dispose() { /* nw-3d sweeps geometries, materials, lights */ }
  };
}
