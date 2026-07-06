/*!
 * lab-narrative.js — 3D Lab demo 2 · Pattern 2: sequenced narrative scenes
 * Doctrine: references/LANDING-3D.md §2 Pattern 2
 *
 * One master progress value (0..1) drives three beats:
 *   beat 1 (0.00–0.33)  camera orbits a scattered field
 *   beat 2 (0.33–0.66)  the field assembles into a ring, lighting warms
 *   beat 3 (0.66–1.00)  camera pulls back, ring settles, key light dims
 *
 * Everything reads from the same playhead, so DOM copy (driven by the same
 * ScrollTrigger on the page) can never drift from the 3D. Scene "swaps" are
 * morphs hidden inside camera moves — no visible pops between beats.
 */
export async function createScene(ctx) {
  const { THREE, scene, camera } = ctx;

  scene.add(new THREE.AmbientLight(0x445577, 0.6));
  const key = new THREE.DirectionalLight(0xffe0b0, 1.8);
  key.position.set(3, 4, 3);
  scene.add(key);

  // 60 cubes: scattered start position + ring end position, lerped by beat 2.
  const COUNT = 60;
  const geo = new THREE.BoxGeometry(0.22, 0.22, 0.22);
  const mat = new THREE.MeshStandardMaterial({ color: 0x00c2a8, metalness: 0.3, roughness: 0.5 });
  const group = new THREE.Group();
  const scatter = [], ring = [];
  for (let i = 0; i < COUNT; i++) {
    const m = new THREE.Mesh(geo, mat);
    scatter.push(new THREE.Vector3(
      (Math.random() - 0.5) * 7, (Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5));
    const a = (i / COUNT) * Math.PI * 2;
    ring.push(new THREE.Vector3(Math.cos(a) * 2.2, Math.sin(a) * 2.2, 0));
    m.position.copy(scatter[i]);
    group.add(m);
  }
  scene.add(group);
  camera.position.set(0, 0, 7);

  const ease = t => t * t * (3 - 2 * t); // smoothstep: morphs settle, never snap

  return {
    setProgress(p) {
      // beat windows
      const b1 = Math.min(p / 0.33, 1);                       // orbit
      const b2 = ease(Math.max(0, Math.min((p - 0.33) / 0.33, 1))); // assemble
      const b3 = ease(Math.max(0, (p - 0.66) / 0.34));        // resolve

      // beat 1: camera orbits the field
      const ang = b1 * Math.PI * 0.6;
      camera.position.x = Math.sin(ang) * 7;
      camera.position.z = Math.cos(ang) * 7 + b3 * 3; // beat 3: pull back
      camera.lookAt(0, 0, 0);

      // beat 2: scatter → ring morph + lighting warms
      for (let i = 0; i < COUNT; i++) {
        group.children[i].position.lerpVectors(scatter[i], ring[i], b2);
        group.children[i].rotation.set(b2 * Math.PI, b2 * Math.PI * 0.5, 0);
      }
      key.intensity = 1.8 + b2 * 1.2 - b3 * 1.6; // warm up, then dim to resolve
      group.rotation.z = b3 * Math.PI * 0.25;
    },
    dispose() { /* nw-3d sweeps geometry, material, lights */ }
  };
}
