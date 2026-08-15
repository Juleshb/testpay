import { HDNodeWallet, ethers, Contract } from 'ethers';
import { config } from '../config/index.js';
import { getNetwork, getToken, isNativeToken, ERC20_ABI, NETWORKS } from '../config/networks.js';

const GAS_FUNDER_INDEX = 0;
const providers = new Map();
let cachedPayoutWallet = null;

export function deriveDepositWallet(index) {
  return HDNodeWallet.fromPhrase(
    config.masterMnemonic,
    undefined,
    `m/44'/60'/0'/0/${index}`
  );
}

export function derivePayoutWallet() {
  if (cachedPayoutWallet) return cachedPayoutWallet;

  if (config.payoutUseTreasury) {
    const treasury = ethers.getAddress(config.treasuryAddress);
    for (let i = 0; i < 32; i++) {
      const wallet = deriveDepositWallet(i);
      if (wallet.address.toLowerCase() === treasury.toLowerCase()) {
        cachedPayoutWallet = wallet;
        return wallet;
      }
    }
    throw new Error(
      'PAYOUT_USE_TREASURY is enabled but TREASURY_ADDRESS is not derived from MASTER_MNEMONIC'
    );
  }

  cachedPayoutWallet = deriveDepositWallet(config.payoutWalletIndex);
  return cachedPayoutWallet;
}

export function getPayoutAddress() {
  if (config.payoutUseTreasury) {
    return ethers.getAddress(config.treasuryAddress);
  }
  return derivePayoutWallet().address;
}

export function getPayoutSourceLabel() {
  return config.payoutUseTreasury
    ? 'Treasury (same wallet that receives sweeps)'
    : `HD wallet index ${config.payoutWalletIndex}`;
}

export function getDepositAddress(index) {
  return deriveDepositWallet(index).address;
}

export async function getNextDerivationIndex(prisma) {
  const walletIndex = await prisma.walletIndex.upsert({
    where: { id: 1 },
    create: { id: 1, index: 1 },
    update: { index: { increment: 1 } },
  });
  return walletIndex.index;
}

export function getProvider(chainId) {
  const network = getNetwork(chainId);
  if (!network) throw new Error(`Unsupported chainId: ${chainId}`);

  if (!providers.has(chainId)) {
    providers.set(chainId, new ethers.JsonRpcProvider(network.rpcUrl));
  }
  return providers.get(chainId);
}

export async function getPaymentBalance(depositAddress, chainId, tokenSymbol) {
  const token = getToken(chainId, tokenSymbol);
  if (!token) throw new Error(`Unknown token ${tokenSymbol}`);

  const provider = getProvider(chainId);

  if (isNativeToken(token)) {
    const balance = await provider.getBalance(depositAddress);
    return ethers.formatUnits(balance, token.decimals);
  }

  const contract = new Contract(token.address, ERC20_ABI, provider);
  const balance = await contract.balanceOf(depositAddress);
  return ethers.formatUnits(balance, token.decimals);
}

async function sweepNative(fromIndex, toAddress, chainId) {
  const provider = getProvider(chainId);
  const wallet = deriveDepositWallet(fromIndex).connect(provider);
  let balance = await provider.getBalance(wallet.address);

  if (balance === 0n) return null;

  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice ?? ethers.parseUnits('20', 'gwei');
  const gasLimit = 21000n;
  const gasCost = gasPrice * gasLimit;

  if (balance <= gasCost) {
    await fundGasForSweep(wallet.address, chainId, gasCost - balance + gasCost / 2n);
    balance = await provider.getBalance(wallet.address);
    if (balance <= gasCost) {
      throw new Error(
        `Balance too low to cover gas. Send native tokens to gas funder ${deriveDepositWallet(GAS_FUNDER_INDEX).address} on chain ${chainId}`
      );
    }
  }

  const value = balance - gasCost;
  const tx = await wallet.sendTransaction({ to: toAddress, value, gasLimit, gasPrice });
  const receipt = await tx.wait();
  const token = getToken(chainId, getNetwork(chainId).nativeSymbol);

  return {
    txHash: receipt.hash,
    amount: ethers.formatUnits(value, token.decimals),
  };
}

async function fundGasForSweep(depositAddress, chainId, amount = null) {
  const provider = getProvider(chainId);
  const funder = deriveDepositWallet(GAS_FUNDER_INDEX).connect(provider);
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice ?? ethers.parseUnits('20', 'gwei');
  const gasNeeded = amount ?? gasPrice * 65000n;
  const funderGas = gasPrice * 21000n;

  const funderBalance = await provider.getBalance(funder.address);
  if (funderBalance <= gasNeeded + funderGas) {
    throw new Error(
      `Gas funder wallet (${funder.address}) needs native tokens on chain ${chainId}`
    );
  }

  const tx = await funder.sendTransaction({
    to: depositAddress,
    value: gasNeeded,
    gasLimit: 21000n,
    gasPrice,
  });
  await tx.wait();
}

async function sweepErc20(fromIndex, toAddress, chainId, tokenSymbol) {
  const token = getToken(chainId, tokenSymbol);
  const provider = getProvider(chainId);
  const wallet = deriveDepositWallet(fromIndex).connect(provider);
  const contract = new Contract(token.address, ERC20_ABI, wallet);

  const balance = await contract.balanceOf(wallet.address);
  if (balance === 0n) return null;

  const nativeBalance = await provider.getBalance(wallet.address);
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice ?? ethers.parseUnits('20', 'gwei');
  const minGas = gasPrice * 65000n;

  if (nativeBalance < minGas) {
    await fundGasForSweep(wallet.address, chainId);
  }

  const tx = await contract.transfer(toAddress, balance);
  const receipt = await tx.wait();

  return {
    txHash: receipt.hash,
    amount: ethers.formatUnits(balance, token.decimals),
  };
}

async function ensureGasForWallet(walletAddress, chainId, minGas = null) {
  const provider = getProvider(chainId);
  const nativeBalance = await provider.getBalance(walletAddress);
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice ?? ethers.parseUnits('20', 'gwei');
  const needed = minGas ?? gasPrice * 65000n;
  if (nativeBalance >= needed) return;
  await fundGasForSweep(walletAddress, chainId, needed - nativeBalance + needed / 4n);
}

export async function sendErc20FromPayoutWallet(toAddress, chainId, tokenSymbol, amount) {
  const token = getToken(chainId, tokenSymbol);
  if (!token || isNativeToken(token)) {
    throw new Error(`ERC-20 withdrawal required (got ${tokenSymbol})`);
  }

  const provider = getProvider(chainId);
  const wallet = derivePayoutWallet().connect(provider);
  const contract = new Contract(ethers.getAddress(token.address), ERC20_ABI, wallet);
  const parsed = ethers.parseUnits(String(amount), token.decimals);

  const balance = await contract.balanceOf(wallet.address);
  if (balance < parsed) {
    const err = new Error('WITHDRAW_LIQUIDITY_UNAVAILABLE');
    err.code = 'WITHDRAW_LIQUIDITY_UNAVAILABLE';
    err.publicMessage =
      'This network is temporarily unavailable for withdrawals. Please choose another network or try again later.';
    err.logMessage = `Payout wallet insufficient ${tokenSymbol} on chain ${chainId} (${getNetwork(chainId)?.name}). Need ${amount}, have ${ethers.formatUnits(balance, token.decimals)}`;
    throw err;
  }

  await ensureGasForWallet(wallet.address, chainId);

  const tx = await contract.transfer(toAddress, parsed);
  const receipt = await tx.wait();
  return {
    txHash: receipt.hash,
    amount: ethers.formatUnits(parsed, token.decimals),
  };
}

export async function sendNativeFromPayoutWallet(toAddress, chainId, amount) {
  const network = getNetwork(chainId);
  if (!network) throw new Error(`Unsupported chainId: ${chainId}`);

  const provider = getProvider(chainId);
  const wallet = derivePayoutWallet().connect(provider);
  const parsed = ethers.parseEther(String(amount));
  const balance = await provider.getBalance(wallet.address);
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice ?? ethers.parseUnits('20', 'gwei');
  const gasLimit = 21000n;
  const gasCost = gasPrice * gasLimit;

  if (balance < parsed + gasCost) {
    const err = new Error('WITHDRAW_LIQUIDITY_UNAVAILABLE');
    err.code = 'WITHDRAW_LIQUIDITY_UNAVAILABLE';
    err.publicMessage =
      'This network is temporarily unavailable for withdrawals. Please choose another network or try again later.';
    err.logMessage = `Payout wallet insufficient native on chain ${chainId}. Need ${amount} + gas, have ${ethers.formatEther(balance)}`;
    throw err;
  }

  const tx = await wallet.sendTransaction({
    to: toAddress,
    value: parsed,
    gasLimit,
    gasPrice,
  });
  const receipt = await tx.wait();
  return {
    txHash: receipt.hash,
    amount: ethers.formatEther(parsed),
  };
}

export async function sendFromPayoutWallet(toAddress, chainId, tokenSymbol, amount) {
  const token = getToken(chainId, tokenSymbol);
  if (!token) throw new Error(`Unknown token ${tokenSymbol} on chain ${chainId}`);
  if (isNativeToken(token)) {
    return sendNativeFromPayoutWallet(toAddress, chainId, amount);
  }
  return sendErc20FromPayoutWallet(toAddress, chainId, tokenSymbol, amount);
}

/** Fallback only if fee lookup fails — keep low so small treasury balances still list */
const NATIVE_GAS_RESERVE_FALLBACK = {
  1: 0.00005,
  137: 0.02,
  56: 0.0003,
  42161: 0.00002,
  10: 0.00002,
  8453: 0.00002,
  43114: 0.002,
  11155111: 0.00005,
};

async function estimateNativePayoutGasReserve(provider, chainId) {
  try {
    const feeData = await Promise.race([
      provider.getFeeData(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('fee timeout')), 5000)
      ),
    ]);
    const gasPrice =
      feeData.maxFeePerGas ?? feeData.gasPrice ?? ethers.parseUnits('5', 'gwei');
    const gasLimit = 21000n;
    const cost = gasPrice * gasLimit;
    // 50% buffer for fee spikes
    const reserved = cost + cost / 2n;
    return parseFloat(ethers.formatEther(reserved));
  } catch {
    return NATIVE_GAS_RESERVE_FALLBACK[chainId] ?? 0.00005;
  }
}

const PAYOUT_LIQUIDITY_CACHE_MS = 30_000;
let payoutLiquidityCache = { at: 0, value: null };

export async function getPayoutLiquidity({ force = false } = {}) {
  const now = Date.now();
  if (!force && payoutLiquidityCache.value && now - payoutLiquidityCache.at < PAYOUT_LIQUIDITY_CACHE_MS) {
    return payoutLiquidityCache.value;
  }

  const address = getPayoutAddress();
  const networks = Object.values(NETWORKS);
  let prices = {};
  try {
    const { getTokenUsdRate } = await import('./priceConversion.js');
    const symbols = new Set();
    for (const network of networks) {
      for (const token of Object.values(network.tokens || {})) {
        symbols.add(token.symbol);
      }
    }
    await Promise.all(
      [...symbols].map(async (symbol) => {
        try {
          prices[symbol] = await getTokenUsdRate(symbol);
        } catch {
          prices[symbol] = null;
        }
      })
    );
  } catch {
    prices = {};
  }

  const results = await Promise.all(
    networks.flatMap((network) =>
      Object.values(network.tokens || {}).map(async (token) => {
        const symbol = token.symbol;
        try {
          const provider = getProvider(network.chainId);
          let balance = 0;

          if (isNativeToken(token) || !token.address) {
            const raw = await Promise.race([
              provider.getBalance(address),
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error('liquidity check timeout')), 8000)
              ),
            ]);
            balance = parseFloat(ethers.formatEther(raw));
            const reserve = await estimateNativePayoutGasReserve(provider, network.chainId);
            balance = Math.max(0, balance - reserve);
          } else {
            const tokenAddress = ethers.getAddress(token.address);
            const contract = new Contract(tokenAddress, ERC20_ABI, provider);
            const raw = await Promise.race([
              contract.balanceOf(address),
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error('liquidity check timeout')), 8000)
              ),
            ]);
            balance = parseFloat(ethers.formatUnits(raw, token.decimals));
          }

          if (!Number.isFinite(balance) || balance <= 0) return null;

          const rate = prices[symbol];
          // Need a USD rate so user USD balances convert correctly (stables = 1)
          if (rate == null || !(rate > 0)) return null;

          return {
            chainId: network.chainId,
            networkName: network.name,
            tokenSymbol: symbol,
            isNative: !!(isNativeToken(token) || !token.address),
            balance: balance.toFixed(Math.min(8, token.decimals)),
            availableUsd: (balance * rate).toFixed(2),
            usdRate: String(rate),
          };
        } catch (err) {
          console.warn(
            `Payout liquidity check failed ${symbol} on ${network.name}:`,
            err.message
          );
          return null;
        }
      })
    )
  );

  const balances = results.filter(Boolean);
  const byChain = {};
  for (const row of balances) {
    if (!byChain[row.chainId]) {
      byChain[row.chainId] = {
        chainId: row.chainId,
        networkName: row.networkName,
        tokens: [],
      };
    }
    byChain[row.chainId].tokens.push({
      symbol: row.tokenSymbol,
      balance: row.balance,
      availableUsd: row.availableUsd,
      isNative: row.isNative,
      usdRate: row.usdRate,
    });
  }

  const value = {
    checkedAt: new Date().toISOString(),
    networks: Object.values(byChain),
    balances,
  };
  payoutLiquidityCache = { at: now, value };
  return value;
}

const TREASURY_BALANCES_CACHE_MS = 30_000;
let treasuryBalancesCache = { at: 0, value: null };

/** Full TREASURY_ADDRESS balances across every configured network/token (admin). */
export async function getTreasuryBalances({ force = false } = {}) {
  const now = Date.now();
  if (!force && treasuryBalancesCache.value && now - treasuryBalancesCache.at < TREASURY_BALANCES_CACHE_MS) {
    return treasuryBalancesCache.value;
  }

  const address = ethers.getAddress(config.treasuryAddress);
  const networks = Object.values(NETWORKS);
  let prices = {};
  try {
    const { getTokenUsdRate } = await import('./priceConversion.js');
    const symbols = new Set();
    for (const network of networks) {
      for (const token of Object.values(network.tokens || {})) {
        symbols.add(token.symbol);
      }
    }
    await Promise.all(
      [...symbols].map(async (symbol) => {
        try {
          prices[symbol] = await getTokenUsdRate(symbol);
        } catch {
          prices[symbol] = null;
        }
      })
    );
  } catch {
    prices = {};
  }

  const results = await Promise.all(
    networks.flatMap((network) =>
      Object.values(network.tokens || {}).map(async (token) => {
        const symbol = token.symbol;
        const base = {
          chainId: network.chainId,
          networkName: network.name,
          explorer: network.explorer || null,
          tokenSymbol: symbol,
          tokenName: token.name || symbol,
          isNative: !!(isNativeToken(token) || !token.address),
          decimals: token.decimals,
        };
        try {
          const provider = getProvider(network.chainId);
          let balance = 0;

          if (isNativeToken(token) || !token.address) {
            const raw = await Promise.race([
              provider.getBalance(address),
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error('treasury balance timeout')), 8000)
              ),
            ]);
            balance = parseFloat(ethers.formatEther(raw));
          } else {
            const tokenAddress = ethers.getAddress(token.address);
            const contract = new Contract(tokenAddress, ERC20_ABI, provider);
            const raw = await Promise.race([
              contract.balanceOf(address),
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error('treasury balance timeout')), 8000)
              ),
            ]);
            balance = parseFloat(ethers.formatUnits(raw, token.decimals));
          }

          if (!Number.isFinite(balance)) balance = 0;
          const rate = prices[symbol];
          const availableUsd =
            rate != null && rate > 0 ? (balance * rate).toFixed(2) : null;

          return {
            ...base,
            balance: balance.toFixed(Math.min(8, token.decimals)),
            balanceNum: balance,
            availableUsd,
            usdRate: rate != null ? String(rate) : null,
            error: null,
          };
        } catch (err) {
          return {
            ...base,
            balance: '0',
            balanceNum: 0,
            availableUsd: null,
            usdRate: null,
            error: String(err.message || err).slice(0, 120),
          };
        }
      })
    )
  );

  const byChain = {};
  let totalUsd = 0;
  for (const row of results) {
    if (!byChain[row.chainId]) {
      byChain[row.chainId] = {
        chainId: row.chainId,
        networkName: row.networkName,
        explorer: row.explorer,
        tokens: [],
        networkUsd: 0,
      };
    }
    byChain[row.chainId].tokens.push({
      symbol: row.tokenSymbol,
      name: row.tokenName,
      isNative: row.isNative,
      balance: row.balance,
      availableUsd: row.availableUsd,
      usdRate: row.usdRate,
      error: row.error,
    });
    if (row.availableUsd != null) {
      const usd = parseFloat(row.availableUsd) || 0;
      byChain[row.chainId].networkUsd += usd;
      totalUsd += usd;
    }
  }

  const networksOut = Object.values(byChain)
    .map((n) => ({
      ...n,
      networkUsd: n.networkUsd.toFixed(2),
      tokens: n.tokens.sort(
        (a, b) => (parseFloat(b.availableUsd) || 0) - (parseFloat(a.availableUsd) || 0)
      ),
    }))
    .sort((a, b) => parseFloat(b.networkUsd) - parseFloat(a.networkUsd));

  const value = {
    address,
    checkedAt: new Date().toISOString(),
    totalUsd: totalUsd.toFixed(2),
    networks: networksOut,
    balances: results
      .filter((r) => r.balanceNum > 0)
      .sort((a, b) => (parseFloat(b.availableUsd) || 0) - (parseFloat(a.availableUsd) || 0))
      .map(({ balanceNum, ...rest }) => rest),
  };
  treasuryBalancesCache = { at: now, value };
  return value;
}

export function sanitizeWithdrawFailure(err) {
  if (!err) return 'Withdrawal failed';
  if (err.code === 'WITHDRAW_LIQUIDITY_UNAVAILABLE' || err.publicMessage) {
    return (
      err.publicMessage ||
      'This network is temporarily unavailable for withdrawals. Please choose another network or try again later.'
    );
  }
  const msg = String(err.message || err);
  if (/payout wallet|fund 0x|insufficient usdc|insufficient usdt|insufficient native/i.test(msg)) {
    return 'This network is temporarily unavailable for withdrawals. Please choose another network or try again later.';
  }
  if (/0x[a-fA-F0-9]{40}/.test(msg)) {
    return 'Withdrawal could not be completed right now. Please try again later.';
  }
  return msg.slice(0, 500) || 'Withdrawal failed';
}

export async function sweepPayment(payment, treasuryAddress) {
  const token = getToken(payment.chainId, payment.tokenSymbol);

  if (isNativeToken(token)) {
    return sweepNative(payment.derivationIndex, treasuryAddress, payment.chainId);
  }
  return sweepErc20(
    payment.derivationIndex,
    treasuryAddress,
    payment.chainId,
    payment.tokenSymbol
  );
}

export { ethers };
