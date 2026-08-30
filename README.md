# Florida Non-Emergency Finder

A mobile-first public-information website for quickly finding Florida law-enforcement non-emergency phone numbers by city, ZIP code, county, or agency.

## Current build

- Statewide baseline covering all **67 Florida county sheriff / consolidated county law-enforcement jurisdictions**
- Growing municipal police directory, including major Florida cities
- Fast city / county / agency search
- ZIP-code lookup with Florida place resolution
- Browse-all directory view
- County and agency-type filters
- One-tap `tel:` calling on mobile
- Direct official-source links on every published result
- Verification dates stored with each record
- Duplicate agency/phone suppression in the browser
- Safe fallback when a number has not yet been independently verified
- GitHub Pages static deployment
- No account, application server, or API key required

The live interface calculates and displays the current unique listing count automatically.

## Source policy

**The phone number itself must come from the law-enforcement agency's official website or an official city/county government page for that agency.**

The project does not use FDLE, commercial directories, Google business listings, social-media profiles, or other third-party directories as the authority for a published non-emergency number.

A number is only published when the official source identifies it as one of the following, or provides an equivalent clearly documented public calls-for-service contact:

- Non-emergency
- Non-emergency dispatch
- Communications / dispatch number for routine calls for service
- Equivalent wording that clearly directs the public to the number for non-emergency police or sheriff assistance

Generic administration, records, jail, chief/sheriff office, and unrelated switchboard numbers must not be relabeled as non-emergency numbers.

If official sources conflict, the record remains unpublished until the discrepancy is resolved.

## Data files

The site currently loads these curated datasets in order:

- `data/agencies.js` — original verified seed records
- `data/agencies-expanded.js` — expanded sheriff coverage
- `data/county-completion.js` — remaining counties needed for the 67-county baseline
- `data/municipal-extra.js` — additional municipal / county records
- `data/major-municipal.js` — major Florida municipal police departments

`data/verified-expansion.js` is a legacy research file and is intentionally **not loaded by the production page** because newer curated files supersede overlapping records.

Each record follows this structure:

```js
{
  agency: "Example Police Department",
  type: "Police Department",
  city: "Example City",
  county: "Example",
  areas: ["Example City"],
  zips: ["32000"],
  phone: "555-555-5555",
  phoneLabel: "Non-Emergency",
  source: "https://official-agency-or-government-source.example/",
  verified: "2026-08-29"
}
```

## Search and ZIP behavior

Search indexes agency name, agency type, city, county, service-area aliases, and any ZIP codes stored with a record.

If a five-digit ZIP is not directly present in the curated data, the browser uses the public Zippopotam.us endpoint to resolve the ZIP to a Florida place name, then searches the directory again. No API key is required.

ZIP-to-jurisdiction mapping should be treated separately from phone-number verification because ZIP boundaries do not always match law-enforcement jurisdiction boundaries. Results therefore identify matching agencies rather than claiming that a ZIP alone proves exact jurisdiction.

## Verification workflow

1. Identify the Florida sheriff, municipal police department, or other law-enforcement agency.
2. Find the agency's official website or official local-government police page.
3. Locate the page that publishes the public non-emergency / dispatch / routine calls-for-service number.
4. Confirm that the number is appropriate for public non-emergency law-enforcement assistance.
5. Store the exact source URL and the date checked.
6. Do not publish unresolved or conflicting records.
7. Periodically re-check published records for changes.

## Next coverage layer

The county baseline is complete. Ongoing expansion should prioritize:

1. Remaining incorporated-city police departments
2. University and college police departments
3. Airport and seaport law-enforcement agencies
4. School-district police departments where applicable
5. State and other specialized law-enforcement agencies that publish a meaningful public non-emergency contact

## Deployment

The site is static and deploys through GitHub Pages from this repository.

Live site: `https://alexthezero.github.io/fl-nonemergency-finder/`

## Disclaimer

This project is independent and is not affiliated with or endorsed by any government agency. Information should be periodically re-verified. In an emergency, call 911.
