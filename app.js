const rawAgencies = Array.isArray(window.FL_AGENCIES) ? window.FL_AGENCIES : [];
const agencies = Array.from(
  new Map(
    rawAgencies.map(agency => [
      `${String(agency.agency).toLowerCase()}|${String(agency.phone).replace(/\D/g, '')}`,
      agency
    ])
  ).values()
);

const form = document.getElementById('searchForm');
const input = document.getElementById('searchInput');
const results = document.getElementById('results');
const resultsTitle = document.getElementById('resultsTitle');
const resultCount = document.getElementById('resultCount');
const browseAll = document.getElementById('browseAll');
const directoryCount = document.getElementById('directoryCount');
const countyCoverage = document.getElementById('countyCoverage');
const countyFilter = document.getElementById('countyFilter');
const typeFilter = document.getElementById('typeFilter');
const applyFilters = document.getElementById('applyFilters');
const clearFilters = document.getElementById('clearFilters');

const ZIP_JURISDICTION_OVERRIDES = {
  '32259': {
    agencyNames: ["St. Johns County Sheriff's Office", "Jacksonville Sheriff's Office"],
    title: 'ZIP 32259 crosses county jurisdictions',
    note: 'Most 32259 addresses are in St. Johns County, but a small portion reaches Duval County. Use the agency for the county where the incident or property is physically located—not the mailing city shown for the ZIP.'
  }
};

const normalize = (value = '') => value
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9\s-]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const compactPhone = phone => phone.replace(/\D/g, '');
const escapeHtml = value => String(value).replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));

if (directoryCount) directoryCount.textContent = `${agencies.length} verified listings`;

const countyLawEnforcement = new Set(
  agencies
    .filter(agency => normalize(agency.type).includes('sheriff'))
    .map(agency => normalize(agency.county))
    .filter(Boolean)
);
if (countyCoverage) countyCoverage.textContent = `${countyLawEnforcement.size}/67 county jurisdictions`;

const counties = [...new Set(agencies.map(a => a.county).filter(Boolean))].sort((a, b) => a.localeCompare(b));
const agencyTypes = [...new Set(agencies.map(a => a.type).filter(Boolean))].sort((a, b) => a.localeCompare(b));

if (countyFilter) {
  counties.forEach(county => {
    const option = document.createElement('option');
    option.value = county;
    option.textContent = `${county} County`;
    countyFilter.appendChild(option);
  });
}
if (typeFilter) {
  agencyTypes.forEach(type => {
    const option = document.createElement('option');
    option.value = type;
    option.textContent = type;
    typeFilter.appendChild(option);
  });
}

function searchableText(agency) {
  return normalize([
    agency.agency,
    agency.type,
    agency.city,
    agency.county,
    `${agency.county} county`,
    ...(agency.areas || []),
    ...(agency.zips || [])
  ].join(' '));
}

function scoreAgency(agency, rawQuery) {
  const q = normalize(rawQuery);
  if (!q) return 0;
  const full = searchableText(agency);
  const fields = [agency.agency, agency.city, agency.county, ...(agency.areas || []), ...(agency.zips || [])].map(normalize);
  let score = 0;
  if (fields.includes(q)) score += 120;
  if ((agency.zips || []).includes(rawQuery.trim())) score += 150;
  if (normalize(agency.agency).startsWith(q)) score += 75;
  if (normalize(agency.city) === q) score += 90;
  if (normalize(agency.county) === q || normalize(`${agency.county} county`) === q) score += 85;
  if (full.includes(q)) score += 45;
  for (const token of q.split(' ').filter(Boolean)) if (full.includes(token)) score += 10;
  return score;
}

function findMatches(query) {
  return agencies
    .map(agency => ({ agency, score: scoreAgency(agency, query) }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score || a.agency.agency.localeCompare(b.agency.agency))
    .map(item => item.agency);
}

function resultCard(agency) {
  const areas = (agency.areas || []).slice(0, 7).join(' • ');
  return `
    <article class="result-card">
      <div class="result-top">
        <div>
          <div class="agency-type">${escapeHtml(agency.type)}</div>
          <h3>${escapeHtml(agency.agency)}</h3>
          <div class="location">${escapeHtml(agency.city)}, ${escapeHtml(agency.county)} County, Florida</div>
        </div>
        <span class="verified">✓ Official source</span>
      </div>
      <div class="phone-block">
        <div>
          <span class="phone-label">${escapeHtml(agency.phoneLabel || 'Non-Emergency')}</span>
          <a class="phone-number" href="tel:${compactPhone(agency.phone)}">${escapeHtml(agency.phone)}</a>
        </div>
        <a class="call-button" href="tel:${compactPhone(agency.phone)}" aria-label="Call ${escapeHtml(agency.agency)} at ${escapeHtml(agency.phone)}">Call now</a>
      </div>
      <div class="meta-row">
        ${areas ? `<span>Serves / matches: ${escapeHtml(areas)}</span>` : ''}
        <span>Checked: ${escapeHtml(agency.verified)}</span>
        <a href="${escapeHtml(agency.source)}" target="_blank" rel="noopener noreferrer">Official agency source ↗</a>
      </div>
    </article>`;
}

function ensureSearchOverlay() {
  let overlay = document.getElementById('searchResultOverlay');
  if (overlay) return overlay;
  overlay = document.createElement('div');
  overlay.id = 'searchResultOverlay';
  overlay.className = 'search-result-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-hidden', 'true');
  overlay.innerHTML = `
    <div class="search-result-shell">
      <div class="search-result-header">
        <div>
          <div class="section-kicker">SEARCH RESULT</div>
          <h2 id="searchOverlayTitle">Result</h2>
        </div>
        <button type="button" class="overlay-close" id="closeSearchOverlay" aria-label="Close search result">×</button>
      </div>
      <div id="searchOverlayNote" class="jurisdiction-note" hidden></div>
      <div id="searchOverlayCards" class="search-overlay-cards"></div>
      <button type="button" class="new-search-button" id="newSearchButton">Search another location</button>
    </div>`;
  document.body.appendChild(overlay);

  const close = () => closeSearchOverlay();
  overlay.addEventListener('click', event => { if (event.target === overlay) close(); });
  overlay.querySelector('#closeSearchOverlay').addEventListener('click', close);
  overlay.querySelector('#newSearchButton').addEventListener('click', () => {
    close();
    input.value = '';
    input.focus();
  });
  return overlay;
}

function showSearchOverlay(matches, label, note = '') {
  const overlay = ensureSearchOverlay();
  const title = overlay.querySelector('#searchOverlayTitle');
  const noteEl = overlay.querySelector('#searchOverlayNote');
  const cards = overlay.querySelector('#searchOverlayCards');
  title.textContent = label;
  noteEl.hidden = !note;
  noteEl.textContent = note;
  cards.innerHTML = matches.map(resultCard).join('');
  overlay.classList.add('is-open');
  overlay.setAttribute('aria-hidden', 'false');
  document.body.classList.add('search-overlay-open');
  overlay.querySelector('.call-button, .overlay-close')?.focus({ preventScroll: true });
}

function closeSearchOverlay() {
  const overlay = document.getElementById('searchResultOverlay');
  if (!overlay) return;
  overlay.classList.remove('is-open');
  overlay.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('search-overlay-open');
}

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') closeSearchOverlay();
});

function showMatches(matches, label, scroll = true) {
  resultsTitle.textContent = label;
  resultCount.textContent = `${matches.length} ${matches.length === 1 ? 'listing' : 'listings'}`;
  results.innerHTML = matches.length ? matches.map(resultCard).join('') : `
    <div class="empty-state"><div class="empty-icon">⌕</div><h3>No listings match those filters.</h3><p>Try another county or agency type.</p></div>`;
  if (scroll) results.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function sortedDirectory(list = agencies) {
  return [...list].sort((a, b) => a.county.localeCompare(b.county) || a.agency.localeCompare(b.agency));
}

function showDirectory() {
  closeSearchOverlay();
  if (countyFilter) countyFilter.value = '';
  if (typeFilter) typeFilter.value = '';
  input.value = '';
  history.replaceState(null, '', window.location.pathname);
  showMatches(sortedDirectory(), 'All verified Florida agencies');
}

function showFilteredDirectory() {
  closeSearchOverlay();
  const county = countyFilter?.value || '';
  const type = typeFilter?.value || '';
  const filtered = agencies.filter(agency => (!county || agency.county === county) && (!type || agency.type === type));
  const labels = [county ? `${county} County` : '', type].filter(Boolean);
  showMatches(sortedDirectory(filtered), labels.length ? labels.join(' • ') : 'All verified Florida agencies');
}

function noMatch(query, resolvedPlace = '') {
  const location = resolvedPlace || query;
  const googleQuery = encodeURIComponent(`${location} Florida police sheriff non-emergency official site`);
  const overlay = ensureSearchOverlay();
  overlay.querySelector('#searchOverlayTitle').textContent = `No verified match for “${location}”`;
  const noteEl = overlay.querySelector('#searchOverlayNote');
  noteEl.hidden = true;
  overlay.querySelector('#searchOverlayCards').innerHTML = `
    <div class="empty-state">
      <div class="empty-icon" aria-hidden="true">!</div>
      <h3>This area has not been independently verified yet.</h3>
      <p>This directory only publishes numbers confirmed on an official law-enforcement agency or government website.</p>
      <div class="fallback-actions"><a class="fallback-button" href="https://www.google.com/search?q=${googleQuery}" target="_blank" rel="noopener noreferrer">Search official agency sites</a></div>
    </div>`;
  overlay.classList.add('is-open');
  overlay.setAttribute('aria-hidden', 'false');
  document.body.classList.add('search-overlay-open');
}

async function resolveZip(zip) {
  try {
    const response = await fetch(`https://api.zippopotam.us/us/${zip}`, { headers: { Accept: 'application/json' } });
    if (!response.ok) return null;
    const data = await response.json();
    const place = data.places?.[0];
    if (!place || place['state abbreviation'] !== 'FL') return null;
    return place['place name'];
  } catch { return null; }
}

function agenciesForOverride(override) {
  return override.agencyNames
    .map(name => agencies.find(agency => agency.agency === name))
    .filter(Boolean);
}

async function runSearch(rawQuery) {
  const query = rawQuery.trim();
  if (!query) return input.focus();

  const url = new URL(window.location.href);
  url.searchParams.set('q', query);
  history.replaceState(null, '', `${url.pathname}?${url.searchParams.toString()}`);

  if (/^\d{5}$/.test(query) && ZIP_JURISDICTION_OVERRIDES[query]) {
    const override = ZIP_JURISDICTION_OVERRIDES[query];
    const overrideAgencies = agenciesForOverride(override);
    if (overrideAgencies.length) {
      showSearchOverlay(overrideAgencies, override.title, override.note);
      return;
    }
  }

  let matches = findMatches(query);
  if (matches.length) {
    showSearchOverlay([matches[0]], `Best match for “${query}”`);
    return;
  }

  if (/^\d{5}$/.test(query)) {
    const place = await resolveZip(query);
    if (place) {
      matches = findMatches(place);
      if (matches.length) {
        showSearchOverlay([matches[0]], `${place}, FL • ZIP ${query}`);
        return;
      }
      noMatch(query, `${place} (${query})`);
      return;
    }
  }

  noMatch(query);
}

form.addEventListener('submit', event => { event.preventDefault(); runSearch(input.value); });
document.querySelectorAll('[data-query]').forEach(button => button.addEventListener('click', () => { input.value = button.dataset.query; runSearch(button.dataset.query); }));
if (browseAll) browseAll.addEventListener('click', showDirectory);
if (applyFilters) applyFilters.addEventListener('click', showFilteredDirectory);
if (clearFilters) clearFilters.addEventListener('click', () => { if (countyFilter) countyFilter.value = ''; if (typeFilter) typeFilter.value = ''; showDirectory(); });

const params = new URLSearchParams(window.location.search);
const initialQuery = params.get('q');
if (initialQuery) { input.value = initialQuery; runSearch(initialQuery); }
