import { BrowserProvider, parseUnits, formatUnits, Contract } from 'ethers';

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
];

let networksCache = null;

export async function loadNetworks() {
  if (networksCache) return networksCache;
  const res = await fetch('/api/networks');
  if (!res.ok) throw new Error('Failed to load networks');
  networksCache = await res.json();
  return networksCache;
}

export function getNetworkFromList(networks, chainId) {
  return networks.find((n) => n.chainId === chainId);
}

export function getChainName(chainId, networks) {
  const network = networks?.find((n) => n.chainId === chainId);
  return network?.name || `Chain ${chainId}`;
}

export async function switchToChain(chainId, networks) {
  if (!window.ethereum) throw new Error('No crypto wallet found in this browser');

  const network = getNetworkFromList(networks, chainId);
  if (!network) throw new Error(`Unsupported network: ${chainId}`);

  const chainIdHex = `0x${chainId.toString(16)}`;
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: chainIdHex }],
    });
  } catch (err) {
    if (err.code === 4902) {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: chainIdHex,
          ...network.metamask,
        }],
      });
    } else {
      throw err;
    }
  }
}

export async function connectWallet(requiredChainId, networks) {
  if (!window.ethereum) {
    throw new Error(
      'No crypto wallet found. Install a browser wallet (e.g. MetaMask or Coinbase Wallet) or send manually to the deposit address.'
    );
  }

  const provider = new BrowserProvider(window.ethereum);
  await provider.send('eth_requestAccounts', []);

  if (requiredChainId && networks) {
    await switchToChain(requiredChainId, networks);
  }

  const signer = await provider.getSigner();
  const address = await signer.getAddress();
  const network = await provider.getNetwork();
  const chainId = Number(network.chainId);

  if (requiredChainId && chainId !== requiredChainId) {
    throw new Error(
      `Wrong network. Switch your wallet to ${getChainName(requiredChainId, networks)} before paying.`
    );
  }

  return { provider, signer, address, chainId };
}

export async function getWalletTokenBalance(signer, token) {
  const address = await signer.getAddress();
  const provider = signer.provider;

  if (token.isNative || !token.address) {
    const balance = await provider.getBalance(address);
    return formatUnits(balance, token.decimals);
  }

  const contract = new Contract(token.address, ERC20_ABI, provider);
  const balance = await contract.balanceOf(address);
  return formatUnits(balance, token.decimals);
}

export async function getNativeBalance(signer, decimals = 18) {
  const address = await signer.getAddress();
  const balance = await signer.provider.getBalance(address);
  return formatUnits(balance, decimals);
}

export function formatPaymentError(err) {
  const msg = err?.reason || err?.shortMessage || err?.message || 'Payment failed';

  if (/exceeds balance|insufficient funds|transfer amount exceeds/i.test(msg)) {
    return 'Insufficient token balance. Make sure you have enough of the selected token on this network (not another chain).';
  }
  if (/insufficient funds for gas|gas required exceeds/i.test(msg)) {
    return 'Not enough native token for gas fees (e.g. BNB on BSC, ETH on Ethereum). Keep a small amount for fees.';
  }
  if (/user rejected|denied transaction/i.test(msg)) {
    return 'Transaction cancelled in your wallet.';
  }
  if (/Wrong network/i.test(msg)) {
    return msg;
  }
  return msg;
}

export async function sendPayment(signer, toAddress, amount, token) {
  const walletBalance = await getWalletTokenBalance(signer, token);
  if (parseFloat(walletBalance) < parseFloat(amount)) {
    throw new Error(
      `Insufficient ${token.symbol} balance. You have ${parseFloat(walletBalance).toFixed(6)} but need ${amount} ${token.symbol} on this network.`
    );
  }

  if (!token.isNative && token.address) {
    const network = await signer.provider.getNetwork();
    const nativeBal = await getNativeBalance(signer);
    if (parseFloat(nativeBal) < 0.0001) {
      const nativeSymbol = network.chainId === 56n ? 'BNB'
        : network.chainId === 137n ? 'POL'
        : network.chainId === 43114n ? 'AVAX'
        : 'ETH';
      throw new Error(
        `You need a small amount of ${nativeSymbol} on this network to pay gas fees for the ${token.symbol} transfer.`
      );
    }
  }

  if (token.isNative || !token.address) {
    const tx = await signer.sendTransaction({
      to: toAddress,
      value: parseUnits(String(amount), token.decimals),
    });
    return tx;
  }

  const contract = new Contract(token.address, ERC20_ABI, signer);
  const tx = await contract.transfer(
    toAddress,
    parseUnits(String(amount), token.decimals)
  );
  return tx;
}

export async function waitForTransaction(provider, txHash) {
  return provider.waitForTransaction(txHash);
}

export function shortenAddress(address) {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function getExplorerUrl(chainId, txHash, networks) {
  const network = networks?.find((n) => n.chainId === chainId);
  const base = network?.explorer || 'https://etherscan.io';
  return `${base}/tx/${txHash}`;
}

export function getAddressExplorerUrl(chainId, address, networks) {
  const network = networks?.find((n) => n.chainId === chainId);
  const base = network?.explorer || 'https://etherscan.io';
  return `${base}/address/${address}`;
}

export function getTokenFromNetwork(network, tokenSymbol) {
  return network?.tokens?.find((t) => t.symbol === tokenSymbol);
}

/** @deprecated Use connectWallet */
export const connectMetaMask = connectWallet;
