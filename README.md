# NASA Space Explorer

**Live website:** https://playlist0726-code.github.io/nasa-space-explorer/

A responsive Astronomy Picture of the Day explorer built with semantic HTML, CSS, and vanilla JavaScript. Based on [GCA Classroom's Project 7 starter](https://github.com/GCA-Classroom/07-nasa-space-explorer). The original `js/dateRange.js` is preserved unchanged; custom JavaScript is in `js/script.js`.

## Features

- Select dates from June 16, 1995 through today; request up to 366 days at once.
- Live NASA gallery with titles and dates, newest/oldest sorting, and lazy-loaded images.
- Native accessible dialog with larger images, full explanations, credits, NASA source links, Escape/backdrop/close-button dismissal, focus trapping and return.
- Loading, empty, unpublished-date, network error and retry states.
- All three LevelUps: video entries with clear NASA watch links; randomized space facts; smooth image hover zoom.
- Responsive desktop/mobile layout, keyboard focus indicators, reduced-motion support, and no private API keys or build dependencies needed to run.

## Run locally

```sh
python3 -m http.server 8765
```

Open http://localhost:8765. Serve over HTTP rather than opening index.html directly.

For automated tests: `npm ci && npm test` (Node 22+). Tests cover image/video rendering, safe text, details dialog, sorting, random facts, date validation, loading, failure/retry and range chunking. GitHub Actions runs tests before deploying to GitHub Pages.

## NASA API compatibility

The [official APOD API repository](https://github.com/nasa/apod-api) documents its September 2026 migration to NASA Science's keyless feed. The app requests `https://science.nasa.gov/wp-json/wp/v2/apod-basic` using inclusive `date_from` / `date_to` in YYMMDD format, in chunks of at most 25 dates. If unavailable it falls back to `https://api.nasa.gov/planetary/apod` with public `DEMO_KEY` and ISO dates. No personal key is required. NASA availability and shared demo limits can affect requests; failures are shown honestly rather than substituted with unrelated pictures.

Prefer `hdurl` for pictures because `url` can now point to a NASA article. NASA HTML text is parsed into plain text without inserting remote HTML into the document. Video/iframe entries link to the NASA article instead of assuming all URLs are images. Missing dates are reported; today may not be published yet. Results are cached in memory for the session.

## Credits and references

- [NASA APOD](https://science.nasa.gov/apod/), including original photographer / creator credits in each detail dialog.
- Hero: *Peculiar Galaxies of Arp 273*, APOD January 9, 2025. Image credit and copyright: Dave Doctor. See [NASA's original entry](https://science.nasa.gov/apod/?date=250109) for full credit and usage terms.
- Original NASA worm logo from the classroom starter, displayed without modification.
- Palette and typographic direction informed by [NASA Brand Guidelines](https://www.nasa.gov/nasa-brand-center/brand-guidelines/) and the [NASA Web Design System](https://nasa.github.io/nasawds-site/components/colors/). Fonts: Barlow Condensed and DM Sans via Google Fonts, with system fallbacks.

This is an independent educational project, not an official NASA website. NASA identity and third-party imagery retain their respective rights.

## Submission

See `docs/submission.md` and `docs/NASA-Space-Explorer-Submission.pdf` for the website URL, LevelUps, API reflection, debugging interview plan, and LinkedIn post draft. The LinkedIn text is a draft, not a published post.
