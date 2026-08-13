# StackPay

Stack your earnings — crypto payments, investment packages, referrals, and wallet withdrawals in one platform.

Accept crypto via MetaMask. Each payer gets a **unique deposit address**; confirmed funds are automatically swept to your treasury wallet.

## How It Works

```
Payer → MetaMask → Unique deposit address → Auto-sweep → Your treasury wallet
```

1. **Create payment** — Enter amount; the system generates a unique Ethereum address for that payer
2. **Pay with MetaMask** — Payer connects MetaMask and sends ETH to their deposit address
3. **Balance monitoring** — Backend polls the blockchain every 15 seconds to detect incoming payments
4. **Auto-collect** — Confirmed funds are swept from deposit addresses to your main `TREASURY_ADDRESS`

## Tech Stack

| Layer    | Technology              |
|----------|-------------------------|
| Frontend | React, Tailwind CSS, Vite |
| Wallet   | MetaMask + ethers.js    |
| Backend  | Node.js, Express        |
| Database | PostgreSQL, Prisma ORM  |

## Prerequisites

- Node.js 18+
- PostgreSQL running locally (or a hosted instance)
- [MetaMask](https://metamask.io/) browser extension
- Sepolia testnet ETH for testing ([faucet](https://sepoliafaucet.com/))

## Supported Networks & Tokens

| Network | Native | Tokens |
|---------|--------|--------|
| Ethereum Mainnet | ETH | USDC, USDT, WBTC |
| Polygon | POL | USDC, USDT |
| BNB Smart Chain | BNB | USDC, USDT |
| Arbitrum One | ETH | USDC, USDT |
| Optimism | ETH | USDC, USDT |
| Base | ETH | USDC |
| Avalanche | AVAX | USDC, USDT |
| Sepolia (testnet) | ETH | — |

**Bitcoin note:** Native BTC uses different addresses than MetaMask EVM wallets. For Bitcoin-pegged payments via MetaMask, use **WBTC on Ethereum**.

Each payment stores its `chainId` and `tokenSymbol` — the monitor checks the correct network automatically.

## User Accounts

Users must **register and log in** to use StackPay:

1. **Sign Up** at `/register` — email, password, and name only
2. **Login** at `/login`
3. **Create a payment** — choose network, token, and amount
4. **Pay with MetaMask** on the payment page
5. **My Payments** — view your payment history in the dashboard

## Admin

Set admin credentials in `backend/.env`:

```env
ADMIN_EMAIL="admin@stackpay.com"
ADMIN_PASSWORD="your-secure-password"
```

On server start, the admin account is created or updated automatically. Admins can:

- View **all payments** and **all users**
- See platform stats (pending, confirmed, swept)
- Trigger **manual fund sweep** to treasury
- Access the admin panel at `/admin`

Add to `backend/.env`:
```env
JWT_SECRET="your-random-secret-key"
```

## Setup

### 1. Clone and install

```bash
cd stackpay
npm run install:all
```

### 2. Configure backend

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env`:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/crptopay?schema=public"
MASTER_MNEMONIC="word1 word2 word3 ... word12"   # Generate a NEW mnemonic — never reuse!
TREASURY_ADDRESS="0xYourMainMetaMaskAddress"     # Where swept funds go
DEFAULT_CHAIN_ID=11155111
```

Generate a secure mnemonic:

```bash
node -e "console.log(require('ethers').Wallet.createRandom().mnemonic.phrase)"
```

### 3. Set up the database

```bash
# Create the database (if needed)
createdb crptopay

# Push schema to PostgreSQL
npm run db:generate
npm run db:push
```

### 4. Run the app

**Terminal 1 — Backend:**
```bash
npm run dev:backend
```

**Terminal 2 — Frontend:**
```bash
npm run dev:frontend
```

Open **http://localhost:5173**

## Usage

1. Go to the home page and enter an amount (e.g. `0.001` ETH)
2. You get a unique deposit address on the payment page
3. Connect MetaMask (switch to Sepolia testnet)
4. Click **Pay with MetaMask**
5. The dashboard shows payment status; confirmed payments are swept automatically

## API Endpoints

| Method | Endpoint                  | Description                    |
|--------|---------------------------|--------------------------------|
| POST   | `/api/payments`           | Create payment + deposit address |
| GET    | `/api/payments/:id`       | Get payment status             |
| GET    | `/api/payments/:id/balance` | Live on-chain balance        |
| GET    | `/api/payments`           | List all payments              |
| POST   | `/api/payments/sweep`     | Manually trigger fund sweep    |
| GET    | `/api/config`             | Chain ID and treasury address  |

## Security Notes

- **Never commit `.env`** — it contains your master mnemonic
- **MASTER_MNEMONIC** controls all deposit addresses; store it securely (e.g. a secrets manager)
- Use **Sepolia testnet** for development; switch `RPC_URL` and `CHAIN_ID` for mainnet in production
- Consider adding authentication before going to production

## Project Structure

```
stackpay/
├── backend/
│   ├── prisma/schema.prisma    # Database models
│   └── src/
│       ├── index.js            # Express server
│       ├── routes/payments.js  # API routes
│       └── services/
│           ├── wallet.js       # HD wallet + blockchain
│           ├── paymentMonitor.js
│           └── sweep.js        # Collect to treasury
└── frontend/
    └── src/
        ├── pages/              # Home, Payment, Dashboard
        ├── api.js              # API client
        └── wallet.js           # MetaMask integration
```

## Production Checklist

- [ ] Use a secure secrets manager for `MASTER_MNEMONIC`
- [ ] Switch to mainnet RPC and `CHAIN_ID=1`
- [ ] Add rate limiting and authentication
- [ ] Use a dedicated PostgreSQL instance with backups
- [ ] Monitor sweep transactions and set up alerts
