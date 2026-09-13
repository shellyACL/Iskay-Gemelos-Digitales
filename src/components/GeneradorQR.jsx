import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";

export default function GeneradorQR() {
  const [uid, setUid] = useState("TEST001");

  return (
    <section className="qr-generador">
      <header className="tarjeta__cabecera">
        <p className="ojal">Identificador físico</p>
        <h3>Etiqueta de la obra</h3>
        <p className="tarjeta__ayuda">
          Generá el identificador que acompaña a la pieza. Imprimilo y adherilo
          para que pueda verificarse desde cualquier dispositivo.
        </p>
      </header>

      <div className="qr-generador__form">
        <label>
          Identificador
          <input
            type="text"
            value={uid}
            onChange={(e) => setUid(e.target.value)}
            spellCheck={false}
          />
        </label>
      </div>

      <div className="qr-generador__salida">
        <QRCodeSVG value={uid} size={180} level="M" includeMargin />
        <p className="qr-generador__uid">{uid}</p>
      </div>
    </section>
  );
}