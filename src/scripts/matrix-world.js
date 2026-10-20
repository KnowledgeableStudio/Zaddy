// Three.js (~730KB) is imported lazily below — the rain canvas, toggle, and
// page interactivity don't wait on it; the WebGL relics fade in when ready.

// A single decorative world per document. It never writes layout transforms:
// the original hologram keeps its own renderer and projection coordinates.
const world = document.getElementById('matrix-world');
const geometryCanvas = document.getElementById('matrix-geometry');
const codeCanvas = document.getElementById('matrix-code');
const toggle = document.getElementById('motion-toggle');

if (world && geometryCanvas && codeCanvas && toggle) initMatrixWorld();

function initMatrixWorld() {
  const root = document.documentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const narrow = window.matchMedia('(max-width: 700px)');
  const pointerFine = window.matchMedia('(hover: hover) and (pointer: fine)');
  const controller = new AbortController();
  const { signal } = controller;
  let userPaused = false;
  try { userPaused = sessionStorage.getItem('zaddy-ambient-motion') === 'paused'; } catch { /* Private browsing still gets a working toggle. */ }
  let width = window.innerWidth;
  let height = window.innerHeight;
  let renderer = null;
  let scene = null;
  let camera = null;
  let leftRelic = null;
  let rightRelic = null;
  let environmentTarget = null;
  let sparks = null;
  let shadows = [];
  let columns = [];
  let frame = 0;
  let last = 0;
  let rainLast = 0;
  let elapsed = 0;
  let disposed = false;
  let THREE = null;
  let RoomEnvironment = null;
  let degraded = false;
  // Second degradation level — replaces the old auto-freeze. Motion never
  // stops on its own: quality steps down (lower DPR, sparser rain, ~15fps
  // cap) but the world keeps animating. Only the visitor's toggle, an OS
  // reduced-motion choice, or a hidden tab can pause it.
  let deepDegraded = false;
  let slowMs = 0;
  let pageAway = false;
  let contextLost = false;
  let scrollTarget = window.scrollY;
  let scrollCurrent = scrollTarget;
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  let context = null;
  try { context = codeCanvas.getContext('2d', { alpha: true }); } catch { /* CSS and WebGL remain independent fallbacks. */ }
  const resources = new Set();
  const remember = (resource) => { resources.add(resource); return resource; };
  const glyphs = '01IZADカサノバネモラヌリムシトメヒソヤ光夢音愛ZADDY';
  const canRun = () => !disposed && !pageAway && !document.hidden && !userPaused && !reduced.matches;

  function createEnvironment() {
    const room = new RoomEnvironment();
    const pmrem = new THREE.PMREMGenerator(renderer);
    try {
      // Broad luminous panels in this real 3D room form the metal reflections.
      // A local procedural environment avoids a remote HDR image dependency.
      const nextTarget = pmrem.fromScene(room, .025, .1, 100, { size: narrow.matches ? 128 : 256 });
      if (environmentTarget) { environmentTarget.dispose(); resources.delete(environmentTarget); }
      environmentTarget = remember(nextTarget);
      scene.environment = environmentTarget.texture;
      scene.environmentIntensity = .86;
      scene.environmentRotation.y = -.45;
    } finally { room.dispose(); pmrem.dispose(); }
  }

  function makeSculpture(kind) {
    const group = new THREE.Group();
    const polished = remember(new THREE.MeshPhysicalMaterial({ color: 0xc1c9d1, metalness: 1, roughness: .19, clearcoat: .65, clearcoatRoughness: .14 }));
    const graphite = remember(new THREE.MeshPhysicalMaterial({ color: 0x313b46, metalness: .92, roughness: .26, clearcoat: .8, clearcoatRoughness: .18 }));
    const segments = narrow.matches ? 80 : 136;
    if (kind === 'loop') {
      const loop = new THREE.Mesh(remember(new THREE.TorusGeometry(1.24, .29, narrow.matches ? 16 : 24, segments)), polished);
      loop.scale.set(.9, 1.18, 1);
      group.add(loop);
      // A closely seated graphite band gives the loop a manufactured edge.
      const inset = new THREE.Mesh(remember(new THREE.TorusGeometry(1.235, .305, 16, segments)), graphite);
      inset.scale.set(.9, 1.18, .32); inset.position.z = -.075;
      group.add(inset);
    } else {
      const loop = new THREE.Mesh(remember(new THREE.TorusKnotGeometry(.87, .23, segments, narrow.matches ? 12 : 20, 2, 3)), polished);
      group.add(loop);
      const glass = remember(new THREE.MeshPhysicalMaterial({ color: 0xdce7ed, metalness: 0, roughness: .17, transmission: .78, thickness: .7, ior: 1.46, attenuationColor: new THREE.Color(0xabbfce), attenuationDistance: 2.2, clearcoat: 1, clearcoatRoughness: .12 }));
      const insert = new THREE.Mesh(remember(new THREE.SphereGeometry(.42, narrow.matches ? 20 : 32, 16)), glass);
      insert.scale.set(.86, 1.26, .86); group.add(insert);
    }
    scene.add(group);
    return group;
  }

  function makeGround() {
    const floor = new THREE.Mesh(remember(new THREE.PlaneGeometry(80, 80)), remember(new THREE.MeshStandardMaterial({ color: 0x0a1018, metalness: .28, roughness: .66 })));
    floor.rotation.x = -Math.PI / 2; floor.position.set(0, -3.8, -10); scene.add(floor);
    const shadowCanvas = document.createElement('canvas'); shadowCanvas.width = 128; shadowCanvas.height = 128;
    const shadowContext = shadowCanvas.getContext('2d');
    if (!shadowContext) return;
    const gradient = shadowContext.createRadialGradient(64, 64, 4, 64, 64, 64);
    gradient.addColorStop(0, 'rgba(0,0,0,.78)'); gradient.addColorStop(.3, 'rgba(0,0,0,.45)'); gradient.addColorStop(1, 'rgba(0,0,0,0)');
    shadowContext.fillStyle = gradient; shadowContext.fillRect(0, 0, 128, 128);
    const texture = remember(new THREE.CanvasTexture(shadowCanvas));
    for (let i = 0; i < 2; i++) {
      const shadow = new THREE.Mesh(remember(new THREE.PlaneGeometry(5.6, 4.2)), remember(new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: .48, depthWrite: false, toneMapped: false })));
      shadow.rotation.x = -Math.PI / 2; shadow.position.y = -3.79; scene.add(shadow); shadows.push(shadow);
    }
  }

  function buildScene() {
    try {
      renderer = new THREE.WebGLRenderer({ canvas: geometryCanvas, antialias: !narrow.matches, alpha: true, powerPreference: 'low-power', failIfMajorPerformanceCaveat: true });
      renderer.setClearColor(0x000000, 0);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = .94;
      renderer.transmissionResolutionScale = narrow.matches ? .25 : .3;
      scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0x070a0e, .033);
      camera = new THREE.PerspectiveCamera(46, width / Math.max(1, height), .1, 75);
      camera.position.set(0, .3, 12);
      try { createEnvironment(); } catch { /* Direct studio lighting remains available if environment baking fails. */ }
      scene.add(new THREE.AmbientLight(0xd6e0e8, .18));
      const key = new THREE.DirectionalLight(0xf6f8fb, 2.1); key.position.set(-4, 7, 5); scene.add(key);
      const rim = new THREE.DirectionalLight(0xa8bdcc, 1.8); rim.position.set(6, 1, -4); scene.add(rim);
      const fill = new THREE.PointLight(0xc5d9e7, 18, 32, 2); fill.position.set(3, 4, 5); scene.add(fill);
      leftRelic = makeSculpture('loop');
      rightRelic = makeSculpture('fold');
      makeGround();

      const pointCount = narrow.matches ? 18 : 32;
      const positions = new Float32Array(pointCount * 3);
      for (let i = 0; i < pointCount; i++) {
        positions[i * 3] = (Math.random() - .5) * 34;
        positions[i * 3 + 1] = (Math.random() - .5) * 16;
        positions[i * 3 + 2] = -Math.random() * 18;
      }
      const pointsGeometry = remember(new THREE.BufferGeometry());
      pointsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      sparks = new THREE.Points(pointsGeometry, remember(new THREE.PointsMaterial({ color: 0xc4d2dd, size: .02, transparent: true, opacity: .28, sizeAttenuation: true, depthWrite: false })));
      scene.add(sparks);
      world.dataset.webgl = 'true';
    } catch {
      renderer?.dispose(); renderer = null;
      resources.forEach((item) => item.dispose?.()); resources.clear();
      world.dataset.webgl = 'false';
    }
  }

  function resize() {
    width = window.innerWidth; height = window.innerHeight;
    // The rain canvas is soft ambient texture — DPR 1 is enough, and every
    // pixel saved is per-frame cost. WebGL stays capped at 1.25 and drops
    // further when the adaptive check below degrades quality.
    const dpr = Math.min(window.devicePixelRatio || 1, narrow.matches ? 1 : 1.25) / (deepDegraded ? 1.6 : degraded ? 1.25 : 1);
    if (context) {
      codeCanvas.width = Math.round(width);
      codeCanvas.height = Math.round(height);
      context.setTransform(1, 0, 0, 1, 0, 0);
      const spacing = (narrow.matches ? 76 : 92) * (deepDegraded ? 2.2 : degraded ? 1.5 : 1);
      const count = Math.ceil(width / spacing);
      columns = Array.from({ length: count }, (_, i) => ({ x: i * spacing + 14, y: Math.random() * (height + 440) - 440, speed: 15 + Math.random() * 12, length: 5 + Math.floor(Math.random() * 8), seed: Math.floor(Math.random() * glyphs.length), opacity: .26 + Math.random() * .35 }));
    }
    if (renderer && camera) {
      renderer.setPixelRatio(dpr); renderer.setSize(width, height, false);
      camera.aspect = width / Math.max(1, height); camera.updateProjectionMatrix();
    }
    if (!canRun()) drawStill();
  }

  function drawRain(delta) {
    if (!context) return;
    context.clearRect(0, 0, width, height);
    context.font = '11px ui-monospace, SFMono-Regular, Consolas, monospace';
    const step = 21;
    const mutation = Math.floor(elapsed * 1.4);
    for (const column of columns) {
      column.y += delta * column.speed;
      if (column.y - column.length * step > height) column.y = -step;
      for (let j = 0; j < column.length; j++) {
        const y = column.y - j * step;
        if (y < -step || y > height + step) continue;
        const alpha = (1 - j / column.length) * column.opacity;
        context.fillStyle = j === 0 && column.seed % 7 === 0 ? `rgba(141,192,166,${alpha})` : `rgba(177,194,207,${alpha * (j === 0 ? 1 : .56)})`;
        const index = (column.seed + j * 7 + mutation * (j % 4 === 0 ? 1 : 0)) % glyphs.length;
        context.fillText(glyphs[index], column.x, y);
      }
    }
  }

  function drawGeometry(delta) {
    if (!renderer || !scene || contextLost) return;
    const easing = delta ? 1 - Math.exp(-delta * 3) : 1;
    pointer.x += (pointer.tx - pointer.x) * easing;
    pointer.y += (pointer.ty - pointer.y) * easing;
    scrollCurrent += (scrollTarget - scrollCurrent) * easing;
    const travel = scrollCurrent / Math.max(height, 1);
    const halfWidth = Math.tan(THREE.MathUtils.degToRad(23)) * 12 * camera.aspect;
    const side = halfWidth * (narrow.matches ? 1.18 : .94);
    leftRelic.position.set(-side, .95 + Math.sin(elapsed * .2 - travel * .35) * .28, -.8);
    leftRelic.rotation.set(.42 + Math.sin(elapsed * .12) * .18, -.52 + elapsed * .075 + travel * .08, -.27 + Math.sin(elapsed * .14) * .14);
    rightRelic.position.set(side, -1.55 + Math.sin(elapsed * .18 + travel * .36) * .34, -1.1);
    rightRelic.rotation.set(.3 + elapsed * -.045 + travel * .065, elapsed * .065, .35);
    shadows.forEach((shadow, i) => { const sculpture = i ? rightRelic : leftRelic; shadow.position.x = sculpture.position.x; shadow.position.z = sculpture.position.z - .1; shadow.material.opacity = i ? .45 : .32; });
    sparks.rotation.y = elapsed * .004;
    sparks.position.y = Math.sin(elapsed * .1) * .15;
    camera.position.x = pointer.x * .22;
    camera.position.y = .3 + pointer.y * .14 - Math.sin(travel * .3) * .1;
    camera.lookAt(0, 0, -2);
    renderer.render(scene, camera);
  }

  function drawStill() { drawRain(0); drawGeometry(0); }

  function tick(time) {
    frame = 0;
    if (!canRun()) return;
    // Render at 30 fps on small screens, ~15 fps when deep-degraded, and cap
    // elapsed time after interruptions.
    const interval = deepDegraded ? 1000 / 15 : narrow.matches ? 1000 / 30 : 1000 / 60;
    if (last && time - last < interval - 1) { frame = requestAnimationFrame(tick); return; }
    const delta = last ? Math.min((time - last) / 1000, .055) : 0;
    // Wall-clock gap between rendered frames — catches GPU-bound jank that a
    // JS-side draw timer can't see (the throttled branch above skips render).
    const gapMs = last ? time - last : 0;
    last = time; elapsed += delta;
    const drawStart = performance.now();
    if (!rainLast || time - rainLast >= 90) {
      drawRain(rainLast ? Math.min((time - rainLast) / 1000, .12) : 0); rainLast = time;
    }
    drawGeometry(delta);
    // Adaptive quality, time-budgeted: sustained frames slower than ~30fps
    // accumulate; ~1.2s of jank drops pixel/rain density, ~1.5s more steps
    // down to the ~15fps tier. Motion never freezes on its own — only the
    // visitor's toggle, reduced-motion, or a hidden tab can pause it.
    if (!deepDegraded) {
      const frameMs = Math.max(gapMs, performance.now() - drawStart);
      slowMs = frameMs > 30 ? slowMs + frameMs : Math.max(0, slowMs - 40);
      if (!degraded && slowMs > 1200) { slowMs = 0; degrade(); }
      else if (degraded && slowMs > 1500) { slowMs = 0; degrade(true); }
    }
    frame = requestAnimationFrame(tick);
  }

  async function loadThree() {
    try {
      const [three, env] = await Promise.all([
        import('three'),
        import('three/addons/environments/RoomEnvironment.js'),
      ]);
      if (disposed) return;
      THREE = three;
      RoomEnvironment = env.RoomEnvironment;
      buildScene();
      resize();
    } catch {
      world.dataset.webgl = 'false';
    }
  }

  function degrade(deep = false) {
    if (deep) {
      deepDegraded = true;
      resize();
      return;
    }
    degraded = true;
    if (renderer) {
      renderer.setPixelRatio(1);
      renderer.transmissionResolutionScale = .2;
    }
    resize();
  }

  function sync() {
    const paused = userPaused || reduced.matches || document.hidden || pageAway;
    root.dataset.motionUserPaused = String(userPaused);
    root.dataset.motionPaused = String(paused);
    toggle.hidden = false;
    toggle.disabled = reduced.matches;
    const held = userPaused;
    toggle.setAttribute('aria-pressed', String(!held && !reduced.matches));
    toggle.setAttribute('aria-label', reduced.matches ? 'Ambient motion follows your reduced motion setting' : held ? 'Resume ambient motion' : 'Pause ambient motion');
    const label = toggle.querySelector('.motion-label');
    if (label) label.textContent = reduced.matches ? 'Motion reduced' : held ? 'Motion off' : 'Motion on';
    document.dispatchEvent(new CustomEvent('zaddy:motionchange', { detail: { paused, userPaused, reduced: reduced.matches } }));
    cancelAnimationFrame(frame); frame = 0; last = 0; rainLast = 0;
    if (canRun()) frame = requestAnimationFrame(tick);
    else if (!document.hidden && !pageAway) drawStill();
  }

  function dispose() {
    if (disposed) return;
    disposed = true; cancelAnimationFrame(frame); controller.abort();
    resources.forEach((item) => item.dispose?.()); resources.clear();
    renderer?.dispose();
    scene?.clear();
  }

  resize(); sync();
  // The rain canvas and CSS ambience paint immediately; the ~730KB Three.js
  // module eval and scene build (incl. the PMREM environment bake) are moved
  // off the critical path into the first idle window so first paint and input
  // stay unblocked. Relics still fade in during page open.
  const startScene = () => { if (!disposed) void loadThree(); };
  if ('requestIdleCallback' in window) requestIdleCallback(startScene, { timeout: 1200 });
  else setTimeout(startScene, 0);
  toggle.addEventListener('click', () => {
    userPaused = !userPaused;
    try { sessionStorage.setItem('zaddy-ambient-motion', userPaused ? 'paused' : 'playing'); } catch { /* Preference remains valid for this document. */ }
    sync();
  }, { signal });
  window.addEventListener('pointermove', (event) => {
    if (!canRun() || !pointerFine.matches || event.pointerType === 'touch') return;
    pointer.tx = event.clientX / Math.max(width, 1) * 2 - 1;
    pointer.ty = -(event.clientY / Math.max(height, 1) * 2 - 1);
  }, { passive: true, signal });
  window.addEventListener('pointerout', (event) => { if (!event.relatedTarget) { pointer.tx = 0; pointer.ty = 0; } }, { passive: true, signal });
  window.addEventListener('scroll', () => { scrollTarget = window.scrollY; }, { passive: true, signal });
  // Mobile URL-bar chrome fires resize on every scroll — debounce so canvas
  // realloc (setSize) doesn't run per frame.
  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { if (!disposed) resize(); }, 120);
  }, { passive: true, signal });
  document.addEventListener('visibilitychange', sync, { signal });
  reduced.addEventListener('change', sync, { signal });
  narrow.addEventListener('change', resize, { signal });
  geometryCanvas.addEventListener('webglcontextlost', (event) => { event.preventDefault(); contextLost = true; world.dataset.webgl = 'false'; }, { signal });
  geometryCanvas.addEventListener('webglcontextrestored', () => { contextLost = false; world.dataset.webgl = 'true'; try { createEnvironment(); } catch { /* Direct lights still provide a usable restored scene. */ } if (!canRun()) drawStill(); }, { signal });
  window.addEventListener('pagehide', (event) => { pageAway = true; cancelAnimationFrame(frame); frame = 0; if (!event.persisted) dispose(); }, { signal });
  window.addEventListener('pageshow', () => { pageAway = false; sync(); }, { signal });
}
