import { getTreasuryBalances } from './wallet.js';
import { getTreasuryActivity } from './treasuryActivity.js';

/** @type {Set<import('express').Response>} */
const clients = new Set();

const TICK_MS = 8_000;
let timer = null;
let lastPayload = null;
let balanceTick = 0;

function writeEvent(res, data) {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

async function buildPayload({ forceBalances = false } = {}) {
  const [balances, activity] = await Promise.all([
    getTreasuryBalances({ force: forceBalances }),
    getTreasuryActivity({ limit: 40 }),
  ]);
  return {
    live: true,
    updatedAt: new Date().toISOString(),
    balances,
    activity,
  };
}

async function broadcastTreasury({ forceBalances = false } = {}) {
  try {
    const data = await buildPayload({ forceBalances });
    lastPayload = data;
    for (const res of clients) {
      try {
        writeEvent(res, data);
      } catch {
        clients.delete(res);
      }
    }
  } catch (err) {
    console.warn('Treasury stream tick failed:', err.message);
    for (const res of clients) {
      try {
        writeEvent(res, {
          live: false,
          error: err.message || 'Treasury stream failed',
          updatedAt: new Date().toISOString(),
        });
      } catch {
        clients.delete(res);
      }
    }
  }
}

function ensureTicker() {
  if (timer) return;
  timer = setInterval(() => {
    if (clients.size === 0) {
      clearInterval(timer);
      timer = null;
      return;
    }
    balanceTick += 1;
    // Full on-chain balance scan about every ~24s; activity every tick
    const forceBalances = balanceTick % 3 === 0;
    broadcastTreasury({ forceBalances });
  }, TICK_MS);
}

export function notifyTreasuryChanged() {
  if (clients.size === 0) return;
  broadcastTreasury({ forceBalances: true }).catch(() => {});
}

export function attachTreasuryStream(req, res) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  if (typeof res.flushHeaders === 'function') res.flushHeaders();

  clients.add(res);
  ensureTicker();

  const sendInitial = lastPayload
    ? Promise.resolve(lastPayload)
    : buildPayload({ forceBalances: true }).then((data) => {
        lastPayload = data;
        return data;
      });

  sendInitial
    .then((data) => {
      if (!clients.has(res)) return;
      writeEvent(res, data);
    })
    .catch((err) => {
      if (!clients.has(res)) return;
      writeEvent(res, {
        live: false,
        error: err.message || 'Failed to load treasury stream',
        updatedAt: new Date().toISOString(),
      });
    });

  const heartbeat = setInterval(() => {
    if (!clients.has(res)) {
      clearInterval(heartbeat);
      return;
    }
    try {
      res.write(': ping\n\n');
    } catch {
      clearInterval(heartbeat);
      clients.delete(res);
    }
  }, 15000);

  const cleanup = () => {
    clearInterval(heartbeat);
    clients.delete(res);
    if (clients.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  };

  req.on('close', cleanup);
  req.on('error', cleanup);
}
