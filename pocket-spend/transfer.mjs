import { validateTransaction, newId, cents } from './core.mjs';

const columns = ['id', 'type', 'date', 'merchant', 'amount', 'category', 'notes', 'tags', 'items', 'createdAt'];
const safeCell = value => /^[=+@\-\t\r]|^'/.test(value) ? `'${value}` : value;
const quoted = value => `"${safeCell(String(value ?? '')).replaceAll('"', '""')}"`;
export function exportCSV(records) {
  return [columns.join(','), ...records.map(tx => columns.map(key => quoted(key === 'amount' ? (tx.amount / 100).toFixed(2) : key === 'tags' || key === 'items' ? JSON.stringify(tx[key]) : tx[key])).join(','))].join('\r\n');
}
export function exportJSON(records, currency = 'USD') {
  return JSON.stringify({ format: 'pocket-spend', version: 1, exportedAt: new Date().toISOString(), currency, transactions: records }, null, 2);
}
export function parseCSV(text) {
  const rows = []; let row = [], field = '', quotedField = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quotedField) {
      if (char === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (char === '"') quotedField = false;
      else field += char;
    } else if (char === '"') quotedField = true;
    else if (char === ',') { row.push(field); field = ''; }
    else if (char === '\n') { row.push(field.replace(/\r$/, '')); rows.push(row); row = []; field = ''; }
    else field += char;
  }
  if (quotedField) throw new Error('CSV has an unfinished quoted field.');
  if (field || row.length) { row.push(field.replace(/\r$/, '')); rows.push(row); }
  const headers = rows.shift()?.map((header, index) => index === 0 ? header.replace(/^\ufeff/, '') : header);
  if (!headers || !['type', 'date', 'merchant', 'amount'].every(key => headers.includes(key))) throw new Error('CSV needs type, date, merchant, and amount columns.');
  return rows.filter(row => row.some(Boolean)).map(row => Object.fromEntries(headers.map((header, index) => {
    const value = row[index] ?? '';
    return [header, /^'(?:[=+@\-\t\r']|$)/.test(value) ? value.slice(1) : value];
  })));
}
export function parseBackup(text, filename) {
  let input, currency = null;
  if (/\.json$/i.test(filename)) {
    const parsed = JSON.parse(text);
    if (parsed.format !== 'pocket-spend' || parsed.version !== 1 || !Array.isArray(parsed.transactions)) throw new Error('This is not a supported Pocket Spend backup.');
    input = parsed.transactions;
    if (parsed.currency != null) {
      if (!['USD', 'EUR', 'GBP', 'INR'].includes(parsed.currency)) throw new Error('Backup has an unsupported currency.');
      currency = parsed.currency;
    }
  } else if (/\.csv$/i.test(filename)) {
    input = parseCSV(text).map(row => ({ ...row, id: row.id || newId(), amount: cents(row.amount), tags: row.tags ? JSON.parse(row.tags) : [], items: row.items ? JSON.parse(row.items) : [] }));
  } else throw new Error('Choose a .json or .csv file.');
  if (input.length > 100000) throw new Error('Backup is too large.');
  const ids = new Set();
  const records = input.map(record => {
    const validated = validateTransaction(record);
    if (ids.has(validated.id)) throw new Error('Backup contains repeated transaction IDs.');
    ids.add(validated.id);
    return { ...validated, createdAt: record.createdAt || validated.createdAt, updatedAt: record.updatedAt || validated.updatedAt };
  });
  return { records, currency };
}
export const parseImport = (text, filename) => parseBackup(text, filename).records;
export async function saveFile(name, content, type) {
  const file = new File([content], name, { type });
  if (navigator.canShare?.({ files: [file] }) && navigator.share) {
    try { await navigator.share({ files: [file], title: 'Pocket Spend backup' }); return; }
    catch (error) { if (error.name === 'AbortError') throw error; }
  }
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url; link.download = name; document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
