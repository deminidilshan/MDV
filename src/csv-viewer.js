// csv-viewer.js — Excel-like CSV viewer with sorting & searching
import Papa from 'papaparse';

let containerEl = null;
let currentData = null;
let filteredData = null;
let sortCol = -1;
let sortAsc = true;
let searchTerm = '';

export function initCsvViewer(container) {
  containerEl = container;
}

export function openCsv(csvText, filename) {
  const result = Papa.parse(csvText, { header: true, skipEmptyLines: true, dynamicTyping: true });
  currentData = result;
  filteredData = [...result.data];
  sortCol = -1;
  searchTerm = '';
  renderCsv(filename);
  containerEl.classList.add('active');
}

export function closeCsv() {
  if (containerEl) containerEl.classList.remove('active');
  currentData = null;
  filteredData = null;
}

export function isCsvOpen() {
  return containerEl?.classList.contains('active');
}

function renderCsv(filename) {
  if (!containerEl || !currentData) return;
  const headers = currentData.meta.fields || [];
  const data = filteredData || currentData.data;

  containerEl.innerHTML = `
    <div class="csv-header">
      <div class="csv-title">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        <span>${filename || 'CSV Viewer'}</span>
        <span class="csv-count">${data.length} rows × ${headers.length} cols</span>
      </div>
      <div class="csv-actions">
        <div class="csv-search-wrap">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" id="csv-search" class="csv-search" placeholder="Search..." value="${searchTerm}" />
        </div>
        <button class="csv-close-btn" id="csv-close-btn" title="Close CSV">✕</button>
      </div>
    </div>
    <div class="csv-table-wrap">
      <table class="csv-table">
        <thead>
          <tr>
            <th class="csv-row-num">#</th>
            ${headers.map((h, i) => `
              <th class="csv-sortable ${sortCol === i ? (sortAsc ? 'sort-asc' : 'sort-desc') : ''}" data-col="${i}">
                ${escapeHtml(h)}
                <span class="csv-sort-icon">${sortCol === i ? (sortAsc ? '↑' : '↓') : '↕'}</span>
              </th>
            `).join('')}
          </tr>
        </thead>
        <tbody>
          ${data.map((row, ri) => `
            <tr>
              <td class="csv-row-num">${ri + 1}</td>
              ${headers.map(h => `<td>${formatCell(row[h])}</td>`).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  // Bind events
  containerEl.querySelector('#csv-search')?.addEventListener('input', (e) => {
    searchTerm = e.target.value;
    applyFilter(filename);
  });

  containerEl.querySelector('#csv-close-btn')?.addEventListener('click', closeCsv);

  containerEl.querySelectorAll('.csv-sortable').forEach(th => {
    th.addEventListener('click', () => {
      const col = parseInt(th.dataset.col);
      if (sortCol === col) { sortAsc = !sortAsc; }
      else { sortCol = col; sortAsc = true; }
      applySort();
      renderCsv(filename);
    });
  });
}

function applyFilter(filename) {
  if (!currentData) return;
  const headers = currentData.meta.fields || [];
  const term = searchTerm.toLowerCase();

  if (!term) {
    filteredData = [...currentData.data];
  } else {
    filteredData = currentData.data.filter(row =>
      headers.some(h => String(row[h] ?? '').toLowerCase().includes(term))
    );
  }
  applySort();
  renderCsv(filename);
}

function applySort() {
  if (sortCol < 0 || !currentData) return;
  const headers = currentData.meta.fields || [];
  const key = headers[sortCol];

  filteredData.sort((a, b) => {
    let va = a[key], vb = b[key];
    if (va == null) va = '';
    if (vb == null) vb = '';
    if (typeof va === 'number' && typeof vb === 'number') {
      return sortAsc ? va - vb : vb - va;
    }
    const sa = String(va).toLowerCase(), sb = String(vb).toLowerCase();
    return sortAsc ? sa.localeCompare(sb) : sb.localeCompare(sa);
  });
}

function formatCell(val) {
  if (val === null || val === undefined) return '<span class="csv-null">—</span>';
  if (typeof val === 'number') return `<span class="csv-num">${val.toLocaleString()}</span>`;
  if (typeof val === 'boolean') return `<span class="csv-bool">${val}</span>`;
  const str = String(val);
  if (str.match(/^https?:\/\//)) return `<a href="${escapeHtml(str)}" class="csv-link" target="_blank">${escapeHtml(str.slice(0, 40))}${str.length > 40 ? '…' : ''}</a>`;
  return escapeHtml(str);
}

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
