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
    .slice(0, 14)
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
  if (countyFilter) countyFilter.value = '';
  if (typeFilter) typeFilter.value = '';
  input.value = '';
  history.replaceState(null, '', window.location.pathname);
  showMatches(sortedDirectory(), 'All verified Florida agencies');
}

function showFilteredDirectory() {
  const county = countyFilter?.value || '';
  const type = typeFilter?.value || '';
  const filtered = agencies.filter(agency => (!county || agency.county === county) && (!type || agency.type === type));
  const labels = [county ? `${county} County` : '', type].filter(Boolean);
  showMatches(sortedDirectory(filtered), labels.length ? labels.join(' • ') : 'All verified Florida agencies');
}

function noMatch(query, resolvedPlace = '') {
  const location = resolvedPlace || query;
  const googleQuery = encodeURIComponent(`${location} Florida police sheriff non-emergency official site`);
  resultsTitle.textContent = `No verified match yet for “${location}”`;
  resultCount.textContent = '';
  results.innerHTML = `
    <div class="empty-state">
      <div class="empty-icon" aria-hidden="true">!</div>
      <h3>This area has not been independently verified yet.</h3>
      <p>This directory only publishes numbers confirmed on an official law-enforcement agency or government website. Rather than guess or rely on a third-party directory, the finder stops here.</p>
      <div class="fallback-actions"><a class="fallback-button" href="https://www.google.com/search?q=${googleQuery}" target="_blank" rel="noopener noreferrer">Search official agency sites</a></div>
    </div>`;
  results.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

async function runSearch(rawQuery) {
  const query = rawQuery.trim();
  if (!query) return input.focus();
  const url = new URL(window.location.href);
  url.searchParams.set('q', query);
  history.replaceState(null, '', `${url.pathname}?${url.searchParams.toString()}`);
  let matches = findMatches(query);
  if (matches.length) return showMatches(matches, `Results for “${query}”`);
  if (/^\d{5}$/.test(query)) {
    resultsTitle.textContent = `Checking ZIP ${query}…`;
    resultCount.textContent = '';
    const place = await resolveZip(query);
    if (place) {
      matches = findMatches(place);
      if (matches.length) return showMatches(matches, `${place}, FL • ZIP ${query}`);
      return noMatch(query, `${place} (${query})`);
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
