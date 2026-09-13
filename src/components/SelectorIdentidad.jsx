import { useState } from "react";
import {
  getIdentidadesDemo,
  addIdentidadDemo,
  removeIdentidadDemo,
  generarAddressDemo,
  acortarAddr,
} from "../lib/identidadDemo";
import { useIdentidad } from "../hooks/useIdentidad";

export default function SelectorIdentidad() {
  const { address, walletReal, walletRealConectada, cambiarIdentidad } =
    useIdentidad();
  const [abierto, setAbierto] = useState(false);
  const [lista, setLista] = useState(() => getIdentidadesDemo());
  const [etiqueta, setEtiqueta] = useState("");

  function refrescar() {
    setLista(getIdentidadesDemo());
  }

  function crear() {
    const addr = generarAddressDemo();
    const nombre = etiqueta.trim() || `Perfil ${lista.length + 1}`;
    addIdentidadDemo(addr, nombre);
    setEtiqueta("");
    refrescar();
    cambiarIdentidad(addr);
  }

  function borrar(addr) {
    if (!confirm(`¿Eliminar perfil ${acortarAddr(addr)}?`)) return;
    removeIdentidadDemo(addr);
    refrescar();
    if (address?.toLowerCase() === addr.toLowerCase()) {
      cambiarIdentidad(walletReal || null);
    }
  }

  const opciones = [];
  if (walletReal) {
    opciones.push({
      addr: walletReal,
      etiqueta: "Cuenta conectada",
      esDemo: false,
    });
  }
  lista.forEach((i) =>
    opciones.push({ addr: i.addr, etiqueta: i.etiqueta, esDemo: true })
  );

  const activa = opciones.find(
    (o) => o.addr?.toLowerCase() === address?.toLowerCase()
  );

  return (
    <section className="perfil">
      <button
        type="button"
        className="perfil__resumen"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
      >
        <span className="perfil__avatar" aria-hidden="true">
          {activa?.etiqueta?.charAt(0).toUpperCase() || "·"}
        </span>
        <span className="perfil__info">
          <span className="perfil__etiqueta">
            {activa?.etiqueta || "Sin perfil activo"}
          </span>
          {address && (
            <span className="perfil__addr">{acortarAddr(address)}</span>
          )}
        </span>
        <span className={`perfil__chevron ${abierto ? "perfil__chevron--abierto" : ""}`}>
          ▾
        </span>
      </button>

      {abierto && (
        <div className="perfil__panel">
          <p className="perfil__ayuda">
            Cambiá de cuenta para simular compradores y vendedores desde un
            mismo dispositivo.
          </p>

          <div className="perfil__crear">
            <input
              type="text"
              placeholder="Nombre del nuevo perfil"
              value={etiqueta}
              onChange={(e) => setEtiqueta(e.target.value)}
            />
            <button type="button" className="boton boton--secundario" onClick={crear}>
              Crear
            </button>
          </div>

          {!walletRealConectada && (
            <p className="perfil__ayuda">
              Conectá una wallet o creá un perfil para empezar.
            </p>
          )}

          {opciones.length > 0 && (
            <ul className="perfil__lista">
              {opciones.map((op) => {
                const esActiva =
                  address?.toLowerCase() === op.addr.toLowerCase();
                return (
                  <li
                    key={op.addr}
                    className={
                      "perfil__item" + (esActiva ? " perfil__item--activa" : "")
                    }
                  >
                    <button
                      type="button"
                      className="perfil__item-boton"
                      onClick={() => cambiarIdentidad(op.addr)}
                    >
                      <span className="perfil__item-nombre">
                        {op.etiqueta}
                      </span>
                      <span className="perfil__item-addr">
                        {acortarAddr(op.addr)}
                      </span>
                    </button>
                    {op.esDemo && (
                      <button
                        type="button"
                        className="perfil__item-borrar"
                        onClick={() => borrar(op.addr)}
                        aria-label="Eliminar"
                      >
                        ×
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}