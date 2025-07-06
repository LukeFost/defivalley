export const pump_factory_address =
  "0x576Be17F4dFa0E4964034e2E3dD29465B225B8d4" as const;

export const pump_factory = [
  {
    inputs: [
      { internalType: "string", name: "name", type: "string" },
      { internalType: "string", name: "symbol", type: "string" },
      { internalType: "uint256", name: "fundingRaised", type: "uint256" },
      { internalType: "string", name: "uniqueId", type: "string" },
    ],
    name: "createMemeToken",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "memeTokenAddress", type: "address" },
      { internalType: "uint256", name: "totalCost", type: "uint256" },
    ],
    name: "buyTokens",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
] as const;

export const meme_token = [
  {
    inputs: [
      { internalType: "address", name: "spender", type: "address" },
      { internalType: "uint256", name: "value", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;
