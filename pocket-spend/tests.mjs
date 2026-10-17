import test from 'node:test';
import assert from 'node:assert/strict';
import { cents, validateTransaction, itemTotal, receiptDifference, monthly, categoryTotals, suggestions } from './core.mjs';
import { exportCSV, exportJSON, parseImport } from './transfer.mjs';

const expense = validateTransaction({ id: 'one', type: 'expense', amount: 1250, merchant: 'Cafe', date: '2026-10-10', category: 'Dining', tags: ['coffee'] });
const income = validateTransaction({ id: 'two', type: 'income', amount: 50000, merchant: 'Salary', date: '2026-10-11', category: 'Work' });
const receipt = validateTransaction({ id: 'three', type: 'receipt', amount: 1020, merchant: 'Market', date: '2026-10-12', category: 'Groceries', tags: ['weekly'], items: [{ name: 'Milk', quantity: 2, unitPrice: 310, category: 'Groceries', tags: ['dairy'] }, { name: 'Soap', quantity: 1, unitPrice: 350, category: 'Home', tags: [] }] });

test('money uses exact integer cents and rejects excess precision', () => {
  assert.equal(cents('12.34'), 1234); assert.equal(cents('0.01'), 1);
  assert.throws(() => cents('1.999')); assert.throws(() => cents('-2'));
});
test('receipt reconciliation and totals count each receipt once', () => {
  assert.equal(itemTotal(receipt), 970); assert.equal(receiptDifference(receipt), 50);
  assert.deepEqual(monthly([expense, income, receipt], '2026-10'), { income: 50000, expenses: 2270 });
  const categories = Object.fromEntries(categoryTotals([expense, receipt]));
  assert.equal(categories.Groceries, 620); assert.equal(categories.Home, 350);
  assert.equal(categories['Receipt adjustment'], 50);
  assert.equal(Object.values(categories).reduce((a, b) => a + b, 0), 2270);
});
test('validation rejects malformed receipts', () => {
  assert.throws(() => validateTransaction({ ...receipt, items: [{ name: 'Milk', quantity: 0, unitPrice: 100 }] }));
  assert.throws(() => validateTransaction({ ...expense, amount: 0 }));
});
test('autocomplete favors frequent and recent values', () => {
  assert.equal(suggestions([receipt, expense, { ...expense, id: 'four' }], 'merchant')[0], 'Cafe');
  assert.deepEqual(suggestions([receipt], 'item'), ['Milk', 'Soap']);
});
test('JSON and CSV backups round trip receipt details', () => {
  for (const [name, content] of [['backup.json', exportJSON([expense, income, receipt])], ['backup.csv', exportCSV([expense, income, receipt])]]) {
    const restored = parseImport(content, name);
    assert.equal(restored.length, 3);
    assert.equal(restored[2].amount, 1020);
    assert.deepEqual(restored[2].items, receipt.items);
    assert.deepEqual(restored[2].tags, ['weekly']);
  }
});
test('import rejects invalid files and duplicate IDs', () => {
  assert.throws(() => parseImport('{"format":"other","version":1,"transactions":[]}', 'backup.json'));
  assert.throws(() => parseImport(exportJSON([expense, expense]), 'backup.json'));
});
test('CSV export keeps spreadsheet formulas as text and restores original values', () => {
  const suspicious = { ...expense, id: 'formula', merchant: '=2+2', notes: "'literal" };
  const csv = exportCSV([suspicious]);
  assert.match(csv, /"'=2\+2"/);
  const [restored] = parseImport(csv, 'backup.csv');
  assert.equal(restored.merchant, '=2+2');
  assert.equal(restored.notes, "'literal");
});
