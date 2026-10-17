export const VERSION = 1;
export const newId = () => crypto.randomUUID();
export const localDate = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
export const dateFrom = value => { const [year, month, day] = value.split('-').map(Number); return new Date(year, month - 1, day, 12); };
export const shiftDate = (value, days) => { const date = dateFrom(value); date.setDate(date.getDate() + days); return localDate(date); };
export const weekStart = value => shiftDate(value, -((dateFrom(value).getDay() + 6) % 7));
export const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && localDate(dateFrom(value)) === value;
export const clean = (value, max = 120) => String(value ?? '').trim().slice(0, max);
export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
export const formatDate = value => dateFrom(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
export const COLORS = ['#4d9b72', '#6587c8', '#bc795e', '#a679bd', '#c19a4a', '#549da3'];
export function centi(value) {
  const input = String(value).trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(input)) throw new Error('Enter a non-negative number with at most two decimals.');
  const [whole, fraction = ''] = input.split('.'); const result = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(result) || result > 100000000000) throw new Error('Number is too large.');
  return result;
}
export const displayCenti = value => Number((value / 100).toFixed(2));
export function validateHabit(raw) {
  if (!raw || typeof raw !== 'object') throw new Error('Invalid habit.');
  const name = clean(raw.name); if (!name) throw new Error('Enter a habit name.');
  const frequency = raw.frequency === 'weekdays' ? 'weekdays' : 'daily';
  const weekdays = frequency === 'weekdays' ? [...new Set((raw.weekdays || []).map(Number))].filter(day => Number.isInteger(day) && day >= 0 && day <= 6).sort() : [0, 1, 2, 3, 4, 5, 6];
  if (!weekdays.length) throw new Error('Choose at least one scheduled day.');
  const type = raw.type === 'quantity' ? 'quantity' : 'checkbox';
  const targetCenti = type === 'quantity' ? Number(raw.targetCenti) : 100;
  if (!Number.isSafeInteger(targetCenti) || targetCenti <= 0 || targetCenti > 100000000000) throw new Error('Enter a target above zero.');
  const weeklyTarget = raw.weeklyTarget === '' || raw.weeklyTarget == null ? null : Number(raw.weeklyTarget);
  if (weeklyTarget !== null && (!Number.isInteger(weeklyTarget) || weeklyTarget < 1 || weeklyTarget > weekdays.length)) throw new Error('Weekly target must fit the scheduled days.');
  const createdAt = validDate(raw.createdAt) ? raw.createdAt : localDate();
  const archivedAt = raw.archivedAt == null ? null : raw.archivedAt;
  if (archivedAt !== null && !validDate(archivedAt)) throw new Error('Invalid archive date.');
  const pauses = (raw.pauses || []).map(pause => { if (!validDate(pause.start) || (pause.end !== null && (!validDate(pause.end) || pause.end < pause.start))) throw new Error('Invalid pause dates.'); return { start: pause.start, end: pause.end ?? null }; });
  return { id: clean(raw.id) || newId(), schemaVersion: VERSION, name, description: clean(raw.description, 240), icon: clean(raw.icon, 8) || '\u2713', color: COLORS.includes(raw.color) ? raw.color : COLORS[0], frequency, weekdays, weeklyTarget, type, targetCenti, unit: clean(raw.unit, 30), createdAt, archivedAt, pauses };
}
export function validateEntry(raw) {
  if (!raw || !clean(raw.habitId) || !validDate(raw.date)) throw new Error('Invalid habit entry.');
  const status = ['complete', 'pending', 'skipped'].includes(raw.status) ? raw.status : 'pending';
  const valueCenti = Number(raw.valueCenti ?? 0);
  if (!Number.isSafeInteger(valueCenti) || valueCenti < 0 || valueCenti > 100000000000) throw new Error('Invalid quantity value.');
  return { id: `${clean(raw.habitId)}|${raw.date}`, habitId: clean(raw.habitId), date: raw.date, status, valueCenti, updatedAt: raw.updatedAt || new Date().toISOString() };
}
export function scheduled(habit, date) {
  if (!validDate(date) || date < habit.createdAt || (habit.archivedAt && date >= habit.archivedAt)) return false;
  if (habit.pauses.some(pause => date >= pause.start && (pause.end === null || date < pause.end))) return false;
  return habit.frequency === 'daily' || habit.weekdays.includes(dateFrom(date).getDay());
}
export const entryFor = (entries, habitId, date) => entries.find(entry => entry.habitId === habitId && entry.date === date);
export function statusFor(habit, entries, date) {
  if (!scheduled(habit, date)) return 'off';
  return entryFor(entries, habit.id, date)?.status || 'pending';
}
export function streaks(habit, entries, asOf = localDate()) {
  if (asOf < habit.createdAt) return { current: 0, longest: 0 };
  const lookup = new Map(entries.filter(entry => entry.habitId === habit.id).map(entry => [entry.date, entry.status]));
  let longest = 0, run = 0;
  for (let day = habit.createdAt; day <= asOf; day = shiftDate(day, 1)) {
    if (!scheduled(habit, day)) continue;
    const status = lookup.get(day) || 'pending';
    if (status === 'complete') { run++; longest = Math.max(longest, run); }
    else if (status === 'skipped' || day === asOf) continue;
    else run = 0;
  }
  return { current: run, longest };
}
export function completionRate(habits, entries, start, end, asOf = localDate()) {
  let due = 0, done = 0;
  for (let date = start; date <= end && date <= asOf; date = shiftDate(date, 1)) for (const habit of habits) {
    if (!scheduled(habit, date)) continue;
    const status = statusFor(habit, entries, date);
    if (status === 'skipped') continue;
    due++; if (status === 'complete') done++;
  }
  return { done, due, percent: due ? Math.round(done / due * 100) : 0 };
}
export function weeklyTargetProgress(habit, entries, date) {
  const start = weekStart(date); let completed = 0;
  for (let day = start; day < shiftDate(start, 7); day = shiftDate(day, 1)) if (statusFor(habit, entries, day) === 'complete') completed++;
  return { completed, target: habit.weeklyTarget || habit.weekdays.length };
}
