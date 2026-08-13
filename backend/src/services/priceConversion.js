const STABLECOINS = new Set(['USDT', 'USDC']);

const COINGECKO_IDS = {
  ETH: 'ethereum',
  BNB: 'binancecoin',
  POL: 'polygon-ecosystem-token',
  MATIC: 'matic-network',
  AVAX: 'avalanche-2',
  WBTC: 'wrapped-bitcoin',
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

let priceCache = { prices: {}, fetchedAt: 0 };
const CACHE_MS = 5 * 60 * 1000;

async function fetchPricesFromApi() {
  const ids = [...new Set(Object.values(COINGECKO_IDS))].join(',');
  const res = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`,
    { headers: { Accept: 'application/json' } }
  );
  if (!res.ok) throw new Error(`Price API error: ${res.status}`);
  const data = await res.json();
  const bySymbol = {};
  for (const [symbol, id] of Object.entries(COINGECKO_IDS)) {
    if (data[id]?.usd != null) bySymbol[symbol] = data[id].usd;
  }
  return bySymbol;
}

async function getUsdPrices() {
  const now = Date.now();
  if (now - priceCache.fetchedAt < CACHE_MS && Object.keys(priceCache.prices).length > 0) {
    return priceCache.prices;
  }
  try {
    const prices = await fetchPricesFromApi();
    priceCache = { prices, fetchedAt: now };
    return prices;
  } catch (err) {
    console.warn('Price fetch failed, using fallback rates:', err.message);
    if (Object.keys(priceCache.prices).length > 0) return priceCache.prices;
    return FALLBACK_USD;
  }
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
