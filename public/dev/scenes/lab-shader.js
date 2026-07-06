/*!
 * lab-shader.js — 3D Lab demo 3 · Pattern 3: scroll-revealed shader element
 * Doctrine: references/LANDING-3D.md §2 Pattern 3
 *
 * A single full-stage plane. ScrollTrigger drives one uniform (uProgress);
 * the fragment shader turns it into a reveal sweep with a distortion that
 * settles to a clean, legible state at p=1 (the "resolves legible" rule).
 * Geometry is static — uniforms are the only thing scroll touches.
 */
export async function createScene(ctx) {
  const { THREE, scene, camera } = ctx;

  const uniforms = {
    uProgress: { value: 0 },
    uPointer: { value: new THREE.Vector2(0, 0) },
    uAspect: { value: ctx.size.width / ctx.size.height }
  };

  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      precision highp float;
      varying vec2 vUv;
      uniform float uProgress;
      uniform vec2 uPointer;
      uniform float uAspect;

      // cheap hash noise: no texture fetch, mobile-friendly
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x),
                   mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
      }

      void main() {
        vec2 uv = vUv;
        // distortion strongest mid-reveal, zero at p=0 and p=1: it settles.
        float turb = uProgress * (1.0 - uProgress) * 4.0;
        uv.x += (noise(uv * 6.0 + uProgress * 3.0) - 0.5) * 0.12 * turb;
        uv.y += (noise(uv * 6.0 - uProgress * 2.0) - 0.5) * 0.12 * turb;

        // reveal sweep: a noisy diagonal edge that crosses with progress
        float edge = uv.x * 0.7 + uv.y * 0.3 + (noise(uv * 8.0) - 0.5) * 0.25;
        float reveal = smoothstep(edge - 0.08, edge + 0.08, uProgress * 1.3 - 0.15);

        // two-stop brand gradient under the reveal, pointer adds a soft glow
        vec3 a = vec3(0.42, 0.36, 1.0);   // #6a5cff
        vec3 b = vec3(0.61, 0.17, 1.0);   // #9b2cff
        vec3 col = mix(a, b, uv.y);
        vec2 pv = (uv - 0.5 - uPointer * 0.4) * vec2(uAspect, 1.0);
        col += vec3(0.25) * exp(-dot(pv, pv) * 9.0) * reveal;

        gl_FragColor = vec4(col * reveal, reveal);
      }`,
    transparent: true
  });

  const plane = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  scene.add(plane);
  // Orthographic-style trick: plane fills clip space via a no-op camera at z>0
  camera.position.z = 1;
  plane.onBeforeRender = () => {}; // plane in clip space needs no projection help
  plane.material.depthTest = false;
  plane.frustumCulled = false;
  // Override the vertex stage to pass position straight through:
  mat.vertexShader = `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
  mat.needsUpdate = true;

  return {
    setProgress(p) { uniforms.uProgress.value = p; },
    setPointer(x, y) { uniforms.uPointer.value.set(x, -y); },
    dispose() { /* nw-3d sweeps plane geometry + shader material */ }
  };
}
