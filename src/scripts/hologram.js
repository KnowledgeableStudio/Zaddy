/* ============================================================
   Hologram — full-section WebGL projection
   The canvas covers the ENTIRE Story section (absolute inset-0,
   pointer-events none, behind content). The character is projected
   at the anchor element's screen position — nothing is boxed in.
   ============================================================ */

let hologramTeardown = null;

// The hologram lives on the story page only. Client-side navigation swaps the
// DOM without re-running this module, so init is bound to astro:page-load and
// fully disposed before each swap — otherwise the WebGL context and render
// loop would leak into the next page.
function initHologramPage() {
  const anchor = document.getElementById('holo-anchor');
  const story = document.getElementById('story');
  if (!anchor || !story) return null;

  const lifecycle = new AbortController();
  const { signal } = lifecycle;
  let requested = false;
  let nearViewport = false;
  let lazyObserver;

  function requestHologram() {
    if (requested || !nearViewport || document.hidden || signal.aborted) return;
    requested = true;
    lazyObserver?.disconnect();
    initHologram(anchor, story, signal).catch((error) => {
      if (signal.aborted) return;
      console.error('Hologram initialization failed:', error);
      const loading = document.getElementById('holo-loading');
      if (loading) loading.textContent = 'Hologram unavailable';
    });
  }
  if ('IntersectionObserver' in window) {
    lazyObserver = new IntersectionObserver(([entry]) => {
      nearViewport = entry.isIntersecting;
      requestHologram();
    }, { rootMargin: '250px' });
    lazyObserver.observe(anchor);
  } else {
    nearViewport = true;
    requestHologram();
  }
  document.addEventListener('visibilitychange', requestHologram, { signal });
  window.addEventListener('pagehide', (event) => {
    if (!event.persisted) {
      lazyObserver?.disconnect();
      lifecycle.abort();
    }
  }, { signal });

  return () => {
    lazyObserver?.disconnect();
    lifecycle.abort();
  };
}

async function initHologram(anchor, story, signal) {
  const [THREE, { GLTFLoader }, { MeshoptDecoder }] = await Promise.all([
    import('three'),
    import('three/examples/jsm/loaders/GLTFLoader.js'),
    import('three/examples/jsm/libs/meshopt_decoder.module.js'),
  ]);

  if (signal.aborted) return;
  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  let reduced = motionPreference.matches;
  let disposed = false;
  const ACCENT = new THREE.Color('#22d861');

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  } catch {
    const el = document.getElementById('holo-loading');
    if (el) el.textContent = 'Hologram unavailable';
    return;
  }
  // Full-section additive shader canvas — 1.25 DPR is the sweet spot, higher
  // multiplies per-frame fragment cost for no visible gain.
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
  renderer.setClearColor(0x000000, 0);

  // Canvas becomes the section's background layer — invisible bounds
  renderer.domElement.style.cssText =
    'position:absolute;inset:0;width:100%;height:100%;z-index:1;pointer-events:none;';
  story.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);

  const rig = new THREE.Group();
  scene.add(rig);

  /* ---------------- shared uniforms ---------------- */
  const shared = {
    uTime: { value: 0 },
    uColor: { value: ACCENT },
    uSpawn: { value: 0 },
    uBeam: { value: 0 },
  };

  /* ---------------- hologram body shader ---------------- */
  const holoUniforms = {
    uTime: shared.uTime,
    uColor: shared.uColor,
    uSpawn: shared.uSpawn,
    uMinY: { value: -0.95 },
    uHeight: { value: 1.9 },
  };

  const holoMaterial = new THREE.ShaderMaterial({
    uniforms: holoUniforms,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    vertexShader: /* glsl */ `
      varying vec3 vNormal;
      varying vec3 vWorldPos;
      varying vec3 vViewDir;
      void main() {
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPos = worldPos.xyz;
        vNormal = normalize(mat3(modelMatrix) * normal);
        vec4 mv = viewMatrix * worldPos;
        vViewDir = -mv.xyz;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uSpawn;
      uniform vec3 uColor;
      uniform float uMinY;
      uniform float uHeight;
      varying vec3 vNormal;
      varying vec3 vWorldPos;
      varying vec3 vViewDir;

      float rand(vec2 co) {
        return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
      }

      void main() {
        vec3 n = normalize(vNormal);
        vec3 v = normalize(vViewDir);
        float fres = pow(1.0 - abs(dot(n, v)), 2.0);

        float ny = clamp((vWorldPos.y - uMinY) / uHeight, 0.0, 1.0);

        float frontier = uSpawn * 1.1;
        float vis = 1.0 - smoothstep(frontier - 0.02, frontier + 0.02, ny);
        float grain = rand(floor(vWorldPos.xz * 90.0) + floor(vWorldPos.y * 90.0));
        vis *= step(grain, frontier * 1.25);
        float edge = smoothstep(frontier - 0.10, frontier, ny) * vis;

        float scan = 0.74 + 0.26 * sin(vWorldPos.y * 55.0 - uTime * 2.0);
        float micro = 0.86 + 0.14 * sin(vWorldPos.y * 420.0);
        float flicker = 0.94 + 0.06 * sin(uTime * 17.0) * sin(uTime * 5.3 + 1.3);

        float instability = (1.0 - uSpawn) * step(0.75, rand(vec2(floor(vWorldPos.y * 140.0), floor(uTime * 22.0)))) * 0.6;

        float row = floor(vWorldPos.y * 24.0);
        float glitch = step(0.985, rand(vec2(row, floor(uTime * 9.0)))) * 0.35;

        float lowerGlow = pow(1.0 - ny, 2.2);

        float alpha = (0.15 + fres * 0.85) * scan * micro;
        alpha = alpha * flicker * (1.0 - instability) + glitch * fres;
        alpha = alpha * vis + edge * 0.9;
        alpha += lowerGlow * 0.18;

        vec3 col = uColor * (0.5 + fres * 1.5)
                 + uColor * lowerGlow * 0.5
                 + vec3(0.55, 1.0, 0.7) * edge * 1.6
                 + vec3(0.4, 1.0, 0.65) * glitch;

        gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0));
      }
    `,
  });

  /* ---------------- volumetric beam ---------------- */
  function makeBeamMaterial(strength) {
    return new THREE.ShaderMaterial({
      uniforms: { uTime: shared.uTime, uColor: shared.uColor, uBeam: shared.uBeam, uStrength: { value: strength } },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform float uBeam;
        uniform float uStrength;
        uniform vec3 uColor;
        varying vec2 vUv;
        void main() {
          float fade = pow(1.0 - vUv.y, 1.9);
          float scan = 0.88 + 0.12 * sin(vUv.y * 34.0 - uTime * 2.6);
          float edgeFade = smoothstep(0.0, 0.12, vUv.y);
          gl_FragColor = vec4(uColor, fade * uStrength * scan * edgeFade * uBeam);
        }
      `,
    });
  }

  const BEAM_H = 2.0;
  const beamOuter = new THREE.Mesh(
    new THREE.CylinderGeometry(0.78, 0.34, BEAM_H, 40, 1, true),
    makeBeamMaterial(0.1)
  );
  const beamInner = new THREE.Mesh(
    new THREE.CylinderGeometry(0.6, 0.22, BEAM_H, 40, 1, true),
    makeBeamMaterial(0.22)
  );
  const beamGroup = new THREE.Group();
  beamGroup.add(beamOuter, beamInner);
  beamGroup.position.y = -0.95 + BEAM_H / 2 - 0.05;
  rig.add(beamGroup);

  /* ---------------- falling code sheath ---------------- */
  function makeCodeTexture() {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 512;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, 512, 512);
    const chars = 'iZaCsnv01ｱｲｻﾞﾄﾞ<>[]#@$%&0101';
    const cols = 28;
    const w = 512 / cols;
    ctx.font = `${Math.floor(w * 0.9)}px monospace`;
    for (let col = 0; col < cols; col++) {
      const offset = Math.floor(Math.random() * 30);
      const count = 14 + Math.floor(Math.random() * 10);
      for (let i = 0; i < count; i++) {
        const ch = chars[Math.floor(Math.random() * chars.length)];
        const bright = Math.random() < 0.12;
        ctx.fillStyle = bright
          ? 'rgba(190,255,215,0.95)'
          : `rgba(34,216,97,${0.25 + Math.random() * 0.55})`;
        ctx.fillText(ch, col * w + 1, ((i + offset) * w) % 512);
      }
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 1);
    return tex;
  }

  const codeUniforms = {
    uTime: shared.uTime,
    uCode: { value: 0 },
    uMap: { value: makeCodeTexture() },
  };
  const codeMat = new THREE.ShaderMaterial({
    uniforms: codeUniforms,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMap;
      uniform float uTime;
      uniform float uCode;
      varying vec2 vUv;
      void main() {
        vec2 uv = vec2(vUv.x, vUv.y * 1.4 + uTime * 0.45);
        vec4 t = texture2D(uMap, uv);
        float fade = smoothstep(0.0, 0.15, vUv.y) * pow(1.0 - vUv.y, 0.7);
        gl_FragColor = vec4(t.rgb, t.a * fade * uCode * 0.85);
      }
    `,
  });
  const codeCyl = new THREE.Mesh(
    new THREE.CylinderGeometry(0.68, 0.3, BEAM_H, 40, 1, true),
    codeMat
  );
  codeCyl.position.y = beamGroup.position.y;
  rig.add(codeCyl);

  /* ---------------- rising dust ---------------- */
  const DUST_N = 160;
  const dustGeo = new THREE.BufferGeometry();
  {
    const seeds = new Float32Array(DUST_N);
    const angles = new Float32Array(DUST_N);
    const radii = new Float32Array(DUST_N);
    const speeds = new Float32Array(DUST_N);
    const sizes = new Float32Array(DUST_N);
    for (let i = 0; i < DUST_N; i++) {
      seeds[i] = Math.random();
      angles[i] = Math.random() * Math.PI * 2;
      radii[i] = Math.random();
      speeds[i] = 0.1 + Math.random() * 0.16;
      sizes[i] = 2 + Math.random() * 4;
    }
    dustGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(DUST_N * 3), 3));
    dustGeo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
    dustGeo.setAttribute('aAngle', new THREE.BufferAttribute(angles, 1));
    dustGeo.setAttribute('aRadius', new THREE.BufferAttribute(radii, 1));
    dustGeo.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1));
    dustGeo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  }
  const dustMat = new THREE.ShaderMaterial({
    uniforms: { uTime: shared.uTime, uColor: shared.uColor, uBeam: shared.uBeam },
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    vertexShader: /* glsl */ `
      attribute float aSeed;
      attribute float aAngle;
      attribute float aRadius;
      attribute float aSpeed;
      attribute float aSize;
      uniform float uTime;
      varying float vAlpha;
      void main() {
        float t = fract(aSeed + uTime * aSpeed * 0.28);
        float y = t * 2.0;
        float r = mix(0.28, 0.74, t) * aRadius;
        float swirl = aAngle + uTime * 0.35;
        vec3 pos = vec3(cos(swirl) * r, y, sin(swirl) * r);
        vAlpha = (1.0 - t) * 0.85;
        vec4 mv = modelViewMatrix * vec4(pos, 1.0);
        gl_PointSize = aSize * (140.0 / -mv.z) * 0.02;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uBeam;
      varying float vAlpha;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.05, d) * vAlpha * uBeam;
        gl_FragColor = vec4(uColor * 1.4, a);
      }
    `,
  });
  const dust = new THREE.Points(dustGeo, dustMat);
  dust.position.y = -1.0;
  rig.add(dust);

  /* ---------------- floor: glow + pulse ring ---------------- */
  const FLOOR_Y = -1.12;

  function makeRadialTexture(inner, mid) {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, inner);
    g.addColorStop(0.45, mid);
    g.addColorStop(1, 'rgba(34,216,97,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(c);
  }

  const glow = new THREE.Mesh(
    new THREE.CircleGeometry(0.82, 48),
    new THREE.MeshBasicMaterial({
      map: makeRadialTexture('rgba(120,255,170,0.5)', 'rgba(34,216,97,0.16)'),
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = FLOOR_Y;
  glow.scale.y = 0.55;
  rig.add(glow);

  const pulseMat = new THREE.ShaderMaterial({
    uniforms: { uTime: shared.uTime, uColor: shared.uColor, uBeam: shared.uBeam },
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 uColor;
      uniform float uBeam;
      varying vec2 vUv;
      void main() {
        float d = length(vUv - 0.5) * 2.0;
        float ring = fract(uTime * 0.35);
        float band = smoothstep(ring - 0.06, ring, d) * smoothstep(ring + 0.06, ring, d);
        float a = band * (1.0 - ring) * 0.35 * uBeam;
        gl_FragColor = vec4(uColor, a);
      }
    `,
  });
  const pulse = new THREE.Mesh(new THREE.CircleGeometry(0.82, 48), pulseMat);
  pulse.rotation.x = -Math.PI / 2;
  pulse.position.y = FLOOR_Y + 0.001;
  pulse.scale.y = 0.55;
  rig.add(pulse);

  /* ---------------- projector hardware ---------------- */
  const metal = new THREE.MeshStandardMaterial({ color: 0x14161a, metalness: 0.85, roughness: 0.32 });
  const darkMetal = new THREE.MeshStandardMaterial({ color: 0x0b0c0e, metalness: 0.9, roughness: 0.45 });

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.52, 0.1, 56), metal);
  base.position.y = FLOOR_Y + 0.05;
  rig.add(base);

  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.46, 0.05, 56), darkMetal);
  collar.position.y = FLOOR_Y + 0.125;
  rig.add(collar);

  const lensRing = new THREE.Mesh(
    new THREE.RingGeometry(0.18, 0.3, 48),
    new THREE.MeshBasicMaterial({
      color: 0x22d861,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  lensRing.rotation.x = -Math.PI / 2;
  lensRing.position.y = FLOOR_Y + 0.152;
  rig.add(lensRing);

  const lens = new THREE.Mesh(
    new THREE.CircleGeometry(0.17, 40),
    new THREE.MeshBasicMaterial({
      color: 0xbfffdd,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  lens.rotation.x = -Math.PI / 2;
  lens.position.y = FLOOR_Y + 0.153;
  rig.add(lens);

  const lensGlow = new THREE.Mesh(
    new THREE.CircleGeometry(0.34, 40),
    new THREE.MeshBasicMaterial({
      map: makeRadialTexture('rgba(160,255,200,0.8)', 'rgba(34,216,97,0.25)'),
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  lensGlow.rotation.x = -Math.PI / 2;
  lensGlow.position.y = FLOOR_Y + 0.16;
  rig.add(lensGlow);

  scene.add(new THREE.AmbientLight(0x30363d, 0.9));
  const keyLight = new THREE.DirectionalLight(0xdfe8e2, 1.4);
  keyLight.position.set(2.5, 3, 2.5);
  scene.add(keyLight);
  const lensLight = new THREE.PointLight(0x22d861, 0, 4);
  rig.add(lensLight);
  lensLight.position.set(0, FLOOR_Y + 0.3, 0);

  /* ============================================================
     Layout — canvas covers the section; rig lands on the anchor
     ============================================================ */
  const RIG_H = 2.35; // model + projector + glow margin
  const RIG_W = 1.7; // widest element — beam cylinders
  const RIG_FLOOR = -1.14; // bottom of projector+glow, local space
  const TAN_HALF_FOV = Math.tan((camera.fov * Math.PI) / 360);
  let userYaw = 0; // drag / auto-rotate rotation

  function layout() {
    const secRect = story.getBoundingClientRect();
    const cw = secRect.width;
    const ch = secRect.height;
    if (!cw || !ch) return;

    renderer.setSize(cw, ch, false);
    camera.aspect = cw / ch;

    // camera distance so the rig's world height matches anchor height in px.
    // Rig renders ~12% smaller than the anchor block — its head drops
    // below the subtitle instead of overlapping it.
    const anchorH = (anchor.clientHeight || ch * 0.5) * 1.12;
    const anchorW = anchor.clientWidth || cw * 0.6;
    const distH = (RIG_H * ch) / (2 * TAN_HALF_FOV * anchorH);
    // on mobile the section canvas is extremely tall+narrow — the
    // horizontal FOV is tiny, so fit the rig's width to the anchor too
    const distW = (RIG_W * cw) / (2 * TAN_HALF_FOV * camera.aspect * anchorW);
    const dist = Math.max(distH, distW, 2.4);
    camera.position.set(0, 0, Math.min(dist, 40));
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
  }

  // Rig must follow the anchor EVERY frame — the anchor lives inside the
  // sticky column, so its section-space position changes while scrolling.
  // Both rects must be measured fresh: a cached section rect goes stale on
  // scroll and the rig drifts away from the anchor.
  //
  // The rig stays at x=0 — dead-center on the camera axis — so the model
  // faces the viewer straight-on and the floor discs never skew. Horizontal
  // placement is done by shifting the projection (setViewOffset), not by
  // moving the rig off-axis.
  const rigTemp = new THREE.Vector3();

  function positionRig() {
    const secRect = story.getBoundingClientRect();
    const aRect = anchor.getBoundingClientRect();
    const cw = secRect.width;
    const ch = secRect.height;
    if (!cw || !ch) return;

    // shift the view so the rig's on-axis column renders at the anchor's center-x
    const ax = aRect.left + aRect.width / 2 - secRect.left;
    camera.setViewOffset(cw, ch, cw / 2 - ax, 0, cw, ch);

    // world y where the anchor's bottom edge sits on the z=0 plane
    const ndcY = -(((aRect.bottom - secRect.top) / ch) * 2 - 1);
    const v = rigTemp.set(0, ndcY, 0.5).unproject(camera);
    const dir = v.sub(camera.position).normalize();
    const t = -camera.position.z / dir.z;
    const wy = camera.position.y + dir.y * t;
    // floor of the rig lands on the anchor's bottom edge — right above the caption
    rig.position.set(0, wy - RIG_FLOOR, 0);
    rig.rotation.y = userYaw;
  }

  function relayout() {
    layout();
    positionRig();
    if (!running) renderOnce();
  }

  const resizeObserver = new ResizeObserver(relayout);
  resizeObserver.observe(story);
  resizeObserver.observe(anchor);
  window.addEventListener('resize', relayout, { signal });

  /* ---------------- model ---------------- */
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);

  let model = null;
  let modelBaseY = 0; // rest height — idle float is added on top
  let spawnStart = -1;
  let elapsed = 0;
  let lastFrame = null;
  let raf = 0;
  let running = false;
  let pageActive = true;
  const initialBounds = anchor.getBoundingClientRect();
  let inView = initialBounds.bottom > 0 && initialBounds.top < window.innerHeight;
  const canRender = () => !disposed && pageActive && inView && !document.hidden && !!model;
  const ambientPaused = () => reduced || document.documentElement.dataset.motionPaused === 'true';
  const canAnimate = () => canRender() && !ambientPaused();

  loader.load(
    '/models/izad-hologram.glb',
    (gltf) => {
      if (disposed || signal.aborted) {
        gltf.scene.traverse((object) => {
          object.geometry?.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => material?.dispose());
        });
        return;
      }
      model = gltf.scene;

      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const scale = 1.9 / Math.max(size.y, 0.001);
      model.scale.setScalar(scale);
      box.setFromObject(model);
      box.getCenter(center);
      model.position.sub(center);
      modelBaseY = model.position.y;

      holoUniforms.uMinY.value = box.min.y;
      holoUniforms.uHeight.value = Math.max(size.y, 0.001);

      model.traverse((obj) => {
        if (obj.isMesh) obj.material = holoMaterial;
      });

      rig.add(model);
      document.getElementById('holo-loading')?.classList.add('done');
      relayout();

      spawnStart = 0.35;
      syncPlayback();
    },
    undefined,
    (err) => {
      if (disposed || signal.aborted) return;
      console.error('Hologram failed to load:', err);
      const el = document.getElementById('holo-loading');
      if (el) el.textContent = 'Hologram unavailable';
    }
  );

  function renderOnce() {
    if (!canRender()) return;
    // A static frame must apply input too: reduced motion still supports
    // dragging and keyboard rotation, and tracks the sticky anchor.
    positionRig();
    renderer.render(scene, camera);
  }

  /* ============================================================
     Drag rotate — pointer events on the section, gated to the
     figure's screen-space radius so text stays selectable
     ============================================================ */
  let dragging = false;
  let lastX = 0;
  let manualVel = 0;

  function rigScreenPos() {
    const secRect = story.getBoundingClientRect();
    const v = rig.position.clone().project(camera);
    return {
      x: secRect.left + ((v.x + 1) / 2) * secRect.width,
      y: secRect.top + ((1 - v.y) / 2) * secRect.height,
      r: anchor.clientWidth * 0.6,
    };
  }

  story.addEventListener('pointerdown', (e) => {
    if (!model || !canRender() || e.button !== 0) return;
    if (e.target.closest('a, button, input, select, textarea, .holo-caption')) return;
    const rp = rigScreenPos();
    const dx = e.clientX - rp.x;
    const dy = e.clientY - rp.y;
    if (Math.hypot(dx, dy) < rp.r) {
      dragging = true;
      lastX = e.clientX;
      story.setPointerCapture(e.pointerId);
    }
  }, { signal });

  story.addEventListener('pointermove', (e) => {
    if (dragging) {
      const dx = e.clientX - lastX;
      lastX = e.clientX;
      userYaw += dx * 0.009;
      manualVel = dx * 0.009;
      if (!running) renderOnce();
    }
  }, { signal });

  const endDrag = () => (dragging = false);
  story.addEventListener('pointerup', endDrag, { signal });
  story.addEventListener('pointercancel', endDrag, { signal });
  story.addEventListener('lostpointercapture', endDrag, { signal });

  // Keyboard alternative — arrow keys rotate the figure
  anchor.tabIndex = 0;
  anchor.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    userYaw += e.key === 'ArrowLeft' ? -0.18 : 0.18;
    if (!running) renderOnce();
  }, { signal });

  /* ============================================================
     Spawn timeline
     ============================================================ */
  const smooth = (a, b, x) => {
    const t = Math.min(Math.max((x - a) / (b - a), 0), 1);
    return t * t * (3 - 2 * t);
  };

  let spawned = false;

  function driveSpawn(t) {
    if (spawned) return;
    const ignition = smooth(spawnStart, spawnStart + 0.5, t);
    lensRing.material.opacity = ignition * 0.55;
    lens.material.opacity = ignition * (0.85 + 0.15 * Math.sin(t * 40));
    lensGlow.material.opacity = ignition * 0.7;
    lensLight.intensity = ignition * 8;

    const beamIn = smooth(0.9, 1.6, t);
    shared.uBeam.value = beamIn;
    codeUniforms.uCode.value = beamIn * (1.0 - smooth(2.9, 3.6, t)) * 0.9 + 0.08;

    shared.uSpawn.value = smooth(1.15, 2.75, t);

    if (t > 3.6) spawned = true;
  }

  /* ============================================================
     Render loop — paused when section is offscreen
     ============================================================ */
  function stopLoop() {
    running = false;
    cancelAnimationFrame(raf);
    raf = 0;
    lastFrame = null;
  }

  function staticPose() {
    spawned = true;
    shared.uSpawn.value = 1;
    shared.uBeam.value = 1;
    codeUniforms.uCode.value = 0.25;
    lensRing.material.opacity = 0.5;
    lens.material.opacity = 0.9;
    lensGlow.material.opacity = 0.7;
    lensLight.intensity = 8;
    manualVel = 0;
    if (model) {
      model.position.y = modelBaseY;
      model.rotation.x = 0;
      model.rotation.z = 0;
    }
  }

  function syncPlayback() {
    if (!canAnimate()) {
      stopLoop();
      if (ambientPaused() && model) staticPose();
      renderOnce();
      return;
    }
    if (!running) {
      running = true;
      lastFrame = null;
      raf = requestAnimationFrame(loop);
    }
  }

  function loop(timestamp) {
    if (!canAnimate()) return stopLoop();
    // Accumulate only rendered time. Hidden/offscreen intervals must never
    // advance the spawn timeline, angular motion, or shader clock.
    const dt = lastFrame === null ? 0 : Math.min((timestamp - lastFrame) / 1000, 0.05);
    lastFrame = timestamp;
    elapsed += dt;
    const t = elapsed;
    shared.uTime.value = t;
    positionRig();
    driveSpawn(t);
    if (spawned && !dragging) {
      userYaw += 0.4 * dt + manualVel;
      manualVel *= 0.94;
    }
    rig.rotation.y = userYaw;

    // Original avatar float and projector geometry are unchanged.
    if (spawned && model) {
      model.position.y = modelBaseY + Math.sin(t * 0.85) * 0.04;
      model.rotation.z = Math.sin(t * 0.6) * 0.018;
      model.rotation.x = Math.sin(t * 0.45 + 1.0) * 0.014;
      lensLight.intensity = 8 * (0.82 + 0.18 * Math.sin(t * 2.2));
      shared.uBeam.value = 1 + 0.09 * Math.sin(t * 1.7);
    }
    renderer.render(scene, camera);
    raf = requestAnimationFrame(loop);
  }

  let viewObserver;
  if ('IntersectionObserver' in window) {
    viewObserver = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      syncPlayback();
    });
    viewObserver.observe(anchor);
  } else {
    inView = true;
  }
  motionPreference.addEventListener('change', () => {
    reduced = motionPreference.matches;
    syncPlayback();
  }, { signal });
  document.addEventListener('visibilitychange', syncPlayback, { signal });
  document.addEventListener('zaddy:motionchange', syncPlayback, { signal });
  window.addEventListener('scroll', () => {
    if (!running && canRender()) renderOnce();
  }, { passive: true, signal });
  window.addEventListener('pagehide', () => {
    pageActive = false;
    stopLoop();
  }, { signal });
  window.addEventListener('pageshow', () => {
    pageActive = true;
    relayout();
    syncPlayback();
  }, { signal });
  signal.addEventListener('abort', () => {
    disposed = true;
    stopLoop();
    viewObserver?.disconnect();
    resizeObserver.disconnect();
    const geometries = new Set();
    const materials = new Set();
    const textures = new Set();
    scene.traverse((object) => {
      if (object.geometry) geometries.add(object.geometry);
      const list = Array.isArray(object.material) ? object.material : [object.material];
      list.forEach((material) => {
        if (!material) return;
        materials.add(material);
        if (material.map) textures.add(material.map);
        Object.values(material.uniforms || {}).forEach(({ value }) => {
          if (value?.isTexture) textures.add(value);
        });
      });
    });
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
    textures.forEach((texture) => texture.dispose());
    renderer.dispose();
    renderer.domElement.remove();
  }, { once: true });
}

function bootHologram() {
  hologramTeardown?.();
  hologramTeardown = initHologramPage();
}

bootHologram();
document.addEventListener('astro:page-load', bootHologram);
document.addEventListener('astro:before-swap', () => {
  hologramTeardown?.();
  hologramTeardown = null;
});
