import { useCallback, useEffect, useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import ObraCard from "./components/ObraCard";
import ObraDetalle from "./components/ObraDetalle";
import VerificadorNFC from "./components/VerificadorNFC";
import GeneradorQR from "./components/GeneradorQR";
import EscanerQR from "./components/EscanerQR";
import RegistrarObra from "./components/RegistrarObra";
import HistorialGlobal from "./components/HistorialGlobal";
import QrPago from "./components/QrPago";
import SelectorIdentidad from "./components/SelectorIdentidad";
import { supabase } from "./lib/supabase";
import { normalizeUid, extraerUidDeEvento } from "./lib/nfc";
import { useIdentidad } from "./hooks/useIdentidad";
import "./App.css";

const ROL_GUARDADO = "iskay_rol";

export default function App() {
  const [rol, setRol] = useState(
    () => localStorage.getItem(ROL_GUARDADO) || "comprador"
  );
  const [obraSeleccionada, setObraSeleccionada] = useState(null);
  const [uidEscaneado, setUidEscaneado] = useState(null);
  const [refrescoGaleria, setRefrescoGaleria] = useState(0);

  const { address: identidadActiva } = useIdentidad();

  function cambiarRol(nuevoRol) {
    setRol(nuevoRol);
    localStorage.setItem(ROL_GUARDADO, nuevoRol);
  }

  const [obrasAcunadas, setObrasAcunadas] = useState([]);
  const [cargandoGaleria, setCargandoGaleria] = useState(true);
  const [errorGaleria, setErrorGaleria] = useState(null);

  useEffect(() => {
    let cancelado = false;
    async function cargarGaleria() {
      setCargandoGaleria(true);
      setErrorGaleria(null);
      if (!supabase) {
        if (!cancelado) {
          setObrasAcunadas([]);
          setErrorGaleria("Supabase no está configurado.");
          setCargandoGaleria(false);
        }
        return;
      }
      const { data, error } = await supabase
        .from("obras")
        .select("token_id")
        .order("token_id", { ascending: true });
      if (cancelado) return;
      if (error) {
        setErrorGaleria(error.message);
        setObrasAcunadas([]);
      } else {
        setObrasAcunadas((data ?? []).map((f) => f.token_id));
      }
      setCargandoGaleria(false);
    }
    cargarGaleria();
    return () => {
      cancelado = true;
    };
  }, [refrescoGaleria]);

  useEffect(() => {
    function manejarLecturaNFC(evento) {
      const uid = normalizeUid(extraerUidDeEvento(evento));
      if (uid) setUidEscaneado(uid);
    }
    window.addEventListener("iskayNfcUid", manejarLecturaNFC);
    window.addEventListener("iskayNfcWritten", manejarLecturaNFC);
    import("./lib/nfc").then((m) =>
      m
        .obtenerUltimaLectura()
        .then((uid) => uid && setUidEscaneado(uid))
        .catch(() => {})
    );
    return () => {
      window.removeEventListener("iskayNfcUid", manejarLecturaNFC);
      window.removeEventListener("iskayNfcWritten", manejarLecturaNFC);
    };
  }, []);

  const manejarEscaneo = useCallback((texto) => {
    setUidEscaneado(normalizeUid(texto) || texto);
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header__marca">
          <span className="marca-sello" aria-hidden="true">
            <img
              className="marca-sello__img"
              src="/iskay-sello.png"
              alt=""
            />
          </span>
          <span className="app-header__marca-texto">
            <span className="app-header__logo">Iskay</span>
            <span className="app-header__tagline">
              Gemelos Digitales de Arte
            </span>
          </span>
        </div>
        <div className="app-header__wallet">
          <ConnectButton />
        </div>
      </header>

      {/* Selector de identidad activa (real o demo) */}
      <SelectorIdentidad />

      <div className="selector-rol" role="tablist" aria-label="Elegir rol">
        <button
          type="button"
          role="tab"
          aria-selected={rol === "comprador"}
          className={
            rol === "comprador"
              ? "selector-rol__boton selector-rol__boton--activo"
              : "selector-rol__boton"
          }
          onClick={() => cambiarRol("comprador")}
        >
          Soy comprador
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={rol === "artista"}
          className={
            rol === "artista"
              ? "selector-rol__boton selector-rol__boton--activo"
              : "selector-rol__boton"
          }
          onClick={() => cambiarRol("artista")}
        >
          Soy artista
        </button>
      </div>

      <main>
        <section className="hero">
          <p className="ojal">
            {rol === "artista"
              ? "Registro de obra"
              : "Verificación de autenticidad"}
          </p>
          {rol === "artista" ? (
            <>
              <h1>Certificá el origen de tu obra.</h1>
              <p>
                Cada pieza se vincula a un gemelo digital verificable. La procedencia
                queda registrada y las regalías se liquidan automáticamente en cada
                reventa.
              </p>
            </>
          ) : (
            <>
              <h1>Verificá la procedencia de una obra.</h1>
              <p>
                Comprobá en segundos que una pieza corresponde a su registro on-chain.
                Sin intermediarios, sin suposiciones.
              </p>
            </>
          )}
          {identidadActiva && (
            <p className="hero__identidad">
              Operando como <code>{identidadActiva.slice(0, 6)}…{identidadActiva.slice(-4)}</code>
            </p>
          )}
          <dl className="hero__stats">
            <div>
              <dt>Obras</dt>
              <dd>{obrasAcunadas.length}</dd>
            </div>
            <div>
              <dt>Red</dt>
              <dd>Sepolia</dd>
            </div>
            <div>
              <dt>Contrato</dt>
              <dd>Verificado</dd>
            </div>
          </dl>
        </section>

        <section className="galeria">
          <h2>Obras registradas</h2>

          {errorGaleria && (
            <p className="registrar-obra__error">
              No se pudo cargar la galería desde Supabase ({errorGaleria}).
            </p>
          )}

          {cargandoGaleria ? (
            <p className="verificador__estado">Cargando obras…</p>
          ) : (
            <div className="galeria__grid">
              {obrasAcunadas.map((tokenId) => (
                <ObraCard
                  key={tokenId}
                  tokenId={tokenId}
                  onVerDetalle={setObraSeleccionada}
                />
              ))}
            </div>
          )}
        </section>

        {rol === "artista" ? (
          <section className="panel-rol">
            <GeneradorQR />
            <RegistrarObra
              uidPrellenado={uidEscaneado}
              onRegistrada={() => setRefrescoGaleria((n) => n + 1)}
            />
            <QrPago />
            <HistorialGlobal modo="artista" refresco={refrescoGaleria} />
          </section>
        ) : (
          <section className="panel-rol">
            <EscanerQR onEscanear={manejarEscaneo} />
            <VerificadorNFC
              uidPrellenado={uidEscaneado}
              onVerDetalle={setObraSeleccionada}
            />
            <HistorialGlobal modo="comprador" refresco={refrescoGaleria} />
          </section>
        )}
      </main>

      {obraSeleccionada && (
        <ObraDetalle
          tokenId={obraSeleccionada}
          onCerrar={() => setObraSeleccionada(null)}
          rol={rol}
          onOperacion={() => setRefrescoGaleria((n) => n + 1)}
        />
      )}

      <footer className="app-footer">
        Contrato verificado en{" "}
        <a
          href="https://sepolia.etherscan.io/address/0x44De8ed096eFADB08f2A24B4De568C620cAe9699#code"
          target="_blank"
          rel="noreferrer"
        >
          Ethereum Sepolia
        </a>
      </footer>
    </div>
  );
}