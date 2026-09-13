import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import {
  coinbaseWallet,
  metaMaskWallet,
  rabbyWallet,
  walletConnectWallet,
  injectedWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { sepolia, baseSepolia } from "wagmi/chains";

// getDefaultConfig pide un projectId de WalletConnect Cloud (gratis,
// cloud.walletconnect.com). Mientras no lo configuren, RainbowKit sigue
// funcionando con MetaMask/inyectadas, solo sin WalletConnect QR.
const WALLETCONNECT_PROJECT_ID =
  import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || "";

// Habilita Coinbase Smart Wallet (onboarding con Passkey, sin seed phrase).
// "smartWalletOnly" fuerza el flujo de Smart Wallet en vez del típico
// conectar-extensión. Documentado por RainbowKit específicamente para
// probarse en testnets como Sepolia y Base Sepolia — exactamente lo que
// están usando.
coinbaseWallet.preference = "smartWalletOnly";

export const wagmiConfig = getDefaultConfig({
  appName: "Iskay — Gemelos Digitales",
  projectId: WALLETCONNECT_PROJECT_ID || "iskay-demo-placeholder",
  chains: [sepolia, baseSepolia],
  ssr: false,
  wallets: [
    {
      groupName: "Recomendado",
      wallets: [coinbaseWallet, metaMaskWallet, rabbyWallet, walletConnectWallet, injectedWallet],
    },
  ],
});
