// One original soundtrack per document; remember the listener's choice and position.
const audio = document.getElementById('bg-music');
const button = document.getElementById('music-toggle');
let userMuted = false;
let suspended = false;
let restoreTime = 0;
try {
  const saved = JSON.parse(sessionStorage.getItem('zaddy-soundtrack') || 'null');
  userMuted = saved?.muted === true;
  restoreTime = Number.isFinite(saved?.time) ? Math.max(0, saved.time) : 0;
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
  try { sessionStorage.setItem('zaddy-soundtrack', JSON.stringify({ muted: userMuted, time: audio.currentTime })); }
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
  audio.addEventListener('loadedmetadata', () => {
    if (restoreTime && Number.isFinite(audio.duration)) audio.currentTime = restoreTime % audio.duration;
    restoreTime = 0;
  }, { once: true });
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
