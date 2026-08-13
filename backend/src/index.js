import http from 'http';
import express from 'express';
import cors from 'cors';
import { config } from './config/index.js';
import authRouter from './routes/auth.js';
import paymentsRouter from './routes/payments.js';
import { startPaymentMonitor } from './services/paymentMonitor.js';
import { startSweepScheduler } from './services/sweep.js';
import { getNetworksList, getNetwork } from './config/networks.js';
import adminRouter from './routes/admin.js';
import packagesRouter from './routes/packages.js';
import communityRouter from './routes/community.js';
import transfersRouter from './routes/transfers.js';
import withdrawalsRouter from './routes/withdrawals.js';
import referralsRouter from './routes/referrals.js';
import loansRouter from './routes/loans.js';
import { bootstrapAdmin } from './services/bootstrapAdmin.js';
import { bootstrapPackages } from './services/bootstrapPackages.js';
import { startPackageAccrualScheduler } from './services/packageAccrual.js';
import { backfillPaymentCredits } from './services/userBalance.js';
import { bootstrapCommunity } from './services/bootstrapCommunity.js';
import { bootstrapUsernames } from './services/username.js';
import { bootstrapInviteCodes, getReferralSettings } from './services/referrals.js';
import { bootstrapShowcaseTeam } from './services/showcaseTeam.js';
import { bootstrapShowcaseTestimonials } from './services/showcaseTestimonials.js';
import { startWithdrawalProcessor } from './services/withdrawals.js';
import { getDepositAddress } from './services/wallet.js';
import publicRouter, { APP_VERSION } from './routes/public.js';
import { localeMiddleware } from './i18n/index.js';
import { initCommunityRealtime } from './services/communityRealtime.js';

const app = express();

app.use(cors({ origin: config.frontendUrl }));
app.use(express.json());
app.use(localeMiddleware);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', version: APP_VERSION, defaultChainId: config.defaultChainId });
});

app.get('/api/networks', (_req, res) => {
  res.json(getNetworksList());
});

app.get('/api/config', (_req, res) => {
  const network = getNetwork(config.defaultChainId);
  res.json({
    version: APP_VERSION,
    defaultChainId: config.defaultChainId,
    defaultNetworkName: network?.name || `Chain ${config.defaultChainId}`,
    treasuryAddress: config.treasuryAddress,
    gasFunderAddress: getDepositAddress(0),
  });
});

app.use('/api/public', publicRouter);

app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/packages', packagesRouter);
app.use('/api/community', communityRouter);
app.use('/api/transfers', transfersRouter);
app.use('/api/withdrawals', withdrawalsRouter);
app.use('/api/referrals', referralsRouter);
app.use('/api/loans', loansRouter);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const server = http.createServer(app);
initCommunityRealtime(server);

server.listen(config.port, async () => {
  console.log(`StackPay API running on http://localhost:${config.port}`);
  console.log(`Supported networks: ${getNetworksList().map((n) => n.name).join(', ')}`);
  await bootstrapAdmin();
  await bootstrapUsernames();
  await bootstrapInviteCodes();
  await getReferralSettings();
  await bootstrapPackages();
  await bootstrapCommunity();
  await bootstrapShowcaseTeam();
  await bootstrapShowcaseTestimonials();
  await backfillPaymentCredits();
  startPaymentMonitor();
  startSweepScheduler();
  startPackageAccrualScheduler();
  startWithdrawalProcessor();
});
