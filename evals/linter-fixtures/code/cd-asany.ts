interface Window { wallet?: unknown }

export function currentWallet() {
  const w = (window as any).wallet;
  return w;
}

// @ts-ignore
legacyBridge.hook();
