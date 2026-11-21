const API = '/api';
const grid = document.getElementById('download-grid');
const searchInput = document.getElementById('search-input');
const sortSelect = document.getElementById('sort-select');
const resultCount = document.getElementById('results-count');
const pagination = document.getElementById('pagination');
const toast = document.getElementById('toast');

const state = { category: 'All', search: '', page: 1, pages: 1, items: [], total: 0 };
let searchTimer;
let toastTimer;

const categorySymbols = {
  Apps: '▦', Games: '⌁', Documents: '▤', Tools: '⌘', Music: '♫', Videos: '▶', Other: '◈'
};

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

function formatSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) { value /= 1024; unit += 1; }
  return `${value.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return 'Recently added';
  return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
}

function setActiveCategory(category) {
  state.category = category;
  state.page = 1;
  document.querySelectorAll('[data-category]').forEach((button) => {
    button.classList.toggle(button.classList.contains('filter-pill') ? 'active' : 'selected', button.dataset.category === category);
  });
  loadDownloads();
}

function cardTemplate(item) {
  const symbol = categorySymbols[item.category] || '◈';
  const safeTitle = escapeHtml(item.title);
  const safeCategory = escapeHtml(item.category);
  const cover = item.coverUrl
    ? `<img src="${escapeHtml(item.coverUrl)}" alt="" style="width:100%;height:100%;object-fit:cover;position:absolute;inset:0" loading="lazy" onerror="this.remove()">`
    : '';
  return `
    <article class="download-card">
      <div class="card-cover">
        ${cover}
        <span class="cover-label">${safeCategory.toUpperCase()}</span>
        ${item.featured ? '<span class="featured-label">★ FEATURED</span>' : ''}
        <span class="cover-art" aria-hidden="true">${symbol}</span>
      </div>
      <div class="card-body">
        <div class="card-meta"><span>${safeCategory}</span><i class="meta-dot"></i><span>${escapeHtml(item.fileExtension || 'FILE')}</span><i class="meta-dot"></i><span>${escapeHtml(formatDate(item.createdAt))}</span></div>
        <h3>${safeTitle}</h3>
        <p class="card-description">${escapeHtml(item.description || 'A useful file from the CAT CPN Downloads library.')}</p>
        <div class="card-bottom">
          <div class="file-info"><strong>${escapeHtml(formatSize(item.size))} · v${escapeHtml(item.version || '1.0')}</strong><span>↓ ${Number(item.downloads || 0).toLocaleString()} downloads</span></div>
          <button class="download-button" data-download="${escapeHtml(item.id)}" aria-label="Download ${safeTitle}">Download <span>↓</span></button>
        </div>
      </div>
    </article>`;
}

function renderItems(items) {
  if (!items.length) {
    grid.innerHTML = `<div class="empty-state"><span class="empty-icon">⌕</span><h3>No downloads found</h3><p>Try another search or choose a different category.</p></div>`;
    return;
  }
  grid.innerHTML = items.map(cardTemplate).join('');
}

function renderPagination() {
  if (state.pages <= 1) { pagination.innerHTML = ''; return; }
  const buttons = [];
  buttons.push(`<button class="page-button" data-page="${state.page - 1}" ${state.page === 1 ? 'disabled' : ''}>←</button>`);
  for (let page = 1; page <= state.pages; page += 1) {
    if (page === 1 || page === state.pages || Math.abs(page - state.page) <= 1) {
      buttons.push(`<button class="page-button ${page === state.page ? 'active' : ''}" data-page="${page}">${page}</button>`);
    } else if (Math.abs(page - state.page) === 2) buttons.push('<span class="page-button" style="border:0;background:none;cursor:default">…</span>');
  }
  buttons.push(`<button class="page-button" data-page="${state.page + 1}" ${state.page === state.pages ? 'disabled' : ''}>→</button>`);
  pagination.innerHTML = buttons.join('');
}

async function loadDownloads() {
  grid.innerHTML = '<div class="loading-card"><span class="loader"></span><p>Finding your downloads…</p></div>';
  const params = new URLSearchParams({ page: String(state.page), limit: '12' });
  if (state.category !== 'All') params.set('category', state.category);
  if (state.search) params.set('search', state.search);
  try {
    const response = await fetch(`${API}/downloads?${params.toString()}`);
    if (!response.ok) throw new Error('Could not load the library.');
    const data = await response.json();
    state.items = data.items || [];
    state.total = data.total || 0;
    state.pages = Math.max(1, data.pages || 1);
    if (sortSelect.value === 'popular') state.items.sort((a, b) => b.downloads - a.downloads);
    renderItems(state.items);
    renderPagination();
    resultCount.textContent = `${state.total} ${state.total === 1 ? 'item' : 'items'} found`;
  } catch (error) {
    grid.innerHTML = `<div class="error-state"><h3>We couldn't reach the library.</h3><p>${escapeHtml(error.message)} Check the server and MongoDB connection, then refresh.</p></div>`;
    resultCount.textContent = 'Library unavailable';
    pagination.innerHTML = '';
  }
}

document.querySelectorAll('[data-category]').forEach((button) => {
  button.addEventListener('click', () => setActiveCategory(button.dataset.category));
});

searchInput.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    state.search = searchInput.value.trim();
    state.page = 1;
    loadDownloads();
  }, 260);
});

sortSelect.addEventListener('change', () => {
  if (sortSelect.value === 'popular') state.items.sort((a, b) => b.downloads - a.downloads);
  else state.items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  renderItems(state.items);
});

grid.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-download]');
  if (!button) return;
  const id = button.dataset.download;
  button.disabled = true;
  button.innerHTML = 'Starting… <span>↗</span>';
  // Navigate directly so the browser handles the file download natively.
  window.location.href = `${API}/downloads/${encodeURIComponent(id)}/file`;
  window.setTimeout(() => {
    button.disabled = false;
    button.innerHTML = 'Download <span>↓</span>';
  }, 2500);
});

pagination.addEventListener('click', (event) => {
  const button = event.target.closest('[data-page]');
  if (!button || button.disabled) return;
  state.page = Number(button.dataset.page);
  loadDownloads();
  document.getElementById('library').scrollIntoView({ behavior: 'smooth', block: 'start' });
});

document.getElementById('year').textContent = new Date().getFullYear();
loadDownloads();
