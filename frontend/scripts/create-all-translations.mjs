#!/usr/bin/env node
/**
 * One-shot pipeline: builds translation table, path maps, and pages.json files.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOCALES_DIR = join(__dirname, '../src/i18n/locales');

// Parse en from generate-pages-locales.mjs
const src = readFileSync(join(__dirname, 'generate-pages-locales.mjs'), 'utf8');
const match = src.match(/const en = (\{[\s\S]*?\n\});\n\nfunction translateTree/);
if (!match) throw new Error('Could not parse en object');
const en = Function(`return ${match[1]}`)();

function walk(obj, fn, path = []) {
  if (typeof obj === 'string') fn(path, obj);
  else if (Array.isArray(obj)) obj.forEach((v, i) => walk(v, fn, [...path, String(i)]));
  else if (obj && typeof obj === 'object') Object.entries(obj).forEach(([k, v]) => walk(v, fn, [...path, k]));
}

function clone(o) { return JSON.parse(JSON.stringify(o)); }

function setPath(root, path, value) {
  let cur = root;
  for (let i = 0; i < path.length - 1; i++) cur = cur[path[i]];
  cur[path[path.length - 1]] = value;
}

function applyTree(base, overrides) {
  const out = clone(base);
  for (const [pathKey, val] of Object.entries(overrides)) {
    setPath(out, pathKey.split('.'), val);
  }
  return out;
}

// ─── French path overrides (all leaf paths) ───────────────────────────────
const frO = {};
const swO = {};

walk(en, (path, value) => {
  const k = path.join('.');
  frO[k] = trFr(path, value);
  swO[k] = trSw(path, value);
});

function trFr(path, s) {
  const k = path.join('.');
  if (FR[k]) return FR[k];
  return autoFr(s);
}

function trSw(path, s) {
  const k = path.join('.');
  if (SW[k]) return SW[k];
  return autoSw(s);
}

function autoFr(s) {
  if (/^(StackPay|MetaMask|USDC|USDT|USD|ETH|EVM|PWA|BNB|Sepolia|Ethereum|Polygon|Arbitrum|Optimism|Base|Avalanche|PAID|ACTIVE|USER|ADMIN|24h|7d|30d|01|02|03|04|05|0\.01|0\.00)$/.test(s)) return s;
  return s
    .replace(/Pending/g, 'En attente')
    .replace(/Confirmed/g, 'Confirmé')
    .replace(/Completed/g, 'Terminé')
    .replace(/Dashboard/g, 'Tableau de bord')
    .replace(/Payment/g, 'Paiement')
    .replace(/Payments/g, 'Paiements')
    .replace(/Withdraw/g, 'Retrait')
    .replace(/Transfer/g, 'Transfert')
    .replace(/Network/g, 'Réseau')
    .replace(/Networks/g, 'Réseaux')
    .replace(/Community/g, 'Communauté')
    .replace(/Portfolio/g, 'Portefeuille')
    .replace(/Package/g, 'Forfait')
    .replace(/Packages/g, 'Forfaits')
    .replace(/Amount/g, 'Montant')
    .replace(/Balance/g, 'Solde')
    .replace(/Available/g, 'Disponible')
    .replace(/Total/g, 'Total')
    .replace(/Today/g, "Aujourd'hui")
    .replace(/Yesterday/g, 'Hier')
    .replace(/Create/g, 'Créer')
    .replace(/Cancel/g, 'Annuler')
    .replace(/Save/g, 'Enregistrer')
    .replace(/Edit/g, 'Modifier')
    .replace(/Delete/g, 'Supprimer')
    .replace(/Copy/g, 'Copier')
    .replace(/Install/g, 'Installer')
    .replace(/loading /g, 'chargement ')
    .replace(/Loading /g, 'Chargement ');
}

function autoSw(s) {
  if (/^(StackPay|MetaMask|USDC|USDT|USD|ETH|EVM|PWA|BNB|Sepolia|Ethereum|Polygon|Arbitrum|Optimism|Base|Avalanche|PAID|ACTIVE|USER|ADMIN|24h|7d|30d|01|02|03|04|05|0\.01|0\.00)$/.test(s)) return s;
  return s
    .replace(/Pending/g, 'Inasubiri')
    .replace(/Confirmed/g, 'Imethibitishwa')
    .replace(/Completed/g, 'Imekamilika')
    .replace(/Dashboard/g, 'Dashibodi')
    .replace(/Payment/g, 'Malipo')
    .replace(/Payments/g, 'Malipo')
    .replace(/Withdraw/g, 'Utoaji')
    .replace(/Transfer/g, 'Uhamisho')
    .replace(/Network/g, 'Mtandao')
    .replace(/Networks/g, 'Mitandao')
    .replace(/Community/g, 'Jumuiya')
    .replace(/Portfolio/g, 'Kwingineko')
    .replace(/Package/g, 'Kifurushi')
    .replace(/Packages/g, 'Vifurushi')
    .replace(/Amount/g, 'Kiasi')
    .replace(/Balance/g, 'Salio')
    .replace(/Available/g, 'Inapatikana')
    .replace(/Total/g, 'Jumla')
    .replace(/Today/g, 'Leo')
    .replace(/Yesterday/g, 'Jana')
    .replace(/Create/g, 'Unda')
    .replace(/Cancel/g, 'Ghairi')
    .replace(/Save/g, 'Hifadhi')
    .replace(/Edit/g, 'Hariri')
    .replace(/Delete/g, 'Futa')
    .replace(/Copy/g, 'Nakili')
    .replace(/Install/g, 'Sakinisha')
    .replace(/loading /g, 'inapakia ')
    .replace(/Loading /g, 'Inapakia ');
}

// Path-specific translations — FR and SW keyed by dot path
const FR = {};
const SW = {};

// Populate FR/SW from bundled data file
const bundled = JSON.parse(readFileSync(join(__dirname, 'pages-translations-bundled.json'), 'utf8'));
Object.assign(FR, bundled.fr);
Object.assign(SW, bundled.sw);

const frPages = applyTree(en, frO);
const swPages = applyTree(en, swO);

// Override with bundled path translations (higher quality)
walk(en, (path) => {
  const k = path.join('.');
  if (bundled.fr[k]) setPath(frPages, path, bundled.fr[k]);
  if (bundled.sw[k]) setPath(swPages, path, bundled.sw[k]);
});

function countNamespaceKeys(obj) {
  const counts = {};
  for (const [ns, value] of Object.entries(obj)) counts[ns] = countLeaves(value);
  return counts;
}
function countLeaves(value) {
  if (value === null || typeof value !== 'object') return 1;
  if (Array.isArray(value)) return value.reduce((s, i) => s + countLeaves(i), 0);
  return Object.values(value).reduce((s, v) => s + countLeaves(v), 0);
}

function writeLocale(code, data) {
  const dir = join(LOCALES_DIR, code);
  mkdirSync(dir, { recursive: true });
  const fp = join(dir, 'pages.json');
  writeFileSync(fp, `${JSON.stringify(data, null, 2)}\n`);
  console.log(`Wrote ${fp} (${(Buffer.byteLength(JSON.stringify(data)) / 1024).toFixed(1)} KB)`);
}

writeLocale('en', en);
writeLocale('fr', frPages);
writeLocale('sw', swPages);

const enC = countNamespaceKeys(en);
const frC = countNamespaceKeys(frPages);
const swC = countNamespaceKeys(swPages);

console.log('\nKey counts per namespace:\n');
console.log('Namespace'.padEnd(16), 'en'.padStart(6), 'fr'.padStart(6), 'sw'.padStart(6), 'Match');
for (const ns of Object.keys(enC).sort()) {
  const m = enC[ns] === frC[ns] && frC[ns] === swC[ns] ? '✓' : '✗';
  console.log(ns.padEnd(16), String(enC[ns]).padStart(6), String(frC[ns]).padStart(6), String(swC[ns]).padStart(6), m);
}
const te = Object.values(enC).reduce((a, b) => a + b, 0);
const tf = Object.values(frC).reduce((a, b) => a + b, 0);
const ts = Object.values(swC).reduce((a, b) => a + b, 0);
console.log('─'.repeat(40));
console.log('TOTAL'.padEnd(16), String(te).padStart(6), String(tf).padStart(6), String(ts).padStart(6), te === tf && tf === ts ? '✓' : '✗');
