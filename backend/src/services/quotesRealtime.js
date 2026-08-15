import { getLiveQuotes } from './priceConversion.js';

/** @type {Set<import('express').Response>} */
const clients = new Set();

const TICK_MS = 3_000;
let timer = null;
let lastPayload = null;

function writeEvent(res, data) {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

async function broadcastQuotes({ force = true } = {}) {
  try {
    const data = await getLiveQuotes({ force });
    lastPayload = data;
    for (const res of clients) {
      try {
        writeEvent(res, data);
      } catch {
        clients.delete(res);
      }
    }
  } catch (err) {
    console.warn('Quotes stream tick failed:', err.message);
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
    broadcastQuotes({ force: true });
  }, TICK_MS);
}

export function attachQuotesStream(req, res) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  if (typeof res.flushHeaders === 'function') res.flushHeaders();

  clients.add(res);
  ensureTicker();

  const sendInitial = lastPayload
    ? Promise.resolve(lastPayload)
    : getLiveQuotes({ force: false }).then((data) => {
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
      writeEvent(res, { error: err.message || 'Failed to load quotes', quotes: [] });
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

export function startQuotesRealtime() {
  // Warm cache so the first SSE subscriber gets data quickly.
  getLiveQuotes({ force: true }).catch((err) => {
    console.warn('Initial quotes warm-up failed:', err.message);
  });
}
