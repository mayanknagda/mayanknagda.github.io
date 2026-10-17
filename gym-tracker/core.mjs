export const VERSION = 1;
export const newId = () => crypto.randomUUID();
export const localDate = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
export const dateFrom = value => { const [year, month, day] = value.split('-').map(Number); return new Date(year, month - 1, day, 12); };
export const shiftDate = (value, days) => { const date = dateFrom(value); date.setDate(date.getDate() + days); return localDate(date); };
export const weekStart = value => shiftDate(value, -((dateFrom(value).getDay() + 6) % 7));
export const clean = (value, max = 120) => String(value ?? '').trim().slice(0, max);
export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
export const formatDate = value => dateFrom(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
export function validDate(value) { return /^\d{4}-\d{2}-\d{2}$/.test(value) && localDate(dateFrom(value)) === value; }
export function toGrams(value, unit = 'kg') {
  const input = String(value).trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(input)) throw new Error('Enter a valid weight with at most two decimals.');
  const grams = Math.round(Number(input) * (unit === 'lb' ? 453.59237 : 1000));
  if (!Number.isSafeInteger(grams) || grams > 1000000) throw new Error('Weight is too large.');
  return grams;
}
export const fromGrams = (grams, unit = 'kg') => grams / (unit === 'lb' ? 453.59237 : 1000);
export const weightText = (grams, unit = 'kg') => `${Number(fromGrams(grams, unit).toFixed(2))} ${unit}`;
export const STARTER_EXERCISES = [
  ['barbell-squat', 'Barbell Squat', 'Legs', 'Barbell'], ['deadlift', 'Deadlift', 'Back', 'Barbell'], ['bench-press', 'Bench Press', 'Chest', 'Barbell'], ['overhead-press', 'Overhead Press', 'Shoulders', 'Barbell'],
  ['barbell-row', 'Barbell Row', 'Back', 'Barbell'], ['pull-up', 'Pull-up', 'Back', 'Bodyweight'], ['lat-pulldown', 'Lat Pulldown', 'Back', 'Machine'], ['seated-row', 'Seated Row', 'Back', 'Machine'],
  ['incline-press', 'Incline Dumbbell Press', 'Chest', 'Dumbbell'], ['dumbbell-curl', 'Dumbbell Curl', 'Arms', 'Dumbbell'], ['triceps-pushdown', 'Triceps Pushdown', 'Arms', 'Cable'],
  ['leg-press', 'Leg Press', 'Legs', 'Machine'], ['romanian-deadlift', 'Romanian Deadlift', 'Legs', 'Barbell'], ['leg-curl', 'Leg Curl', 'Legs', 'Machine'], ['calf-raise', 'Calf Raise', 'Legs', 'Machine'],
  ['lateral-raise', 'Lateral Raise', 'Shoulders', 'Dumbbell'], ['plank', 'Plank', 'Core', 'Bodyweight'], ['cable-crunch', 'Cable Crunch', 'Core', 'Cable']
].map(([id, name, muscle, equipment]) => ({ id, name, muscle, equipment, custom: false }));
export const MUSCLES = ['Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core', 'Other'];
export function validateExercise(raw) {
  if (!raw || typeof raw !== 'object') throw new Error('Invalid exercise.');
  const name = clean(raw.name);
  if (!name) throw new Error('Enter an exercise name.');
  return { id: clean(raw.id) || newId(), name, muscle: MUSCLES.includes(raw.muscle) ? raw.muscle : 'Other', equipment: clean(raw.equipment) || 'Other', custom: true };
}
export function validateWorkout(raw) {
  if (!raw || typeof raw !== 'object' || !validDate(raw.date)) throw new Error('Enter a valid workout date.');
  if (!['active', 'finished'].includes(raw.status)) throw new Error('Invalid workout status.');
  const exercises = (raw.exercises || []).map(exercise => {
    const name = clean(exercise.name);
    if (!name) throw new Error('Every exercise needs a name.');
    const sets = (exercise.sets || []).map(set => {
      const reps = Number(set.reps), weightGrams = Number(set.weightGrams);
      if (!Number.isInteger(reps) || reps < 0 || reps > 1000 || !Number.isSafeInteger(weightGrams) || weightGrams < 0 || weightGrams > 1000000) throw new Error('Check set reps and weight.');
      return { id: clean(set.id) || newId(), kind: set.kind === 'warmup' ? 'warmup' : 'work', reps, weightGrams, completed: Boolean(set.completed) };
    });
    if (sets.length > 100) throw new Error('Too many sets in one exercise.');
    return { id: clean(exercise.id) || newId(), exerciseId: clean(exercise.exerciseId), name, muscle: clean(exercise.muscle) || 'Other', notes: clean(exercise.notes, 300), sets };
  });
  if (exercises.length > 100) throw new Error('Too many exercises in one workout.');
  return { id: clean(raw.id) || newId(), schemaVersion: VERSION, date: raw.date, name: clean(raw.name) || 'Workout', status: raw.status, startedAt: raw.startedAt || new Date().toISOString(), finishedAt: raw.status === 'finished' ? (raw.finishedAt || new Date().toISOString()) : null, exercises, notes: clean(raw.notes, 500), updatedAt: new Date().toISOString() };
}
export function validateTemplate(raw) {
  if (!raw || typeof raw !== 'object' || !clean(raw.name)) throw new Error('Template needs a name.');
  const workout = validateWorkout({ id: 'template-check', date: localDate(), name: raw.name, status: 'active', exercises: raw.exercises || [] });
  return { id: clean(raw.id) || newId(), name: clean(raw.name), exercises: workout.exercises.map(exercise => ({ ...exercise, sets: exercise.sets.map(set => ({ ...set, completed: false })) })) };
}
export function validateBodyWeight(raw) {
  if (!raw || !validDate(raw.date) || !Number.isSafeInteger(raw.grams) || raw.grams < 1000 || raw.grams > 1000000) throw new Error('Enter a valid date and body weight.');
  return { id: clean(raw.id) || newId(), date: raw.date, grams: raw.grams, note: clean(raw.note, 160) };
}
export const completedSets = workout => workout.exercises.flatMap(exercise => exercise.sets.filter(set => set.completed && set.kind === 'work').map(set => ({ ...set, exerciseId: exercise.exerciseId, name: exercise.name })));
export const volumeGrams = workout => completedSets(workout).reduce((sum, set) => sum + set.weightGrams * set.reps, 0);
export const estimatedOneRepMax = (grams, reps) => reps >= 1 && reps <= 12 && grams > 0 ? Math.round(grams * (1 + reps / 30)) : null;
export function recordsForExercise(workouts, exerciseId) {
  const entries = workouts.filter(workout => workout.status === 'finished').flatMap(workout => completedSets(workout).filter(set => set.exerciseId === exerciseId).map(set => ({ date: workout.date, weightGrams: set.weightGrams, reps: set.reps, estimatedGrams: estimatedOneRepMax(set.weightGrams, set.reps) })));
  return { entries: entries.sort((a, b) => a.date.localeCompare(b.date)), maxWeightGrams: Math.max(0, ...entries.map(set => set.weightGrams)), maxEstimatedGrams: Math.max(0, ...entries.map(set => set.estimatedGrams || 0)) };
}
