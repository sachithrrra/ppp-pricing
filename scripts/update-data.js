import axios from 'axios';
import lookup from 'country-code-lookup';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { stringify } from 'smol-toml';
import XLSX from 'xlsx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// PA.NUS.PPP  = PPP conversion factor, GDP (LCU per international $)
// PA.NUS.FCRF = Official exchange rate (LCU per US$, period average)
// Price level ratio = PA.NUS.PPP / PA.NUS.FCRF  (dimensionless, US = 1.0)
// This replicates the retired PA.NUS.PPPC.RF indicator (price level ratio).
const PPP_URL  = 'https://api.worldbank.org/v2/country/all/indicator/PA.NUS.PPP?downloadformat=excel';
const FCRF_URL = 'https://api.worldbank.org/v2/country/all/indicator/PA.NUS.FCRF?downloadformat=excel';
const OUTPUT_FILE = path.join(__dirname, '../data.toml');
const HISTORY_FILE = path.join(__dirname, '../data/history.toml');

async function fetchRows(url) {
    const response = await axios.get(url, { responseType: 'arraybuffer', maxRedirects: 5 });
    const workbook = XLSX.read(response.data, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    return XLSX.utils.sheet_to_json(sheet, { range: 3 });
}

function yearSeries(row) {
    const series = {};
    for (const key of Object.keys(row)) {
        if (!/^\d{4}$/.test(key)) continue;
        if (row[key] === '' || row[key] === undefined || row[key] === null) continue;
        series[key] = parseFloat(row[key]);
    }
    return series;
}

function latestValue(series) {
    const years = Object.keys(series).sort().reverse();
    return years.length ? series[years[0]] : null;
}

async function downloadAndProcess() {
    console.log('Downloading PPP and exchange rate data from World Bank...');
    try {
        const [pppRows, fxRows] = await Promise.all([
            fetchRows(PPP_URL),
            fetchRows(FCRF_URL),
        ]);

        // Build exchange rate time series: ISO3 -> { year: value }
        const fxSeries = {};
        fxRows.forEach(row => {
            const code = row['Country Code'];
            if (!code) return;
            fxSeries[code] = yearSeries(row);
        });

        console.log('Computing price level ratios (PPP / exchange rate)...');
        const pppData = {};
        const history = {};

        pppRows.forEach(row => {
            const countryCode = row['Country Code'];
            if (!countryCode) return;

            const pppSeries = yearSeries(row);
            const fx = fxSeries[countryCode] || {};

            const ratios = {};
            for (const year of Object.keys(pppSeries)) {
                const fxVal = fx[year];
                if (fxVal === undefined || fxVal === 0) continue;
                ratios[year] = pppSeries[year] / fxVal;
            }

            const latest = latestValue(ratios);
            if (latest === null) return;

            pppData[countryCode] = latest;
            history[countryCode] = ratios;

            const country = lookup.byIso(countryCode);
            if (country) {
                pppData[country.iso2] = latest;
            }
        });

        fs.mkdirSync(path.dirname(HISTORY_FILE), { recursive: true });
        fs.writeFileSync(OUTPUT_FILE, stringify(pppData));
        fs.writeFileSync(HISTORY_FILE, stringify(history));
        console.log(`Data updated successfully! Saved to ${OUTPUT_FILE}`);
        console.log(`Time series saved to ${HISTORY_FILE}`);
        console.log(`Total countries processed: ${Object.keys(pppData).length / 2}`);

    } catch (error) {
        console.error('Error updating data:', error.message);
        console.error(error);
        process.exit(1);
    }
}

downloadAndProcess();
