Nombre del proyecto:
Iskay — Galería y Verificador NFC para Arte Phygital

Descripción larga:
Iskay es una aplicación web que permite explorar obras de arte tokenizadas y verificar la autenticidad de un chip NFC contra un contrato inteligente en Ethereum Sepolia. Cada obra física tiene un chip NFC con un UID único, registrado on-chain en el contrato ObraDigitalTwin. Desde la app, el usuario puede conectar su wallet (MetaMask, WalletConnect o Coinbase Smart Wallet con Passkey), ver la galería de obras acuñadas, revisar dueño, artista, galería, UID y fecha, y verificar si un chip corresponde a una obra auténtica. La verificación se hace ingresando el UID leído del chip y llamando a verificarChip() en el contrato. El proyecto está construido con Vite, React, wagmi, viem y RainbowKit, y está desplegado como MVP funcional en Sepolia. Iskay demuestra cómo unir el mundo físico y el blockchain para dar trazabilidad y autenticidad al arte.

Stack:
Vite, React, wagmi, viem, RainbowKit, Ethereum Sepolia.

Contrato:
ObraDigitalTwin — 0x44De8ed096eFADB08f2A24B4De568C620cAe9699 (Sepolia)

Repo GitHub:
[pegar enlace]

Video demo:
[pegar enlace]

Cómo probar:

Abrir la app.

Conectar wallet en Sepolia.

Explorar galería y detalle de obra.

Ir al verificador NFC.

Pegar UID del chip y verificar.

