export const SCHEMA_VERSION = 1;
export const DEFAULT_CATEGORIES = ['Groceries', 'Dining', 'Transport', 'Shopping', 'Home', 'Health', 'Travel', 'Bills', 'Entertainment', 'Other'];
export const today = () => new Date().toLocaleDateString('en-CA');
export const newId = () => globalThis.crypto?.randomUUID?.() || `ps-${Date.now()}-${Math.random().toString(36).slice(2)}`;

export function cents(value) {
  const input = String(value).trim();
  if (!/^(?:\d+)(?:\.\d{1,2})?$/.test(input)) throw new Error('Enter a valid, non-negative amount with at most two decimal places.');
  const [whole, fraction = ''] = input.split('.');
  const result = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(result) || result > 999999999999) throw new Error('Amount is too large.');
  return result;
}
export const money = (value, currency = 'USD') => new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(value / 100);
export const clean = value => String(value ?? '').trim().slice(0, 160);
export const tagsFrom = value => [...new Set(String(value ?? '').split(',').map(clean).filter(Boolean))].slice(0, 20);

export function validateTransaction(raw) {
  if (!raw || typeof raw !== 'object') throw new Error('Invalid transaction.');
  const type = raw.type;
  if (!['expense', 'income', 'receipt'].includes(type)) throw new Error('Choose expense, income, or receipt.');
  const amount = raw.amount;
  if (!Number.isSafeInteger(amount) || amount <= 0 || amount > 999999999999) throw new Error('Amount must be greater than zero.');
  const date = clean(raw.date);
  const parsedDate = new Date(`${date}T12:00:00`);
  const normalizedDate = `${parsedDate.getFullYear()}-${String(parsedDate.getMonth() + 1).padStart(2, '0')}-${String(parsedDate.getDate()).padStart(2, '0')}`;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(parsedDate.getTime()) || normalizedDate !== date) throw new Error('Enter a valid date.');
  const merchant = clean(raw.merchant);
  if (!merchant) throw new Error(type === 'income' ? 'Enter a source.' : 'Enter a merchant.');
  const category = clean(raw.category) || (type === 'receipt' ? 'Groceries' : 'Other');
  const tags = Array.isArray(raw.tags) ? [...new Set(raw.tags.map(clean).filter(Boolean))].slice(0, 20) : tagsFrom(raw.tags);
  const items = type === 'receipt' ? (raw.items || []).map(item => {
    const name = clean(item.name);
    const quantity = Number(item.quantity);
    const unitPrice = Number(item.unitPrice);
    if (!name || !Number.isInteger(quantity) || quantity < 1 || quantity > 9999 || !Number.isSafeInteger(unitPrice) || unitPrice < 0 || !Number.isSafeInteger(quantity * unitPrice)) throw new Error('Check each receipt item, quantity, and price.');
    return { name, quantity, unitPrice, category: clean(item.category) || category, tags: Array.isArray(item.tags) ? [...new Set(item.tags.map(clean).filter(Boolean))] : tagsFrom(item.tags) };
  }) : [];
  if (items.length > 200) throw new Error('A receipt can contain at most 200 items.');
  return { id: clean(raw.id) || newId(), schemaVersion: SCHEMA_VERSION, type, amount, merchant, date, category, notes: clean(raw.notes), tags, items, createdAt: raw.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() };
}

export const itemTotal = tx => (tx.items || []).reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
export const receiptDifference = tx => tx.type === 'receipt' ? tx.amount - itemTotal(tx) : 0;
export function monthly(records, month) {
  return records.filter(tx => tx.date.startsWith(month)).reduce((acc, tx) => {
    if (tx.type === 'income') acc.income += tx.amount;
    else acc.expenses += tx.amount;
    return acc;
  }, { income: 0, expenses: 0 });
}
export function categoryTotals(records) {
  const totals = new Map();
  const add = (name, amount) => totals.set(name, (totals.get(name) || 0) + amount);
  records.filter(tx => tx.type !== 'income').forEach(tx => {
    if (tx.type === 'receipt' && tx.items.length) {
      tx.items.forEach(item => add(item.category || tx.category, item.quantity * item.unitPrice));
      const difference = receiptDifference(tx);
      if (difference) add('Receipt adjustment', difference);
    } else add(tx.category, tx.amount);
  });
  return [...totals].sort((a, b) => b[1] - a[1]);
}
export function suggestions(records, field) {
  const scores = new Map();
  records.forEach((tx, index) => {
    const values = field === 'item' ? (tx.items || []).map(item => item.name) : field === 'tag' ? [...tx.tags, ...(tx.items || []).flatMap(item => item.tags)] : [tx[field]];
    values.filter(Boolean).forEach(value => scores.set(value, (scores.get(value) || 0) + 1 + Math.max(0, 25 - index) / 25));
  });
  return [...scores].sort((a, b) => b[1] - a[1]).map(([value]) => value);
}
