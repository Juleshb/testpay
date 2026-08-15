/** Supported MetaMask EVM networks and tokens */
export const NETWORKS = {
  1: {
    chainId: 1,
    name: 'Ethereum Mainnet',
    nativeSymbol: 'ETH',
    rpcUrl: 'https://ethereum-rpc.publicnode.com',
    explorer: 'https://etherscan.io',
    metamask: {
      chainName: 'Ethereum Mainnet',
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
      rpcUrls: ['https://ethereum-rpc.publicnode.com'],
      blockExplorerUrls: ['https://etherscan.io'],
    },
    tokens: {
      ETH: { symbol: 'ETH', name: 'Ether', decimals: 18, address: null, isNative: true },
      USDC: { symbol: 'USDC', name: 'USD Coin', decimals: 6, address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' },
      USDT: { symbol: 'USDT', name: 'Tether USD', decimals: 6, address: '0xdAC17F958D2ee523a2206206994597C13D831ec7' },
      WBTC: { symbol: 'WBTC', name: 'Wrapped Bitcoin', decimals: 8, address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599' },
    },
  },
  137: {
    chainId: 137,
    name: 'Polygon',
    nativeSymbol: 'POL',
    rpcUrl: 'https://polygon-bor-rpc.publicnode.com',
    explorer: 'https://polygonscan.com',
    metamask: {
      chainName: 'Polygon Mainnet',
      nativeCurrency: { name: 'POL', symbol: 'POL', decimals: 18 },
      rpcUrls: ['https://polygon-bor-rpc.publicnode.com'],
      blockExplorerUrls: ['https://polygonscan.com'],
    },
    tokens: {
      POL: { symbol: 'POL', name: 'Polygon', decimals: 18, address: null, isNative: true },
      USDC: { symbol: 'USDC', name: 'USD Coin', decimals: 6, address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359' },
      USDT: { symbol: 'USDT', name: 'Tether USD', decimals: 6, address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F' },
    },
  },
  56: {
    chainId: 56,
    name: 'BNB Smart Chain',
    nativeSymbol: 'BNB',
    rpcUrl: 'https://bsc-rpc.publicnode.com',
    explorer: 'https://bscscan.com',
    metamask: {
      chainName: 'BNB Smart Chain',
      nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
      rpcUrls: ['https://bsc-rpc.publicnode.com'],
      blockExplorerUrls: ['https://bscscan.com'],
    },
    tokens: {
      BNB: { symbol: 'BNB', name: 'BNB', decimals: 18, address: null, isNative: true },
      USDC: { symbol: 'USDC', name: 'USD Coin', decimals: 18, address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d' },
      USDT: { symbol: 'USDT', name: 'Tether USD', decimals: 18, address: '0x55d398326f99059fF775485246999027B3197955' },
    },
  },
  42161: {
    chainId: 42161,
    name: 'Arbitrum One',
    nativeSymbol: 'ETH',
    rpcUrl: 'https://arbitrum-one-rpc.publicnode.com',
    explorer: 'https://arbiscan.io',
    metamask: {
      chainName: 'Arbitrum One',
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
      rpcUrls: ['https://arbitrum-one-rpc.publicnode.com'],
      blockExplorerUrls: ['https://arbiscan.io'],
    },
    tokens: {
      ETH: { symbol: 'ETH', name: 'Ether', decimals: 18, address: null, isNative: true },
      USDC: { symbol: 'USDC', name: 'USD Coin', decimals: 6, address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831' },
      USDT: { symbol: 'USDT', name: 'Tether USD', decimals: 6, address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9' },
    },
  },
  10: {
    chainId: 10,
    name: 'Optimism',
    nativeSymbol: 'ETH',
    rpcUrl: 'https://optimism-rpc.publicnode.com',
    explorer: 'https://optimistic.etherscan.io',
    metamask: {
      chainName: 'Optimism',
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
      rpcUrls: ['https://optimism-rpc.publicnode.com'],
      blockExplorerUrls: ['https://optimistic.etherscan.io'],
    },
    tokens: {
      ETH: { symbol: 'ETH', name: 'Ether', decimals: 18, address: null, isNative: true },
      USDC: { symbol: 'USDC', name: 'USD Coin', decimals: 6, address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85' },
      USDT: { symbol: 'USDT', name: 'Tether USD', decimals: 6, address: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58' },
    },
  },
  8453: {
    chainId: 8453,
    name: 'Base',
    nativeSymbol: 'ETH',
    rpcUrl: 'https://base-rpc.publicnode.com',
    explorer: 'https://basescan.org',
    metamask: {
      chainName: 'Base',
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
      rpcUrls: ['https://base-rpc.publicnode.com'],
      blockExplorerUrls: ['https://basescan.org'],
    },
    tokens: {
      ETH: { symbol: 'ETH', name: 'Ether', decimals: 18, address: null, isNative: true },
      USDC: { symbol: 'USDC', name: 'USD Coin', decimals: 6, address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' },
    },
  },
  43114: {
    chainId: 43114,
    name: 'Avalanche C-Chain',
    nativeSymbol: 'AVAX',
    rpcUrl: 'https://avalanche-c-chain-rpc.publicnode.com',
    explorer: 'https://snowtrace.io',
    metamask: {
      chainName: 'Avalanche Network C-Chain',
      nativeCurrency: { name: 'AVAX', symbol: 'AVAX', decimals: 18 },
      rpcUrls: ['https://avalanche-c-chain-rpc.publicnode.com'],
      blockExplorerUrls: ['https://snowtrace.io'],
    },
    tokens: {
      AVAX: { symbol: 'AVAX', name: 'Avalanche', decimals: 18, address: null, isNative: true },
      USDC: { symbol: 'USDC', name: 'USD Coin', decimals: 6, address: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E' },
      USDT: { symbol: 'USDT', name: 'Tether USD', decimals: 6, address: '0x9702230A8EA53601F5cCd2Dccaa3c011fDAAb71f' },
    },
  },
  11155111: {
    chainId: 11155111,
    name: 'Sepolia Testnet',
    nativeSymbol: 'ETH',
    rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com',
    explorer: 'https://sepolia.etherscan.io',
    metamask: {
      chainName: 'Sepolia',
      nativeCurrency: { name: 'Sepolia ETH', symbol: 'ETH', decimals: 18 },
      rpcUrls: ['https://ethereum-sepolia-rpc.publicnode.com'],
      blockExplorerUrls: ['https://sepolia.etherscan.io'],
    },
    tokens: {
      ETH: { symbol: 'ETH', name: 'Sepolia Ether', decimals: 18, address: null, isNative: true },
    },
  },
};

export const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
];

export function getNetwork(chainId) {
  return NETWORKS[chainId] || null;
}

export function getToken(chainId, tokenSymbol) {
  const network = getNetwork(chainId);
  if (!network) return null;
  return network.tokens[tokenSymbol] || null;
}

export function isNativeToken(token) {
  return token?.isNative || token?.address === null;
}

export function getNetworksList() {
  return Object.values(NETWORKS).map((network) => ({
    chainId: network.chainId,
    name: network.name,
    nativeSymbol: network.nativeSymbol,
    explorer: network.explorer,
    metamask: network.metamask,
    tokens: Object.values(network.tokens).map((t) => ({
      symbol: t.symbol,
      name: t.name,
      decimals: t.decimals,
      address: t.address,
      isNative: !!t.isNative || t.address === null,
    })),
  }));
}

export function validatePaymentRequest(chainId, tokenSymbol) {
  const network = getNetwork(chainId);
  if (!network) {
    return { valid: false, error: `Unsupported network (chainId: ${chainId})` };
  }
  const token = getToken(chainId, tokenSymbol);
  if (!token) {
    return { valid: false, error: `Unsupported token ${tokenSymbol} on ${network.name}` };
  }
  return { valid: true, network, token };
}
