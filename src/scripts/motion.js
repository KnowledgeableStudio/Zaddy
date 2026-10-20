import '../styles/cinematic.css';

// Optional decoration has a single owner. Content is visible until an observer
// has successfully registered it; a failed enhancement cannot hide the page.
let teardown = null;
export function initMotion() {
  if (teardown || typeof window === 'undefined') return teardown;
  const controller = new AbortController();
  const { signal } = controller;
  const root = document.documentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const reveals = [...document.querySelectorAll('.reveal')];
  const scenes = [...document.querySelectorAll('[data-motion-scene]')];
  const hologramAnchor = document.getElementById('holo-anchor');
  let observer;
  let active = null;
  let activeSurface = null;
  let pointer = null;
  let frame = 0;
  // Depth vars feed the surface's transform — write them on the surface itself
  // so each frame invalidates its small subtree instead of the whole card's.
  // Light vars stay on the card (its ::before glare consumes them there).
  const depthProps = ['--depth-rx', '--depth-ry', '--depth-x', '--depth-y', '--depth-lift'];
  const lightProps = ['--light-x', '--light-y', '--glare-opacity'];
  const isPaused = () => reduced.matches || document.hidden || root.dataset.motionUserPaused === 'true';
  const canMove = () => !isPaused() && finePointer.matches;
  const resetDepth = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    if (active) {
      lightProps.forEach((name) => active.style.removeProperty(name));
      (activeSurface || active) && depthProps.forEach((name) => (activeSurface || active).style.removeProperty(name));
      active.removeAttribute('data-depth-active');
    }
    active = null;
    activeSurface = null;
    pointer = null;
  };
  const flushPointer = () => {
    frame = 0;
    if (!active || !pointer || !canMove()) return resetDepth();
    const rect = active.getBoundingClientRect();
    if (!rect.width || !rect.height) return resetDepth();
    const x = Math.max(-1, Math.min(1, (pointer.x - rect.left) / rect.width * 2 - 1));
    const y = Math.max(-1, Math.min(1, (pointer.y - rect.top) / rect.height * 2 - 1));
    const surface = activeSurface || active;
    surface.style.setProperty('--depth-rx', `${(-y * 6).toFixed(2)}deg`);
    surface.style.setProperty('--depth-ry', `${(x * 6).toFixed(2)}deg`);
    surface.style.setProperty('--depth-x', `${(x * 5).toFixed(2)}px`);
    surface.style.setProperty('--depth-y', `${(y * 5).toFixed(2)}px`);
    surface.style.setProperty('--depth-lift', '12px');
    active.style.setProperty('--light-x', `${((x + 1) * 50).toFixed(1)}%`);
    active.style.setProperty('--light-y', `${((y + 1) * 50).toFixed(1)}%`);
    active.style.setProperty('--glare-opacity', '.7');
  };
  const syncPreferences = () => {
    root.dataset.motionPaused = String(isPaused());
    if (!canMove()) resetDepth();
    if (isPaused()) reveals.forEach((el) => {
      el.classList.remove('motion-pending');
      el.classList.add('is-visible');
      if (!el.matches('[data-motion-scene]')) observer?.unobserve(el);
    });
  };

  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver((entries) => {
      entries.forEach(({ target, isIntersecting }) => {
        if (target.matches('[data-motion-scene]')) target.dataset.motionVisible = String(isIntersecting);
        if (isIntersecting && target.classList.contains('reveal')) {
          target.classList.remove('motion-pending');
          target.classList.add('is-visible');
          if (!target.matches('[data-motion-scene]')) observer.unobserve(target);
        }
      });
    }, { threshold: 0.01 });
    scenes.forEach((el) => { el.dataset.motionVisible = 'false'; observer.observe(el); });
    reveals.forEach((el) => {
      // Ancestors of the existing hologram must never be translated, scaled,
      // or rotated: its independent canvas uses the anchor's viewport rect.
      if (hologramAnchor && el.contains(hologramAnchor)) el.dataset.revealStatic = 'true';
      observer.observe(el);
      if (!isPaused() && !el.classList.contains('is-visible')) el.classList.add('motion-pending');
    });
  } else {
    scenes.forEach((el) => { el.dataset.motionVisible = 'true'; });
    reveals.forEach((el) => el.classList.add('is-visible'));
  }
  root.classList.add('motion-ready');
  syncPreferences();
  reduced.addEventListener('change', syncPreferences, { signal });
  finePointer.addEventListener('change', syncPreferences, { signal });
  document.addEventListener('visibilitychange', syncPreferences, { signal });
  document.addEventListener('zaddy:motionchange', syncPreferences, { signal });
  document.addEventListener('pointermove', (event) => {
    if (!canMove() || event.pointerType === 'touch') return;
    let next = event.target instanceof Element ? event.target.closest('[data-depth]') : null;
    if (next && hologramAnchor && next.contains(hologramAnchor)) next = null;
    if (next !== active) {
      resetDepth();
      active = next;
      activeSurface = active?.querySelector('[data-depth-surface]') || null;
      active?.setAttribute('data-depth-active', 'true');
    }
    if (!active) return;
    pointer = { x: event.clientX, y: event.clientY };
    if (!frame) frame = requestAnimationFrame(flushPointer);
  }, { passive: true, signal });
  document.addEventListener('pointerout', (event) => {
    if (active && (!(event.relatedTarget instanceof Node) || !active.contains(event.relatedTarget))) resetDepth();
  }, { passive: true, signal });
  window.addEventListener('blur', resetDepth, { signal });
  window.addEventListener('scroll', resetDepth, { passive: true, signal });
  window.addEventListener('pageshow', syncPreferences, { signal });
  window.addEventListener('pagehide', (event) => {
    resetDepth();
    root.dataset.motionPaused = 'true';
    if (!event.persisted) teardown?.();
  }, { signal });

  teardown = () => {
    controller.abort();
    observer?.disconnect();
    resetDepth();
    reveals.forEach((el) => el.classList.remove('motion-pending'));
    scenes.forEach((el) => delete el.dataset.motionVisible);
    root.classList.remove('motion-ready');
    delete root.dataset.motionPaused;
    teardown = null;
  };
  return teardown;
}

initMotion();

// Client-side navigation swaps the page DOM but not this module: each new
// document needs fresh reveal/scene observers, and the old ones are released
// before the swap so nothing double-registers.
document.addEventListener('astro:page-load', initMotion);
document.addEventListener('astro:before-swap', () => teardown?.());
