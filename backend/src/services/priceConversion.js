const STABLECOINS = new Set(['USDT', 'USDC']);

const COINGECKO_IDS = {
  ETH: 'ethereum',
  BNB: 'binancecoin',
  POL: 'polygon-ecosystem-token',
  MATIC: 'matic-network',
  AVAX: 'avalanche-2',
  WBTC: 'wrapped-bitcoin',
  USDT: 'tether',
  USDC: 'usd-coin',
};

const BINANCE_SYMBOLS = {
  ETH: 'ETHUSDT',
  WBTC: 'BTCUSDT',
  BNB: 'BNBUSDT',
  AVAX: 'AVAXUSDT',
  POL: 'POLUSDT',
  USDC: 'USDCUSDT',
};

const FALLBACK_USD = {
  ETH: 3500,
  BNB: 600,
  POL: 0.5,
  MATIC: 0.5,
  AVAX: 35,
  WBTC: 95000,
  USDT: 1,
  USDC: 1,
};

const QUOTE_SYMBOLS = ['ETH', 'WBTC', 'BNB', 'AVAX', 'POL', 'USDT', 'USDC'];

let priceCache = { prices: {}, changes: {}, fetchedAt: 0, source: 'fallback' };
const CACHE_MS = 2 * 1000;

async function fetchPricesFromBinance() {
  const pairs = [...new Set(Object.values(BINANCE_SYMBOLS))];
  const url = `https://api.binance.com/api/v3/ticker/24hr?symbols=${encodeURIComponent(JSON.stringify(pairs))}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Binance price API error: ${res.status}`);
  const rows = await res.json();
  if (!Array.isArray(rows)) throw new Error('Binance price API returned invalid payload');

  const byPair = new Map(rows.map((row) => [row.symbol, row]));
  const prices = {};
  const changes = {};

  for (const [symbol, pair] of Object.entries(BINANCE_SYMBOLS)) {
    const row = byPair.get(pair);
    if (!row) continue;
    const lastPrice = Number(row.lastPrice);
    const change = Number(row.priceChangePercent);
    if (Number.isFinite(lastPrice) && lastPrice > 0) prices[symbol] = lastPrice;
    if (Number.isFinite(change)) changes[symbol] = change;
  }

  if (Object.keys(prices).length === 0) {
    throw new Error('Binance returned no usable prices');
  }

  if (prices.USDT == null) {
    prices.USDT = 1;
    changes.USDT = 0;
  }

  return { prices, changes, source: 'binance' };
}

async function fetchPricesFromCoinGecko() {
  const ids = [...new Set(Object.values(COINGECKO_IDS))].join(',');
  const res = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`,
    { headers: { Accept: 'application/json' } }
  );
  if (!res.ok) throw new Error(`CoinGecko price API error: ${res.status}`);
  const data = await res.json();
  const prices = {};
  const changes = {};
  for (const [symbol, id] of Object.entries(COINGECKO_IDS)) {
    if (data[id]?.usd != null) prices[symbol] = data[id].usd;
    if (data[id]?.usd_24h_change != null) changes[symbol] = data[id].usd_24h_change;
  }
  return { prices, changes, source: 'coingecko' };
}

async function fetchPricesFromApi() {
  try {
    return await fetchPricesFromBinance();
  } catch (binanceErr) {
    console.warn('Binance price fetch failed, trying CoinGecko:', binanceErr.message);
    return fetchPricesFromCoinGecko();
  }
}

async function getUsdPrices({ force = false } = {}) {
  const now = Date.now();
  if (
    !force &&
    now - priceCache.fetchedAt < CACHE_MS &&
    Object.keys(priceCache.prices).length > 0
  ) {
    return priceCache.prices;
  }
  try {
    const { prices, changes, source } = await fetchPricesFromApi();
    priceCache = { prices, changes, fetchedAt: now, source: source || 'live' };
    return prices;
  } catch (err) {
    console.warn('Price fetch failed, using fallback rates:', err.message);
    if (Object.keys(priceCache.prices).length > 0) return priceCache.prices;
    return FALLBACK_USD;
  }
}

function formatPriceUsd(value) {
  if (value >= 1000) return value.toFixed(2);
  if (value >= 1) return value.toFixed(4);
  return value.toFixed(6);
}

export async function getLiveQuotes({ force = false } = {}) {
  await getUsdPrices({ force });
  const prices =
    Object.keys(priceCache.prices).length > 0 ? priceCache.prices : FALLBACK_USD;
  const changes = priceCache.changes || {};
  const source =
    Object.keys(priceCache.prices).length > 0 ? priceCache.source || 'cache' : 'fallback';

  const quotes = QUOTE_SYMBOLS.map((symbol) => {
    const livePrice = prices[symbol] ?? FALLBACK_USD[symbol] ?? null;
    const priceUsd = livePrice;
    const change24h = changes[symbol] ?? (STABLECOINS.has(symbol) ? 0 : null);

    return {
      symbol,
      priceUsd: priceUsd == null ? null : Number(priceUsd),
      priceUsdFormatted: priceUsd == null ? null : formatPriceUsd(Number(priceUsd)),
      change24h: change24h == null ? null : Number(change24h),
    };
  }).filter((q) => q.priceUsd != null);

  return {
    quotes,
    updatedAt: new Date(priceCache.fetchedAt || Date.now()).toISOString(),
    source,
  };
}

export async function getTokenUsdRate(tokenSymbol) {
  const symbol = String(tokenSymbol || '').toUpperCase();
  if (STABLECOINS.has(symbol)) return 1;

  const prices = await getUsdPrices();
  const rate = prices[symbol] ?? FALLBACK_USD[symbol];
  if (rate == null || rate <= 0) {
    throw new Error(`No USD price available for ${symbol}`);
  }
  return rate;
}

export async function convertToUsd(amount, tokenSymbol) {
  const num = parseFloat(amount);
  if (isNaN(num) || num <= 0) return { usdAmount: '0', usdRate: '0' };

  const rate = await getTokenUsdRate(tokenSymbol);
  const usd = num * rate;
  return {
    usdAmount: usd.toFixed(2),
    usdRate: String(rate),
  };
}

export async function convertUsdToToken(amountUsd, tokenSymbol, decimals = 6) {
  const usd = parseFloat(amountUsd);
  if (isNaN(usd) || usd <= 0) return { tokenAmount: '0', usdRate: '0' };

  const rate = await getTokenUsdRate(tokenSymbol);
  const tokenAmount = usd / rate;
  return {
    tokenAmount: tokenAmount.toFixed(decimals),
    usdRate: String(rate),
  };
}

export { STABLECOINS };
