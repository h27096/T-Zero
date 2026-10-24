import { STORAGE_KEY, defaults, restore, transition, manualValue, clockParts, parseLaunch, launchInput } from './clock.js';

const $ = id => document.getElementById(id);
let state = defaults();
function storageUnavailable() {
  $('storage-warning').hidden = false;
  $('save-status').textContent = 'SESSION ONLY · STORAGE UNAVAILABLE';
}
try { state = restore(localStorage.getItem(STORAGE_KEY)); } catch { storageUnavailable(); }

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    $('storage-warning').hidden = true;
    $('save-status').textContent = 'CONFIGURATION SAVED LOCALLY';
  } catch { storageUnavailable(); }
}
function announce(text) { $('message').textContent = text; }
function zoneHint() {
  $('zone-hint').textContent = state.zone === 'utc' ? 'Universal time (UTC). No daylight-saving adjustment.' :
    `Your time zone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}. At a repeated daylight-saving hour, the first occurrence is used; select UTC for the second.`;
}
function populate() {
  $('mission').value = state.mission;
  const secs = state.manual.duration / 1000;
  $('duration-hours').value = Math.floor(secs / 3600);
  $('duration-minutes').value = Math.floor(secs / 60) % 60;
  $('duration-seconds').value = secs % 60;
  $('zone').value = state.zone;
  $('launch-date').value = state.target === null ? '' : launchInput(state.target, state.zone);
  zoneHint();
  sync();
}
function sync() {
  const manual = state.mode === 'manual', phase = state.manual.phase;
  $('mission-heading').textContent = state.mission.trim() || 'UNTITLED MISSION';
  $('manual-mode').setAttribute('aria-pressed', String(manual));
  $('exact-mode').setAttribute('aria-pressed', String(!manual));
  $('manual-form').hidden = $('manual-controls').hidden = !manual;
  $('exact-form').hidden = $('exact-controls').hidden = manual;
  $('start').disabled = phase === 'running';
  $('start').textContent = phase === 'held' ? '▶ Resume sequence' : phase === 'running' ? 'Sequence running' : '▶ Start sequence';
  $('hold').disabled = phase !== 'running';
  for (const id of ['duration-hours', 'duration-minutes', 'duration-seconds', 'set-duration']) $(id).disabled = phase !== 'ready';
  $('duration-hint').textContent = phase === 'ready' ? 'Set your duration, then start the sequence.' : 'Reset the sequence before changing its duration.';
  $('operation-copy').textContent = phase === 'held' ? 'On hold. Ready when you are.' : phase === 'running' ? 'Sequence active. Make every second count.' : 'The next milestone starts with you.';
  $('target-summary').textContent = state.target === null ? 'Set a launch date to begin the countdown.' :
    new Intl.DateTimeFormat(undefined, { dateStyle: 'full', timeStyle: 'long', ...(state.zone === 'utc' ? { timeZone: 'UTC' } : {}) }).format(state.target);
  render();
}
function render() {
  const now = Date.now(), manual = state.mode === 'manual';
  const unset = !manual && state.target === null;
  const value = manual ? manualValue(state.manual, now) : unset ? 0 : now - state.target;
  const parts = clockParts(value);
  $('sign').textContent = unset ? '−' : parts.sign;
  for (const unit of ['hours', 'minutes', 'seconds']) $(unit).textContent = unset ? '--' : parts[unit];
  $('clock').setAttribute('aria-label', unset ? 'Launch time not set' : `T ${value < 0 ? 'minus' : 'plus'} ${Number(parts.hours)} hours ${Number(parts.minutes)} minutes ${Number(parts.seconds)} seconds`);
  const phase = unset || (manual && state.manual.phase === 'ready') ? 'ready' : manual && state.manual.phase === 'held' ? 'held' : value >= 0 ? 'elapsed' : 'running';
  const status = { ready: 'STANDING BY', held: 'ON HOLD', elapsed: 'MISSION ELAPSED', running: 'COUNTDOWN ACTIVE' }[phase];
  if ($('status').textContent !== status) $('status').textContent = status;
  $('status').dataset.phase = phase;
  $('clock-note').textContent = manual ? `Manual sequence · ${ { ready: 'Ready to start', held: 'Clock paused', running: 'Counting down', elapsed: 'Beyond zero' }[phase] }` : unset ? 'Scheduled launch · Awaiting launch time' : `Scheduled launch · ${value >= 0 ? 'Beyond zero' : 'Tracking launch time'}`;
  $('utc-time').textContent = 'UTC ' + new Date(now).toISOString().slice(11, 19);
  const progress = manual ? state.manual.duration === 0 ? (phase === 'ready' ? 0 : 100) : 100 * (1 + value / state.manual.duration) : value >= 0 && !unset ? 100 : 0;
  $('progress').style.width = `${Math.max(0, Math.min(100, progress))}%`;
  // Retain readable hours for very distant targets without horizontal overflow.
  $('clock').style.fontSize = parts.hours.length > 3 ? `clamp(20px, ${Math.max(4, 9 - (parts.hours.length - 3))}vw, 85px)` : '';
}

for (const mode of ['manual', 'exact']) $(mode + '-mode').addEventListener('click', () => {
  state.mode = mode; save(); sync(); announce(mode === 'manual' ? 'Manual sequence selected.' : 'Scheduled launch selected.');
});
$('mission').addEventListener('input', () => { state.mission = $('mission').value; save(); $('mission-heading').textContent = state.mission.trim() || 'UNTITLED MISSION'; });
$('manual-form').addEventListener('submit', event => {
  event.preventDefault();
  if (state.manual.phase !== 'ready') return;
  const duration = (Number($('duration-hours').value) * 3600 + Number($('duration-minutes').value) * 60 + Number($('duration-seconds').value)) * 1000;
  state.manual = { duration, phase: 'ready', value: -duration, anchor: null };
  save(); sync(); announce('Countdown duration set. Ready to start.');
});
for (const action of ['start', 'hold', 'reset']) $(action).addEventListener('click', () => {
  state.manual = transition(state.manual, action, Date.now()); save(); sync();
  announce({ start: 'Sequence running.', hold: 'Sequence on hold.', reset: 'Sequence reset to its configured duration.' }[action]);
  if (action === 'start') $('hold').focus();
  if (action === 'hold') $('start').focus();
});
$('zone').addEventListener('change', () => {
  // Preserve the instant represented by the draft when switching display zones.
  const draft = parseLaunch($('launch-date').value, state.zone);
  state.zone = $('zone').value;
  if (draft !== null) $('launch-date').value = launchInput(draft, state.zone);
  $('launch-date').setCustomValidity('');
  save(); zoneHint(); sync();
});
$('launch-date').addEventListener('input', () => $('launch-date').setCustomValidity(''));
$('exact-form').addEventListener('submit', event => {
  event.preventDefault();
  const target = parseLaunch($('launch-date').value, state.zone);
  if (target === null) {
    $('launch-date').setCustomValidity('Enter a valid date and time. For a skipped daylight-saving hour, choose another time or use UTC.');
    $('launch-date').reportValidity(); return;
  }
  state.target = target; save(); sync(); announce('Launch time set. The clock is tracking your scheduled instant.');
});
$('fullscreen').addEventListener('click', async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
    else announce('Fullscreen is unavailable in this browser. Try your browser’s fullscreen control.');
  } catch { announce('Fullscreen could not start. Try your browser’s fullscreen control.'); }
});
document.addEventListener('fullscreenchange', () => { $('fullscreen').lastElementChild.textContent = document.fullscreenElement ? 'Exit fullscreen' : 'Fullscreen'; });
document.addEventListener('visibilitychange', render);
window.addEventListener('pageshow', render);
window.addEventListener('storage', event => {
  if (event.key === STORAGE_KEY || event.key === null) {
    state = restore(event.newValue); populate(); announce('Configuration updated from another tab.');
  }
});
populate();
save();
setInterval(render, 100);
