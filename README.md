# Florida Non-Emergency Finder

A mobile-first public-information website for quickly finding Florida law-enforcement non-emergency phone numbers by city, ZIP code, county, or agency.

## Current build

- Fast city / county / agency search
- ZIP-code lookup with Florida place resolution
- One-tap `tel:` calling on mobile
- Direct official-source links on every published result
- Verification dates stored with each record
- Safe fallback when a number has not yet been independently verified
- GitHub Pages-friendly static architecture
- No account, server, database, or API key required

## Source policy

**The phone number itself must come from the law-enforcement agency's official website or an official city/county government page for that agency.**

The project does not use FDLE, commercial directories, Google business listings, social-media profiles, or other third-party directories as the authority for a published non-emergency number.

A number is only published when the official source explicitly identifies it as one of the following:

- Non-emergency
- Non-emergency dispatch
- Communications / dispatch number for routine calls for service
- Equivalent wording that clearly tells the public to use the number for a non-emergency police or sheriff response

Generic administration, records, jail, chief/sheriff office, and switchboard numbers are not to be relabeled as non-emergency numbers.

If official sources conflict, the record remains unpublished until the discrepancy is resolved.

## Adding an agency

The original seed records are in `data/agencies.js`. Independently researched expansion records are in `data/verified-expansion.js`.

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

## ZIP lookup

If a five-digit ZIP is not directly present in the curated data, the browser uses the public Zippopotam.us endpoint to resolve the ZIP to a Florida place name, then searches the local directory again. No API key is required.

ZIP-to-jurisdiction mapping should be treated separately from phone-number verification because ZIP boundaries do not always match police jurisdiction boundaries.

## Verification workflow

1. Identify the Florida sheriff, municipal police department, or other law-enforcement agency.
2. Find the agency's official website or official local-government police page.
3. Locate the page that explicitly publishes the public non-emergency / dispatch number.
4. Confirm the number is for public calls for service rather than administration or records.
5. Store the exact source URL and the date checked.
6. Do not publish unresolved or conflicting records.
7. Periodically re-check published records for changes.

## Deployment

The site is static and deploys through GitHub Pages from this repository.

## Disclaimer

This project is independent and is not affiliated with or endorsed by any government agency. Information should be periodically re-verified. In an emergency, call 911.
