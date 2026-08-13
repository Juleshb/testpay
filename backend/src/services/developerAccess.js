import { randomUUID } from 'node:crypto';
import { prisma } from '../db.js';
import { config } from '../config/index.js';
import { getNextDerivationIndex, getDepositAddress } from './wallet.js';
import { validatePaymentRequest, getNetwork } from '../config/networks.js';

export const API_ACCESS_INDIVIDUAL_USD = 100;
export const API_ACCESS_COMPANY_USD = 250;
const API_ACCESS_CHAIN_ID = 137;
const API_ACCESS_TOKEN = 'USDC';

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function feeForAccountType(accountType) {
  return accountType === 'COMPANY' ? API_ACCESS_COMPANY_USD : API_ACCESS_INDIVIDUAL_USD;
}

function formatRegistration(row, payment) {
  const network = payment ? getNetwork(payment.chainId) : null;
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    accountType: row.accountType,
    companyName: row.companyName,
    amountUsd: row.amountUsd,
    accessToken: row.accessToken,
    status: row.status,
    unlocked: row.status === 'ACTIVE',
    paidAt: row.paidAt,
    payment: payment
      ? {
          id: payment.id,
          amount: payment.amount,
          tokenSymbol: payment.tokenSymbol,
          chainId: payment.chainId,
          networkName: network?.name || `Chain ${payment.chainId}`,
          depositAddress: payment.depositAddress,
          status: payment.status,
          paidAmount: payment.paidAmount,
        }
      : null,
  };
}

export async function registerDeveloperAccess(input) {
  const email = normalizeEmail(input.email);
  const name = String(input.name || '').trim();
  const accountType = input.accountType === 'COMPANY' ? 'COMPANY' : 'INDIVIDUAL';
  const companyName = String(input.companyName || '').trim();

  if (!email) throw new Error('Email is required');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Valid email is required');
  if (!name) throw new Error('Name is required');
  if (name.length > 80) throw new Error('Name must be 80 characters or less');
  if (accountType === 'COMPANY' && !companyName) {
    throw new Error('Company name is required for company registrations');
  }

  const existingActive = await prisma.apiDeveloperAccess.findFirst({
    where: { email, status: 'ACTIVE' },
    include: { payment: true },
  });
  if (existingActive) {
    return formatRegistration(existingActive, existingActive.payment);
  }

  const existingPending = await prisma.apiDeveloperAccess.findFirst({
    where: { email, status: 'PENDING_PAYMENT' },
    include: { payment: true },
    orderBy: { createdAt: 'desc' },
  });
  if (existingPending?.payment) {
    return formatRegistration(existingPending, existingPending.payment);
  }

  const amountUsd = String(feeForAccountType(accountType));
  const validation = validatePaymentRequest(API_ACCESS_CHAIN_ID, API_ACCESS_TOKEN);
  if (!validation.valid) {
    throw new Error(validation.error || 'API unlock payments are not configured for this network');
  }

  const derivationIndex = await getNextDerivationIndex(prisma);
  const depositAddress = getDepositAddress(derivationIndex);

  const payment = await prisma.payment.create({
    data: {
      amount: amountUsd,
      usdAmount: amountUsd,
      chainId: API_ACCESS_CHAIN_ID,
      tokenSymbol: API_ACCESS_TOKEN,
      tokenAddress: validation.token.address,
      email,
      name: accountType === 'COMPANY' ? companyName : name,
      depositAddress,
      derivationIndex,
      userId: null,
    },
  });

  const registration = await prisma.apiDeveloperAccess.create({
    data: {
      email,
      name,
      accountType,
      companyName: accountType === 'COMPANY' ? companyName : null,
      amountUsd,
      accessToken: randomUUID(),
      status: 'PENDING_PAYMENT',
      paymentId: payment.id,
    },
    include: { payment: true },
  });

  return formatRegistration(registration, payment);
}

export async function verifyDeveloperAccess(accessToken) {
  if (!accessToken) throw new Error('Access token is required');

  const row = await prisma.apiDeveloperAccess.findUnique({
    where: { accessToken: String(accessToken).trim() },
    include: { payment: true },
  });

  if (!row) throw new Error('Invalid access token');
  return formatRegistration(row, row.payment);
}

export async function tryActivateDeveloperAccess(payment) {
  if (!payment?.id) return;
  if (payment.status !== 'CONFIRMED' && payment.status !== 'SWEPT') return;

  const row = await prisma.apiDeveloperAccess.findFirst({
    where: { paymentId: payment.id, status: 'PENDING_PAYMENT' },
  });

  if (!row) return;

  await prisma.apiDeveloperAccess.update({
    where: { id: row.id },
    data: {
      status: 'ACTIVE',
      paidAt: new Date(),
    },
  });

  console.log(`API docs unlocked for ${row.email} (${row.accountType}, $${row.amountUsd})`);
}

export async function listDeveloperAccessRegistrations() {
  const rows = await prisma.apiDeveloperAccess.findMany({
    orderBy: { createdAt: 'desc' },
    include: { payment: true },
  });
  return rows.map((row) => formatRegistration(row, row.payment));
}
