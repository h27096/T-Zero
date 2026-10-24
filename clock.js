// All durations are signed milliseconds: negative before launch, positive after.
export const STORAGE_KEY = 't-zero:v1';
export const MAX_DURATION = 999 * 3600_000 + 59 * 60_000 + 59_000;

export function defaults() {
  return { version: 1, mission: 'NEXT HORIZON', mode: 'manual', target: null,
    zone: 'local', manual: { duration: 600_000, phase: 'ready', value: -600_000, anchor: null } };
}

export function manualValue(manual, now) {
  return manual.phase === 'running' ? manual.value + now - manual.anchor : manual.value;
}

export function transition(manual, action, now) {
  if (action === 'reset') return { ...manual, phase: 'ready', value: -manual.duration, anchor: null };
  if (action === 'start' && manual.phase !== 'running')
    return { ...manual, phase: 'running', anchor: now };
  if (action === 'hold' && manual.phase === 'running')
    return { ...manual, phase: 'held', value: manualValue(manual, now), anchor: null };
  return manual;
}

export function clockParts(value) {
  // Round prelaunch away from zero, so T+ starts only at the actual deadline.
  const seconds = value < 0 ? Math.ceil(-value / 1000) : Math.floor(value / 1000);
  return { sign: value < 0 ? '−' : '+', hours: String(Math.floor(seconds / 3600)).padStart(2, '0'),
    minutes: String(Math.floor(seconds / 60) % 60).padStart(2, '0'), seconds: String(seconds % 60).padStart(2, '0') };
}

export function parseLaunch(input, zone) {
  if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d)?$/.test(input)) return null;
  const date = new Date(input + (zone === 'utc' ? 'Z' : ''));
  if (!Number.isFinite(date.getTime())) return null;
  // Reject normalized invalid dates and nonexistent local DST times.
  if (launchInput(date.getTime(), zone) !== (input.length === 16 ? input + ':00' : input)) return null;
  return date.getTime();
}

export function launchInput(timestamp, zone) {
  const d = new Date(timestamp);
  const part = name => d[(zone === 'utc' ? 'getUTC' : 'get') + name]();
  const pad = n => String(n).padStart(2, '0');
  return `${String(part('FullYear')).padStart(4, '0')}-${pad(part('Month') + 1)}-${pad(part('Date'))}T${pad(part('Hours'))}:${pad(part('Minutes'))}:${pad(part('Seconds'))}`;
}

export function restore(raw) {
  const fallback = defaults();
  if (!raw) return fallback;
  try {
    const s = JSON.parse(raw), m = s.manual;
    const time = n => Number.isFinite(n) && Math.abs(n) <= 8.64e15;
    if (s.version !== 1 || !['manual', 'exact'].includes(s.mode) || !['utc', 'local'].includes(s.zone) ||
      typeof s.mission !== 'string' || s.mission.length > 48 ||
      !(s.target === null || time(s.target)) || !m ||
      !Number.isInteger(m.duration) || m.duration < 0 || m.duration > MAX_DURATION ||
      !['ready', 'held', 'running'].includes(m.phase) || !time(m.value) ||
      (m.phase === 'running' ? !time(m.anchor) : m.anchor !== null) ||
      (m.phase === 'ready' && m.value !== -m.duration)) return fallback;
    return { version: 1, mission: s.mission, mode: s.mode, zone: s.zone, target: s.target,
      manual: { duration: m.duration, phase: m.phase, value: m.value, anchor: m.anchor } };
  } catch { return fallback; }
}
