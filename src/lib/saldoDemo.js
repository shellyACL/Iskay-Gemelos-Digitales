// Saldo ficticio demo por wallet (localStorage). Evita el error de
// Sepolia sin fondos: la compra/venta simulada no usa gas.
const SALDO_INICIAL = 1000;

export function getSaldoDemo(wallet) {
  if (!wallet) return 0;
  const k = `iskay_saldo_${wallet.toLowerCase()}`;
  const raw = localStorage.getItem(k);
  // Si la clave NO existe todavía → crear con saldo inicial.
  if (raw === null) {
    localStorage.setItem(k, String(SALDO_INICIAL));
    return SALDO_INICIAL;
  }
  const n = Number(raw);
  return Number.isFinite(n) ? n : SALDO_INICIAL;
}

export function setSaldoDemo(wallet, monto) {
  if (!wallet) return;
  const k = `iskay_saldo_${wallet.toLowerCase()}`;
  localStorage.setItem(k, String(monto));
}

export function moverSaldoDemo({ de, aArtista, aVendedor, total, regalia }) {
  const paraVendedor = total - regalia;
  const sDe = getSaldoDemo(de);
  if (sDe < total) return { ok: false, falta: total - sDe };
  const k = (w) => `iskay_saldo_${w.toLowerCase()}`;
  localStorage.setItem(k(de), String(sDe - total));
  if (aVendedor) {
    const s = getSaldoDemo(aVendedor);
    localStorage.setItem(k(aVendedor), String(s + paraVendedor));
  }
  if (aArtista) {
    const s = getSaldoDemo(aArtista);
    localStorage.setItem(k(aArtista), String(s + regalia));
  }
  return { ok: true, paraVendedor };
}

// Ofertas en venta (localStorage, por token). Sin tabla nueva en Supabase.
export function getOferta(tokenId) {
  try {
    const todas = JSON.parse(localStorage.getItem("iskay_ofertas") || "{}");
    return todas[String(tokenId)] || null;
  } catch {
    return null;
  }
}

export function setOferta(tokenId, oferta) {
  const todas = JSON.parse(localStorage.getItem("iskay_ofertas") || "{}");
  if (oferta) todas[String(tokenId)] = oferta;
  else delete todas[String(tokenId)];
  localStorage.setItem("iskay_ofertas", JSON.stringify(todas));
}