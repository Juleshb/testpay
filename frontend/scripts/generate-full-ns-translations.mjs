#!/usr/bin/env node
/** Generates scripts/pages-ns-translations.mjs with complete FR/SW trees */
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

function clone(o) { return JSON.parse(JSON.stringify(o)); }

function setPath(root, path, value) {
  let cur = root;
  for (let i = 0; i < path.length - 1; i++) cur = cur[path[i]];
  cur[path[path.length - 1]] = value;
}

function translateLeaf(path, s, lang) {
  const key = path.join('.');
  const table = lang === 'fr' ? PATH_FR : PATH_SW;
  if (table[key]) return table[key];
  const strTable = lang === 'fr' ? STR_FR : STR_SW;
  if (strTable[s]) return strTable[s];
  return lang === 'fr' ? autoFr(s) : autoSw(s);
}

function autoFr(s) {
  if (/^(StackPay|MetaMask|USDC|USDT|USD|ETH|EVM|PWA|BNB|Sepolia|Ethereum|Polygon|Arbitrum|Optimism|Base|Avalanche|PAID|ACTIVE|USER|ADMIN|24h|7d|30d|01|02|03|04|05|0\.01|0\.00|4\.8\/5|2\.5k\+|840\+|12k\+)$/.test(s)) return s;
  return s;
}

function autoSw(s) {
  if (/^(StackMask|MetaMask|USDC|USDT|USD|ETH|EVM|PWA|BNB|Sepolia|Ethereum|Polygon|Arbitrum|Optimism|Base|Avalanche|PAID|ACTIVE|USER|ADMIN|24h|7d|30d|01|02|03|04|05|0\.01|0\.00|4\.8\/5|2\.5k\+|840\+|12k\+)$/.test(s)) return s;
  return s;
}

// Path-level translations (highest fidelity)
const PATH_FR = {};
const PATH_SW = {};

// String-level fallbacks for repeated strings
const STR_FR = {
  Pending: 'En attente', Confirmed: 'Confirmé', Swept: 'Collecté', Expired: 'Expiré',
  Processing: 'En cours', Completed: 'Terminé', Failed: 'Échoué', Cancelled: 'Annulé',
  all: 'tout', Retry: 'Réessayer', 'open →': 'ouvrir →', 'view all →': 'tout voir →',
  View: 'Voir', 'No data yet': 'Aucune donnée', Chain: 'Chaîne', Amount: 'Montant',
  Date: 'Date', Time: 'Heure', Status: 'Statut', Network: 'Réseau', Address: 'Adresse',
  User: 'Utilisateur', Create: 'Créer', 'create one': 'en créer un', period: 'période',
  Today: "Aujourd'hui", Yesterday: 'Hier', Dashboard: 'Tableau de bord', overview: 'aperçu',
  Withdraw: 'Retrait', Transfer: 'Transfert', 'New Payment': 'Nouveau paiement',
  Payments: 'Paiements', Total: 'Total', Pending: 'En attente', Available: 'Disponible',
  Cancel: 'Annuler', Save: 'Enregistrer', Edit: 'Modifier', Delete: 'Supprimer',
  Copy: 'Copier', Install: 'Installer', Name: 'Nom', Email: 'E-mail', Phone: 'Téléphone',
  Password: 'Mot de passe', Community: 'Communauté', Networks: 'Réseaux',
  Portfolio: 'Portefeuille', Admin: 'Admin', Approve: 'Approuver', Hide: 'Masquer',
  Show: 'Afficher', Paste: 'Coller', Note: 'Note', member: 'membre', eligible: 'éligible',
  locked: 'verrouillé', daily: 'quotidien', active: 'actif', inactive: 'inactif',
  sent: 'envoyé', received: 'reçu', public: 'public', pending: 'en attente',
  completed: 'terminé', cancelled: 'annulé', 'Log in': 'Se connecter',
  'Get started': 'Commencer', 'Create free account': 'Créer un compte gratuit',
  'Not now': 'Pas maintenant', 'Rate StackPay': 'Noter StackPay', Close: 'Fermer',
  'Copied!': 'Copié !', 'Find user': 'Trouver', Change: 'Modifier', Packages: 'Forfaits',
  Referrals: 'Parrainages', Invitations: 'Invitations', 'Sign in': 'Se connecter',
  'Create Account': 'Créer un compte', 'Create account': 'Créer un compte',
  'Terms of Use': "Conditions d'utilisation", 'Privacy Policy': 'Politique de confidentialité',
  'loading dashboard': 'chargement du tableau de bord',
  'fetching payments': 'récupération des paiements',
  'loading payment': 'chargement du paiement',
  'loading transfer': 'chargement du transfert',
  'loading withdraw': 'chargement du retrait',
  'loading packages': 'chargement des forfaits',
  'loading portfolio': 'chargement du portefeuille',
  'loading referrals': 'chargement des parrainages',
  'loading networks': 'chargement des réseaux',
  'loading users': 'chargement des utilisateurs',
};

const STR_SW = {
  Pending: 'Inasubiri', Confirmed: 'Imethibitishwa', Swept: 'Imekusanywa', Expired: 'Imeisha muda',
  Processing: 'Inachakatwa', Completed: 'Imekamilika', Failed: 'Imeshindwa', Cancelled: 'Imefutwa',
  all: 'zote', Retry: 'Jaribu tena', 'open →': 'fungua →', 'view all →': 'ona zote →',
  View: 'Angalia', 'No data yet': 'Hakuna data bado', Chain: 'Mnyororo', Amount: 'Kiasi',
  Date: 'Tarehe', Time: 'Muda', Status: 'Hali', Network: 'Mtandao', Address: 'Anwani',
  User: 'Mtumiaji', Create: 'Unda', 'create one': 'unda moja', period: 'kipindi',
  Today: 'Leo', Yesterday: 'Jana', Dashboard: 'Dashibodi', overview: 'muhtasari',
  Withdraw: 'Utoaji', Transfer: 'Uhamisho', 'New Payment': 'Malipo mapya',
  Payments: 'Malipo', Total: 'Jumla', Available: 'Inapatikana',
  Cancel: 'Ghairi', Save: 'Hifadhi', Edit: 'Hariri', Delete: 'Futa',
  Copy: 'Nakili', Install: 'Sakinisha', Name: 'Jina', Email: 'Barua pepe', Phone: 'Simu',
  Password: 'Nenosiri', Community: 'Jumuiya', Networks: 'Mitandao',
  Portfolio: 'Kwingineko', Admin: 'Msimamizi', Approve: 'Idhinisha', Hide: 'Ficha',
  Show: 'Onyesha', Paste: 'Bandika', Note: 'Dokezo', member: 'mwanachama', eligible: 'stahiki',
  locked: 'imefungwa', daily: 'kila siku', active: 'hai', inactive: 'isiyotumika',
  sent: 'imetumwa', received: 'imepokelewa', public: 'ya umma', pending: 'inasubiri',
  completed: 'imekamilika', cancelled: 'imefutwa', 'Log in': 'Ingia',
  'Get started': 'Anza', 'Create free account': 'Unda akaunti bure',
  'Not now': 'Si sasa', 'Rate StackPay': 'Kadiria StackPay', Close: 'Funga',
  'Copied!': 'Imenakiliwa!', 'Find user': 'Tafuta mtumiaji', Change: 'Badilisha',
  Packages: 'Vifurushi', Referrals: 'Mialiko', Invitations: 'Mialiko', 'Sign in': 'Ingia',
  'Create Account': 'Unda akaunti', 'Create account': 'Unda akaunti',
  'Terms of Use': 'Masharti ya matumizi', 'Privacy Policy': 'Sera ya faragha',
  'loading dashboard': 'inapakia dashibodi',
  'fetching payments': 'inachukua malipo',
  'loading payment': 'inapakia malipo',
  'loading transfer': 'inapakia uhamisho',
  'loading withdraw': 'inapakia utoaji',
  'loading packages': 'inapakia vifurushi',
  'loading portfolio': 'inapakia kwingineko',
  'loading referrals': 'inapakia mialiko',
  'loading networks': 'inapakia mitandao',
  'loading users': 'inapakia watumiaji',
};

// Load extended path translations
const ext = JSON.parse(readFileSync(join(__dirname, 'pages-path-translations.json'), 'utf8'));
Object.assign(PATH_FR, ext.fr);
Object.assign(PATH_SW, ext.sw);

const nsFr = clone(en);
const nsSw = clone(en);

walk(en, (path, val) => {
  setPath(nsFr, path, translateLeaf(path, val, 'fr'));
  setPath(nsSw, path, translateLeaf(path, val, 'sw'));
});

writeFileSync(
  join(__dirname, 'pages-ns-translations.mjs'),
  `/** Auto-generated complete FR/SW page translations */\nexport const nsFr = ${JSON.stringify(nsFr, null, 2)};\nexport const nsSw = ${JSON.stringify(nsSw, null, 2)};\n`
);

const unchangedFr = walkCount(nsFr, en, (a, b) => a === b);
console.log(`Generated pages-ns-translations.mjs — ${unchangedFr} FR strings still English`);

function walkCount(a, b, cmp, path = []) {
  let n = 0;
  if (typeof a === 'string') return cmp(a, b) ? 1 : 0;
  if (Array.isArray(a)) { for (let i = 0; i < a.length; i++) n += walkCount(a[i], b[i], cmp, [...path, i]); return n; }
  if (a && typeof a === 'object') {
    for (const k of Object.keys(a)) n += walkCount(a[k], b[k], cmp, [...path, k]);
  }
  return n;
}
