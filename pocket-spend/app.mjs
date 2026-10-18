import { DEFAULT_CATEGORIES, today, newId, cents, money, clean, tagsFrom, validateTransaction, itemTotal, receiptDifference, monthly, categoryTotals, suggestions } from './core.mjs';
import { allTransactions, putTransaction, deleteTransaction, getMeta, setMeta, importTransactions } from './db.mjs';
import { exportCSV, exportJSON, parseBackup, saveFile } from './transfer.mjs';

const app = document.querySelector('#app');
const editor = document.querySelector('#editor');
const detail = document.querySelector('#detail');
const toastNode = document.querySelector('#toast');
const state = { records: [], page: 'home', currency: 'USD', changes: 0, lastBackup: null, filter: {}, editing: null, itemCount: 0 };
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const fmt = value => money(value, state.currency);
const fmtDate = date => new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
const monthName = month => new Date(`${month}-01T12:00:00`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
const sorted = () => [...state.records].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
let toastTimer;
function toast(message) { toastNode.textContent = message; toastNode.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => toastNode.classList.remove('show'), 3500); }
function errorMessage(error) { console.error(error); toast(error.message || 'Something went wrong. Your saved data is safe.'); }
async function load() { state.records = await allTransactions(); state.records = sorted(); render(); }
async function changeMade() { state.changes++; await setMeta('changes', state.changes); await load(); }
function head(title, subtitle = '') { return `<div class="page-head"><div><p class="eyebrow">Your money, clearly</p><h1>${esc(title)}</h1>${subtitle ? `<p class="subtle">${esc(subtitle)}</p>` : ''}</div></div>`; }
function row(tx) { return `<button class="row" data-view="${esc(tx.id)}" type="button"><span class="row-icon">${tx.type === 'income' ? '+' : tx.type === 'receipt' ? '#' : '-'}</span><span class="row-main"><strong>${esc(tx.merchant)}</strong><small>${esc(fmtDate(tx.date))} \u00b7 ${esc(tx.type === 'receipt' ? 'Receipt' : tx.category)}${tx.tags.length ? ` \u00b7 ${esc(tx.tags.slice(0, 2).join(', '))}` : ''}</small></span><span class="row-amount ${tx.type === 'income' ? 'positive' : ''}">${tx.type === 'income' ? '+' : '-'}${esc(fmt(tx.amount))}</span></button>`; }
function bars(entries, total) { return entries.length ? `<div class="bars">${entries.slice(0, 6).map(([name, amount]) => `<div><div class="bar-label"><span>${esc(name)}</span><strong>${esc(fmt(amount))}</strong></div><div class="track"><div class="fill" style="width:${Math.max(0, Math.min(100, total ? amount / total * 100 : 0))}%"></div></div></div>`).join('')}</div>` : '<div class="empty">No spending here yet.</div>'; }
function renderHome() {
  const month = today().slice(0, 7), current = state.records.filter(tx => tx.date.startsWith(month));
  const totals = monthly(current, month), categories = categoryTotals(current), recent = sorted().slice(0, 5);
  return `${head('A clearer view of today', monthName(month))}<div class="grid"><section class="card hero"><div><p class="eyebrow">Spent this month</p><div class="hero-value">${esc(fmt(totals.expenses))}</div></div><div class="hero-foot"><div><span class="subtle">Income</span><strong>${esc(fmt(totals.income))}</strong></div><div><span class="subtle">Net cash flow</span><strong>${esc(fmt(totals.income - totals.expenses))}</strong></div></div></section><section class="card metric"><div><p class="eyebrow">At a glance</p><div class="metric-value">${current.length}</div><span class="subtle">transactions this month</span></div><div class="metric-pair"><div class="mini"><span class="subtle">Expense entries</span><strong>${current.filter(tx => tx.type !== 'income').length}</strong></div><div class="mini"><span class="subtle">Income entries</span><strong>${current.filter(tx => tx.type === 'income').length}</strong></div></div></section><section class="card wide"><div class="section-title"><h2>Spending by category</h2><button class="link-button" data-go="insights">More insights</button></div>${bars(categories, totals.expenses)}</section><section class="card side"><div class="section-title"><h2>Recent activity</h2><button class="link-button" data-go="transactions">See all</button></div><div class="list">${recent.length ? recent.map(row).join('') : '<div class="empty">Your first transaction starts here.<br>Add one with the green button.</div>'}</div></section></div>`;
}
function filteredRecords() {
  const f = state.filter;
  return sorted().filter(tx => (!f.search || [tx.merchant, tx.category, tx.notes, ...tx.tags, ...(tx.items || []).map(item => item.name)].join(' ').toLowerCase().includes(f.search.toLowerCase())) && (!f.type || tx.type === f.type) && (!f.category || tx.category === f.category || tx.items.some(item => item.category === f.category)) && (!f.tag || tx.tags.includes(f.tag) || tx.items.some(item => item.tags.includes(f.tag))) && (!f.from || tx.date >= f.from) && (!f.to || tx.date <= f.to));
}
function renderTransactions() {
  const f = state.filter, records = filteredRecords();
  const categories = [...new Set([...DEFAULT_CATEGORIES, ...state.records.flatMap(tx => [tx.category, ...tx.items.map(item => item.category)])])].filter(Boolean).sort();
  const tags = suggestions(state.records, 'tag');
  return `${head('Transactions', 'Every entry, easy to find and change.')}<div class="toolbar"><input aria-label="Search transactions" data-filter="search" placeholder="Search merchants, items, notes..." value="${esc(f.search || '')}"><select aria-label="Type" data-filter="type"><option value="">All types</option>${['expense', 'income', 'receipt'].map(type => `<option value="${type}" ${f.type === type ? 'selected' : ''}>${type[0].toUpperCase() + type.slice(1)}</option>`).join('')}</select><select aria-label="Category" data-filter="category"><option value="">All categories</option>${categories.map(category => `<option ${f.category === category ? 'selected' : ''}>${esc(category)}</option>`).join('')}</select><select aria-label="Tag" data-filter="tag"><option value="">All tags</option>${tags.map(tag => `<option ${f.tag === tag ? 'selected' : ''}>${esc(tag)}</option>`).join('')}</select><input type="date" aria-label="From date" data-filter="from" value="${esc(f.from || '')}"><input type="date" aria-label="To date" data-filter="to" value="${esc(f.to || '')}"></div><p class="filter-summary">${records.length} ${records.length === 1 ? 'transaction' : 'transactions'}</p><section class="card"><div class="list">${records.length ? records.map(row).join('') : '<div class="empty">No transactions match these filters.</div>'}</div></section>`;
}
function renderInsights() {
  const now = today().slice(0, 7), months = Array.from({ length: 6 }, (_, index) => { const d = new Date(`${now}-01T12:00:00`); d.setMonth(d.getMonth() - (5 - index)); return d.toLocaleDateString('en-CA').slice(0, 7); });
  const trends = months.map(month => [month, monthly(state.records, month).expenses]);
  const max = Math.max(1, ...trends.map(([, value]) => value));
  const allExpenses = state.records.filter(tx => tx.type !== 'income');
  const categories = categoryTotals(allExpenses);
  const tagTotals = new Map();
  allExpenses.forEach(tx => new Set([...tx.tags, ...tx.items.flatMap(item => item.tags)]).forEach(tag => tagTotals.set(tag, (tagTotals.get(tag) || 0) + tx.amount)));
  const itemStats = new Map();
  state.records.flatMap(tx => tx.items.map(item => ({ ...item, date: tx.date }))).forEach(item => { const key = item.name.toLowerCase(); const stat = itemStats.get(key) || { name: item.name, count: 0, prices: [] }; stat.count += item.quantity; stat.prices.push([item.date, item.unitPrice]); itemStats.set(key, stat); });
  const frequent = [...itemStats.values()].sort((a, b) => b.count - a.count).slice(0, 6);
  return `${head('Insights', 'Patterns from your own history.')}<div class="grid insight-grid"><section class="card"><h2>Monthly spending</h2><div class="chart" role="img" aria-label="Monthly spending: ${trends.map(([month, value]) => `${month} ${fmt(value)}`).join(', ')}">${trends.map(([month, value]) => `<div class="chart-col"><div class="chart-bar" style="height:${Math.max(2, value / max * 140)}px" title="${esc(fmt(value))}"></div><small>${esc(new Date(`${month}-01T12:00:00`).toLocaleDateString(undefined, { month: 'short' }))}</small></div>`).join('')}</div></section><section class="card"><h2>Categories</h2><p class="small-note">Receipt item totals are assigned to their categories. Any difference appears as a receipt adjustment.</p>${bars(categories, allExpenses.reduce((sum, tx) => sum + tx.amount, 0))}</section><section class="card"><h2>Tags</h2><p class="small-note">A transaction can have more than one tag. Tag totals overlap and should not be added together.</p>${bars([...tagTotals].sort((a, b) => b[1] - a[1]), Math.max(1, ...tagTotals.values()))}</section><section class="card"><h2>Groceries and items</h2><p class="subtle">${esc(fmt(categories.find(([name]) => name === 'Groceries')?.[1] || 0))} assigned to groceries</p>${frequent.length ? `<div class="list">${frequent.map(stat => `<div class="row"><span class="row-icon">${stat.count}</span><span class="row-main"><strong>${esc(stat.name)}</strong><small>${stat.count} purchased \u00b7 latest ${esc(fmt(stat.prices.sort((a, b) => b[0].localeCompare(a[0]))[0][1]))}</small></span></div>`).join('')}</div>` : '<div class="empty">Itemized receipts will reveal your frequent purchases.</div>'}</section><section class="card"><h2>Historical item prices</h2><div class="list">${frequent.length ? frequent.map(stat => `<div class="detail-line"><span>${esc(stat.name)}</span><strong>${stat.prices.sort((a, b) => a[0].localeCompare(b[0])).map(([date, price]) => `${fmt(price)} (${fmtDate(date)})`).join(' \u2192 ')}</strong></div>`).join('') : '<div class="empty">Add receipt items to track prices over time.</div>'}</div></section></div>`;
}
function renderSettings() {
  const backupText = state.lastBackup ? fmtDate(state.lastBackup.slice(0, 10)) : 'Never';
  const how = [
    ['Add money in or out', 'Tap the green plus button, choose Expense or Income, then enter the amount, merchant or source, date, and category. Notes and tags are optional.'],
    ['Use receipts', 'Choose Receipt for shopping. Enter just the receipt total for a quick record, or add items with quantity, unit price, category, and tags. The receipt total is counted once; any item difference is shown clearly.'],
    ['Autocomplete and tags', 'Previously used merchants, categories, items, and tags appear as suggestions. Reusing an item also fills its last price, category, and tags. Separate multiple tags with commas.'],
    ['Read your insights', 'Home shows this month\'s income, expenses, cash flow, and categories. Insights shows trends and item prices. Receipt items split category totals; overlapping tag totals should not be added together.'],
    ['Keep and restore your data', 'Transactions live in this browser. Back up as JSON or CSV; both save your records and currency. CSV also opens in a spreadsheet. To restore, choose Restore JSON or CSV and select a backup. Existing records stay untouched.'],
    ['Back up and install', 'Browser data does not sync between devices. Save a backup regularly. On iPhone, use Safari Share > Add to Home Screen. On Android, use Chrome menu > Install app or Add to Home screen. Visit once online before using it offline.']
  ];
  return `${head('Settings', 'A quiet place for your data.')}<div class="grid settings-grid"><section class="card"><h2>How to Use</h2>${how.map(([title, body]) => `<details class="help-item"><summary>${esc(title)}</summary><p>${esc(body)}</p></details>`).join('')}</section><section class="card"><h2>Preferences</h2><p class="small-note">Choose a currency before your first transaction. To keep amounts accurate, it stays fixed once you have records.</p><label class="field">Currency<select id="currency" ${state.records.length ? 'disabled' : ''}><option value="USD" ${state.currency === 'USD' ? 'selected' : ''}>USD \u00b7 US dollar</option><option value="EUR" ${state.currency === 'EUR' ? 'selected' : ''}>EUR \u00b7 Euro</option><option value="GBP" ${state.currency === 'GBP' ? 'selected' : ''}>GBP \u00b7 Pound</option><option value="INR" ${state.currency === 'INR' ? 'selected' : ''}>INR \u00b7 Rupee</option></select></label><p class="small-note">The app follows your device's light or dark appearance.</p></section><section class="card"><h2>Data & Backup</h2><p class="subtle">All financial data stays in this browser. It does not sync automatically. Save backups before changing devices or clearing browser data.</p><div class="detail-line"><span>Last backup</span><strong>${esc(backupText)}</strong></div><div class="detail-line"><span>Changes since backup</span><strong>${state.changes}</strong></div>${state.changes >= 10 ? '<p class="pill">Time for a backup</p>' : ''}<div class="button-row"><button class="button" data-export="json">Back up JSON</button><button class="button secondary" data-export="csv">Back up CSV</button><button class="button secondary" id="import-button">Restore JSON or CSV</button><input id="import-file" type="file" accept=".json,.csv,application/json,text/csv" hidden></div><p class="small-note">JSON and CSV both save all records and the currency. Use either as a backup; CSV also opens in Numbers or Excel. Restore adds missing records without replacing existing ones.</p></section><section class="card"><h2>About</h2><p class="subtle">Private spending records that work offline after your first visit.</p><p class="small-note">Version 1.1 \u00b7 Developed by Mayank Nagda</p></section></div>`;
}
function render() {
  app.innerHTML = ({ home: renderHome, transactions: renderTransactions, insights: renderInsights, settings: renderSettings })[state.page]();
  document.querySelector('#add-button').hidden = !['home', 'transactions'].includes(state.page);
  document.querySelectorAll('.bottom-nav button').forEach(button => { button.classList.toggle('active', button.dataset.page === state.page); button.setAttribute('aria-current', button.dataset.page === state.page ? 'page' : 'false'); });
}
function setPage(page) { state.page = page; render(); app.focus(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
function fillLists() {
  const categoryValues = [...new Set([...DEFAULT_CATEGORIES, ...suggestions(state.records, 'category'), ...state.records.flatMap(tx => tx.items.map(item => item.category))])];
  for (const [id, values] of [['merchant-list', suggestions(state.records, 'merchant')], ['category-list', categoryValues], ['item-list', suggestions(state.records, 'item')], ['tag-list', suggestions(state.records, 'tag')]]) document.getElementById(id).innerHTML = values.map(value => `<option value="${esc(value)}"></option>`).join('');
}
function field(label, name, value = '', attrs = '', full = false) { return `<label class="field ${full ? 'full' : ''}">${label}<input name="${name}" value="${esc(value)}" ${attrs}></label>`; }
function itemTemplate(item = {}) { return `<div class="receipt-item"><div class="form-grid">${field('Item', 'item-name', item.name || '', 'required list="item-list" autocomplete="off"')}${field('Quantity', 'item-quantity', item.quantity || 1, 'type="number" min="1" max="9999" step="1" required')}${field('Unit price', 'item-price', item.unitPrice == null ? '' : (item.unitPrice / 100).toFixed(2), 'type="number" min="0" step="0.01" required')}${field('Category', 'item-category', item.category || 'Groceries', 'list="category-list"')}${field('Tags, comma separated', 'item-tags', (item.tags || []).join(', '), 'list="tag-list"', true)}</div><button type="button" class="link-button remove-item">Remove item</button></div>`; }
function openEditor(tx = null, mode = null) {
  fillLists(); state.editing = tx?.id || null;
  const type = mode || tx?.type || 'expense'; state.itemCount = tx?.items.length || 0;
  document.querySelector('#editor-content').innerHTML = `<div class="dialog-inner"><div class="dialog-head"><h2>${tx ? 'Edit transaction' : 'Add transaction'}</h2><button class="close" type="button" data-close="editor" aria-label="Close">\u00d7</button></div><div class="tabs" role="tablist" aria-label="Transaction type">${['expense', 'income', 'receipt'].map(value => `<button type="button" data-mode="${value}" class="${type === value ? 'active' : ''}" aria-selected="${type === value}">${value === 'receipt' ? 'Receipt' : value[0].toUpperCase() + value.slice(1)}</button>`).join('')}</div><form id="transaction-form" data-type="${type}"><div class="form-grid">${field('Amount', 'amount', tx ? (tx.amount / 100).toFixed(2) : '', 'type="number" inputmode="decimal" min="0.01" step="0.01" required autofocus')}${field('Date', 'date', tx?.date || today(), 'type="date" required')}${field(type === 'income' ? 'Source' : 'Merchant', 'merchant', tx?.merchant || '', 'required list="merchant-list" autocomplete="off"')}${field('Category', 'category', tx?.category || (type === 'receipt' ? 'Groceries' : ''), 'list="category-list"')}${field('Tags, comma separated', 'tags', tx?.tags.join(', ') || '', 'list="tag-list"', true)}<label class="field full">Notes<textarea name="notes" maxlength="160">${esc(tx?.notes || '')}</textarea></label></div>${type === 'receipt' ? `<div class="section-title" style="margin-top:23px"><h2>Items <span class="small-note">optional</span></h2><button type="button" class="link-button" id="add-item">+ Add item</button></div><div id="items">${(tx?.items || []).map(itemTemplate).join('')}</div><div id="receipt-summary" class="receipt-summary">Add items to compare with the receipt total, or save just the total.</div>` : ''}<p id="form-error" class="error" role="alert"></p><button class="button" type="submit">${tx ? 'Save changes' : 'Save transaction'}</button></form></div>`;
  editor.showModal(); document.querySelector('#transaction-form input[name="amount"]').focus(); updateReceiptSummary();
}
function collectItems(form) {
  return [...form.querySelectorAll('.receipt-item')].map(node => ({ name: node.querySelector('[name="item-name"]').value, quantity: Number(node.querySelector('[name="item-quantity"]').value), unitPrice: cents(node.querySelector('[name="item-price"]').value), category: node.querySelector('[name="item-category"]').value, tags: tagsFrom(node.querySelector('[name="item-tags"]').value) }));
}
function updateReceiptSummary() {
  const form = document.querySelector('#transaction-form'); if (!form || form.dataset.type !== 'receipt') return;
  const node = document.querySelector('#receipt-summary');
  try { const amount = cents(form.elements.amount.value || '0'); const items = collectItems(form); if (!items.length) { node.textContent = 'No items listed. The receipt total will be counted once.'; return; } const sum = itemTotal({ items }); const difference = amount - sum; node.textContent = `Items: ${fmt(sum)} \u00b7 Receipt: ${fmt(amount)} \u00b7 ${difference === 0 ? 'Totals match' : `Difference: ${fmt(difference)}`}. The receipt total is counted once.`; }
  catch { node.textContent = 'Enter valid item prices to compare totals.'; }
}
function openDetail(id) {
  const tx = state.records.find(record => record.id === id); if (!tx) return;
  const items = tx.items.map(item => `<div class="detail-line"><span>${esc(item.quantity)} \u00d7 ${esc(item.name)} <small>(${esc(item.category)})</small></span><strong>${esc(fmt(item.quantity * item.unitPrice))}</strong></div>`).join('');
  document.querySelector('#detail-content').innerHTML = `<div class="dialog-inner"><div class="dialog-head"><h2>${esc(tx.merchant)}</h2><button class="close" type="button" data-close="detail" aria-label="Close">\u00d7</button></div><div class="detail-line"><span>Type</span><strong>${esc(tx.type)}</strong></div><div class="detail-line"><span>Date</span><strong>${esc(fmtDate(tx.date))}</strong></div><div class="detail-line"><span>Total</span><strong>${esc(fmt(tx.amount))}</strong></div><div class="detail-line"><span>Category</span><strong>${esc(tx.category)}</strong></div>${tx.tags.length ? `<div class="detail-line"><span>Tags</span><strong>${esc(tx.tags.join(', '))}</strong></div>` : ''}${tx.notes ? `<p class="subtle">${esc(tx.notes)}</p>` : ''}${items ? `<h3>Items</h3>${items}<div class="detail-line"><span>Item total</span><strong>${esc(fmt(itemTotal(tx)))}</strong></div><div class="detail-line"><span>Difference</span><strong>${esc(fmt(receiptDifference(tx)))}</strong></div>` : ''}<div class="button-row"><button class="button" data-edit="${esc(tx.id)}">Edit</button><button class="button danger" data-delete="${esc(tx.id)}">Delete</button></div></div>`;
  detail.showModal();
}
async function doExport(format) {
  const name = `pocket-spend-${new Date().toISOString().replace(/[:.]/g, '-')}.${format}`;
  try {
    await saveFile(name, format === 'json' ? exportJSON(state.records, state.currency) : exportCSV(state.records, state.currency), format === 'json' ? 'application/json' : 'text/csv');
    state.lastBackup = new Date().toISOString(); state.changes = 0;
    await setMeta('lastBackup', state.lastBackup); await setMeta('changes', 0);
    render(); toast('Backup saved. Keep a copy somewhere safe.');
  }
  catch (error) { if (error.name !== 'AbortError') errorMessage(error); }
}
async function doImport(file) {
  try {
    const { records: incoming, currency } = parseBackup(await file.text(), file.name);
    if (currency && state.records.length && currency !== state.currency) throw new Error(`This backup uses ${currency}, but this app uses ${state.currency}. Import stopped to avoid mixing currencies.`);
    const existing = new Map(state.records.map(tx => [tx.id, tx]));
    const comparable = tx => JSON.stringify([tx.type, tx.amount, tx.merchant, tx.date, tx.category, tx.notes, tx.tags, tx.items]);
    const conflicts = incoming.filter(tx => existing.has(tx.id) && comparable(existing.get(tx.id)) !== comparable(tx));
    if (conflicts.length) throw new Error(`${conflicts.length} record IDs already exist with different details. Import stopped to protect your data.`);
    const missing = incoming.filter(tx => !existing.has(tx.id));
    if (!missing.length) { if (currency && !state.records.length) { await setMeta('currency', currency); state.currency = currency; render(); } toast('No new transactions to import.'); return; }
    if (!confirm(`Import ${missing.length} new transactions? Existing transactions will remain untouched.`)) return;
    const result = await importTransactions(missing, currency && !state.records.length ? currency : null);
    if (currency && !state.records.length) state.currency = currency;
    state.changes += result.added; await setMeta('changes', state.changes); await load(); toast(`Imported ${result.added} transactions.`);
  } catch (error) { errorMessage(error); }
}

document.addEventListener('click', async event => {
  const target = event.target.closest('button'); if (!target) return;
  if (target.dataset.page) setPage(target.dataset.page);
  else if (target.dataset.go) setPage(target.dataset.go);
  else if (target.id === 'add-button') openEditor();
  else if (target.dataset.view) openDetail(target.dataset.view);
  else if (target.dataset.close) document.getElementById(target.dataset.close).close();
  else if (target.dataset.mode) { const original = state.editing ? state.records.find(tx => tx.id === state.editing) : null; editor.close(); openEditor(original, target.dataset.mode); }
  else if (target.id === 'add-item') { document.querySelector('#items').insertAdjacentHTML('beforeend', itemTemplate()); updateReceiptSummary(); }
  else if (target.classList.contains('remove-item')) { target.closest('.receipt-item').remove(); updateReceiptSummary(); }
  else if (target.dataset.tagOption) { const input = target.closest('.field').querySelector('input'); const parts = input.value.split(','); parts[parts.length - 1] = target.dataset.tagOption; input.value = `${parts.map(part => part.trim()).filter(Boolean).join(', ')}, `; target.parentElement.remove(); input.focus(); }
  else if (target.dataset.edit) { const tx = state.records.find(record => record.id === target.dataset.edit); detail.close(); openEditor(tx); }
  else if (target.dataset.delete) { if (!confirm('Delete this transaction? This cannot be undone.')) return; try { await deleteTransaction(target.dataset.delete); detail.close(); await changeMade(); toast('Transaction deleted.'); } catch (error) { errorMessage(error); } }
  else if (target.dataset.export) doExport(target.dataset.export);
  else if (target.id === 'import-button') document.querySelector('#import-file').click();
});
document.addEventListener('submit', async event => {
  if (event.target.id !== 'transaction-form') return;
  event.preventDefault(); const form = event.target; const type = form.dataset.type;
  try {
    const existing = state.editing ? state.records.find(tx => tx.id === state.editing) : null;
    const tx = validateTransaction({ id: existing?.id || newId(), createdAt: existing?.createdAt, type, amount: cents(form.elements.amount.value), date: form.elements.date.value, merchant: form.elements.merchant.value, category: form.elements.category.value, tags: tagsFrom(form.elements.tags.value), notes: form.elements.notes.value, items: type === 'receipt' ? collectItems(form) : [] });
    await putTransaction(tx); editor.close(); await changeMade(); toast(existing ? 'Transaction updated.' : 'Transaction saved.');
  } catch (error) { document.querySelector('#form-error').textContent = error.message || 'Could not save this transaction.'; }
});
document.addEventListener('input', event => {
  if (event.target.closest('#transaction-form')) {
    if (event.target.name === 'item-name') { const latest = sorted().flatMap(tx => tx.items).find(item => item.name.toLowerCase() === event.target.value.trim().toLowerCase()); if (latest) { const node = event.target.closest('.receipt-item'); node.querySelector('[name="item-price"]').value = (latest.unitPrice / 100).toFixed(2); node.querySelector('[name="item-category"]').value = latest.category; node.querySelector('[name="item-tags"]').value = latest.tags.join(', '); } }
    if (event.target.name === 'tags' || event.target.name === 'item-tags') {
      const input = event.target, label = input.closest('.field'); label.querySelector('.tag-suggestions')?.remove();
      const parts = input.value.split(','); const token = parts.at(-1).trim().toLowerCase();
      const used = new Set(parts.slice(0, -1).map(part => part.trim().toLowerCase()));
      const matches = token ? suggestions(state.records, 'tag').filter(tag => tag.toLowerCase().startsWith(token) && !used.has(tag.toLowerCase())).slice(0, 5) : [];
      if (matches.length) label.insertAdjacentHTML('beforeend', `<div class="tag-suggestions" aria-label="Tag suggestions">${matches.map(tag => `<button type="button" data-tag-option="${esc(tag)}">${esc(tag)}</button>`).join('')}</div>`);
    }
    updateReceiptSummary();
  }
  if (event.target.dataset.filter) { state.filter[event.target.dataset.filter] = event.target.value; if (event.target.dataset.filter === 'search') { const input = event.target, pos = input.selectionStart; render(); const replacement = document.querySelector('[data-filter="search"]'); replacement.focus(); replacement.setSelectionRange(pos, pos); } else render(); }
});
document.addEventListener('change', async event => {
  if (event.target.id === 'currency') { state.currency = event.target.value; await setMeta('currency', state.currency); render(); }
  if (event.target.id === 'import-file' && event.target.files[0]) { await doImport(event.target.files[0]); event.target.value = ''; }
});
for (const dialog of [editor, detail]) dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });

async function start() {
  try {
    state.currency = (await getMeta('currency'))?.value || 'USD'; state.changes = (await getMeta('changes'))?.value || 0; state.lastBackup = (await getMeta('lastBackup'))?.value || null;
    await load();
    if (navigator.storage?.persist) navigator.storage.persist().catch(() => {});
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(errorMessage);
  } catch (error) { app.innerHTML = `<section class="card"><h1>Storage is unavailable</h1><p class="subtle">Pocket Spend needs browser storage to keep your records. Check private browsing or storage settings, then reload.</p><p class="error">${esc(error.message)}</p></section>`; document.querySelector('#add-button').disabled = true; }
}
start();
