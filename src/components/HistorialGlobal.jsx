import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useIdentidad } from "../hooks/useIdentidad";

const REGALIA_ARTISTA_PCT = 10;
const REGALIA_ISKAY_PCT = 2.5;

function IconoCompra() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"
      fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 6h15l-1.5 9h-13z" />
      <path d="M6 6 5 3H3" />
      <circle cx="9" cy="20" r="1.5" />
      <circle cx="18" cy="20" r="1.5" />
    </svg>
  );
}

function IconoVenta() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"
      fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v18" />
      <path d="m6 9 6-6 6 6" />
      <path d="m6 15 6 6 6-6" />
    </svg>
  );
}

export default function HistorialGlobal({ modo, refresco }) {
  const { address } = useIdentidad();
  const [filas, setFilas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!supabase) return;
    let vivo = true;
    (async () => {
      setCargando(true);
      setError(null);

      const { data, error: historialError } = await supabase
        .from("historial_propiedad")
        .select(
          "propietario_wallet, precio_venta_usd, regalia_artista_usd, regalia_iskay_usd, tx_hash, fecha_transferencia, obra_id"
        )
        .not("precio_venta_usd", "is", null)
        .order("fecha_transferencia", { ascending: false })
        .limit(50);

      if (!vivo) return;
      if (historialError) {
        console.error("[HistorialGlobal] select historial:", historialError);
        setError(historialError.message);
        setFilas([]);
        setCargando(false);
        return;
      }

      const historial = data || [];
      const ids = [...new Set(historial.map((f) => f.obra_id).filter(Boolean))];
      let obras = [];
      if (ids.length > 0) {
        const respuestaObras = await supabase
          .from("obras")
          .select("id, token_id, titulo, uid_chip_nfc, artista_id")
          .in("id", ids);
        if (respuestaObras.error) {
          console.error("[HistorialGlobal] select obras:", respuestaObras.error);
          setError(respuestaObras.error.message);
        } else {
          obras = respuestaObras.data || [];
        }
      }
      const obrasPorId = new Map(obras.map((obra) => [obra.id, obra]));
      let lista = historial.map((f) => ({
        ...f,
        obras: obrasPorId.get(f.obra_id) || null,
      }));

      if (modo === "artista" && address) {
        const { data: artista, error: errArt } = await supabase
          .from("artistas")
          .select("id")
          .ilike("wallet_address", address)
          .maybeSingle();
        if (errArt) console.error("[HistorialGlobal] select artista:", errArt);
        lista = artista
          ? lista.filter((f) => f.obras?.artista_id === artista.id)
          : [];
      } else if (modo === "comprador" && address) {
        const yo = address.toLowerCase();
        lista = lista.filter(
          (f) => (f.propietario_wallet || "").toLowerCase() === yo
        );
      } else if (!address) {
        lista = [];
      }

      if (vivo) {
        setFilas(lista);
        setCargando(false);
      }
    })();
    return () => {
      vivo = false;
    };
  }, [modo, address, refresco]);

  const titulo =
    modo === "artista" ? "Compradores de mis obras" : "Mis obras adquiridas";
  const ayuda =
    modo === "artista"
      ? "Cada reventa registrada en tu contra. La regalía cae automáticamente."
      : "Obras que has adquirido en este dispositivo.";

  return (
    <section className="historial">
      <header className="historial__cabecera">
        <p className="ojal">03 — Historial</p>
        <h3>{titulo}</h3>
        <p className="verificador__ayuda">{ayuda}</p>
      </header>
      {!address && (
        <div className="historial__vacio">
          <span className="marca-sello marca-sello--grande" aria-hidden="true">
            <img className="marca-sello__img" src="/iskay-sello.png" alt="" />
          </span>
          <p className="historial__vacio-titulo">
            Elegí una identidad
          </p>
          <p className="historial__vacio-texto">
            Seleccioná una identidad real o demo para ver tu historial de
            operaciones.
          </p>
        </div>
      )}

      {address && cargando && (
        <p className="verificador__estado" role="status">
          Cargando historial…
        </p>
      )}

      {address && !cargando && error && (
        <p className="registrar-obra__error">
          No se pudo cargar el historial: {error}
        </p>
      )}

      {address && !cargando && !error && filas.length === 0 && (
        <div className="historial__vacio">
          <span className="marca-sello marca-sello--grande" aria-hidden="true">
            <img className="marca-sello__img" src="/iskay-sello.png" alt="" />
          </span>
          <p className="historial__vacio-titulo">Sin movimientos aún</p>
          <p className="historial__vacio-texto">
            {modo === "artista"
              ? "Cuando alguien compre una de tus obras, aparecerá aquí."
              : "Cuando compres o revendas una obra, aparecerá aquí."}
          </p>
        </div>
      )}
      {address && !cargando && !error && filas.length > 0 && (
        <ul className="lista-movimientos">
          {filas.map((f) => {
            const precio = Number(f.precio_venta_usd) || 0;
            const regArt =
              Number(f.regalia_artista_usd) ||
              +((precio * REGALIA_ARTISTA_PCT) / 100).toFixed(2);
            const regIskay =
              Number(f.regalia_iskay_usd) ||
              +((precio * REGALIA_ISKAY_PCT) / 100).toFixed(2);
            const totalReg = +(regArt + regIskay).toFixed(2);
            const paraVend = +(precio - totalReg).toFixed(2);
            const fecha = f.fecha_transferencia
              ? new Date(f.fecha_transferencia).toLocaleString("es-BO", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "—";
            const comprador = `${f.propietario_wallet?.slice(0, 6)}…${f.propietario_wallet?.slice(-4)}`;
            const tituloObra = f.obras?.titulo || "Sin título";
            const token = f.obras?.token_id;

            return (
              <li
                key={f.tx_hash || `${f.obra_id}-${f.fecha_transferencia}`}
                className={`movimiento movimiento--${modo}`}
              >
                <span className="movimiento__sello" aria-hidden="true">
                  {modo === "artista" ? <IconoVenta /> : <IconoCompra />}
                </span>

                <div className="movimiento__cuerpo">
                  <div className="movimiento__meta">
                    <span className="movimiento__fecha">{fecha}</span>
                    <span className="movimiento__badge">
                      {modo === "artista" ? "Venta" : "Compra"}
                    </span>
                  </div>

                  <h4 className="movimiento__titulo">
                    “{tituloObra}”
                    <span className="movimiento__token">Token #{token}</span>
                  </h4>

                  <p className="movimiento__detalle">
                    {modo === "artista" ? (
                      <>
                        Vendiste a <code>{comprador}</code> por{" "}
                        <strong className="movimiento__monto">
                          ${precio.toFixed(2)}
                        </strong>
                      </>
                    ) : (
                      <>
                        Compraste a <code>{comprador}</code> por{" "}
                        <strong className="movimiento__monto">
                          ${precio.toFixed(2)}
                        </strong>
                      </>
                    )}
                  </p>

                  <dl className="movimiento__desglose">
                    <div>
                      <dt>Artista</dt>
                      <dd>+${regArt.toFixed(2)}</dd>
                      <span>{REGALIA_ARTISTA_PCT}%</span>
                    </div>
                    <div>
                      <dt>Iskay</dt>
                      <dd>+${regIskay.toFixed(2)}</dd>
                      <span>{REGALIA_ISKAY_PCT}%</span>
                    </div>
                    <div>
                      <dt>Vendedor</dt>
                      <dd>+${paraVend.toFixed(2)}</dd>
                      <span>neto</span>
                    </div>
                  </dl>

                  {f.tx_hash && (
                    <code className="movimiento__tx" title={f.tx_hash}>
                      TX {f.tx_hash.slice(0, 18)}…
                    </code>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}