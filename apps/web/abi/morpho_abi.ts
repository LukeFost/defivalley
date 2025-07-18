export const morpho_katana_address =
  "0xD50F2DffFd62f94Ee4AEd9ca05C61d0753268aBc";
export const morpho_abi = [
  {
    inputs: [],
    name: "DOMAIN_SEPARATOR",
    outputs: [
      {
        internalType: "bytes32",
        name: "",
        type: "bytes32",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: "address",
            name: "loanToken",
            type: "address",
          },
          {
            internalType: "address",
            name: "collateralToken",
            type: "address",
          },
          {
            internalType: "address",
            name: "oracle",
            type: "address",
          },
          {
            internalType: "address",
            name: "irm",
            type: "address",
          },
          {
            internalType: "uint256",
            name: "lltv",
            type: "uint256",
          },
        ],
        internalType: "struct MarketParams",
        name: "marketParams",
        type: "tuple",
      },
    ],
    name: "accrueInterest",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: "address",
            name: "loanToken",
            type: "address",
          },
          {
            internalType: "address",
            name: "collateralToken",
            type: "address",
          },
          {
            internalType: "address",
            name: "oracle",
            type: "address",
          },
          {
            internalType: "address",
            name: "irm",
            type: "address",
          },
          {
            internalType: "uint256",
            name: "lltv",
            type: "uint256",
          },
        ],
        internalType: "struct MarketParams",
        name: "marketParams",
        type: "tuple",
      },
      {
        internalType: "uint256",
        name: "assets",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "shares",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "onBehalf",
        type: "address",
      },
      {
        internalType: "address",
        name: "receiver",
        type: "address",
      },
    ],
    name: "borrow",
    outputs: [
      {
        internalType: "uint256",
        name: "assetsBorrowed",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "sharesBorrowed",
        type: "uint256",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: "address",
            name: "loanToken",
            type: "address",
          },
          {
            internalType: "address",
            name: "collateralToken",
            type: "address",
          },
          {
            internalType: "address",
            name: "oracle",
            type: "address",
          },
          {
            internalType: "address",
            name: "irm",
            type: "address",
          },
          {
            internalType: "uint256",
            name: "lltv",
            type: "uint256",
          },
        ],
        internalType: "struct MarketParams",
        name: "marketParams",
        type: "tuple",
      },
    ],
    name: "createMarket",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "irm",
        type: "address",
      },
    ],
    name: "enableIrm",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "lltv",
        type: "uint256",
      },
    ],
    name: "enableLltv",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes32[]",
        name: "slots",
        type: "bytes32[]",
      },
    ],
    name: "extSloads",
    outputs: [
      {
        internalType: "bytes32[]",
        name: "",
        type: "bytes32[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "feeRecipient",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "token",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "assets",
        type: "uint256",
      },
      {
        internalType: "bytes",
        name: "data",
        type: "bytes",
      },
    ],
    name: "flashLoan",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "Id",
        name: "id",
        type: "bytes32",
      },
    ],
    name: "idToMarketParams",
    outputs: [
      {
        components: [
          {
            internalType: "address",
            name: "loanToken",
            type: "address",
          },
          {
            internalType: "address",
            name: "collateralToken",
            type: "address",
          },
          {
            internalType: "address",
            name: "oracle",
            type: "address",
          },
          {
            internalType: "address",
            name: "irm",
            type: "address",
          },
          {
            internalType: "uint256",
            name: "lltv",
            type: "uint256",
          },
        ],
        internalType: "struct MarketParams",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "authorizer",
        type: "address",
      },
      {
        internalType: "address",
        name: "authorized",
        type: "address",
      },
    ],
    name: "isAuthorized",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "irm",
        type: "address",
      },
    ],
    name: "isIrmEnabled",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "lltv",
        type: "uint256",
      },
    ],
    name: "isLltvEnabled",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: "address",
            name: "loanToken",
            type: "address",
          },
          {
            internalType: "address",
            name: "collateralToken",
            type: "address",
          },
          {
            internalType: "address",
            name: "oracle",
            type: "address",
          },
          {
            internalType: "address",
            name: "irm",
            type: "address",
          },
          {
            internalType: "uint256",
            name: "lltv",
            type: "uint256",
          },
        ],
        internalType: "struct MarketParams",
        name: "marketParams",
        type: "tuple",
      },
      {
        internalType: "address",
        name: "borrower",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "seizedAssets",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "repaidShares",
        type: "uint256",
      },
      {
        internalType: "bytes",
        name: "data",
        type: "bytes",
      },
    ],
    name: "liquidate",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "Id",
        name: "id",
        type: "bytes32",
      },
    ],
    name: "market",
    outputs: [
      {
        components: [
          {
            internalType: "uint128",
            name: "totalSupplyAssets",
            type: "uint128",
          },
          {
            internalType: "uint128",
            name: "totalSupplyShares",
            type: "uint128",
          },
          {
            internalType: "uint128",
            name: "totalBorrowAssets",
            type: "uint128",
          },
          {
            internalType: "uint128",
            name: "totalBorrowShares",
            type: "uint128",
          },
          {
            internalType: "uint128",
            name: "lastUpdate",
            type: "uint128",
          },
          {
            internalType: "uint128",
            name: "fee",
            type: "uint128",
          },
        ],
        internalType: "struct Market",
        name: "m",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "authorizer",
        type: "address",
      },
    ],
    name: "nonce",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "Id",
        name: "id",
        type: "bytes32",
      },
      {
        internalType: "address",
        name: "user",
        type: "address",
      },
    ],
    name: "position",
    outputs: [
      {
        components: [
          {
            internalType: "uint256",
            name: "supplyShares",
            type: "uint256",
          },
          {
            internalType: "uint128",
            name: "borrowShares",
            type: "uint128",
          },
          {
            internalType: "uint128",
            name: "collateral",
            type: "uint128",
          },
        ],
        internalType: "struct Position",
        name: "p",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: "address",
            name: "loanToken",
            type: "address",
          },
          {
            internalType: "address",
            name: "collateralToken",
            type: "address",
          },
          {
            internalType: "address",
            name: "oracle",
            type: "address",
          },
          {
            internalType: "address",
            name: "irm",
            type: "address",
          },
          {
            internalType: "uint256",
            name: "lltv",
            type: "uint256",
          },
        ],
        internalType: "struct MarketParams",
        name: "marketParams",
        type: "tuple",
      },
      {
        internalType: "uint256",
        name: "assets",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "shares",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "onBehalf",
        type: "address",
      },
      {
        internalType: "bytes",
        name: "data",
        type: "bytes",
      },
    ],
    name: "repay",
    outputs: [
      {
        internalType: "uint256",
        name: "assetsRepaid",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "sharesRepaid",
        type: "uint256",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "authorized",
        type: "address",
      },
      {
        internalType: "bool",
        name: "newIsAuthorized",
        type: "bool",
      },
    ],
    name: "setAuthorization",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: "address",
            name: "authorizer",
            type: "address",
          },
          {
            internalType: "address",
            name: "authorized",
            type: "address",
          },
          {
            internalType: "bool",
            name: "isAuthorized",
            type: "bool",
          },
          {
            internalType: "uint256",
            name: "nonce",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "deadline",
            type: "uint256",
          },
        ],
        internalType: "struct Authorization",
        name: "authorization",
        type: "tuple",
      },
      {
        components: [
          {
            internalType: "uint8",
            name: "v",
            type: "uint8",
          },
          {
            internalType: "bytes32",
            name: "r",
            type: "bytes32",
          },
          {
            internalType: "bytes32",
            name: "s",
            type: "bytes32",
          },
        ],
        internalType: "struct Signature",
        name: "signature",
        type: "tuple",
      },
    ],
    name: "setAuthorizationWithSig",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: "address",
            name: "loanToken",
            type: "address",
          },
          {
            internalType: "address",
            name: "collateralToken",
            type: "address",
          },
          {
            internalType: "address",
            name: "oracle",
            type: "address",
          },
          {
            internalType: "address",
            name: "irm",
            type: "address",
          },
          {
            internalType: "uint256",
            name: "lltv",
            type: "uint256",
          },
        ],
        internalType: "struct MarketParams",
        name: "marketParams",
        type: "tuple",
      },
      {
        internalType: "uint256",
        name: "newFee",
        type: "uint256",
      },
    ],
    name: "setFee",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "newFeeRecipient",
        type: "address",
      },
    ],
    name: "setFeeRecipient",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "setOwner",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: "address",
            name: "loanToken",
            type: "address",
          },
          {
            internalType: "address",
            name: "collateralToken",
            type: "address",
          },
          {
            internalType: "address",
            name: "oracle",
            type: "address",
          },
          {
            internalType: "address",
            name: "irm",
            type: "address",
          },
          {
            internalType: "uint256",
            name: "lltv",
            type: "uint256",
          },
        ],
        internalType: "struct MarketParams",
        name: "marketParams",
        type: "tuple",
      },
      {
        internalType: "uint256",
        name: "assets",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "shares",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "onBehalf",
        type: "address",
      },
      {
        internalType: "bytes",
        name: "data",
        type: "bytes",
      },
    ],
    name: "supply",
    outputs: [
      {
        internalType: "uint256",
        name: "assetsSupplied",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "sharesSupplied",
        type: "uint256",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: "address",
            name: "loanToken",
            type: "address",
          },
          {
            internalType: "address",
            name: "collateralToken",
            type: "address",
          },
          {
            internalType: "address",
            name: "oracle",
            type: "address",
          },
          {
            internalType: "address",
            name: "irm",
            type: "address",
          },
          {
            internalType: "uint256",
            name: "lltv",
            type: "uint256",
          },
        ],
        internalType: "struct MarketParams",
        name: "marketParams",
        type: "tuple",
      },
      {
        internalType: "uint256",
        name: "assets",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "onBehalf",
        type: "address",
      },
      {
        internalType: "bytes",
        name: "data",
        type: "bytes",
      },
    ],
    name: "supplyCollateral",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: "address",
            name: "loanToken",
            type: "address",
          },
          {
            internalType: "address",
            name: "collateralToken",
            type: "address",
          },
          {
            internalType: "address",
            name: "oracle",
            type: "address",
          },
          {
            internalType: "address",
            name: "irm",
            type: "address",
          },
          {
            internalType: "uint256",
            name: "lltv",
            type: "uint256",
          },
        ],
        internalType: "struct MarketParams",
        name: "marketParams",
        type: "tuple",
      },
      {
        internalType: "uint256",
        name: "assets",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "shares",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "onBehalf",
        type: "address",
      },
      {
        internalType: "address",
        name: "receiver",
        type: "address",
      },
    ],
    name: "withdraw",
    outputs: [
      {
        internalType: "uint256",
        name: "assetsWithdrawn",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "sharesWithdrawn",
        type: "uint256",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: "address",
            name: "loanToken",
            type: "address",
          },
          {
            internalType: "address",
            name: "collateralToken",
            type: "address",
          },
          {
            internalType: "address",
            name: "oracle",
            type: "address",
          },
          {
            internalType: "address",
            name: "irm",
            type: "address",
          },
          {
            internalType: "uint256",
            name: "lltv",
            type: "uint256",
          },
        ],
        internalType: "struct MarketParams",
        name: "marketParams",
        type: "tuple",
      },
      {
        internalType: "uint256",
        name: "assets",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "onBehalf",
        type: "address",
      },
      {
        internalType: "address",
        name: "receiver",
        type: "address",
      },
    ],
    name: "withdrawCollateral",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;
