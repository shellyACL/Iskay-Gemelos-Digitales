import { useEffect, useRef, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";

const CONTENEDOR_ID = "lector-qr";

export default function EscanerQR({ onEscanear }) {
  const [activo, setActivo] = useState(false);
  const scannerRef = useRef(null);

  useEffect(() => {
    if (!activo) return;

    const scanner = new Html5QrcodeScanner(
      CONTENEDOR_ID,
      { fps: 10, qrbox: 220 },
      false
    );
    scannerRef.current = scanner;

    scanner.render(
      (uidLeido) => {
        onEscanear(uidLeido.trim());
        scanner.clear().catch(() => {});
        setActivo(false);
      },
      () => {}
    );

    return () => {
      scanner.clear().catch(() => {});
    };
  }, [activo, onEscanear]);

  return (
    <section className="qr-escaner">
      <header className="tarjeta__cabecera">
        <p className="ojal">Verificación</p>
        <h3>Escanear obra</h3>
        <p className="tarjeta__ayuda">
          Enfocá el código adherido a la pieza. La verificación se realiza
          contra el registro público en Ethereum Sepolia.
        </p>
      </header>

      {!activo ? (
        <button className="boton boton--primario" onClick={() => setActivo(true)}>
          Activar cámara
        </button>
      ) : (
        <button
          className="boton boton--fantasma"
          onClick={() => setActivo(false)}
        >
          Cancelar
        </button>
      )}

      <div id={CONTENEDOR_ID} className="qr-escaner__lector" />
    </section>
  );
}