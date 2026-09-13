import { useEffect, useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { supabase } from "../lib/supabase";
import { CONTRATO_DIRECCION } from "../lib/contrato";
import { getSaldoDemo, moverSaldoDemo } from "../lib/saldoDemo";
import { qrKey } from "./QrPago";
import { useIdentidad } from "../hooks/useIdentidad";

const REGALIA_ARTISTA_PCT = 10;
const REGALIA_ISKAY_PCT = 2.5;
const PRECIO_MINIMO_USD = 150;

const norm = (w) => (w || "").toLowerCase();

export default function ObraDetalle({ tokenId, onCerrar, rol, onOperacion }) {
  const { address, isConnected } = useIdentidad();
  const [obra, setObra] = useState(null);
  const [artistaBD, setArtistaBD] = useState(null);
  const [galeriaBD, setGaleriaBD] = useState(null);
  const [duenios, setDuenios] = useState([]);
  const [duenioActual, setDuenioActual] = useState(null);
  const [precioEdit, setPrecioEdit] = useState("");
  const [msg, setMsg] = useState(null);
  const [cargando, setCargando] = useState(true);

  async function cargar() {
    if (!supabase) return;
    setCargando(true);
    const { data } = await supabase
    .from("obras")
    .select('id, titulo, tecnica, descripcion, precio_originacion_usd, precio_venta_usd, estado, creado_en, uid_chip_nfc, artista_id, galeria_id, foto_principal_uri, "año_creacion"')
    .eq("token_id", tokenId)
    .maybeSingle();
    setObra(data ? { ...data, anio_creacion: data["año_creacion"] } : data);

    if (data?.artista_id) {
      const a = await supabase
        .from("artistas")
        .select("nombre_completo, wallet_address")
        .eq("id", data.artista_id)
        .maybeSingle();
      setArtistaBD(a.data || null);
    }
    if (data?.galeria_id) {
      const g = await supabase
        .from("galerias")
        .select("nombre, wallet_address")
        .eq("id", data.galeria_id)
        .maybeSingle();
      setGaleriaBD(g.data || null);
    }
    if (data?.id) {
      const h = await supabase
        .from("historial_propiedad")
        .select("propietario_wallet, precio_venta_usd, fecha_transferencia")
        .eq("obra_id", data.id)
        .not("precio_venta_usd", "is", null)
        .order("fecha_transferencia", { ascending: false })
        .limit(2);
      setDuenios(h.data || []);
      const actual = h.data?.[0] || null;
      if (actual?.propietario_wallet) {
        const propietario = await supabase
          .from("artistas")
          .select("nombre_completo")
          .ilike("wallet_address", actual.propietario_wallet)
          .maybeSingle();
        setDuenioActual({
          ...actual,
          nombre: propietario.data?.nombre_completo || null,
        });
      } else {
        setDuenioActual(null);
      }
    }
    setCargando(false);
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenId]);

  const precioOriginacion = Number(obra?.precio_originacion_usd) || 0;
  const precioVenta = Number(obra?.precio_venta_usd) || 0;
  const estado = obra?.estado || "acuñada";
  const enVenta = estado === "en_venta" && precioVenta > 0;

  const ultimo = duenios[0] || null;
  const soyDuenio = address && ultimo && norm(ultimo.propietario_wallet) === norm(address);
  const soyArtista = address && artistaBD?.wallet_address && norm(artistaBD.wallet_address) === norm(address);
  const puedeEditar = rol === "artista" && soyArtista;
  const vendedor = ultimo?.propietario_wallet || artistaBD?.wallet_address || null;
  const qrVendedor = vendedor
    ? localStorage.getItem(qrKey(vendedor)) || localStorage.getItem(qrKey())
    : localStorage.getItem(qrKey());

  const regaliaArtista = +(precioVenta * REGALIA_ARTISTA_PCT / 100).toFixed(2);
  const regaliaIskay = +(precioVenta * REGALIA_ISKAY_PCT / 100).toFixed(2);
  const regaliaTotal = +(regaliaArtista + regaliaIskay).toFixed(2);

  async function publicarEnVenta() {
    setMsg(null);
    const p = Number(precioEdit) || precioVenta;
    if (!p || p <= 0) {
      return setMsg({ ok: false, t: "El precio de venta debe ser mayor a cero." });
    }
    const { error } = await supabase
      .from("obras")
      .update({ precio_venta_usd: p, estado: "en_venta" })
      .eq("id", obra.id);
    if (error) return setMsg({ ok: false, t: error.message });
    setPrecioEdit("");
    await cargar();
    onOperacion?.();
    setMsg({ ok: true, t: `Publicada a $${p}.` });
  }
  async function retirarDeVenta() {
    setMsg(null);
    const { error } = await supabase
      .from("obras")
      .update({ estado: "acuñada", precio_venta_usd: null })
      .eq("id", obra.id);
    if (error) return setMsg({ ok: false, t: error.message });
    await cargar();
    onOperacion?.();
    setMsg({ ok: true, t: "Retirada de la venta." });
  }

  async function comprar() {
    setMsg(null);
    if (!isConnected) return setMsg({ ok: false, t: "Conecta tu wallet para comprar." });
    if (!enVenta) return setMsg({ ok: false, t: "Esta obra no está a la venta." });
    if (vendedor && norm(vendedor) === norm(address)) return setMsg({ ok: false, t: "Ya eres el dueño." });

    const saldo = getSaldoDemo(address);
    const mov = moverSaldoDemo({
      de: address,
      aArtista: artistaBD?.wallet_address,
      aVendedor: vendedor,
      total: precioVenta,
      regalia: regaliaTotal,
    });
    if (!mov.ok) return setMsg({ ok: false, t: `Saldo insuficiente. Disponés de $${saldo}, la pieza cuesta $${precioVenta}.` });

    const txHash = "0xSIM" + Date.now().toString(16) + Math.floor(Math.random() * 65535).toString(16);
    const { error } = await supabase.from("historial_propiedad").insert({
      obra_id: obra.id,
      propietario_wallet: address,
      precio_venta_usd: precioVenta,
      regalia_artista_usd: regaliaArtista,
      regalia_iskay_usd: regaliaIskay,
      tx_hash: txHash,
    });
    if (error) return setMsg({ ok: false, t: error.message });

    await supabase
      .from("obras")
      .update({ estado: "vendida", precio_venta_usd: null })
      .eq("id", obra.id);

    await cargar();
    onOperacion?.();
    setMsg({
      ok: true,
      t: `Adquiriste “${obra.titulo}” (Token #${obra.token_id}) por $${precioVenta}. Artista +$${regaliaArtista} · Plataforma +$${regaliaIskay}.`,
    });
  }

  function textoEstado() {
    if (enVenta) return `A la venta por $${precioVenta} USD`;
    if (estado === "vendida") {
      return `Vendido a ${duenioActual?.nombre || `${ultimo?.propietario_wallet?.slice(0, 6)}…${ultimo?.propietario_wallet?.slice(-4)}`}`;
    }
    if (estado === "archivada") return "Archivada";
    return "Retirado de la venta";
  }

  return (
    <div className="detalle-overlay" onClick={onCerrar}>
      <div className="detalle-panel" onClick={(e) => e.stopPropagation()}>
        <button className="detalle-cerrar" onClick={onCerrar}>Cerrar</button>
        <span className="obra-card__eyebrow">Certificado phygital — Token #{tokenId}</span>
        <h2>{obra?.titulo || `Obra #${tokenId}`}</h2>
        {obra?.foto_principal_uri && (
        <div className="detalle-panel__foto">
          <img
            src={obra.foto_principal_uri}
            alt={obra.titulo || `Obra #${tokenId}`}
          />
        </div>
      )}

        {cargando ? (
          <p className="verificador__estado">Cargando…</p>
        ) : (
          <dl className="detalle-datos">
            <dt>Técnica</dt>
            <dd>{obra?.tecnica || "—"}</dd>
            <dt>UID chip NFC</dt>
            <dd>{obra?.uid_chip_nfc || "…"}</dd>
            <dt>Artista</dt>
            <dd>{artistaBD ? `${artistaBD.nombre_completo || ""} — ${artistaBD.wallet_address || "sin wallet"}` : "…"}</dd>
            <dt>Galería</dt>
            <dd>{galeriaBD ? `${galeriaBD.nombre || ""} — ${galeriaBD.wallet_address || "sin wallet"}` : "…"}</dd>
            <dt>Año de creación</dt>
            <dd>{obra?.anio_creacion ?? "—"}</dd>
            <dt>Fecha registro</dt>
            <dd>{obra?.creado_en ? new Date(obra.creado_en).toLocaleString("es-BO") : "…"}</dd>
            <dt>Tarifa de originación</dt>
            <dd>${precioOriginacion || 150} USD</dd>
            <dt>Precio de venta</dt>
            <dd>{enVenta ? `$${precioVenta} USD` : "No está a la venta"}</dd>
            <dt>Estado</dt>
            <dd>{textoEstado()}</dd>
          </dl>
        )}

        <a
          className="detalle-link"
          href={`https://sepolia.etherscan.io/address/${CONTRATO_DIRECCION}#code`}
          target="_blank"
          rel="noreferrer"
        >
          Comprobar en Etherscan →
        </a>

        {qrVendedor && (
          <div style={{ marginTop: 12 }}>
            <p className="verificador__ayuda">Cobro del vendedor:</p>
            <img
              src={qrVendedor}
              alt="QR cobro"
              style={{ width: 160, height: 160, objectFit: "contain", border: "1px solid #ccc" }}
            />
          </div>
        )}

        {soyDuenio && (
          <p className="registrar-obra__ok" style={{ marginTop: 12 }}>
            En tu propiedad — comprado de{" "}
            {duenios[1]
              ? `${duenios[1].propietario_wallet?.slice(0, 6)}… (reventa)`
              : `${(artistaBD?.wallet_address || "").slice(0, 6)}… (artista)`}.
          </p>
        )}

        {!isConnected && (
          <div style={{ marginTop: 12 }}>
            <ConnectButton />
          </div>
        )}
        {puedeEditar && obra && (
          <div style={{ marginTop: 12 }}>
            <h4>{enVenta ? "Cambiar precio de venta" : "Publicar a la venta"}</h4>
            <div className="verificador__form">
            <input
              type="number"
              min="0.01"
              step="0.01"
              placeholder={enVenta ? `Nuevo precio (actual $${precioVenta})` : "Precio de venta USD"}
              value={precioEdit}
              onChange={(e) => setPrecioEdit(e.target.value)}
            />
              <button type="button" onClick={publicarEnVenta}>
                {enVenta ? "Actualizar precio" : "Publicar"}
              </button>
              {enVenta && (
                <button type="button" onClick={retirarDeVenta}>
                  Retirar de la venta
                </button>
              )}
            </div>
          </div>
        )}

        {rol === "artista" && soyArtista && estado === "vendida" && (
          <p className="registrar-obra__ok" style={{ marginTop: 12 }}>
            Esta obra ya fue vendida. Para recomprarla necesitas cambiar a rol
            comprador y usar una identidad distinta a tu wallet.
          </p>
        )}

        {rol === "comprador" && isConnected && !soyDuenio && (
          <div style={{ marginTop: 12 }}>
            {enVenta ? (
              <button className="obra-card__boton" onClick={comprar}>
                Adquirir por ${precioVenta}
              </button>
            ) : (
              <p className="verificador__ayuda">
                {estado === "vendida"
                  ? `No disponible. Lo compró ${duenioActual?.nombre || `${ultimo?.propietario_wallet?.slice(0, 6)}…${ultimo?.propietario_wallet?.slice(-4)}`}.`
                  : estado === "archivada"
                    ? "Esta obra está archivada."
                    : "Esta obra no está a la venta."}
              </p>
            )}
          </div>
        )}

        {msg && (
          <p className={msg.ok ? "registrar-obra__ok" : "registrar-obra__error"}>
            {msg.t}
          </p>
        )}
      </div>
    </div>
  );
}