/** Shared developer guidance — used by the help bot and /docs page. */

export const DEVELOPER_HELP_GREETING =
  'Hi! I can help you unlock StackPay API docs, explain pricing and payment steps, and guide you through integration.';

export const DEVELOPER_QUICK_QUESTIONS = [
  'How do I unlock the API documentation?',
  'What does API access cost?',
  'How do I pay for developer access?',
  'How do I authenticate API requests?',
  'What is included in the API docs?',
];

export const DEVELOPER_UNLOCK_STEPS = [
  {
    step: 1,
    title: 'Register your developer profile',
    detail:
      'Enter your name and email on this page. Choose Individual ($100) for solo developers or Company ($250) for teams — company registrations require a company name.',
  },
  {
    step: 2,
    title: 'Receive a deposit address',
    detail:
      'After registration you get a unique USDC deposit address on Polygon. Send the exact unlock amount shown — not more, not less.',
  },
  {
    step: 3,
    title: 'Pay in USDC on Polygon',
    detail:
      'Use any wallet that supports Polygon and USDC — browser extension, mobile app, or exchange withdrawal. Confirm the network is Polygon (chain ID 137) before sending.',
  },
  {
    step: 4,
    title: 'Wait for confirmation',
    detail:
      'This page checks payment status every 10 seconds. Once your transaction is confirmed on-chain, the full API reference unlocks automatically.',
  },
  {
    step: 5,
    title: 'Start integrating',
    detail:
      'Use the REST endpoints and WebSocket events in the unlocked docs. Authenticate user actions with JWT tokens from login or registration.',
  },
];

export const DEVELOPER_INTEGRATION_STEPS = [
  {
    step: 1,
    title: 'Set your base URL',
    detail:
      'Point requests to your StackPay API host. In local development that is http://localhost:3001; in production use your deployed API domain.',
  },
  {
    step: 2,
    title: 'Obtain a user token',
    detail:
      'Register or log in a StackPay member via POST /api/auth/register or POST /api/auth/login. Include the returned JWT as Authorization: Bearer <token> on protected routes.',
  },
  {
    step: 3,
    title: 'Explore public endpoints first',
    detail:
      'Try GET /health, GET /api/config, and GET /api/networks without authentication to verify connectivity and supported chains.',
  },
  {
    step: 4,
    title: 'Build payment flows',
    detail:
      'Create payment requests, poll status, and credit balances using the Payments section. Each request returns a unique on-chain deposit address.',
  },
  {
    step: 5,
    title: 'Subscribe to realtime events',
    detail:
      'Connect to /ws/community for live community updates. Use the WebSocket section in these docs for message formats and event types.',
  },
];

export const DEVELOPER_GUIDANCE_ENTRIES = [
  {
    id: 'api-unlock',
    context: 'developer',
    question: 'How do I unlock the API documentation?',
    keywords: [
      'unlock',
      'api docs',
      'documentation',
      'access',
      'paywall',
      'developer access',
      'view docs',
      'full reference',
    ],
    answer:
      'Go to /docs on the StackPay website. Register with your name and email, choose Individual ($100) or Company ($250), then pay the exact USDC amount on Polygon to the deposit address shown. The full REST and WebSocket reference unlocks automatically after on-chain confirmation.',
  },
  {
    id: 'api-pricing',
    context: 'developer',
    question: 'What does API access cost?',
    keywords: ['price', 'pricing', 'cost', 'fee', '100', '250', 'individual', 'company', 'usd'],
    answer:
      'API documentation unlock is a one-time payment: $100 USDC for Individual developers and $250 USDC for Company accounts. Payment is on Polygon only. This unlocks the full developer reference — it is separate from StackPay member accounts and investment packages.',
  },
  {
    id: 'api-payment',
    context: 'developer',
    question: 'How do I pay for developer access?',
    keywords: ['pay', 'payment', 'usdc', 'polygon', 'deposit', 'wallet', 'send', 'address'],
    answer:
      'After registering on /docs, copy the deposit address and send exactly the listed USDC amount on Polygon (not Ethereum mainnet). Keep this page open — it refreshes every 10 seconds and unlocks the docs when your payment confirms. Use "Use a different email" if you need to restart with another address.',
  },
  {
    id: 'api-after-unlock',
    context: 'developer',
    question: 'What happens after I pay?',
    keywords: ['after pay', 'confirmed', 'unlocked', 'access token', 'browser', 'remember'],
    answer:
      'Once payment is confirmed, the blurred documentation becomes fully readable on this device. Your browser stores an access token so you can return to /docs without paying again. If you clear browser data, use the same email to register — an already-paid account is recognized automatically.',
  },
  {
    id: 'api-included',
    context: 'developer',
    question: 'What is included in the API docs?',
    keywords: ['included', 'endpoints', 'rest', 'websocket', 'reference', 'integrate', 'coverage'],
    answer:
      'Unlocked docs cover authentication, public API, accounts, payments, packages, transfers, withdrawals, referrals, loans, community, WebSocket events, admin endpoints, and error codes. Use them to build integrations on top of StackPay.',
  },
  {
    id: 'api-auth',
    context: 'developer',
    question: 'How do I authenticate API requests?',
    keywords: ['authenticate', 'auth', 'jwt', 'bearer', 'token', 'login', 'header', 'authorization'],
    answer:
      'Member endpoints require a JWT from POST /api/auth/login or POST /api/auth/register. Send Authorization: Bearer <token> on each request. Tokens expire after 7 days. Admin routes need a user with the ADMIN role. The docs unlock fee is separate — it only grants read access to the reference, not API credentials.',
  },
  {
    id: 'api-vs-account',
    context: 'developer',
    question: 'Do I need a StackPay member account for API docs?',
    keywords: ['member account', 'stackpay account', 'separate', 'register account', 'dashboard'],
    answer:
      'Developer doc unlock and StackPay member registration are separate. You can unlock /docs with just an email and name for the unlock payment. To call authenticated member APIs in production, you or your users still need StackPay accounts — create one from the landing page or use the auth endpoints documented after unlock.',
  },
  {
    id: 'api-integration',
    context: 'developer',
    question: 'How do I start integrating with StackPay?',
    keywords: ['integrate', 'integration', 'getting started', 'first request', 'base url', 'connect'],
    answer:
      'After unlocking /docs: (1) set your API base URL, (2) call GET /health to verify connectivity, (3) obtain a JWT via auth endpoints for user-scoped calls, (4) follow the Payments and Packages sections for core flows, (5) optionally connect to /ws/community for realtime updates. Ask this help bot any step along the way.',
  },
];
