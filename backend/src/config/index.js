import dotenv from 'dotenv';

dotenv.config();

function requireEnv(key) {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  databaseUrl: requireEnv('DATABASE_URL'),
  masterMnemonic: requireEnv('MASTER_MNEMONIC'),
  treasuryAddress: requireEnv('TREASURY_ADDRESS'),
  defaultChainId: parseInt(process.env.DEFAULT_CHAIN_ID || process.env.CHAIN_ID || '11155111', 10),
  pollIntervalMs: parseInt(process.env.POLL_INTERVAL_MS || '15000', 10),
  sweepIntervalMs: parseInt(process.env.SWEEP_INTERVAL_MS || '15000', 10),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  jwtSecret: process.env.JWT_SECRET || 'change-this-secret-in-production',
  adminEmail: process.env.ADMIN_EMAIL || '',
  adminPassword: process.env.ADMIN_PASSWORD || '',
  payoutWalletIndex: parseInt(process.env.PAYOUT_WALLET_INDEX || '2', 10),
  // When true, withdrawals are paid from TREASURY_ADDRESS (must be derived from MASTER_MNEMONIC)
  payoutUseTreasury: String(process.env.PAYOUT_USE_TREASURY || 'true').toLowerCase() !== 'false',
  minWithdrawUsd: parseFloat(process.env.MIN_WITHDRAW_USD || '5'),
  maxWithdrawUsd: parseFloat(process.env.MAX_WITHDRAW_USD || '50000'),
  withdrawPollIntervalMs: parseInt(process.env.WITHDRAW_POLL_INTERVAL_MS || '30000', 10),
};
