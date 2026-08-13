import { HDNodeWallet, ethers, Contract } from 'ethers';
import { config } from '../config/index.js';
import { getNetwork, getToken, isNativeToken, ERC20_ABI } from '../config/networks.js';

const GAS_FUNDER_INDEX = 0;
const providers = new Map();

export function derivePayoutWallet() {
  return deriveDepositWallet(config.payoutWalletIndex);
}

export function getPayoutAddress() {
  return derivePayoutWallet().address;
}

export function deriveDepositWallet(index) {
  return HDNodeWallet.fromPhrase(
    config.masterMnemonic,
    undefined,
    `m/44'/60'/0'/0/${index}`
  );
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
    throw new Error(`Withdrawals require ERC-20 tokens (got ${tokenSymbol})`);
  }

  const provider = getProvider(chainId);
  const wallet = derivePayoutWallet().connect(provider);
  const contract = new Contract(token.address, ERC20_ABI, wallet);
  const parsed = ethers.parseUnits(String(amount), token.decimals);

  const balance = await contract.balanceOf(wallet.address);
  if (balance < parsed) {
    throw new Error(
      `Payout wallet has insufficient ${tokenSymbol}. Fund ${getPayoutAddress()} on ${getNetwork(chainId).name}`
    );
  }

  await ensureGasForWallet(wallet.address, chainId);

  const tx = await contract.transfer(toAddress, parsed);
  const receipt = await tx.wait();
  return {
    txHash: receipt.hash,
    amount: ethers.formatUnits(parsed, token.decimals),
  };
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
