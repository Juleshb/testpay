import { Router } from 'express';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { listActiveShowcaseTeam } from '../services/showcaseTeam.js';
import { listActiveTestimonials, submitPublicTestimonial } from '../services/showcaseTestimonials.js';
import {
  registerDeveloperAccess,
  verifyDeveloperAccess,
  API_ACCESS_INDIVIDUAL_USD,
  API_ACCESS_COMPANY_USD,
} from '../services/developerAccess.js';
import { getLiveQuotes } from '../services/priceConversion.js';
import { attachQuotesStream } from '../services/quotesRealtime.js';

const router = Router();

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJson = JSON.parse(readFileSync(join(__dirname, '../../package.json'), 'utf8'));
export const APP_VERSION = packageJson.version || '1.0.0';

const DEV_ERROR_KEYS = {
  'Email is required': 'emailRequired',
  'Valid email is required': 'validEmailRequired',
  'Name is required': 'nameRequired',
  'Name must be 80 characters or less': 'nameTooLong',
  'Company name is required for company registrations': 'companyNameRequired',
  'Access token is required': 'invalidAccessToken',
  'Invalid access token': 'invalidAccessToken',
};

function localizeDeveloperError(req, err) {
  const key = DEV_ERROR_KEYS[err?.message];
  return key ? req.t(key) : err?.message;
}

router.get('/showcase', async (req, res) => {
  try {
    const [communityTeam, testimonials] = await Promise.all([
      listActiveShowcaseTeam(),
      listActiveTestimonials(),
    ]);

    res.json({
      version: APP_VERSION,
      communityTeam,
      testimonials,
    });
  } catch (err) {
    console.error('Public showcase error:', err);
    res.status(500).json({ error: req.t('failedLoadShowcase') });
  }
});

router.get('/meta', (_req, res) => {
  res.json({ version: APP_VERSION, name: 'StackPay' });
});

router.get('/quotes', async (req, res) => {
  try {
    const data = await getLiveQuotes();
    res.json(data);
  } catch (err) {
    console.error('Public quotes error:', err);
    res.status(500).json({ error: req.t('failedLoadQuotes') });
  }
});

router.get('/quotes/stream', (req, res) => {
  attachQuotesStream(req, res);
});

router.post('/testimonials', async (req, res) => {
  try {
    const testimonial = await submitPublicTestimonial(req.body);
    res.status(201).json({
      message: req.t('thanksReview'),
      testimonial,
    });
  } catch (err) {
    console.error('Public testimonial submit error:', err);
    res.status(400).json({ error: err.message || req.t('failedSubmitReview') });
  }
});

router.get('/developer-access/pricing', (_req, res) => {
  res.json({
    individualUsd: API_ACCESS_INDIVIDUAL_USD,
    companyUsd: API_ACCESS_COMPANY_USD,
    token: 'USDC',
    chainId: 137,
    networkName: 'Polygon',
  });
});

router.post('/developer-access/register', async (req, res) => {
  try {
    const registration = await registerDeveloperAccess(req.body);
    res.status(201).json(registration);
  } catch (err) {
    console.error('Developer access register error:', err);
    res.status(400).json({ error: localizeDeveloperError(req, err) || req.t('failedRegisterDeveloper') });
  }
});

router.get('/developer-access/verify', async (req, res) => {
  try {
    const header = req.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : req.query.token;
    const registration = await verifyDeveloperAccess(token);
    res.json(registration);
  } catch (err) {
    console.error('Developer access verify error:', err);
    res.status(401).json({ error: localizeDeveloperError(req, err) || req.t('invalidAccessToken') });
  }
});

export default router;
