import lookup from 'country-code-lookup';
import { parse } from 'smol-toml';
import dataToml from '../../data.toml?raw';
import historyToml from '../../data/history.toml?raw';

export const data = parse(dataToml);
const history = parse(historyToml);

// data.json holds each country twice (ISO3 + ISO2); keep ISO3 and drop World Bank aggregates.
export function getCountries() {
  return Object.keys(data)
    .filter((k) => k.length === 3)
    .map((iso3) => {
      const c = lookup.byIso(iso3);
      if (!c) return null;
      const slug = c.country.normalize('NFD').replace(/[̀-ͯ]/g, '')
        .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      return { iso3, iso2: c.iso2, name: c.country, continent: c.continent, ratio: data[iso3], slug };
    })
    .filter(Boolean)
    .sort((a, b) => a.ratio - b.ratio);
}

// Yearly price level ratio series for a country, oldest to newest.
export function getHistory(iso3) {
  const series = history[iso3] || {};
  return Object.keys(series)
    .sort()
    .map((year) => ({ year: Number(year), ratio: series[year] }));
}
