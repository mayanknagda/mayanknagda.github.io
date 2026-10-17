import test from 'node:test';
import assert from 'node:assert/strict';
import { localDate, dateFrom, shiftDate, validDate, centi, validateHabit, validateEntry, scheduled, streaks, completionRate, weeklyTargetProgress } from './core.mjs';
import { exportJSON, exportCSV, parseImport } from './transfer.mjs';

const habit = validateHabit({ id: 'read', name: 'Read', frequency: 'weekdays', weekdays: [1, 3, 5], weeklyTarget: 2, type: 'quantity', targetCenti: 2000, unit: 'minutes', createdAt: '2026-10-05', pauses: [] });
const entry = (date, status, valueCenti = 0) => validateEntry({ habitId: habit.id, date, status, valueCenti });

test('local date arithmetic survives DST and rejects impossible dates', () => { assert.equal(shiftDate('2026-03-28', 2), '2026-03-30'); assert.equal(localDate(dateFrom('2026-10-25')), '2026-10-25'); assert.equal(validDate('2026-02-30'), false); });
test('quantity values use integer hundredths', () => { assert.equal(centi('2.5'), 250); assert.throws(() => centi('2.555')); });
test('selected weekdays and pauses control the schedule', () => { assert.equal(scheduled(habit, '2026-10-05'), true); assert.equal(scheduled(habit, '2026-10-06'), false); const paused = { ...habit, pauses: [{ start: '2026-10-07', end: '2026-10-09' }] }; assert.equal(scheduled(paused, '2026-10-07'), false); assert.equal(scheduled(paused, '2026-10-09'), true); });
test('skips do not break streaks, missed scheduled days do', () => { const entries = [entry('2026-10-05', 'complete', 2000), entry('2026-10-07', 'skipped'), entry('2026-10-09', 'complete', 2000), entry('2026-10-12', 'pending')]; assert.deepEqual(streaks(habit, entries, '2026-10-12'), { current: 2, longest: 2 }); assert.deepEqual(streaks(habit, entries, '2026-10-14'), { current: 0, longest: 2 }); });
test('completion rates exclude skips and future days', () => { const entries = [entry('2026-10-05', 'complete', 2000), entry('2026-10-07', 'skipped')]; assert.deepEqual(completionRate([habit], entries, '2026-10-05', '2026-10-09', '2026-10-09'), { done: 1, due: 2, percent: 50 }); assert.deepEqual(weeklyTargetProgress(habit, entries, '2026-10-09'), { completed: 1, target: 2 }); });
test('backup JSON and CSV round trip habits and entries', () => { const data = { habits: [habit], entries: [entry('2026-10-05', 'complete', 2000)] }; for (const [name, content] of [['backup.json', exportJSON(data)], ['backup.csv', exportCSV(data)]]) { const restored = parseImport(content, name); assert.equal(restored.habits[0].weeklyTarget, 2); assert.equal(restored.entries[0].valueCenti, 2000); } });
test('invalid schedules and duplicate IDs are rejected', () => { assert.throws(() => validateHabit({ ...habit, weekdays: [] })); assert.throws(() => parseImport(exportJSON({ habits: [habit, habit], entries: [] }), 'backup.json')); });
