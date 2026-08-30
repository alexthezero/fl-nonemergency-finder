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
const intro = document.getElementById('finderIntro');
const resultState = document.getElementById('resultState');
const resultTitle = document.getElementById('resultTitle');
const resultNotice = document.getElementById('resultNotice');
const resultCards = document.getElementById('resultCards');
const backToSearch = document.getElementById('backToSearch');
const supportSection = document.getElementById('supportSection');
const directoryCount = document.getElementById('directoryCount');
const countyCoverage = document.getElementById('countyCoverage');

const ZIP_JURISDICTION_OVERRIDES = {
  '32259': {
    agencyNames: ["St. Johns County Sheriff's Office", "Jacksonville Sheriff's Office"],
    title: 'More than one agency may serve ZIP 32259',
    note: 'Most 32259 addresses are in St. Johns County, while a smaller portion is in Duval County. Choose the agency for the physical county where the incident or property is located—not only the ZIP mailing city.'
  }
};

const normalize = (value = '') => value
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9\s-]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const compactPhone = phone => String(phone || '').replace(/\D/g, '');
const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({
  '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'
}[char]));

if (directoryCount) directoryCount.textContent = agencies.length;

const countyLawEnforcement = new Set(
  agencies
    .filter(agency => normalize(agency.type).includes('sheriff'))
    .map(agency => normalize(agency.county))
    .filter(Boolean)
);
if (countyCoverage) countyCoverage.textContent = `${countyLawEnforcement.size}/67`;

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

  const agencyName = normalize(agency.agency);
  const city = normalize(agency.city);
  const county = normalize(agency.county);
  const areas = (agency.areas || []).map(normalize);
  const zips = agency.zips || [];
  const full = searchableText(agency);
  const type = normalize(agency.type);
  let score = 0;

  if (agencyName === q) score += 400;
  else if (agencyName.startsWith(q)) score += 180;
  else if (agencyName.includes(q)) score += 90;

  if (/^\d{5}$/.test(rawQuery.trim()) && zips.includes(rawQuery.trim())) score += 340;
  if (areas.includes(q)) score += 230;
  if (city === q) score += 180;
  if (county === q || normalize(`${agency.county} county`) === q) score += 190;

  if (city === q && type.includes('police department')) score += 90;
  if (areas.includes(q) && type.includes('police department')) score += 45;
  if (county === q && type.includes('sheriff')) score += 70;

  if (full.includes(q)) score += 35;
  for (const token of q.split(' ').filter(Boolean)) {
    if (full.includes(token)) score += 8;
  }

  return score;
}

function findMatches(query) {
  return agencies
    .map(agency => ({ agency, score: scoreAgency(agency, query) }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score || a.agency.agency.localeCompare(b.agency.agency));
}

function matchContext(agency, rawQuery, mode = 'direct') {
  const query = rawQuery.trim();
  const q = normalize(query);
  const city = normalize(agency.city);
  const county = normalize(agency.county);
  const areas = (agency.areas || []).map(normalize);
  const exactZip = /^\d{5}$/.test(query) && (agency.zips || []).includes(query);

  if (mode === 'zip-fallback') {
    return {
      state: 'likely',
      badge: 'Likely agency — exact address recommended',
      reason: `This is the strongest verified match for the place associated with ZIP ${query}. ZIP boundaries can cross law-enforcement jurisdictions, so confirm the physical address if you are near a boundary.`
    };
  }

  if (exactZip || areas.includes(q) || city === q || county === q || normalize(`${agency.county} county`) === q) {
    return {
      state: 'exact',
      badge: 'Agency serving this location',
      reason: exactZip
        ? `This agency is listed for ZIP ${query} in the verified directory.`
        : `This agency is the strongest verified jurisdiction match for “${query}.”`
    };
  }

  return {
    state: 'likely',
    badge: 'Likely agency — exact address recommended',
    reason: `This is the strongest verified directory match for “${query}.” Confirm the physical jurisdiction if the incident is near a city or county boundary.`
  };
}

function resultCard(agency, context) {
  const phone = compactPhone(agency.phone);
  const checked = escapeHtml(agency.verified || 'date not listed');
  return `
    <article class="agency-result-card">
      <div class="confidence-row">
        <span class="confidence-badge ${escapeHtml(context.state)}">${escapeHtml(context.badge)}</span>
        <span class="source-badge">✓ Official source verified</span>
      </div>

      <h3>${escapeHtml(agency.agency)}</h3>
      <p class="agency-subtitle">${escapeHtml(agency.type)} · ${escapeHtml(agency.county)} County, Florida</p>

      <div class="match-reason">${escapeHtml(context.reason)}</div>

      <div class="phone-panel">
        <span class="phone-label">${escapeHtml(agency.phoneLabel || 'Non-Emergency')}</span>
        <a class="phone-number" href="tel:${phone}">${escapeHtml(agency.phone)}</a>
      </div>

      <div class="result-actions">
        <a class="primary-action" href="tel:${phone}" aria-label="Call ${escapeHtml(agency.agency)} at ${escapeHtml(agency.phone)}">Call now</a>
        <a class="secondary-action" href="${escapeHtml(agency.source)}" target="_blank" rel="noopener noreferrer">View official source</a>
      </div>

      <div class="verification-meta">Source checked ${checked}. This project is independent and is not affiliated with the agency.</div>
    </article>`;
}

function showResultView({ title, cards, notice = '' }) {
  intro.hidden = true;
  supportSection.hidden = true;
  resultState.hidden = false;
  resultTitle.textContent = title;

  if (notice) {
    resultNotice.innerHTML = `<div class="result-notice"><strong>Jurisdiction overlap</strong>${escapeHtml(notice)}</div>`;
  } else {
    resultNotice.innerHTML = '';
  }

  resultCards.innerHTML = cards;
  window.scrollTo({ top: 0, behavior: 'smooth' });
  backToSearch?.focus({ preventScroll: true });
}

function showAgencyResult(agency, query, mode = 'direct') {
  const context = matchContext(agency, query, mode);
  showResultView({
    title: 'Your non-emergency contact',
    cards: resultCard(agency, context)
  });
}

function showAmbiguousZip(query, override) {
  const matches = override.agencyNames
    .map(name => agencies.find(agency => agency.agency === name))
    .filter(Boolean);

  if (!matches.length) return false;

  const cards = matches.map(agency => resultCard(agency, {
    state: 'ambiguous',
    badge: 'May serve this area',
    reason: `ZIP ${query} crosses jurisdiction boundaries. Use this agency only if the physical incident address is within ${agency.county} County.`
  })).join('');

  showResultView({
    title: override.title,
    cards,
    notice: override.note
  });
  return true;
}

function showNoMatch(location) {
  const googleQuery = encodeURIComponent(`${location} Florida police sheriff non-emergency official site`);
  showResultView({
    title: 'We could not verify the correct agency',
    cards: `
      <div class="no-result-card">
        <h3>No verified jurisdiction match yet</h3>
        <p>Rather than guess a phone number, the finder stops here. Try a nearby city, county name, or the agency name directly.</p>
        <div class="result-actions">
          <a class="primary-action" href="https://www.google.com/search?q=${googleQuery}" target="_blank" rel="noopener noreferrer">Search official agency sites</a>
          <a class="secondary-action" href="directory/">Browse directory</a>
        </div>
      </div>`
  });
}

async function resolveZip(zip) {
  try {
    const response = await fetch(`https://api.zippopotam.us/us/${zip}`, {
      headers: { Accept: 'application/json' }
    });
    if (!response.ok) return null;
    const data = await response.json();
    const place = data.places?.[0];
    if (!place || place['state abbreviation'] !== 'FL') return null;
    return place['place name'];
  } catch {
    return null;
  }
}

function updateUrl(query) {
  const url = new URL(window.location.href);
  if (query) url.searchParams.set('q', query);
  else url.searchParams.delete('q');
  history.replaceState(null, '', `${url.pathname}${url.search}`);
}

async function runSearch(rawQuery) {
  const query = rawQuery.trim();
  if (!query) {
    input.focus();
    return;
  }

  updateUrl(query);

  if (/^\d{5}$/.test(query) && ZIP_JURISDICTION_OVERRIDES[query]) {
    if (showAmbiguousZip(query, ZIP_JURISDICTION_OVERRIDES[query])) return;
  }

  const matches = findMatches(query);
  if (matches.length) {
    showAgencyResult(matches[0].agency, query, 'direct');
    return;
  }

  if (/^\d{5}$/.test(query)) {
    const place = await resolveZip(query);
    if (place) {
      const placeMatches = findMatches(place);
      if (placeMatches.length) {
        showAgencyResult(placeMatches[0].agency, query, 'zip-fallback');
        return;
      }
      showNoMatch(`${place} (${query})`);
      return;
    }
  }

  showNoMatch(query);
}

function resetFinder({ focus = true } = {}) {
  resultState.hidden = true;
  intro.hidden = false;
  supportSection.hidden = false;
  resultCards.innerHTML = '';
  resultNotice.innerHTML = '';
  input.value = '';
  updateUrl('');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (focus) setTimeout(() => input.focus(), 250);
}

form?.addEventListener('submit', event => {
  event.preventDefault();
  runSearch(input.value);
});

backToSearch?.addEventListener('click', () => resetFinder());

window.addEventListener('popstate', () => {
  const params = new URLSearchParams(window.location.search);
  const query = params.get('q');
  if (query) {
    input.value = query;
    runSearch(query);
  } else {
    resetFinder({ focus: false });
  }
});

const params = new URLSearchParams(window.location.search);
const initialQuery = params.get('q');
if (initialQuery) {
  input.value = initialQuery;
  runSearch(initialQuery);
}
