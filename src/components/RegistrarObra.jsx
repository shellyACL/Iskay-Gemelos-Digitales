import { useIdentidad } from "../hooks/useIdentidad";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { CONTRATO_DIRECCION } from "../lib/contrato";
import { comprimirImagen } from "../lib/imagenes";
import {
  normalizeUid,
  isValidUid,
  escucharNfc,
  obtenerUltimaLectura,
  armarEscrituraNfc,
  cancelarEscrituraNfc,
} from "../lib/nfc";


const TARIFA_ORIGINACION_USD = 150;

const ESTADO_INICIAL = {
  tokenId: "",
  uidChip: "",
  titulo: "",
  tecnica: "",
  descripcion: "",
  dimensiones: "",
  anioCreacion: "",
  precio: "",
  enVenta: true,
};

export default function RegistrarObra({ onRegistrada, uidPrellenado }) {
  const { address, isConnected } = useIdentidad();
  const [form, setForm] = useState(ESTADO_INICIAL);
  const [foto, setFoto] = useState(null);
  const [cargandoFoto, setCargandoFoto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [grabandoChip, setGrabandoChip] = useState(false);

  useEffect(() => {
    let vivo = true;
    obtenerUltimaLectura().then((uid) => {
      if (vivo && uid) setForm((f) => (f.uidChip === uid ? f : { ...f, uidChip: uid }));
    });
    const cancelar = escucharNfc((uid) => {
      if (!vivo) return;
      setForm((f) => (f.uidChip === uid ? f : { ...f, uidChip: uid }));
    });
    return () => {
      vivo = false;
      cancelar();
    };
  }, []);

  useEffect(() => {
    const uid = normalizeUid(uidPrellenado);
    if (uid) setForm((f) => (f.uidChip === uid ? f : { ...f, uidChip: uid }));
  }, [uidPrellenado]);

  useEffect(() => {
    function alGrabar(e) {
      const ok = e.detail?.escrito;
      setGrabandoChip(false);
      setResultado(
        ok
          ? { ok: true, mensaje: `Chip grabado correctamente (${e.detail?.uid}).` }
          : { ok: false, mensaje: "No se pudo grabar el chip. Acercá el tag nuevamente." }
      );
    }
    window.addEventListener("iskayNfcWritten", alGrabar);
    return () => window.removeEventListener("iskayNfcWritten", alGrabar);
  }, []);

  async function manejarFoto(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setCargandoFoto(true);
    setResultado(null);
    try {
      const dataUrl = await comprimirImagen(f, 900, 0.78);
      setFoto(dataUrl);
    } catch (err) {
      setResultado({ ok: false, mensaje: err.message || "No se pudo cargar la imagen." });
    } finally {
      setCargandoFoto(false);
    }
  }

  function quitarFoto() {
    setFoto(null);
  }

  async function grabarEnChip() {
    if (!isConnected) {
      setResultado({ ok: false, mensaje: "Conectá tu wallet antes de grabar." });
      return;
    }
    const uid = normalizeUid(form.uidChip);
    if (!uid) {
      setResultado({ ok: false, mensaje: "Acercá el tag para obtener su identificador." });
      return;
    }
    if (!form.tokenId || !form.titulo) {
      setResultado({ ok: false, mensaje: "Completá Token ID y título antes de grabar." });
      return;
    }
    const payload = JSON.stringify({
      app: "iskay",
      uid,
      tokenId: Number(form.tokenId),
      titulo: form.titulo.slice(0, 60),
    });
    const ok = await armarEscrituraNfc(payload);
    if (!ok) {
      setResultado({
        ok: false,
        mensaje: "La grabación de chips solo está disponible desde la aplicación móvil.",
      });
      return;
    }
    setGrabandoChip(true);
    setResultado({ ok: true, mensaje: "Acercá el tag al dispositivo para completar la grabación." });
  }

  function actualizar(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  async function enviar(e) {
    e.preventDefault();
    if (!isConnected) {
      setResultado({ ok: false, mensaje: "Conectá tu wallet para registrar." });
      return;
    }
    if (!supabase) {
      setResultado({ ok: false, mensaje: "Servicio no disponible." });
      return;
    }
    if (!form.tokenId || !form.titulo) {
      setResultado({ ok: false, mensaje: "Token ID y título son obligatorios." });
      return;
    }
    if (form.enVenta) {
      const p = Number(form.precio);
      if (!p || p <= 0) {
        setResultado({ ok: false, mensaje: "El precio de venta debe ser mayor a cero." });
        return;
      }
    }
    const uidNormalizado = normalizeUid(form.uidChip);
    if (!uidNormalizado || !isValidUid(uidNormalizado)) {
      setResultado({ ok: false, mensaje: "El identificador del chip no es válido." });
      return;
    }

    setGuardando(true);
    setResultado(null);

    let artistaId = null;
    let galeriaId = null;
    try {
      const { data: artista } = await supabase
        .from("artistas")
        .select("id")
        .ilike("wallet_address", address)
        .maybeSingle();
      const { data: galeria } = await supabase
        .from("galerias")
        .select("id")
        .limit(1)
        .maybeSingle();
      artistaId = artista?.id ?? null;
      galeriaId = galeria?.id ?? null;
    } catch { /* ignora */ }

    if (!artistaId) {
      setGuardando(false);
      setResultado({
        ok: false,
        mensaje: "La cuenta conectada no está registrada como artista.",
      });
      return;
    }

    const base = {
      token_id: Number(form.tokenId),
      contrato_address: CONTRATO_DIRECCION,
      uid_chip_nfc: uidNormalizado,
      titulo: form.titulo,
      tecnica: form.tecnica,
      descripcion: form.descripcion,
      dimensiones: form.dimensiones,
      ["año_creacion"]: form.anioCreacion ? Number(form.anioCreacion) : null,
      artista_id: artistaId,
      galeria_id: galeriaId,
      metadata_uri: "ipfs://pendiente",
      foto_principal_uri: foto || null,
      precio_originacion_usd: TARIFA_ORIGINACION_USD,
      precio_venta_usd: form.enVenta ? Number(form.precio) : null,
      estado: form.enVenta ? "en_venta" : "acuñada",
    };
    const { data: insertado, error } = await supabase
      .from("obras")
      .insert(base)
      .select("token_id, uid_chip_nfc, creado_en")
      .maybeSingle();

    setGuardando(false);

    if (error) {
      setResultado({ ok: false, mensaje: error.message });
    } else {
      const fechaTxt = insertado?.creado_en
        ? new Date(insertado.creado_en).toLocaleString("es-BO")
        : new Date().toLocaleString("es-BO");
      setResultado({
        ok: true,
        mensaje: `Obra registrada · Token ${form.tokenId} · ${form.enVenta ? `publicada a $${form.precio}` : "sin publicar"} · ${fechaTxt}`,
      });
      setForm(ESTADO_INICIAL);
      setFoto(null);
      onRegistrada?.();
    }
  }

  const uidListo = form.uidChip && isValidUid(normalizeUid(form.uidChip));
  const precioNum = Number(form.precio) || 0;
  const precioBajo = form.enVenta && precioNum > 0 && precioNum < TARIFA_ORIGINACION_USD;

  return (
    <section className="registrar-obra">
      <header className="tarjeta__cabecera">
        <p className="ojal">Registro</p>
        <h3>Registrar nueva obra</h3>
        <p className="tarjeta__ayuda">
          Vinculá la pieza física a su gemelo digital. La tarifa de originación
          es de ${TARIFA_ORIGINACION_USD} USD (lo que cuesta registrar). El precio
          de venta lo definís vos.
        </p>
      </header>

      {!isConnected ? (
        <div className="registrar-obra__puerta">
          <p>Necesitás una cuenta para registrar obras.</p>
          <ConnectButton />
        </div>
      ) : (
        <p className="registrar-obra__cuenta">
          <span className="registrar-obra__cuenta-punto" aria-hidden="true" />
          {address?.slice(0, 6)}…{address?.slice(-4)}
        </p>
      )}

      <form onSubmit={enviar} className="registrar-obra__form">
        {/* -------- Imagen -------- */}
        <fieldset className="registrar-obra__seccion registrar-obra__full">
          <legend className="registrar-obra__leyenda">Imagen de la obra</legend>

          <div className="registrar-obra__foto">
            <div className="registrar-obra__foto-marco">
              {foto ? (
                <img src={foto} alt="Vista previa" />
              ) : (
                <div className="registrar-obra__foto-vacia">
                  <svg viewBox="0 0 24 24" width="32" height="32" fill="none"
                       stroke="currentColor" strokeWidth="1.5"
                       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="9" cy="9" r="2" />
                    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                  </svg>
                  <span>Sin imagen</span>
                </div>
              )}
            </div>

            <div className="registrar-obra__foto-controles">
              <label className="registrar-obra__foto-boton">
                <input
                  type="file"
                  accept="image/*"
                  onChange={manejarFoto}
                  disabled={cargandoFoto}
                />
                <span>{cargandoFoto ? "Procesando…" : foto ? "Cambiar imagen" : "Subir imagen"}</span>
              </label>
              {foto && (
                <button type="button" className="boton boton--fantasma" onClick={quitarFoto}>
                  Quitar
                </button>
              )}
              <p className="registrar-obra__foto-nota">
                Se comprime automáticamente. Se muestra en la galería y en el certificado.
              </p>
            </div>
          </div>
        </fieldset>

        <fieldset className="registrar-obra__seccion registrar-obra__full">
          <legend className="registrar-obra__leyenda">Chip de la obra</legend>

          <div className="registrar-obra__grid">
            <label>
              Token ID
              <input
                type="number"
                value={form.tokenId}
                onChange={(e) => actualizar("tokenId", e.target.value)}
                placeholder="1"
              />
            </label>
            <label>
              Identificador NFC
              <input
                type="text"
                placeholder="Acercá el tag"
                value={form.uidChip}
                onChange={(e) => actualizar("uidChip", e.target.value.toUpperCase())}
              />
            </label>
          </div>

          {uidListo && (
            <p className="registrar-obra__chip-ok">
              Chip detectado: <code>{normalizeUid(form.uidChip)}</code>
            </p>
          )}

          <button
            type="button"
            className="boton boton--secundario"
            disabled={grabandoChip}
            onClick={grabarEnChip}
          >
            {grabandoChip ? "Esperando el tag…" : "Grabar datos en el chip"}
          </button>

          {grabandoChip && (
            <button
              type="button"
              className="boton boton--fantasma"
              onClick={() => {
                cancelarEscrituraNfc();
                setGrabandoChip(false);
              }}
            >
              Cancelar
            </button>
          )}
        </fieldset>

        {/* -------- Ficha -------- */}
        <fieldset className="registrar-obra__seccion registrar-obra__full">
          <legend className="registrar-obra__leyenda">Ficha de la pieza</legend>

          <div className="registrar-obra__grid">
            <label className="registrar-obra__full">
              Título
              <input
                type="text"
                value={form.titulo}
                onChange={(e) => actualizar("titulo", e.target.value)}
                placeholder="Nombre de la obra"
              />
            </label>
            <label>
              Técnica
              <input
                type="text"
                placeholder="Óleo, acrílico, escultura…"
                value={form.tecnica}
                onChange={(e) => actualizar("tecnica", e.target.value)}
              />
            </label>
            <label>
              Dimensiones
              <input
                type="text"
                placeholder="60 × 80 cm"
                value={form.dimensiones}
                onChange={(e) => actualizar("dimensiones", e.target.value)}
              />
            </label>
            <label>
              Año
              <input
                type="number"
                placeholder="2026"
                value={form.anioCreacion}
                onChange={(e) => actualizar("anioCreacion", e.target.value)}
              />
            </label>
            <label className="registrar-obra__full">
              Descripción
              <textarea
                rows={3}
                value={form.descripcion}
                onChange={(e) => actualizar("descripcion", e.target.value)}
                placeholder="Breve descripción curatorial"
              />
            </label>
          </div>
        </fieldset>
        <fieldset className="registrar-obra__seccion registrar-obra__full">
          <legend className="registrar-obra__leyenda">Publicación</legend>

          <label className="registrar-obra__switch">
            <input
              type="checkbox"
              checked={!!form.enVenta}
              onChange={(e) => actualizar("enVenta", e.target.checked)}
            />
            <span>Publicar a la venta al registrar</span>
          </label>

          {form.enVenta && (
            <label className="registrar-obra__full">
              Precio de venta (USD)
              <input
                type="number"
                min="0.01"
                step="0.01"
                placeholder="Ej. 500.00"
                value={form.precio}
                onChange={(e) => actualizar("precio", e.target.value)}
              />
            </label>
          )}

          {precioBajo && (
            <p className="registrar-obra__aviso">
              Vas a publicar por debajo de la tarifa de originación ($
              {TARIFA_ORIGINACION_USD}). Es válido — el precio lo definís vos.
            </p>
          )}
        </fieldset>

        <button type="submit" disabled={guardando} className="boton boton--primario registrar-obra__enviar">
          {guardando ? "Registrando…" : "Registrar obra"}
        </button>
      </form>

      {resultado && (
        <p className={resultado.ok ? "registrar-obra__ok" : "registrar-obra__error"}>
          {resultado.mensaje}
        </p>
      )}
    </section>
  );
}