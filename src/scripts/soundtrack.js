// One original soundtrack per document; remember the listener's mute choice.
// A full reload restarts the track from the beginning — position continuity
// only matters across client-side navigation, where the element persists.
const audio = document.getElementById('bg-music');
const button = document.getElementById('music-toggle');
let userMuted = false;
let suspended = false;
try {
  const saved = JSON.parse(sessionStorage.getItem('zaddy-soundtrack') || 'null');
  userMuted = saved?.muted === true;
} catch { /* Storage is optional; music controls still work. */ }

function update() {
  if (!audio || !button) return;
  const audible = !audio.paused && !audio.muted;
  button.classList.toggle('is-on', audible);
  button.classList.toggle('needs-tap', !audible && !userMuted && !suspended);
  button.setAttribute('aria-pressed', String(audible));
  button.setAttribute('aria-label', audible ? 'Mute background music' : 'Unmute background music');
}

function remember() {
  if (!audio) return;
  try { sessionStorage.setItem('zaddy-soundtrack', JSON.stringify({ muted: userMuted })); }
  catch { /* A blocked storage API must not disable playback. */ }
}

async function play() {
  if (!audio || userMuted || suspended) return update();
  audio.muted = false;
  try {
    await audio.play();
  } catch {
    // The button remains an explicit way to unlock sound after autoplay is blocked.
    audio.muted = true;
  }
  update();
}

export function suspendSoundtrack() {
  suspended = true;
  audio?.pause();
  update();
}

export function resumeSoundtrack() {
  suspended = false;
  if (!userMuted) void play();
}

if (audio && button) {
  audio.volume = .55;
  audio.muted = userMuted;
  for (const event of ['play', 'pause', 'volumechange']) audio.addEventListener(event, update);
  button.addEventListener('click', async () => {
    const wasAudible = !audio.paused && !audio.muted;
    userMuted = wasAudible;
    if (userMuted) audio.muted = true;
    else await play();
    remember();
    update();
  });
  function unlock(event) {
    // An explicit sound-button action must not be inverted by an earlier pointerdown.
    if (button.contains(event.target) || event.target.closest?.('[data-video]') || userMuted || suspended) return;
    if (audio.paused || audio.muted) void play();
  }
  document.addEventListener('pointerdown', unlock, { passive: true });
  document.addEventListener('keydown', unlock);
  window.addEventListener('pagehide', remember);
  window.addEventListener('pageshow', () => { if (!userMuted && !suspended) void play(); });
  update();
  void play();
}
