import test from 'node:test';
import assert from 'node:assert/strict';
import { shiftDate, weekStart, toGrams, fromGrams, validateWorkout, validateBodyWeight, volumeGrams, completedSets, estimatedOneRepMax, recordsForExercise } from './core.mjs';
import { exportJSON, exportCSV, parseImport } from './transfer.mjs';

const workout = validateWorkout({ id: 'w1', date: '2026-10-18', name: 'Push', status: 'finished', exercises: [{ id: 'e1', exerciseId: 'bench-press', name: 'Bench Press', muscle: 'Chest', sets: [{ id: 's1', kind: 'warmup', reps: 10, weightGrams: 20000, completed: true }, { id: 's2', kind: 'work', reps: 5, weightGrams: 60000, completed: true }, { id: 's3', kind: 'work', reps: 8, weightGrams: 65000, completed: false }] }] });
const data = { workouts: [workout], exercises: [], templates: [], bodyweights: [validateBodyWeight({ id: 'b1', date: '2026-10-18', grams: 75000 })] };

test('kg/lb values are stored as integer grams', () => { assert.equal(toGrams('60', 'kg'), 60000); assert.equal(toGrams('132.28', 'lb'), 60001); assert.equal(Math.round(fromGrams(60000, 'lb')), 132); assert.throws(() => toGrams('1.234')); });
test('volume and records use completed working sets only', () => { assert.equal(completedSets(workout).length, 1); assert.equal(volumeGrams(workout), 300000); const records = recordsForExercise([workout], 'bench-press'); assert.equal(records.maxWeightGrams, 60000); assert.equal(records.maxEstimatedGrams, 70000); });
test('estimated one-rep max is labeled as estimate and limited to suitable reps', () => { assert.equal(estimatedOneRepMax(60000, 5), 70000); assert.equal(estimatedOneRepMax(60000, 15), null); assert.equal(estimatedOneRepMax(0, 5), null); });
test('date arithmetic survives DST boundaries', () => { assert.equal(shiftDate('2026-03-28', 2), '2026-03-30'); assert.equal(weekStart('2026-10-18'), '2026-10-12'); });
test('backup JSON and CSV round trip complete records', () => { for (const [name, content] of [['backup.json', exportJSON(data)], ['backup.csv', exportCSV(data)]]) { const restored = parseImport(content, name); assert.equal(restored.workouts[0].exercises[0].sets[1].weightGrams, 60000); assert.equal(restored.bodyweights[0].grams, 75000); } });
test('invalid workouts and duplicate backup IDs are rejected', () => { assert.throws(() => validateWorkout({ ...workout, date: '2026-02-30' })); assert.throws(() => parseImport(exportJSON({ ...data, workouts: [workout, workout] }), 'backup.json')); });
