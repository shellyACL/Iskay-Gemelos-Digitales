// Utilidades NFC — formato canónico XX:XX:XX:XX (mayúsculas, con dos puntos).
// El tag físico entrega bytes; MainActivity.java ya los manda así, pero el
// QR legacy y el input manual pueden venir sin dos puntos o en minúsculas.
// Todo lo que vaya a `verificarChip(uid)` y a Supabase debe pasar por aquí.

export function normalizeUid(raw) {
  if (raw == null) return "";
  let s = String(raw).trim().toUpperCase();
  // Quita prefijos y separadores comunes: 0x, espacios, guiones, comas.
  s = s.replace(/^0X/, "").replace(/[\s\-_.,;]+/g, "");
  // Si ya tiene dos puntos, valida y re-normaliza cada bloque.
  if (s.includes(":")) {
    const partes = s.split(":").filter(Boolean);
    if (!partes.every((p) => /^[0-9A-F]{2}$/.test(p))) return "";
    return partes.join(":");
  }
  // Sin dos puntos: debe ser hex puro de longitud par (4 o 7 bytes típico).
  if (!/^[0-9A-F]+$/.test(s) || s.length % 2 !== 0) return "";
  if (s.length < 8 || s.length > 20) return "";
  return s.match(/../g).join(":");
}

export function isValidUid(uid) {
  return /^([0-9A-F]{2}:){3,9}[0-9A-F]{2}$/.test(uid || "");
}

// Mantenido por compat: una sola lectura.
export const escucharNfcUnaVez = escucharNfc;

// Arma la escritura NDEF en nativo. El grabado ocurre al acercar el tag.
// Retorna true si el plugin existe (APK), false en web.
export async function armarEscrituraNfc(texto) {
  try {
    const { registerPlugin } = await import("@capacitor/core");
    const IskayNfc = registerPlugin("IskayNfc");
    await IskayNfc.armarEscritura({ texto });
    return true;
  } catch {
    return false;
  }
}

export async function cancelarEscrituraNfc() {
  try {
    const { registerPlugin } = await import("@capacitor/core");
    const IskayNfc = registerPlugin("IskayNfc");
    await IskayNfc.cancelarEscritura();
  } catch {
    /* web: nada que cancelar */
  }
}

// Extrae UID crudo del evento iskayNfcUid (string legacy o objeto nuevo).
export function extraerUidDeEvento(evento) {
  const d = evento?.detail;
  if (typeof d === "string") return d;
  if (d && typeof d === "object") return d.uid || d.UID || "";
  return "";
}

// Escucha continua de lecturas NFC (siempre activa en artista).
export function escucharNfc(callback) {
  function handler(evento) {
    const uid = normalizeUid(extraerUidDeEvento(evento));
    if (uid) callback(uid, evento.detail);
  }
  window.addEventListener("iskayNfcUid", handler);
  window.addEventListener("iskayNfcWritten", handler);
  return () => {
    window.removeEventListener("iskayNfcUid", handler);
    window.removeEventListener("iskayNfcWritten", handler);
  };
}

// Recupera la última lectura retenida en nativo (caso Toast sí / form no).
export async function obtenerUltimaLectura() {
  try {
    const { registerPlugin } = await import("@capacitor/core");
    const IskayNfc = registerPlugin("IskayNfc");
    const r = await IskayNfc.ultimaLectura();
    return normalizeUid(r?.uid || "");
  } catch {
    return "";
  }
}
