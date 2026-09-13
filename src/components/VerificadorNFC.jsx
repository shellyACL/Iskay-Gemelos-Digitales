import { useEffect, useState } from "react";
import { useReadContract } from "wagmi";
import { CONTRATO_ABI, CONTRATO_DIRECCION } from "../lib/contrato";
import { supabase } from "../lib/supabase";
import { normalizeUid, isValidUid } from "../lib/nfc";

export default function VerificadorNFC({ uidPrellenado, onVerDetalle }) {
  const [uid, setUid] = useState("");
  const [uidConsultado, setUidConsultado] = useState(null);

  useEffect(() => {
    if (uidPrellenado) {
      const normalizado = normalizeUid(uidPrellenado);
      if (normalizado) {
        setUid(normalizado);
        setUidConsultado(normalizado);
      }
    }
  }, [uidPrellenado]);

  const { data: tokenId, isFetching, isError } = useReadContract({
    address: CONTRATO_DIRECCION,
    abi: CONTRATO_ABI,
    functionName: "verificarChip",
    args: [uidConsultado || ""],
    query: { enabled: !!uidConsultado },
  });

  const encontrado =
    typeof tokenId === "bigint" ? tokenId > 0n : Number(tokenId) > 0;

  const [obraBD, setObraBD] = useState(null);
  const [artistaBD, setArtistaBD] = useState(null);
  const [galeriaBD, setGaleriaBD] = useState(null);

  useEffect(() => {
    if (!uidConsultado || !supabase) {
      if (!uidConsultado) {
        setObraBD(null);
        setArtistaBD(null);
        setGaleriaBD(null);
      }
      return;
    }
    let vivo = true;
    (async () => {
      const { data } = await supabase
        .from("obras")
        .select(
          'id, token_id, titulo, tecnica, estado, creado_en, uid_chip_nfc, artista_id, galeria_id, precio_originacion_usd, precio_venta_usd, foto_principal_uri, "año_creacion"'
        )
        .eq("uid_chip_nfc", uidConsultado)
        .maybeSingle();
      if (!vivo) return;
      setObraBD(data ? { ...data, anio_creacion: data["año_creacion"] } : null);
      if (data?.artista_id) {
        const a = await supabase
          .from("artistas")
          .select("nombre_completo, wallet_address")
          .eq("id", data.artista_id)
          .maybeSingle();
        if (vivo) setArtistaBD(a.data || null);
      } else if (vivo) setArtistaBD(null);
      if (data?.galeria_id) {
        const g = await supabase
          .from("galerias")
          .select("nombre, wallet_address")
          .eq("id", data.galeria_id)
          .maybeSingle();
        if (vivo) setGaleriaBD(g.data || null);
      } else if (vivo) setGaleriaBD(null);
    })();
    return () => {
      vivo = false;
    };
  }, [uidConsultado]);

  function verificar(e) {
    e.preventDefault();
    const normalizado = normalizeUid(uid);
    if (!normalizado) return;
    setUid(normalizado);
    setUidConsultado(normalizado);
  }

  const uidValido = !uid || isValidUid(normalizeUid(uid) || uid.toUpperCase());
  const enVenta = obraBD?.estado === "en_venta" && Number(obraBD?.precio_venta_usd) > 0;

  return (
    <section className="verificador">
      <header className="tarjeta__cabecera">
        <p className="ojal">Autenticidad</p>
        <h3>Verificación phygital</h3>
        <p className="tarjeta__ayuda">
          Ingresá el identificador de la pieza o acercá el chip al dispositivo
          para confirmar su registro en la blockchain.
        </p>
      </header>

      <form onSubmit={verificar} className="verificador__form">
        <input
          type="text"
          placeholder="Identificador — ej. 04:A1:B2:C3"
          value={uid}
          onChange={(e) => setUid(e.target.value)}
        />
        <button type="submit" className="boton boton--primario">
          Verificar
        </button>
      </form>

      {uid && !uidValido && (
        <p className="mensaje mensaje--error">
          Formato inválido. Usá hex con dos puntos.
        </p>
      )}

      {isFetching && <p className="verificador__estado">Consultando…</p>}

      {isError && uidConsultado && !isFetching && (
        <p className="mensaje mensaje--error">
          Sin conexión a la red para verificar en cadena.
        </p>
      )}

      {uidConsultado && !isFetching && (
        <div
          className={
            encontrado || obraBD
              ? "resultado resultado--ok"
              : "resultado resultado--no"
          }
        >
          {encontrado || obraBD ? (
            <>
              <strong>Pieza auténtica</strong>
              <p>
                {obraBD ? (
                  <>
                    Corresponde a <em>“{obraBD.titulo}”</em> — Token #
                    {obraBD.token_id}.
                  </>
                ) : (
                  <>Registrada en el contrato con Token #{tokenId?.toString()}.</>
                )}
              </p>
            </>
          ) : (
            <>
              <strong>Sin registro</strong>
              <p>
                El identificador <code>{uidConsultado}</code> no coincide con
                ninguna pieza registrada.
              </p>
            </>
          )}

          {obraBD && (
            <>
              {obraBD.foto_principal_uri && (
                <div className="resultado__foto">
                  <img
                    src={obraBD.foto_principal_uri}
                    alt={obraBD.titulo || "Obra"}
                  />
                </div>
              )}
              <dl className="ficha">
                <div>
                  <dt>Técnica</dt>
                  <dd>{obraBD.tecnica || "—"}</dd>
                </div>
                <div>
                  <dt>Artista</dt>
                  <dd>
                    {artistaBD?.nombre_completo || "—"}
                    <span className="ficha__mono">
                      {artistaBD?.wallet_address?.slice(0, 10)}…
                    </span>
                  </dd>
                </div>
                <div>
                  <dt>Año</dt>
                  <dd>{obraBD.anio_creacion ?? "—"}</dd>
                </div>
                <div>
                  <dt>Estado</dt>
                  <dd>
                    {enVenta
                      ? `En venta · $${obraBD.precio_venta_usd}`
                      : obraBD.estado === "vendida"
                        ? "Vendida"
                        : "Registrada"}
                  </dd>
                </div>
              </dl>
            </>
          )}

          {obraBD && onVerDetalle && (
            <button
              className="boton boton--primario"
              style={{ marginTop: 16 }}
              onClick={() => onVerDetalle(obraBD.token_id)}
            >
              Ver certificado
            </button>
          )}
        </div>
      )}
    </section>
  );
}