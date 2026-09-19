# ppp

What a US-dollar price should cost in every country, adjusted for purchasing power.
A static site built with Astro on top of World Bank price-level data.

```bash
npm install
npm run dev          # local site
npm run build        # static output in dist/
npm run update-data  # refresh data.toml from the World Bank API
npm test             # sanity-check the pricing function
```

## How it works

`data.toml` holds, per country (ISO2 and ISO3), the ratio of the PPP conversion factor
(`PA.NUS.PPP`) to the official exchange rate (`PA.NUS.FCRF`). 1.0 means prices match
the US; 0.27 means goods cost about a quarter as much.

`index.js` turns that into a price:

```
fair = price × (ratio + (1 − ratio) × smoothing)
```

`smoothing` (default 0.2) pulls the raw parity price back toward the original.
Rounding is `'none'`, `'currency'` (cents) or `'pretty'` (4.49, 43, 135).

`src/pages/index.astro` is the whole site; it imports `index.js` and `data.toml`
directly, so the browser runs the same code as `npm test`.

## Deploy

Pushes to `master` build and deploy automatically via `.github/workflows/deploy.yml`
(GitHub Actions → GitHub Pages). In the repo's **Settings → Pages**, set **Source** to
**GitHub Actions**. The site is served at `https://sachithrrra.github.io/ppp-pricing/`.

## License

MIT. Data © World Bank, CC BY 4.0.
