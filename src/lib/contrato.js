// Dirección del contrato ObraDigitalTwin ya desplegado y verificado
// en Ethereum Sepolia. Si vuelven a desplegar (otra red, nueva versión),
// solo hay que actualizar esta constante.
export const CONTRATO_DIRECCION = "0x44De8ed096eFADB08f2A24B4De568C620cAe9699";

export const CONTRATO_RED = "sepolia";
export const CONTRATO_CHAIN_ID = 11155111;

// ABI mínimo: solo las funciones y eventos que el frontend necesita.
// (El ABI completo sale de artifacts/ después de compilar el repo de
// contratos, pero para el frontend basta con esta porción legible.)
export const CONTRATO_ABI = [
  {
    type: "function",
    name: "ownerOf",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "tokenURI",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "string" }],
  },
  {
    type: "function",
    name: "obras",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [
      { name: "uidChipNFC", type: "string" },
      { name: "artistaWallet", type: "address" },
      { name: "galeriaWallet", type: "address" },
      { name: "fechaAcunacion", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "verificarChip",
    stateMutability: "view",
    inputs: [{ name: "uidChipNFC", type: "string" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "royaltyInfo",
    stateMutability: "view",
    inputs: [
      { name: "tokenId", type: "uint256" },
      { name: "salePrice", type: "uint256" },
    ],
    outputs: [
      { name: "receiver", type: "address" },
      { name: "royaltyAmount", type: "uint256" },
    ],
  },
];
