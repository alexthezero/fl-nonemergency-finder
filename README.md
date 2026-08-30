# Florida Non-Emergency Finder

A mobile-first public-information website for quickly finding Florida law-enforcement non-emergency phone numbers by city, ZIP code, county, or agency.

## Current build

- Fast city / county / agency search
- ZIP-code lookup with Florida place resolution
- One-tap `tel:` calling on mobile
- Official-source links on every curated result
- Verification dates stored with each record
- Safe fallback when a number has not yet been verified
- GitHub Pages-friendly static architecture
- No account, server, database, or API key required

## Important data rule

Only put a phone number in `data/agencies.js` when an official agency or government source explicitly identifies it as a **non-emergency**, **dispatch non-emergency**, or equivalent public calls-for-service number.

Do not copy a generic main-office number from a directory and label it as non-emergency.

## Adding an agency

Edit `data/agencies.js` and add an object:

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
  source: "https://official-government-source.example/",
  verified: "2026-08-29"
}
```

## Data sources

The statewide agency roster can be cross-referenced against the Florida Department of Law Enforcement Criminal Justice Standards & Training Commission directories. Individual non-emergency numbers should be verified against each agency's official website or its local government's official website.

FDLE agency links:
https://www.fdle.state.fl.us/cjstc/publications/criminal-justice-agency-links

FDLE agency addresses/directories:
https://www.fdle.state.fl.us/cjstc/publications/criminal-justice-agency-addresses

## ZIP lookup

If a five-digit ZIP is not directly present in the curated data, the browser uses the public Zippopotam.us endpoint to resolve the ZIP to a Florida place name, then searches the local directory again. No API key is required.

## Deployment

The site is static. Enable GitHub Pages for the repository using the `main` branch and root (`/`) folder.

## Disclaimer

This project is independent and is not affiliated with or endorsed by any government agency. Information should be periodically re-verified. In an emergency, call 911.
