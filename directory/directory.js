const rawAgencies = Array.isArray(window.FL_AGENCIES) ? window.FL_AGENCIES : [];
const agencies = Array.from(
  new Map(
    rawAgencies.map(agency => [
      `${String(agency.agency).toLowerCase()}|${String(agency.phone).replace(/\D/g, '')}`,
      agency
    ])
  ).values()
).sort((a, b) => a.county.localeCompare(b.county) || a.agency.localeCompare(b.agency));

const searchInput = document.getElementById('directorySearch');
const countyFilter = document.getElementById('countyFilter');
const typeFilter = document.getElementById('typeFilter');
const results = document.getElementById('directoryResults');
const resultCount = document.getElementById('directoryResultCount');
const listingCount = document.getElementById('directoryListingCount');
const countyCount = document.getElementById('directoryCountyCount');

const normalize = (value = '') => value
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9\s-]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({
  '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'
}[char]));
const compactPhone = phone => String(phone || '').replace(/\D/g, '');

const counties = [...new Set(agencies.map(agency => agency.county).filter(Boolean))]
  .sort((a, b) => a.localeCompare(b));
const types = [...new Set(agencies.map(agency => agency.type).filter(Boolean))]
  .sort((a, b) => a.localeCompare(b));

listingCount.textContent = agencies.length;
countyCount.textContent = counties.length;

counties.forEach(county => {
  const option = document.createElement('option');
  option.value = county;
  option.textContent = `${county} County`;
  countyFilter.appendChild(option);
});

types.forEach(type => {
  const option = document.createElement('option');
  option.value = type;
  option.textContent = type;
  typeFilter.appendChild(option);
});

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

function directoryCard(agency) {
  const phone = compactPhone(agency.phone);
  return `
    <article class="directory-card">
      <div class="directory-card-main">
        <div class="directory-card-type">${escapeHtml(agency.type)}</div>
        <h3>${escapeHtml(agency.agency)}</h3>
        <p class="directory-card-location">${escapeHtml(agency.city)}, ${escapeHtml(agency.county)} County · Verified ${escapeHtml(agency.verified || '')}</p>
      </div>
      <div class="directory-phone">
        <span>${escapeHtml(agency.phoneLabel || 'Non-Emergency')}</span>
        <a href="tel:${phone}">${escapeHtml(agency.phone)}</a>
      </div>
      <div class="directory-actions">
        <a class="small-action call" href="tel:${phone}">Call</a>
        <a class="small-action source" href="${escapeHtml(agency.source)}" target="_blank" rel="noopener noreferrer">Source</a>
      </div>
    </article>`;
}

function applyFilters() {
  const query = normalize(searchInput.value);
  const county = countyFilter.value;
  const type = typeFilter.value;

  const filtered = agencies.filter(agency => {
    if (county && agency.county !== county) return false;
    if (type && agency.type !== type) return false;
    if (query && !searchableText(agency).includes(query)) return false;
    return true;
  });

  resultCount.textContent = `${filtered.length} ${filtered.length === 1 ? 'agency' : 'agencies'}`;
  results.innerHTML = filtered.length
    ? filtered.map(directoryCard).join('')
    : `<div class="directory-empty">No verified agencies match those filters.</div>`;
}

searchInput.addEventListener('input', applyFilters);
countyFilter.addEventListener('change', applyFilters);
typeFilter.addEventListener('change', applyFilters);

applyFilters();
