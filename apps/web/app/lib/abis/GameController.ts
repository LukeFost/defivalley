export const GameControllerABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_gateway",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "_gasService",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [],
    "name": "InsufficientAmount",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidCommand",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidGasPayment",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidSeedType",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      }
    ],
    "name": "OwnableInvalidOwner",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "OwnableUnauthorizedAccount",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "PlayerAlreadyRegistered",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "PlayerNotRegistered",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ReentrancyGuardReentrantCall",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "SeedAlreadyHarvested",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "SeedNotReady",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "player",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "txId",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "destinationChain",
        "type": "string"
      }
    ],
    "name": "CrossChainDepositInitiated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "player",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "txId",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "destinationChain",
        "type": "string"
      }
    ],
    "name": "CrossChainHarvestInitiated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "previousOwner",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
      }
    ],
    "name": "OwnershipTransferred",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "player",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      }
    ],
    "name": "PlayerRegistered",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "player",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "seedId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "yieldAmount",
        "type": "uint256"
      }
    ],
    "name": "SeedHarvested",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "player",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "seedId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "seedType",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "bytes32",
        "name": "crossChainTxId",
        "type": "bytes32"
      }
    ],
    "name": "SeedPlanted",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "DESTINATION_CHAIN",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256[]",
        "name": "seedIds",
        "type": "uint256[]"
      },
      {
        "internalType": "address",
        "name": "gasToken",
        "type": "address"
      }
    ],
    "name": "batchHarvestSeeds",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "seedType",
        "type": "uint256"
      },
      {
        "components": [
          {
            "internalType": "string",
            "name": "name",
            "type": "string"
          },
          {
            "internalType": "uint256",
            "name": "minAmount",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "growthTime",
            "type": "uint256"
          },
          {
            "internalType": "bool",
            "name": "isActive",
            "type": "bool"
          }
        ],
        "internalType": "struct GameController.SeedConfig",
        "name": "config",
        "type": "tuple"
      }
    ],
    "name": "configureSeedType",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "defiVaultAddress",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "seedId",
        "type": "uint256"
      }
    ],
    "name": "emergencyHarvestSeed",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "gasService",
    "outputs": [
      {
        "internalType": "contract IAxelarGasService",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "gateway",
    "outputs": [
      {
        "internalType": "contract IAxelarGateway",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "player",
        "type": "address"
      }
    ],
    "name": "getHarvestableSeeds",
    "outputs": [
      {
        "internalType": "uint256[]",
        "name": "harvestableSeeds",
        "type": "uint256[]"
      },
      {
        "internalType": "uint256",
        "name": "totalHarvestableAmount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "totalEstimatedYield",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "player",
        "type": "address"
      }
    ],
    "name": "getPlayerState",
    "outputs": [
      {
        "internalType": "bool",
        "name": "isRegistered",
        "type": "bool"
      },
      {
        "internalType": "uint256",
        "name": "totalSeeds",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "lastPlantTime",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "experience",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "seedCount",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "player",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "seedId",
        "type": "uint256"
      }
    ],
    "name": "getSeedInfo",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "seedType",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "amount",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "plantTime",
            "type": "uint256"
          },
          {
            "internalType": "bool",
            "name": "isGrowing",
            "type": "bool"
          },
          {
            "internalType": "bytes32",
            "name": "crossChainTxId",
            "type": "bytes32"
          }
        ],
        "internalType": "struct GameController.SeedPosition",
        "name": "seed",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "seedId",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "gasToken",
        "type": "address"
      }
    ],
    "name": "harvestSeed",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "player",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "seedId",
        "type": "uint256"
      }
    ],
    "name": "isSeedReady",
    "outputs": [
      {
        "internalType": "bool",
        "name": "isReady",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "seedType",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "gasToken",
        "type": "address"
      }
    ],
    "name": "plantSeed",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "playerSeedCount",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "players",
    "outputs": [
      {
        "internalType": "bool",
        "name": "isRegistered",
        "type": "bool"
      },
      {
        "internalType": "uint256",
        "name": "totalSeeds",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "lastPlantTime",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "experience",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "registerPlayer",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "renounceOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "seedTypes",
    "outputs": [
      {
        "internalType": "string",
        "name": "name",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "minAmount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "growthTime",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "isActive",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "vaultAddress",
        "type": "string"
      }
    ],
    "name": "setDeFiVaultAddress",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "seedType",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "active",
        "type": "bool"
      }
    ],
    "name": "setSeedTypeActive",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
      }
    ],
    "name": "transferOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

export default GameControllerABI;