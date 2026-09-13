// Sistema de identidades demo: permite simular varias wallets sin
// necesidad de cambiar de cuenta en MetaMask. Cada identidad es una
// address 0x... generada aleatoriamente (formato válido, pero sin
// clave privada — solo sirve para la simulación local).
import { getSaldoDemo } from "./saldoDemo";

const KEY_ACTIVA = "iskay_identidad_activa";
const KEY_LISTA = "iskay_identidades_demo";

export function getIdentidadActiva() {
  return localStorage.getItem(KEY_ACTIVA) || null;
}

export function setIdentidadActiva(addr) {
  if (addr) localStorage.setItem(KEY_ACTIVA, addr);
  else localStorage.removeItem(KEY_ACTIVA);
}

export function getIdentidadesDemo() {
  try {
    return JSON.parse(localStorage.getItem(KEY_LISTA) || "[]");
  } catch {
    return [];
  }
}

export function guardarIdentidadesDemo(lista) {
  localStorage.setItem(KEY_LISTA, JSON.stringify(lista));
}

export function addIdentidadDemo(addr, etiqueta) {
  const lista = getIdentidadesDemo();
  if (lista.some((i) => i.addr.toLowerCase() === addr.toLowerCase())) return;
  lista.push({ addr, etiqueta: etiqueta || `Demo ${lista.length + 1}` });
  guardarIdentidadesDemo(lista);

  // Inicializa el saldo demo a $1000 (la primera vez que se llama,
  // getSaldoDemo crea la entrada en localStorage con SALDO_INICIAL).
  getSaldoDemo(addr);
}

export function removeIdentidadDemo(addr) {
  const lista = getIdentidadesDemo().filter(
    (i) => i.addr.toLowerCase() !== addr.toLowerCase()
  );
  guardarIdentidadesDemo(lista);
  if (getIdentidadActiva()?.toLowerCase() === addr.toLowerCase()) {
    setIdentidadActiva(null);
  }
}

export function generarAddressDemo() {
  const hex = "0123456789abcdef";
  let s = "0x";
  for (let i = 0; i < 40; i++) s += hex[Math.floor(Math.random() * 16)];
  return s;
}

// Etiqueta corta para mostrar en la UI: 0x1234…abcd
export function acortarAddr(addr) {
  if (!addr) return "";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}