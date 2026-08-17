import {
  DEVELOPER_HELP_GREETING,
  DEVELOPER_QUICK_QUESTIONS,
  DEVELOPER_GUIDANCE_ENTRIES,
} from './developerGuidance.js';

export const HELP_BOT_GREETING =
  'Hi! I\'m the StackPay help bot. Ask me about sign-up, payments, packages, withdrawals, referrals, loans, or read the free user guide at /guide.';

export const HELP_BOT_FALLBACK =
  'I\'m not sure about that yet. Try asking about sign-up, crypto payments, investment packages, withdrawals, referrals, or loans. You can also read the free user guide at /guide or create a free account to explore the dashboard.';

export { DEVELOPER_HELP_GREETING, DEVELOPER_QUICK_QUESTIONS, DEVELOPER_GUIDANCE_ENTRIES };

export const HELP_BOT_QUICK_QUESTIONS = [
  'How do I create an account?',
  'Where is the user guide?',
  'Which crypto networks are supported?',
  'How do investment packages work?',
  'How do withdrawals work?',
];

export const HELP_BOT_KNOWLEDGE = [
  {
    id: 'signup',
    question: 'How do I create an account?',
    keywords: ['sign up', 'signup', 'register', 'create account', 'join', 'account', 'email', 'phone'],
    answer:
      'Click Get started or Create free account on the landing page. You can register with email, phone, or both. You must accept the Terms of Use and Privacy Policy. An invitation code is optional and links you to the member who invited you.',
  },
  {
    id: 'login',
    question: 'How do I log in?',
    keywords: ['log in', 'login', 'sign in', 'password', 'forgot'],
    answer:
      'Use Log in from the top menu. Sign in with your username, email, or phone plus your password. After login you\'ll land on your dashboard.',
  },
  {
    id: 'payments',
    question: 'How do crypto payments work?',
    keywords: ['payment', 'pay', 'deposit', 'fund', 'crypto', 'wallet', 'usdc', 'usdt', 'eth', 'address'],
    answer:
      'Create a payment request in the app, receive a unique deposit address, and pay from any crypto wallet on a supported EVM network. You can also copy the deposit address and send manually. After the deposit is confirmed and swept to treasury, your USD balance is credited.',
  },
  {
    id: 'networks',
    question: 'Which networks are supported?',
    keywords: ['network', 'chain', 'polygon', 'bsc', 'arbitrum', 'optimism', 'base', 'avalanche', 'sepolia', 'ethereum'],
    answer:
      'StackPay supports major EVM networks including Ethereum, Polygon, BNB Chain, Arbitrum, Optimism, Base, Avalanche, and Sepolia testnet. Payments and withdrawals use the network you select for each request.',
  },
  {
    id: 'packages',
    question: 'How do investment packages work?',
    keywords: ['package', 'invest', 'investment', 'daily', 'income', 'earn', 'portfolio', 'tier', 'return'],
    answer:
      'Put your USD balance into tiered investment packages to earn daily income. Browse packages in the app, choose an amount within each tier\'s limits, and track active investments in your portfolio. Income accrues automatically on schedule.',
  },
  {
    id: 'withdraw',
    question: 'How do withdrawals work?',
    keywords: ['withdraw', 'withdrawal', 'cash out', 'payout', 'wallet', 'saved wallet'],
    answer:
      'Withdraw your USD balance as USDC or USDT to your crypto wallet on supported networks. You can save your wallet address for faster future withdrawals. Minimum and maximum limits apply and are shown in the withdraw section.',
  },
  {
    id: 'transfer',
    question: 'Can I transfer to other users?',
    keywords: ['transfer', 'send', 'peer', 'member', 'internal', 'p2p'],
    answer:
      'Yes. StackPay supports instant internal transfers between members. Send USD balance to another StackPay user from the transfer page — no blockchain fees for internal moves.',
  },
  {
    id: 'referrals',
    question: 'How does the referral program work?',
    keywords: ['referral', 'invite', 'invitation', 'commission', 'invite code', 'refer', 'friend'],
    answer:
      'Every member gets a personal invite code and link. When someone you invited makes their first package investment, you earn a referral commission credited to your USD balance. Track invites and earnings on the referrals page.',
  },
  {
    id: 'loans',
    question: 'How do loans work?',
    keywords: ['loan', 'borrow', 'advance', 'repay', 'repayment', 'eligibility'],
    answer:
      'Eligible members can borrow up to 75% of their active investment as a loan. Repayment is handled automatically from daily package earnings, with interest applied according to the loan terms shown in the app.',
  },
  {
    id: 'community',
    question: 'What is the community feature?',
    keywords: ['community', 'chat', 'channel', 'dm', 'message', 'direct message', 'profile'],
    answer:
      'StackPay includes community channels and direct messages so members can coordinate and stay connected. Profile images appear in chat, member lists, and referral teams.',
  },
  {
    id: 'mobile',
    question: 'Can I install StackPay on my phone?',
    keywords: ['mobile', 'app', 'pwa', 'install', 'iphone', 'android', 'home screen'],
    answer:
      'Yes. StackPay is a progressive web app (PWA). On mobile, use your browser\'s Add to Home Screen option to install it like a native app with a full-screen experience.',
  },
  {
    id: 'balance',
    question: 'How does my USD balance work?',
    keywords: ['balance', 'usd', 'wallet balance', 'track', 'ledger'],
    answer:
      'Your USD balance is the central wallet inside StackPay. Crypto payments, package income, referral commissions, loan activity, transfers, and withdrawals all flow through this single balance you can view anytime on the dashboard.',
  },
  {
    id: 'fees',
    question: 'Are there fees?',
    keywords: ['fee', 'fees', 'cost', 'charge', 'free'],
    answer:
      'Internal transfers between StackPay members are free. Crypto network gas fees apply for on-chain deposits and withdrawals depending on the blockchain you use. Package and loan terms are shown before you confirm any action.',
  },
  {
    id: 'security',
    question: 'Is StackPay secure?',
    keywords: ['secure', 'security', 'safe', 'private', 'password'],
    answer:
      'Accounts use secure password hashing and session tokens. Each payment gets a unique deposit address. Never share your password or seed phrase. Only use official StackPay links and verify wallet addresses before sending crypto.',
  },
  {
    id: 'guide',
    question: 'Where is the user guide?',
    keywords: ['guide', 'help', 'documentation', 'how to', 'tutorial', 'learn', 'public'],
    answer:
      'The free public user guide is at /guide on the StackPay website. It explains sign-up, payments, packages, withdrawals, referrals, loans, community, and more — no account or payment required. Developer API reference is separate at /docs.',
  },
  {
    id: 'support',
    question: 'How do I get human support?',
    keywords: ['support', 'help', 'contact', 'human', 'team', 'issue', 'problem'],
    answer:
      'For general product questions, read the free user guide at /guide or keep chatting with this help bot. For account-specific help, sign in and reach out through community channels or your team contacts.',
  },
  {
    id: 'api',
    question: 'Where is the developer API documentation?',
    keywords: ['api', 'developer', 'documentation', 'docs', 'integrate', 'rest', 'webhook'],
    answer:
      'StackPay developer documentation lives at /docs. The page is always visible, but the full REST and WebSocket reference unlocks after a one-time payment ($100 Individual / $250 Company in USDC on Polygon). Register on that page or ask the help bot there for step-by-step guidance.',
  },
  {
    id: 'terms',
    question: 'Where are the Terms and Privacy Policy?',
    keywords: ['terms', 'privacy', 'policy', 'legal', 'cookies'],
    answer:
      'Terms of Use and Privacy Policy links are in the site footer. You must accept both when creating an account. Cookie preferences can be managed from the banner when you first visit.',
  },
];
