/*!
 * lab-hero.js — 3D Lab demo 1 · Pattern 1: scroll-scrubbed hero object
 * Doctrine: references/LANDING-3D.md §2 Pattern 1
 *
 * One primary object. Scroll progress rotates it and pulls the camera in.
 * Pointer adds a subtle tilt (desktop only, nw-3d handles the gating).
 * Cheap geometry on purpose: the pattern is the lesson, not the mesh.
 */
export async function createScene(ctx) {
  const { THREE, scene, camera } = ctx;

  // Baked-look lighting on a budget: one ambient + one directional.
  scene.add(new THREE.AmbientLight(0x8877ff, 0.55));
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(2.5, 3, 4);
  scene.add(key);

  const mesh = new THREE.Mesh(
    new THREE.TorusKnotGeometry(1.05, 0.34, 160, 24),
    new THREE.MeshStandardMaterial({ color: 0xff5e3a, metalness: 0.55, roughness: 0.28 })
  );
  scene.add(mesh);
  camera.position.z = 6;

  // Pointer tilt state: eased toward the target each frame while it differs.
  const tilt = { x: 0, y: 0, tx: 0, ty: 0 };
  let progress = 0;

  return {
    setProgress(p) {
      progress = p;
      // One motion verb held for the whole scrub: rotate + camera dolly-in.
      mesh.rotation.y = p * Math.PI * 2;
      mesh.rotation.x = p * Math.PI * 0.5;
      camera.position.z = 6 - p * 2.4;
    },
    setPointer(x, y) { tilt.tx = x; tilt.ty = y; },
    update() {
      // Return true only while the tilt is still settling — nw-3d keeps the
      // demand-driven loop alive exactly that long, then everything sleeps.
      tilt.x += (tilt.tx - tilt.x) * 0.08;
      tilt.y += (tilt.ty - tilt.y) * 0.08;
      mesh.rotation.z = tilt.x * 0.4;
      mesh.position.y = -tilt.y * 0.5;
      return Math.abs(tilt.tx - tilt.x) + Math.abs(tilt.ty - tilt.y) > 0.001;
    },
    dispose() { /* geometry/material freed by nw-3d's scene-graph sweep */ }
  };
}
