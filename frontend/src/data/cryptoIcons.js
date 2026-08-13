const CHAIN_SLUGS = {
  1: 'ethereum',
  137: 'polygon',
  56: 'bsc',
  42161: 'arbitrum',
  10: 'optimism',
  8453: 'base',
  43114: 'avax',
  11155111: 'ethereum',
};

const TOKEN_ICONS = {
  ETH: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
  USDC: 'https://assets.coingecko.com/coins/images/6319/small/usdc.png',
  USDT: 'https://assets.coingecko.com/coins/images/325/small/Tether.png',
  WBTC: 'https://assets.coingecko.com/coins/images/7598/small/wrapped_bitcoin_wbtc.png',
  BNB: 'https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png',
  POL: 'https://assets.coingecko.com/coins/images/4713/small/polygon.png',
  AVAX: 'https://assets.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png',
  USDT: 'https://assets.coingecko.com/coins/images/325/small/Tether.png',
};

export function getNetworkIconUrl(chainId) {
  const slug = CHAIN_SLUGS[chainId];
  if (!slug) return null;
  return `https://icons.llamao.fi/icons/chains/rsz_${slug}.jpg`;
}

export function getTokenIconUrl(symbol) {
  if (!symbol) return null;
  return TOKEN_ICONS[symbol.toUpperCase()] || null;
}

export function getIconFallback(label) {
  return (label || '?').slice(0, 2).toUpperCase();
}
