import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function ObraCard({ tokenId, onVerDetalle }) {
  const [obra, setObra] = useState(null);
  const [ultimo, setUltimo] = useState(null);

  useEffect(() => {
    if (!supabase) return;
    let vivo = true;
    (async () => {
      const { data } = await supabase
        .from("obras")
        .select(
          "id, titulo, tecnica, estado, precio_originacion_usd, precio_venta_usd, foto_principal_uri"
        )
        .eq("token_id", tokenId)
        .maybeSingle();
      if (!vivo) return;
      setObra(data || null);
      if (data?.id) {
        const h = await supabase
          .from("historial_propiedad")
          .select("propietario_wallet, precio_venta_usd, fecha_transferencia")
          .eq("obra_id", data.id)
          .not("precio_venta_usd", "is", null)
          .order("fecha_transferencia", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (vivo) setUltimo(h.data || null);
      }
    })();
    return () => { vivo = false; };
  }, [tokenId]);

  const titulo = obra?.titulo || `Obra #${tokenId}`;
  const estado = obra?.estado || "acuñada";
  const precioVenta = Number(obra?.precio_venta_usd) || 0;
  const enVenta = estado === "en_venta" && precioVenta > 0;
  const foto = obra?.foto_principal_uri || null;

  const estadoVenta = enVenta
    ? `A la venta por $${precioVenta}`
    : estado === "vendida" || ultimo
      ? `Vendido a ${ultimo?.propietario_wallet?.slice(0, 6)}…${ultimo?.propietario_wallet?.slice(-4)}`
      : estado === "archivada"
        ? "Archivada"
        : "No está a la venta";

  return (
    <article className="obra-card">
      <div className="obra-card__imagen">
        {foto ? (
          <img
            className="obra-card__foto"
            src={foto}
            alt={titulo}
            loading="lazy"
          />
        ) : (
          <div className="obra-card__imagen-vacia">
            <span className="obra-card__numero">#{tokenId}</span>
            <span className="obra-card__tecnica">
              {obra?.tecnica || "Sin imagen"}
            </span>
          </div>
        )}
      </div>
      <div className="obra-card__cuerpo">
        <span className="obra-card__eyebrow">Token #{tokenId}</span>
        <h3>{titulo}</h3>
        <p className="obra-card__dueño">{estadoVenta}</p>
        <button className="obra-card__boton" onClick={() => onVerDetalle(tokenId)}>
          Ver certificado
        </button>
      </div>
    </article>
  );
}