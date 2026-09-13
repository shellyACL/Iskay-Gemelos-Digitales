import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { getIdentidadActiva, setIdentidadActiva } from "../lib/identidadDemo";

// Identidad activa para toda la app: o la wallet real conectada con
// MetaMask/Rabby, o una identidad demo seleccionada. Los componentes
// usan esto en lugar de useAccount() directamente.
export function useIdentidad() {
  const { address: walletReal, isConnected: realConectada } = useAccount();
  const [address, setAddress] = useState(
    () => getIdentidadActiva() || walletReal || null
  );

  // Si no hay identidad activa y se conecta una wallet real, la usamos.
  useEffect(() => {
    if (!address && walletReal) {
      setAddress(walletReal);
      setIdentidadActiva(walletReal);
    }
  }, [walletReal, address]);

  function cambiarIdentidad(addr) {
    setAddress(addr);
    setIdentidadActiva(addr);
  }

  return {
    address,             // identidad activa (real o demo)
    isConnected: !!address,
    walletReal,          // address de MetaMask/Rabby (si hay)
    walletRealConectada: realConectada,
    cambiarIdentidad,
  };
}