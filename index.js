import { parse } from 'smol-toml';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createPpp } from './src/lib/ppp-core.js';

const pppData = parse(fs.readFileSync(fileURLToPath(new URL('./data.toml', import.meta.url)), 'utf8'));

export default createPpp(pppData);
