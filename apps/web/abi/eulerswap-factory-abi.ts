export const eulerSwapFactoryAbi = [
  {
    type: "function",
    name: "deployPool",
    inputs: [
      {
        name: "params",
        type: "tuple",
        internalType: "struct IEulerSwap.Params",
        components: [
          { name: "vault0", type: "address", internalType: "address" },
          { name: "vault1", type: "address", internalType: "address" },
          { name: "eulerAccount", type: "address", internalType: "address" },
          {
            name: "equilibriumReserve0",
            type: "uint112",
            internalType: "uint112",
          },
          {
            name: "equilibriumReserve1",
            type: "uint112",
            internalType: "uint112",
          },
          { name: "priceX", type: "uint256", internalType: "uint256" },
          { name: "priceY", type: "uint256", internalType: "uint256" },
          { name: "concentrationX", type: "uint256", internalType: "uint256" },
          { name: "concentrationY", type: "uint256", internalType: "uint256" },
          { name: "fee", type: "uint256", internalType: "uint256" },
          { name: "protocolFee", type: "uint256", internalType: "uint256" },
          {
            name: "protocolFeeRecipient",
            type: "address",
            internalType: "address",
          },
        ],
      },
      {
        name: "initialState",
        type: "tuple",
        internalType: "struct IEulerSwap.InitialState",
        components: [
          { name: "currReserve0", type: "uint112", internalType: "uint112" },
          { name: "currReserve1", type: "uint112", internalType: "uint112" },
        ],
      },
      { name: "salt", type: "bytes32", internalType: "bytes32" },
    ],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "poolByEulerAccount",
    inputs: [
      { name: "eulerAccount", type: "address", internalType: "address" },
    ],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "protocolFee",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "protocolFeeRecipient",
    inputs: [],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "eulerSwapImpl",
    inputs: [],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "view",
  },
] as const;

export const simpleSwapHelperAbi = [
  {
    type: "constructor",
    inputs: [
      { name: "_swapPeriphery", type: "address", internalType: "address" },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getQuote",
    inputs: [
      { name: "pool", type: "address", internalType: "address" },
      { name: "tokenIn", type: "address", internalType: "address" },
      { name: "tokenOut", type: "address", internalType: "address" },
      { name: "amountIn", type: "uint256", internalType: "uint256" },
    ],
    outputs: [{ name: "amountOut", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "swap",
    inputs: [
      { name: "pool", type: "address", internalType: "address" },
      { name: "tokenIn", type: "address", internalType: "address" },
      { name: "tokenOut", type: "address", internalType: "address" },
      { name: "amountIn", type: "uint256", internalType: "uint256" },
      { name: "amountOutMin", type: "uint256", internalType: "uint256" },
    ],
    outputs: [{ name: "amountOut", type: "uint256", internalType: "uint256" }],
    stateMutability: "nonpayable",
  },
] as const;