const agencies = Array.isArray(window.FL_AGENCIES) ? window.FL_AGENCIES : [];
const form = document.getElementById('searchForm');
const input = document.getElementById('searchInput');
const results = document.getElementById('results');
const resultsTitle = document.getElementById('resultsTitle');
const resultCount = document.getElementById('resultCount');

const normalize = (value = '') => value
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9\s-]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const compactPhone = phone => phone.replace(/\D/g, '');
const escapeHtml = value => String(value).replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));

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

  for (const token of q.split(' ').filter(Boolean)) {
    if (full.includes(token)) score += 10;
  }

  return score;
}

function findMatches(query) {
  return agencies
    .map(agency => ({ agency, score: scoreAgency(agency, query) }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score || a.agency.agency.localeCompare(b.agency.agency))
    .slice(0, 8)
    .map(item => item.agency);
}

function resultCard(agency) {
  const areas = (agency.areas || []).slice(0, 5).join(' • ');
  return `
    <article class="result-card">
      <div class="result-top">
        <div>
          <div class="agency-type">${escapeHtml(agency.type)}</div>
          <h3>${escapeHtml(agency.agency)}</h3>
          <div class="location">${escapeHtml(agency.city)}, ${escapeHtml(agency.county)} County, Florida</div>
        </div>
        <span class="verified">✓ Verified source</span>
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
        <a href="${escapeHtml(agency.source)}" target="_blank" rel="noopener noreferrer">Official source ↗</a>
      </div>
    </article>`;
}

function showMatches(matches, label) {
  resultsTitle.textContent = label;
  resultCount.textContent = `${matches.length} ${matches.length === 1 ? 'match' : 'matches'}`;
  results.innerHTML = matches.map(resultCard).join('');
  results.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function noMatch(query, resolvedPlace = '') {
  const location = resolvedPlace || query;
  const googleQuery = encodeURIComponent(`${location} Florida law enforcement non-emergency number official`);
  const fdle = 'https://www.fdle.state.fl.us/cjstc/publications/criminal-justice-agency-links';
  resultsTitle.textContent = `No verified match yet for “${location}”`;
  resultCount.textContent = '';
  results.innerHTML = `
    <div class="empty-state">
      <div class="empty-icon" aria-hidden="true">!</div>
      <h3>This area has not been added to the curated directory yet.</h3>
      <p>Rather than guess, the finder stops here. You can check the FDLE agency directory or search for the area's official law-enforcement non-emergency page.</p>
      <div class="fallback-actions">
        <a class="fallback-button" href="${fdle}" target="_blank" rel="noopener noreferrer">Open FDLE directory</a>
        <a class="fallback-button secondary" href="https://www.google.com/search?q=${googleQuery}" target="_blank" rel="noopener noreferrer">Search official results</a>
      </div>
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
  } catch {
    return null;
  }
}

async function runSearch(rawQuery) {
  const query = rawQuery.trim();
  if (!query) {
    input.focus();
    return;
  }

  let matches = findMatches(query);
  if (matches.length) {
    showMatches(matches, `Results for “${query}”`);
    return;
  }

  if (/^\d{5}$/.test(query)) {
    resultsTitle.textContent = `Checking ZIP ${query}…`;
    resultCount.textContent = '';
    const place = await resolveZip(query);
    if (place) {
      matches = findMatches(place);
      if (matches.length) {
        showMatches(matches, `${place}, FL • ZIP ${query}`);
        return;
      }
      noMatch(query, `${place} (${query})`);
      return;
    }
  }

  noMatch(query);
}

form.addEventListener('submit', event => {
  event.preventDefault();
  runSearch(input.value);
});

document.querySelectorAll('[data-query]').forEach(button => {
  button.addEventListener('click', () => {
    input.value = button.dataset.query;
    runSearch(button.dataset.query);
  });
});

const params = new URLSearchParams(window.location.search);
const initialQuery = params.get('q');
if (initialQuery) {
  input.value = initialQuery;
  runSearch(initialQuery);
}
