import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";
import { useIdentidad } from "../hooks/useIdentidad";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { supabase } from "../lib/supabase";
import { getSaldoDemo, moverSaldoDemo } from "../lib/saldoDemo";

const REGALIA_ARTISTA_PCT = 10;
const REGALIA_ISKAY_PCT = 2.5;
const PRECIO_MINIMO_USD = 150;
const norm = (w) => (w || "").toLowerCase();

export default function PanelMercadoExterno({ obra, onOperacion }) {
  const { address, isConnected } = useIdentidad();
  const [precioInput, setPrecioInput] = useState("");
  const [msg, setMsg] = useState(null);
  const [duenios, setDuenios] = useState([]);
  const [refresco, setRefresco] = useState(0);

  useEffect(() => {
    if (!supabase || !obra?.obraId) return;
    let vivo = true;
    supabase
      .from("historial_propiedad")
      .select("propietario_wallet, precio_venta_usd, fecha_transferencia")
      .eq("obra_id", obra.obraId)
      .not("precio_venta_usd", "is", null)
      .order("fecha_transferencia", { ascending: false })
      .limit(2)
      .then(({ data }) => vivo && setDuenios(data || []));
    return () => { vivo = false; };
  }, [obra?.obraId, refresco]);

  if (!obra) {
    return (
      <section className="verificador" style={{ marginTop: 12 }}>
        <h3>Mercado</h3>
        <p className="verificador__ayuda">Verifica un NFC arriba y aquí aparece precio, estado y compra.</p>
      </section>
    );
  }

  const precioVenta = Number(obra.precioVenta) || 0;
  const estado = obra.estado || "acuñada";
  const enVenta = estado === "en_venta" && precioVenta > 0;
  const regaliaArtista = +(precioVenta * REGALIA_ARTISTA_PCT / 100).toFixed(2);
  const regaliaIskay = +(precioVenta * REGALIA_ISKAY_PCT / 100).toFixed(2);
  const regaliaTotal = +(regaliaArtista + regaliaIskay).toFixed(2);
  const saldo = address ? getSaldoDemo(address) : 0;
  const ultimo = duenios[0] || null;
  const soyDuenio = address && ultimo && norm(ultimo.propietario_wallet) === norm(address);
  const vendedor = ultimo?.propietario_wallet || obra.artistaWallet || null;

  async function publicar(pausar) {
    setMsg(null);
    if (!isConnected) return setMsg({ ok: false, t: "Conecta tu wallet para vender." });

    if (pausar) {
      const { error } = await supabase
        .from("obras")
        .update({ estado: "acuñada", precio_venta_usd: null })
        .eq("id", obra.obraId);
      if (error) return setMsg({ ok: false, t: error.message });
      setMsg({ ok: true, t: "Pausada: ya no está a la venta." });
    } else {
      const p = Number(precioInput);
      if (!p || p < PRECIO_MINIMO_USD) {
        return setMsg({ ok: false, t: `Precio mínimo: $${PRECIO_MINIMO_USD} USD.` });
      }
      const { error } = await supabase
        .from("obras")
        .update({ estado: "en_venta", precio_venta_usd: p })
        .eq("id", obra.obraId);
      if (error) return setMsg({ ok: false, t: error.message });
      setMsg({ ok: true, t: `Publicada a $${p}.` });
      setPrecioInput("");
    }
    setRefresco((x) => x + 1);
    onOperacion?.();
  }

  async function comprar() {
    setMsg(null);
    if (!isConnected) return setMsg({ ok: false, t: "Conecta tu wallet compradora." });
    if (!enVenta) return setMsg({ ok: false, t: "No está a la venta." });
    if (vendedor && norm(vendedor) === norm(address)) return setMsg({ ok: false, t: "Ya eres el vendedor." });

    const mov = moverSaldoDemo({
      de: address,
      aArtista: obra.artistaWallet,
      aVendedor: vendedor,
      total: precioVenta,
      regalia: regaliaTotal,
    });
    if (!mov.ok) return setMsg({ ok: false, t: `Saldo demo insuficiente. Tienes $${saldo}, cuesta $${precioVenta}.` });

    const txHash = "0xSIM" + Date.now().toString(16) + Math.floor(Math.random() * 65535).toString(16);
    const { error } = await supabase.from("historial_propiedad").insert({
      obra_id: obra.obraId,
      propietario_wallet: address,
      precio_venta_usd: precioVenta,
      regalia_artista_usd: regaliaArtista,
      regalia_iskay_usd: regaliaIskay,
      tx_hash: txHash,
    });
    if (error) return setMsg({ ok: false, t: error.message });

    await supabase.from("obras").update({ estado: "vendida", precio_venta_usd: null }).eq("id", obra.obraId);
    setMsg({
      ok: true,
      t: `Comprado de ${vendedor?.slice(0, 6)}… Pagaste $${precioVenta} (artista +$${regaliaArtista} 10%, Iskay +$${regaliaIskay} 2.5%, vendedor +$${mov.paraVendedor}). TX ${txHash}.`,
    });
    setRefresco((x) => x + 1);
    onOperacion?.();
  }

  const qrTexto = `ISKAY:OFERTA|${obra.tokenId}|${obra.uid}|${precioVenta}|${vendedor || "sin-vendedor"}`;

  return (
    <section className="verificador" style={{ marginTop: 12 }}>
      <h3>Mercado — Token #{obra.tokenId} “{obra.titulo}”</h3>
      <p className="verificador__ayuda">
        {enVenta
          ? `En venta por $${precioVenta} USD · Regalías: artista ${REGALIA_ARTISTA_PCT}% = $${regaliaArtista}, Iskay ${REGALIA_ISKAY_PCT}% = $${regaliaIskay} · Tu saldo $${saldo}.`
          : ultimo
            ? `Vendido a ${ultimo.propietario_wallet?.slice(0, 6)}… por $${ultimo.precio_venta_usd}. · Tu saldo $${saldo}.`
            : `Aún sin ventas registradas. · Tu saldo $${saldo}.`}
      </p>
      {soyDuenio && (
        <p className="registrar-obra__ok">
          En tu propiedad — comprado de {duenios[1] ? `${duenios[1].propietario_wallet?.slice(0, 6)}… (reventa)` : `${(obra.artistaWallet || "").slice(0, 6)}… (artista)`}.
        </p>
      )}
      {!isConnected && <ConnectButton />}
      {enVenta ? (
        <button className="obra-card__boton" onClick={comprar}>
          Comprar ahora por ${precioVenta} (demo)
        </button>
      ) : (
        <p className="verificador__ayuda">
          {ultimo
            ? `No disponible. Dueño actual ${ultimo.propietario_wallet?.slice(0, 6)}…${ultimo.propietario_wallet?.slice(-4)}.`
            : "Aún sin ventas. El artista puede publicarla abajo."}
        </p>
      )}
      <form onSubmit={(e) => { e.preventDefault(); publicar(false); }} className="verificador__form" style={{ marginTop: 12 }}>
        <input
          type="number"
          min={PRECIO_MINIMO_USD}
          step="0.01"
          placeholder={`Precio USD (mín. ${PRECIO_MINIMO_USD})`}
          value={precioInput}
          onChange={(e) => setPrecioInput(e.target.value)}
        />
        <button type="submit">Poner en venta</button>
        {enVenta && <button type="button" onClick={() => publicar(true)}>Pausar venta</button>}
      </form>
      <div style={{ marginTop: 12 }}>
        <QRCodeSVG value={qrTexto} size={120} level="M" includeMargin />
        <p className="verificador__ayuda" style={{ maxWidth: 240 }}>QR estilo Bolivia para cobrar este precio.</p>
      </div>
      {msg && <p className={msg.ok ? "registrar-obra__ok" : "registrar-obra__error"}>{msg.t}</p>}
    </section>
  );
}