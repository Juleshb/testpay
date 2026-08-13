#!/usr/bin/env node
/** Generates path-based FR/SW maps for pages.json locales */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const en = JSON.parse(readFileSync(join(__dirname, '.en-pages.json'), 'utf8'));

function walk(obj, fn, path = []) {
  if (typeof obj === 'string') fn(path, obj);
  else if (Array.isArray(obj)) obj.forEach((v, i) => walk(v, fn, [...path, String(i)]));
  else if (obj && typeof obj === 'object') Object.entries(obj).forEach(([k, v]) => walk(v, fn, [...path, k]));
}

function cloneWithTranslate(obj, tr) {
  if (typeof obj === 'string') return tr(obj);
  if (Array.isArray(obj)) return obj.map((item) => cloneWithTranslate(item, tr));
  if (obj && typeof obj === 'object') {
    return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, cloneWithTranslate(v, tr)]));
  }
  return obj;
}

// French full-tree translation
const frTree = {
  status: {
    pending: 'En attente',
    confirmed: 'Confirmé',
    swept: 'Collecté',
    expired: 'Expiré',
    processing: 'En cours',
    completed: 'Terminé',
    failed: 'Échoué',
    cancelled: 'Annulé',
    all: 'tout',
  },
  pageCommon: {
    retry: 'Réessayer',
    open: 'ouvrir →',
    viewAll: 'tout voir →',
    view: 'Voir',
    noData: 'Aucune donnée',
    noDataYet: 'Aucune donnée',
    chain: 'Chaîne',
    amount: 'Montant',
    date: 'Date',
    time: 'Heure',
    status: 'Statut',
    network: 'Réseau',
    address: 'Adresse',
    user: 'Utilisateur',
    create: 'Créer',
    createOne: 'en créer un',
    period: 'période',
    today: "Aujourd'hui",
    yesterday: 'Hier',
    usdApprox: '≈ {{amount}} $ USD',
    loading: {
      dashboard: 'chargement du tableau de bord',
      payments: 'récupération des paiements',
      recentPayments: 'chargement des paiements récents',
      payment: 'chargement du paiement',
      transfer: 'chargement du transfert',
      withdraw: 'chargement du retrait',
      packages: 'chargement des forfaits',
      portfolio: 'chargement du portefeuille',
      referrals: 'chargement des parrainages',
      loan: 'chargement du programme de prêt',
      networks: 'chargement des réseaux',
      users: 'chargement des utilisateurs',
      referralSettings: 'chargement des paramètres de parrainage',
      platformPayments: 'chargement des paiements plateforme',
      testimonials: 'chargement des avis',
      showcaseTeam: "chargement de l'équipe vitrine",
    },
  },
};

// Merge: use en structure, overlay frTree where defined, auto-translate rest via clone
function deepMerge(base, overlay) {
  if (typeof base === 'string') return typeof overlay === 'string' ? overlay : base;
  if (Array.isArray(base)) {
    return base.map((item, i) => deepMerge(item, overlay?.[i] ?? item));
  }
  if (base && typeof base === 'object') {
    const out = {};
    for (const key of Object.keys(base)) {
      out[key] = deepMerge(base[key], overlay?.[key]);
    }
    return out;
  }
  return base;
}

// Load hand-translated trees from overrides module
const { frPages, swPages } = await import('./i18n-full-translations.mjs');

const frPathMap = {};
const swPathMap = {};

walk(frPages, (path, value) => {
  frPathMap[path.join('.')] = value;
});
walk(swPages, (path, value) => {
  swPathMap[path.join('.')] = value;
});

writeFileSync(
  join(__dirname, 'pages-locales-i18n-maps.mjs'),
  `/** Generated path maps — ${Object.keys(frPathMap).length} paths */\nexport const frPathMap = ${JSON.stringify(frPathMap, null, 2)};\nexport const swPathMap = ${JSON.stringify(swPathMap, null, 2)};\n`
);

console.log(`Path maps: ${Object.keys(frPathMap).length} FR, ${Object.keys(swPathMap).length} SW`);
