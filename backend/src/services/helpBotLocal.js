import { guessHelpLink, HELP_LINK_HINTS } from './helpBotKnowledge.js';

/**
 * StackPay system knowledge model — answers come from this data, not inventing facts.
 * Add/edit topics here when the product changes.
 */
export const SYSTEM_TOPICS = [
  {
    id: 'overview',
    link: '/dashboard',
    keywords: [
      'overview', 'start', 'getting started', 'what can', 'features', 'how to use', 'help me', 'everything',
      'stackpay', 'platform', 'que faire', 'fonctionnalités', 'commencer', 'ninaweza', 'vipengele', 'anza',
    ],
    answers: {
      en: 'StackPay lets you: 1) Deposit crypto to fund your USD balance (New deposit). 2) Grow with investment packages (withdrawable income) or cloud mining. 3) Transfer USD to other members. 4) Withdraw USDC/USDT. 5) Borrow against packages. 6) Earn referral commissions. 7) Chat in Community. Use the sidebar to open each section.',
      fr: 'StackPay vous permet de : 1) Déposer de la crypto pour alimenter votre solde USD (Nouveau dépôt). 2) Croître avec les forfaits (retraits possibles) ou le minage cloud. 3) Transférer des USD à d\'autres membres. 4) Retirer en USDC/USDT. 5) Emprunter sur vos forfaits. 6) Gagner des commissions de parrainage. 7) Discuter dans Communauté. Utilisez le menu latéral.',
      sw: 'StackPay inakuwezesha: 1) Kuweka crypto kujaza salio la USD (Amana mpya). 2) Kua kwa vifurushi (mapato yanayoweza kutolewa) au uchimbaji wa cloud. 3) Hamisha USD kwa wanachama. 4) Toa USDC/USDT. 5) Kopa dhidi ya vifurushi. 6) Pata kamisheni za rufaa. 7) Ongea kwenye Jamii. Tumia menyu ya pembeni.',
    },
  },
  {
    id: 'deposit',
    link: '/payments/new',
    keywords: [
      'deposit', 'pay', 'payment', 'fund', 'crypto', 'wallet', 'usdc', 'usdt', 'eth', 'address', 'payment card',
      'dépôt', 'paiement', 'portefeuille', 'adresse', 'amana', 'malipo', 'pochi', 'anwani',
    ],
    answers: {
      en: 'To deposit: open New deposit, enter the USD amount, pick network and token, then create the request. On the payment card, connect your wallet and pay — or copy the deposit address and send from any wallet. Use the correct network only. Keep the page open until confirmed; your USD balance is credited after confirmation.',
      fr: 'Pour déposer : ouvrez Nouveau dépôt, entrez le montant USD, choisissez le réseau et le jeton, puis créez la demande. Sur la carte de paiement, connectez votre portefeuille et payez — ou copiez l\'adresse de dépôt. Utilisez uniquement le bon réseau. Gardez la page ouverte jusqu\'à confirmation ; votre solde USD est crédité ensuite.',
      sw: 'Kuweka amana: fungua Amana mpya, weka kiasi cha USD, chagua mtandao na tokeni, kisha unda ombi. Kwenye kadi ya malipo, unganisha pochi na ulipe — au nakili anwani ya amana. Tumia mtandao sahihi pekee. Weka ukurasa wazi hadi uthibitishwe; salio la USD linaongezwa baada ya uthibitisho.',
    },
  },
  {
    id: 'networks',
    link: '/networks',
    keywords: [
      'network', 'chain', 'polygon', 'bsc', 'arbitrum', 'optimism', 'base', 'avalanche', 'sepolia', 'ethereum',
      'réseau', 'mtandao',
    ],
    answers: {
      en: 'StackPay supports major EVM networks including Ethereum, Polygon, BNB Chain, Arbitrum, Optimism, Base, Avalanche, and Sepolia testnet. Always choose the same network in the app and in your wallet when depositing or withdrawing. See Networks in the menu for the full list.',
      fr: 'StackPay prend en charge les principaux réseaux EVM : Ethereum, Polygon, BNB Chain, Arbitrum, Optimism, Base, Avalanche et Sepolia. Choisissez toujours le même réseau dans l\'app et dans votre portefeuille. Voir Réseaux dans le menu.',
      sw: 'StackPay inaunga mkono mitandao kuu ya EVM: Ethereum, Polygon, BNB Chain, Arbitrum, Optimism, Base, Avalanche, na Sepolia. Chagua mtandao ule ule kwenye programu na pochi. Angalia Mitandao kwenye menyu.',
    },
  },
  {
    id: 'packages',
    link: '/packages',
    keywords: [
      'package', 'invest', 'investment', 'daily', 'income', 'earn', 'portfolio', 'tier', 'return',
      'forfait', 'investir', 'revenu', 'kifurushi', 'wekeza', 'uwekezaji', 'mapato',
    ],
    answers: {
      en: 'Investment packages use your USD balance to earn daily income that returns to your main USD balance (withdrawable). Open Packages, pick a tier and amount within the limits, confirm, then track positions in Package portfolio.',
      fr: 'Les forfaits d\'investissement utilisent votre solde USD pour un revenu quotidien qui revient sur votre solde USD principal (retirable). Ouvrez Forfaits, choisissez un palier et un montant, confirmez, puis suivez le portefeuille des forfaits.',
      sw: 'Vifurushi vya uwekezaji vinatumia salio lako la USD kupata mapato ya kila siku yanayorudi kwenye salio kuu la USD (yanayoweza kutolewa). Fungua Vifurushi, chagua kiwango na kiasi, thibitisha, kisha fuata kwingineko ya vifurushi.',
    },
  },
  {
    id: 'mining',
    link: '/mining',
    keywords: [
      'mining', 'mine', 'cloud mining', 'miner', 'hash', 'session', 'mining balance', 'yield',
      'minage', 'uchimbaji', 'kikao',
    ],
    answers: {
      en: 'Cloud mining: open Mining, choose a plan, and start a session (some plans may be free). Sessions often last about 24 hours, then stop — you can start again. Mining income goes to a separate mining balance that is not withdrawable like package USD. Track sessions in Mining portfolio.',
      fr: 'Minage cloud : ouvrez Minage, choisissez un plan et démarrez une session (certains plans peuvent être gratuits). Les sessions durent souvent ~24 h, puis s\'arrêtent — vous pouvez relancer. Les revenus vont sur un solde minage séparé, non retirable comme le USD des forfaits. Suivez le portefeuille minage.',
      sw: 'Uchimbaji wa cloud: fungua Uchimbaji, chagua mpango, anza kikao (baadhi vinaweza kuwa bure). Vikao mara nyingi huchukua ~saa 24 kisha husimama — unaweza kuanza tena. Mapato yanaenda kwenye salio tofauti la uchimbaji ambalo haliwezi kutolewa kama USD ya vifurushi. Fuata kwingineko ya uchimbaji.',
    },
  },
  {
    id: 'withdraw',
    link: '/withdraw',
    keywords: [
      'withdraw', 'withdrawal', 'cash out', 'payout', 'retrait', 'retirer', 'toa', 'utoaji',
    ],
    answers: {
      en: 'To withdraw: open Withdraw, choose USDC or USDT and a network, enter your wallet address (you can save it), and confirm. Min/max limits and any fee are shown on that page. Track status in Withdraw history.',
      fr: 'Pour retirer : ouvrez Retrait, choisissez USDC ou USDT et un réseau, entrez votre adresse de portefeuille (vous pouvez la sauvegarder), puis confirmez. Les limites et frais s\'affichent sur la page. Suivez l\'historique des retraits.',
      sw: 'Kutoa: fungua Utoaji, chagua USDC au USDT na mtandao, weka anwani ya pochi (unaweza kuihifadhi), kisha thibitisha. Vikomo na ada vinaonyeshwa kwenye ukurasa. Fuata historia ya utoaji.',
    },
  },
  {
    id: 'transfer',
    link: '/transfer',
    keywords: [
      'transfer', 'send', 'peer', 'member', 'internal', 'p2p', 'transfert', 'envoyer', 'hamisha', 'tuma',
    ],
    answers: {
      en: 'Internal transfers move USD between StackPay members instantly with no blockchain gas fee. Open Transfer, find the user (@username, email, or phone), enter the amount, and confirm.',
      fr: 'Les transferts internes déplacent des USD entre membres StackPay instantanément, sans frais de gas. Ouvrez Transfert, trouvez l\'utilisateur (@username, e-mail ou téléphone), entrez le montant et confirmez.',
      sw: 'Uhamisho wa ndani unasogeza USD kati ya wanachama wa StackPay papo hapo bila ada ya gas. Fungua Uhamisho, tafuta mtumiaji (@username, barua pepe, au simu), weka kiasi, thibitisha.',
    },
  },
  {
    id: 'referrals',
    link: '/referrals',
    keywords: [
      'referral', 'invite', 'invitation', 'commission', 'invite code', 'refer', 'friend',
      'parrainage', 'rufaa', 'mwaliko', 'kamisheni',
    ],
    answers: {
      en: 'Every member gets an invite code and link on Referrals. When someone you invited makes their first package investment, you earn a commission on your USD balance. Track invites and earnings on that page.',
      fr: 'Chaque membre reçoit un code et un lien d\'invitation dans Parrainage. Quand une personne invitée fait son premier investissement forfait, vous gagnez une commission sur votre solde USD.',
      sw: 'Kila mwanachama anapata msimbo na kiungo cha mwaliko kwenye Rufaa. Mtu uliyemwalika akifanya uwekezaji wake wa kwanza wa kifurushi, unapata kamisheni kwenye salio la USD.',
    },
  },
  {
    id: 'loans',
    link: '/loan',
    keywords: [
      'loan', 'borrow', 'advance', 'repay', 'repayment', 'eligibility', 'prêt', 'emprunter', 'mkopo', 'kopa',
    ],
    answers: {
      en: 'Eligible members can borrow up to about 75% of their active package investment. Open Loans to see eligibility and terms. Repayment is typically taken automatically from daily package earnings.',
      fr: 'Les membres éligibles peuvent emprunter jusqu\'à environ 75 % de leur investissement forfait actif. Ouvrez Prêts pour voir l\'éligibilité et les conditions. Le remboursement est généralement automatique depuis les gains quotidiens.',
      sw: 'Wanachama wanaostahili wanaweza kukopa hadi takriban 75% ya uwekezaji wao hai wa kifurushi. Fungua Mikopo kuona ustahiki na masharti. Malipo kwa kawaida huchukuliwa kiotomatiki kutoka mapato ya kila siku.',
    },
  },
  {
    id: 'community',
    link: '/community',
    keywords: [
      'community', 'chat', 'channel', 'dm', 'message', 'direct message', 'communauté', 'jamii', 'gumzo', 'ujumbe',
    ],
    answers: {
      en: 'Community has public channels and private DMs so members can talk and get support. Open Community from the sidebar. Admins may also message you about pending deposits.',
      fr: 'La communauté propose des canaux publics et des messages privés (DM). Ouvrez Communauté dans le menu. Les admins peuvent aussi vous écrire au sujet des dépôts en attente.',
      sw: 'Jamii ina vijiji vya umma na ujumbe wa faragha (DM). Fungua Jamii kutoka menyu. Wasimamizi wanaweza pia kukutumia ujumbe kuhusu amana zinazosubiri.',
    },
  },
  {
    id: 'balance',
    link: '/dashboard',
    keywords: [
      'balance', 'usd', 'wallet balance', 'ledger', 'solde', 'salio', 'mkoba',
    ],
    answers: {
      en: 'Your main USD balance is credited from confirmed crypto deposits, package income, referral commissions, and transfers in. You spend it on packages, mining, transfers, loan activity, and withdrawals. Mining has a separate non-withdrawable mining balance. Check everything on the Dashboard.',
      fr: 'Votre solde USD principal est crédité par les dépôts confirmés, revenus de forfaits, commissions et transferts reçus. Vous l\'utilisez pour forfaits, minage, transferts, prêts et retraits. Le minage a un solde séparé non retirable. Tout est sur le Tableau de bord.',
      sw: 'Salio lako kuu la USD linaongezwa kutoka amana zilizothibitishwa, mapato ya vifurushi, kamisheni na uhamisho. Unatumia kwa vifurushi, uchimbaji, uhamisho, mikopo na utoaji. Uchimbaji una salio tofauti lisilotolewa. Angalia Dashibodi.',
    },
  },
  {
    id: 'fees',
    link: '/withdraw',
    keywords: ['fee', 'fees', 'cost', 'charge', 'free', 'gas', 'frais', 'ada', 'gharama', 'bure'],
    answers: {
      en: 'Internal transfers between StackPay members are free. On-chain deposits and withdrawals pay blockchain gas (and any withdraw fee shown in the app). Package and loan terms are shown before you confirm.',
      fr: 'Les transferts internes entre membres sont gratuits. Les dépôts et retraits on-chain paient le gas blockchain (et tout frais de retrait affiché). Les conditions forfait/prêt s\'affichent avant confirmation.',
      sw: 'Uhamisho wa ndani kati ya wanachama ni bure. Amana na utoaji wa on-chain hulipa gas ya blockchain (na ada yoyote ya utoaji inayoonyeshwa). Masharti ya vifurushi/mikopo yanaonekana kabla ya kuthibitisha.',
    },
  },
  {
    id: 'security',
    link: '/settings',
    keywords: [
      'secure', 'security', 'safe', 'private', 'password', 'seed', 'scam',
      'sécurité', 'sûr', 'usalama', 'salama', 'nenosiri',
    ],
    answers: {
      en: 'Never share your password or wallet seed phrase. Each deposit uses a unique address. Only use official StackPay links and double-check network + address before sending crypto. Manage profile and language in Settings.',
      fr: 'Ne partagez jamais votre mot de passe ou phrase secrète de portefeuille. Chaque dépôt a une adresse unique. Utilisez uniquement les liens officiels StackPay et vérifiez réseau + adresse avant d\'envoyer. Profil et langue dans Paramètres.',
      sw: 'Usishiriki nenosiri au maneno ya siri ya pochi. Kila amana ina anwani ya kipekee. Tumia viungo rasmi vya StackPay tu na hakiki mtandao + anwani kabla ya kutuma. Wasifu na lugha kwenye Mipangilio.',
    },
  },
  {
    id: 'settings',
    link: '/settings',
    keywords: [
      'settings', 'profile', 'language', 'avatar', 'french', 'swahili',
      'paramètres', 'profil', 'langue', 'mipangilio', 'wasifu', 'lugha', 'kiswahili',
    ],
    answers: {
      en: 'Open Settings to update your profile, avatar, and language (English, French, Swahili). You can also install StackPay as a mobile app from your browser (Add to Home Screen).',
      fr: 'Ouvrez Paramètres pour mettre à jour profil, avatar et langue (anglais, français, swahili). Vous pouvez aussi installer StackPay comme app mobile (Ajouter à l\'écran d\'accueil).',
      sw: 'Fungua Mipangilio kusasisha wasifu, picha, na lugha (Kiingereza, Kifaransa, Kiswahili). Unaweza pia kusakinisha StackPay kama programu ya simu (Ongeza kwenye Skrini ya Nyumbani).',
    },
  },
  {
    id: 'signup',
    link: '/register',
    keywords: [
      'sign up', 'signup', 'register', 'create account', 'join', 'account',
      'inscription', 'créer compte', 'jisajili', 'unda akaunti',
    ],
    answers: {
      en: 'Create a free account with email, phone, or both. Accept Terms and Privacy. An invite code is optional and links you to the member who invited you. Then log in to open your dashboard.',
      fr: 'Créez un compte gratuit avec e-mail, téléphone ou les deux. Acceptez les Conditions et la Confidentialité. Un code d\'invitation est optionnel. Ensuite connectez-vous pour ouvrir le tableau de bord.',
      sw: 'Unda akaunti bure kwa barua pepe, simu, au zote. Kubali Masharti na Faragha. Msimbo wa mwaliko si lazima. Kisha ingia kufungua dashibodi.',
    },
  },
  {
    id: 'login',
    link: '/login',
    keywords: ['log in', 'login', 'sign in', 'password', 'connexion', 'ingia', 'nenosiri'],
    answers: {
      en: 'Use Log in with your username, email, or phone plus password. After login you land on the dashboard where you can deposit, invest, and manage your wallet.',
      fr: 'Utilisez Se connecter avec nom d\'utilisateur, e-mail ou téléphone et mot de passe. Après connexion vous arrivez sur le tableau de bord.',
      sw: 'Tumia Ingia kwa jina la mtumiaji, barua pepe, au simu na nenosiri. Baada ya kuingia unaenda kwenye dashibodi.',
    },
  },
  {
    id: 'guide',
    link: '/guide',
    keywords: ['guide', 'documentation', 'tutorial', 'learn', 'help', 'mwongozo', 'nyaraka'],
    answers: {
      en: 'The free public user guide is at /guide — no payment required. It covers sign-up, payments, packages, mining, withdrawals, and more. Developer API docs are separate at /docs.',
      fr: 'Le guide public gratuit est sur /guide — sans paiement. Il couvre inscription, paiements, forfaits, minage, retraits, etc. La doc API développeur est sur /docs.',
      sw: 'Mwongozo wa umma bure uko /guide — bila malipo. Unaashiria usajili, malipo, vifurushi, uchimbaji, utoaji, n.k. Nyaraka za API ziko /docs.',
    },
  },
  {
    id: 'api',
    link: '/docs',
    keywords: ['api', 'developer', 'docs', 'integrate', 'rest', 'webhook', 'développeur', 'msanidi'],
    answers: {
      en: 'Developer API documentation is at /docs. Full REST/WebSocket reference unlocks after a one-time payment (Individual / Company in USDC on Polygon). Member product help does not require that unlock.',
      fr: 'La documentation API est sur /docs. La référence complète se déverrouille après un paiement unique (Individuel / Entreprise en USDC sur Polygon).',
      sw: 'Nyaraka za API ziko /docs. Rejea kamili inafunguliwa baada ya malipo ya mara moja (Binafsi / Kampuni kwa USDC kwenye Polygon).',
    },
  },
];

function normalize(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function scoreTopic(query, topic) {
  const q = normalize(query);
  if (!q) return 0;
  let score = 0;
  for (const keyword of topic.keywords) {
    const k = normalize(keyword);
    if (!k) continue;
    if (q.includes(k)) score += k.includes(' ') ? 5 : 2.5;
  }
  const words = q.split(' ').filter((w) => w.length > 2);
  const answerBlob = normalize(Object.values(topic.answers).join(' '));
  for (const word of words) {
    if (answerBlob.includes(word)) score += 0.35;
  }
  return score;
}

function fallbackAnswer(language) {
  const map = {
    en: "Hmm, I'm not 100% sure what you mean yet — but I'm here for you. Ask me about deposits, packages, mining, transfers, withdrawals, loans, referrals, community, or settings. Or say “what can I do?” and I'll give you the full tour.",
    fr: "Hmm, je ne suis pas encore sûr de ce que tu veux dire — mais je suis là. Parle-moi des dépôts, forfaits, minage, transferts, retraits, prêts, parrainages, communauté ou paramètres. Ou dis « que puis-je faire ? » pour le tour complet.",
    sw: "Hmm, bado sijaelewa vizuri unachomaanisha — lakini niko hapa. Niulize kuhusu amana, vifurushi, uchimbaji, uhamisho, utoaji, mikopo, rufaa, jamii au mipangilio. Au sema “ninaweza kufanya nini?” nikupe muhtasari.",
  };
  return map[language] || map.en;
}

const TOPIC_LABELS = {
  overview: { en: 'how StackPay works overall', fr: 'le fonctionnement global de StackPay', sw: 'jinsi StackPay inavyofanya kazi kwa ujumla' },
  deposit: { en: 'deposits & paying with crypto', fr: 'les dépôts et paiements crypto', sw: 'amana na kulipa kwa crypto' },
  networks: { en: 'supported networks', fr: 'les réseaux supportés', sw: 'mitandao inayoungwa mkono' },
  packages: { en: 'investment packages', fr: 'les forfaits d’investissement', sw: 'vifurushi vya uwekezaji' },
  mining: { en: 'cloud mining', fr: 'le minage cloud', sw: 'uchimbaji wa cloud' },
  withdraw: { en: 'withdrawals', fr: 'les retraits', sw: 'utoaji' },
  transfer: { en: 'transfers to other members', fr: 'les transferts entre membres', sw: 'uhamisho kwa wanachama wengine' },
  referrals: { en: 'referrals & invite rewards', fr: 'le parrainage et les invitations', sw: 'rufaa na zawadi za mwaliko' },
  loans: { en: 'loans', fr: 'les prêts', sw: 'mikopo' },
  community: { en: 'community chat', fr: 'la communauté et le chat', sw: 'gumzo la jamii' },
  balance: { en: 'your USD balance', fr: 'ton solde USD', sw: 'salio lako la USD' },
  fees: { en: 'fees', fr: 'les frais', sw: 'ada' },
  security: { en: 'security tips', fr: 'la sécurité', sw: 'usalama' },
  settings: { en: 'settings & language', fr: 'les paramètres et la langue', sw: 'mipangilio na lugha' },
  signup: { en: 'creating an account', fr: 'créer un compte', sw: 'kuunda akaunti' },
  login: { en: 'logging in', fr: 'la connexion', sw: 'kuingia' },
  guide: { en: 'the user guide', fr: 'le guide utilisateur', sw: 'mwongozo wa mtumiaji' },
  api: { en: 'developer API docs', fr: 'la doc API développeur', sw: 'nyaraka za API' },
};

const CHAT = {
  en: {
    openers: [
      'Sure — happy to help.',
      'Got it.',
      'Good question.',
      'Of course.',
      'Yep, I can walk you through that.',
      'Alright, here’s the simple version.',
    ],
    ack: (label) => `You’re asking about ${label}.`,
    related: 'Oh, and this is also useful:',
    followUps: [
      'Want me to also explain deposits, packages, or withdrawals next?',
      'Anything else you’re stuck on?',
      'If you want, tell me what you’re trying to do and I’ll guide the next step.',
      'Need the step-by-step for another part of StackPay?',
    ],
    greetings: [
      'Hey! 👋 I’m your StackPay helper. Ask me anything about the app — deposits, packages, mining, withdrawals… I’m chatting with you using our product guide (no external AI).',
      'Hi there! What do you need help with today? Deposits, earning, withdrawing, or something else?',
    ],
    thanks: [
      'You’re welcome! Anytime you get stuck, just message me here.',
      'Glad that helped! Ask again whenever you need.',
    ],
    bye: [
      'Talk soon! Open Need help? anytime if you get stuck.',
      'Catch you later — I’m here whenever you need a hand.',
    ],
    howAreYou: [
      'I’m doing great, thanks for asking — ready to help you with StackPay. What do you want to do in the app?',
    ],
  },
  fr: {
    openers: [
      'Bien sûr — avec plaisir.',
      'Compris.',
      'Bonne question.',
      'Carrément.',
      'Oui, je t’explique simplement.',
      'Ok, voici la version claire.',
    ],
    ack: (label) => `Tu poses une question sur ${label}.`,
    related: 'Au fait, ça peut aussi t’aider :',
    followUps: [
      'Tu veux que je t’explique aussi les dépôts, forfaits ou retraits ?',
      'Autre chose qui te bloque ?',
      'Dis-moi ce que tu veux faire, je te guide à l’étape suivante.',
      'Besoin du pas-à-pas pour une autre partie de StackPay ?',
    ],
    greetings: [
      'Salut ! 👋 Je suis ton aide StackPay. Pose-moi tes questions sur l’app — dépôts, forfaits, minage, retraits… Je discute avec toi à partir de notre guide produit (sans clé API).',
      'Hey ! De quoi as-tu besoin aujourd’hui ? Dépôts, gains, retraits… ?',
    ],
    thanks: [
      'Avec plaisir ! Écris-moi dès que tu bloques.',
      'Content d’avoir aidé ! Reviens quand tu veux.',
    ],
    bye: [
      'À bientôt ! Rouvre « Need help? » si tu bloques.',
      'À plus — je suis là dès que tu as besoin.',
    ],
    howAreYou: [
      'Ça va super, merci — prêt à t’aider sur StackPay. Que veux-tu faire dans l’app ?',
    ],
  },
  sw: {
    openers: [
      'Sawa — niko tayari kukusaidia.',
      'Nimeelewa.',
      'Swali zuri.',
      'Ndio, nitaeleza kwa urahisi.',
      'Sawa, hii ndiyo toleo rahisi.',
      'Hakuna shida.',
    ],
    ack: (label) => `Unauliza kuhusu ${label}.`,
    related: 'Na hii pia inaweza kukusaidia:',
    followUps: [
      'Unataka nieleze pia amana, vifurushi, au utoaji?',
      'Kuna kingine kinachokushinda?',
      'Niambie unachotaka kufanya, nikuongoze hatua ijayo.',
      'Unahitaji hatua kwa sehemu nyingine ya StackPay?',
    ],
    greetings: [
      'Habari! 👋 Mimi ni msaidizi wako wa StackPay. Niulize chochote kuhusu programu — amana, vifurushi, uchimbaji, utoaji… Ninaongea nawe kutoka mwongozo wetu (bila API key).',
      'Mambo! Unahitaji msaada gani leo? Amana, mapato, utoaji…?',
    ],
    thanks: [
      'Karibu sana! Niandikie ukikwama tena.',
      'Nimefurahi kusaidia! Uliza tena wakati wowote.',
    ],
    bye: [
      'Tutaonana! Fungua Need help? ukikwama.',
      'Baadaye — niko hapa unapohitaji msaada.',
    ],
    howAreYou: [
      'Nzuri sana, asante — niko tayari kukusaidia kwenye StackPay. Unataka kufanya nini kwenye programu?',
    ],
  },
};

function pick(list, seed) {
  if (!list?.length) return '';
  const n = Math.abs(hashSeed(seed)) % list.length;
  return list[n];
}

function hashSeed(text) {
  let h = 0;
  const s = String(text || '');
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

function detectSmallTalk(question, lang) {
  const q = normalize(question);
  const chat = CHAT[lang] || CHAT.en;
  if (/^(hi|hello|hey|yo|saluti?|bonjour|salut|bonsoir|habari|mambo|niaje)\b/.test(q) || q.length < 12 && /^(hi|hey|hello|salut|habari)\b/.test(q)) {
    return { answer: pick(chat.greetings, q + Date.now()), link: '/dashboard', matched: true, topicId: 'smalltalk' };
  }
  if (/\b(thanks|thank you|thx|merci|asante|shukrani)\b/.test(q)) {
    return { answer: pick(chat.thanks, q), link: null, matched: true, topicId: 'thanks' };
  }
  if (/\b(bye|goodbye|see you|a plus|au revoir|baadaye|tutaonana)\b/.test(q)) {
    return { answer: pick(chat.bye, q), link: null, matched: true, topicId: 'bye' };
  }
  if (/\b(how are you|ca va|ça va|habari yako|uko poa)\b/.test(q)) {
    return { answer: pick(chat.howAreYou, q), link: '/dashboard', matched: true, topicId: 'howto' };
  }
  return null;
}

function lastAssistantTopic(history) {
  if (!Array.isArray(history)) return null;
  for (let i = history.length - 1; i >= 0; i -= 1) {
    const turn = history[i];
    if ((turn?.role === 'assistant' || turn?.role === 'bot') && turn.topicId) {
      return turn.topicId;
    }
  }
  return null;
}

function craftConversationalAnswer({ question, lang, best, second, history }) {
  const chat = CHAT[lang] || CHAT.en;
  const seed = `${question}|${best.topic.id}|${history?.length || 0}`;
  const label = TOPIC_LABELS[best.topic.id]?.[lang] || TOPIC_LABELS[best.topic.id]?.en || best.topic.id;
  const fact = best.topic.answers[lang] || best.topic.answers.en;

  const parts = [];
  parts.push(pick(chat.openers, seed));
  parts.push(chat.ack(label));
  parts.push(fact);

  if (second && second.score >= best.score * 0.75 && second.score >= 2.5) {
    const tip = second.topic.answers[lang] || second.topic.answers.en;
    parts.push(`${chat.related} ${tip}`);
  }

  // Avoid repeating the exact same follow-up every time in a long chat
  const follow = pick(chat.followUps, seed + String(lastAssistantTopic(history) || ''));
  parts.push(follow);

  return parts.filter(Boolean).join('\n\n');
}

/**
 * Answer from StackPay system knowledge in a natural chat style (no external AI).
 */
export function answerFromSystemKnowledge(question, { language = 'en', context = 'default', history = [] } = {}) {
  const lang = ['en', 'fr', 'sw'].includes(language) ? language : 'en';

  const small = detectSmallTalk(question, lang);
  if (small) {
    return {
      ...small,
      source: 'knowledge',
      score: 10,
    };
  }

  const scored = SYSTEM_TOPICS.map((topic) => ({
    topic,
    score: scoreTopic(question, topic),
  }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score);

  if (context === 'developer') {
    const api = scored.find((r) => r.topic.id === 'api');
    if (api) {
      scored.splice(scored.indexOf(api), 1);
      scored.unshift(api);
    }
  }

  const best = scored[0];
  if (!best || best.score < 1.5) {
    const chat = CHAT[lang] || CHAT.en;
    return {
      answer: `${pick(chat.openers, question)}\n\n${fallbackAnswer(lang)}`,
      link: guessHelpLink(question) || '/guide',
      source: 'knowledge',
      matched: false,
      topicId: null,
      score: best?.score || 0,
    };
  }

  const answer = craftConversationalAnswer({
    question,
    lang,
    best,
    second: scored[1],
    history,
  });

  return {
    answer,
    link: best.topic.link || guessHelpLink(question),
    source: 'knowledge',
    matched: true,
    topicId: best.topic.id,
    score: best.score,
  };
}

export function listSystemTopicIds() {
  return SYSTEM_TOPICS.map((t) => t.id);
}

export { HELP_LINK_HINTS };
