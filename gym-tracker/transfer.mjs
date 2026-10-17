import { validateWorkout, validateExercise, validateTemplate, validateBodyWeight } from './core.mjs';
const kinds = { workouts: validateWorkout, exercises: validateExercise, templates: validateTemplate, bodyweights: validateBodyWeight };
const safe = value => /^[=+@\-\t\r]|^'/.test(value) ? `'${value}` : value;
const cell = value => `"${safe(String(value ?? '')).replaceAll('"', '""')}"`;
export function exportJSON(data) { return JSON.stringify({ format: 'gym-tracker', version: 1, exportedAt: new Date().toISOString(), data }, null, 2); }
export function exportCSV(data) {
  const rows = [['kind', 'id', 'date', 'label', 'summary', 'payload'].join(',')];
  for (const [kind, records] of Object.entries(data)) {
    if (!kinds[kind]) continue;
    for (const record of records) {
      const label = record.name || record.note || 'Body weight';
      const summary = kind === 'workouts' ? `${record.exercises.length} exercises; ${record.status}` : kind === 'bodyweights' ? `${record.grams / 1000} kg` : record.muscle || '';
      rows.push([kind, record.id, record.date || '', label, summary, JSON.stringify(record)].map(cell).join(','));
    }
  }
  return rows.join('\r\n');
}
function csvRows(text) {
  const rows = []; let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) { const char = text[i];
    if (quoted) { if (char === '"' && text[i + 1] === '"') { field += '"'; i++; } else if (char === '"') quoted = false; else field += char; }
    else if (char === '"') quoted = true;
    else if (char === ',') { row.push(field); field = ''; }
    else if (char === '\n') { row.push(field.replace(/\r$/, '')); rows.push(row); row = []; field = ''; }
    else field += char;
  }
  if (quoted) throw new Error('CSV contains an unfinished quoted field.');
  if (field || row.length) { row.push(field.replace(/\r$/, '')); rows.push(row); }
  const headers = rows.shift()?.map(value => value.replace(/^\ufeff/, ''));
  if (!headers || ['kind', 'id', 'payload'].some(value => !headers.includes(value))) throw new Error('This is not a Gym Tracker CSV export.');
  return rows.filter(row => row.some(Boolean)).map(row => Object.fromEntries(headers.map((key, index) => {
    const value = row[index] || ''; return [key, /^'(?:[=+@\-\t\r']|$)/.test(value) ? value.slice(1) : value];
  })));
}
export function parseImport(text, filename) {
  let data;
  if (/\.json$/i.test(filename)) { const backup = JSON.parse(text); if (backup.format !== 'gym-tracker' || backup.version !== 1) throw new Error('Unsupported Gym Tracker backup.'); data = backup.data; }
  else if (/\.csv$/i.test(filename)) { data = { workouts: [], exercises: [], templates: [], bodyweights: [] }; for (const row of csvRows(text)) { if (!kinds[row.kind]) throw new Error('Unknown CSV record type.'); data[row.kind].push(JSON.parse(row.payload)); } }
  else throw new Error('Choose a JSON or CSV backup.');
  if (!data || typeof data !== 'object') throw new Error('Backup is incomplete.');
  const result = {};
  for (const [kind, validate] of Object.entries(kinds)) {
    if (!Array.isArray(data[kind]) || data[kind].length > 100000) throw new Error(`Backup has invalid ${kind}.`);
    const seen = new Set(); result[kind] = data[kind].map(raw => { const record = validate(raw); if (!raw.id || seen.has(record.id)) throw new Error(`Backup has duplicate or missing ${kind} IDs.`); seen.add(record.id); return kind === 'workouts' ? { ...record, updatedAt: raw.updatedAt || record.updatedAt } : record; });
  }
  return result;
}
export async function saveFile(filename, content, type) {
  const file = new File([content], filename, { type });
  if (navigator.canShare?.({ files: [file] }) && navigator.share) { try { await navigator.share({ files: [file], title: 'Gym Tracker backup' }); return; } catch (error) { if (error.name === 'AbortError') throw error; } }
  const url = URL.createObjectURL(file), link = document.createElement('a'); link.href = url; link.download = filename; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000);
}
