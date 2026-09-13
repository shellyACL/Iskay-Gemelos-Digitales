import { useState } from "react";
import { useIdentidad } from "../hooks/useIdentidad";

export const qrKey = (w) => `iskay_qr_pago_${(w || "general").toLowerCase()}`;

export default function QrPago() {
  const { address, isConnected } = useIdentidad();
  const [img, setImg] = useState(
    () =>
      localStorage.getItem(qrKey(address)) ||
      localStorage.getItem(qrKey()) ||
      null
  );

  function cargar(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      const url = String(r.result);
      localStorage.setItem(qrKey(address), url);
      localStorage.setItem(qrKey(), url);
      setImg(url);
    };
    r.readAsDataURL(f);
  }

  function quitar() {
    localStorage.removeItem(qrKey(address));
    localStorage.removeItem(qrKey());
    setImg(null);
  }

  return (
    <section className="qr-pago">
      <header className="tarjeta__cabecera">
        <p className="ojal">Cobros</p>
        <h3>Código de cobro</h3>
        <p className="tarjeta__ayuda">
          Cargá tu QR de cobro. Se muestra al comprador al momento de adquirir
          una obra.
        </p>
      </header>

      {!isConnected && (
        <p className="verificador__estado">Conectá una cuenta para asociar el QR.</p>
      )}

      {isConnected && (
        <>
          <label className="qr-pago__upload">
            <input type="file" accept="image/*" onChange={cargar} />
            <span>{img ? "Cambiar imagen" : "Subir imagen del QR"}</span>
          </label>

          {img && (
            <div className="qr-pago__preview">
              <img src={img} alt="Código de cobro" />
              <button type="button" className="boton boton--fantasma" onClick={quitar}>
                Quitar
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}