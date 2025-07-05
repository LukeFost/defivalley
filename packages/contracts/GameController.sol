// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@axelar-network/axelar-gmp-sdk-solidity/contracts/interfaces/IAxelarGateway.sol";
import "@axelar-network/axelar-gmp-sdk-solidity/contracts/interfaces/IAxelarGasService.sol";

/**
 * @title GameController
 * @dev Manages game state and triggers cross-chain DeFi operations
 * Deployed on Saga Chainlet for gasless gaming with DeFi integration
 */
contract GameController is Ownable, ReentrancyGuard {
    
    // Axelar integration
    IAxelarGateway public immutable gateway;
    IAxelarGasService public immutable gasService;
    
    // Game configuration
    string public constant DESTINATION_CHAIN = "arbitrum"; // Axelar chain identifier
    string public defiVaultAddress; // DeFiVault contract address on Arbitrum
    
    // Command enum for cross-chain message routing (must match DeFiVault)
    enum Command {
        INVALID,
        DEPOSIT,
        HARVEST,
        EMERGENCY_WITHDRAW,
        UPDATE_PLAYER_STATE
    }
    
    // Player management
    struct Player {
        bool isRegistered;
        uint256 totalSeeds;
        uint256 lastPlantTime;
        uint256 experience;
        mapping(uint256 => SeedPosition) seeds;
    }
    
    struct SeedPosition {
        uint256 seedType; // 1=USDC, 2=ETH, etc.
        uint256 amount; // DeFi deposit amount
        uint256 plantTime;
        bool isGrowing;
        bytes32 crossChainTxId; // Reference to cross-chain transaction
    }
    
    mapping(address => Player) public players;
    mapping(address => uint256) public playerSeedCount;
    
    // Seed type configuration
    mapping(uint256 => SeedConfig) public seedTypes;
    
    struct SeedConfig {
        string name;
        uint256 minAmount; // Minimum USDC amount for this seed
        uint256 growthTime; // Time to maturity in seconds
        bool isActive;
    }
    
    // Events
    event PlayerRegistered(address indexed player, uint256 timestamp);
    
    event SeedPlanted(
        address indexed player,
        uint256 indexed seedId,
        uint256 seedType,
        uint256 amount,
        bytes32 crossChainTxId
    );
    
    event CrossChainDepositInitiated(
        address indexed player,
        uint256 amount,
        bytes32 indexed txId,
        string destinationChain
    );
    
    event CrossChainHarvestInitiated(
        address indexed player,
        uint256 amount,
        bytes32 indexed txId,
        string destinationChain
    );
    
    event SeedHarvested(
        address indexed player,
        uint256 indexed seedId,
        uint256 yieldAmount
    );

    // Errors
    error PlayerNotRegistered();
    error PlayerAlreadyRegistered();
    error InvalidSeedType();
    error InsufficientAmount();
    error SeedNotReady();
    error InvalidGasPayment();
    error SeedAlreadyHarvested();
    error InvalidCommand();

    /**
     * @dev Constructor
     * @param _gateway Axelar Gateway contract address on Saga
     * @param _gasService Axelar Gas Service contract address
     */
    constructor(
        address _gateway,
        address _gasService
    ) Ownable(msg.sender) {
        gateway = IAxelarGateway(_gateway);
        gasService = IAxelarGasService(_gasService);
        
        // Initialize default seed types
        _initializeSeedTypes();
    }

    /**
     * @dev Initialize default seed configurations
     */
    function _initializeSeedTypes() internal {
        // USDC Seed - Basic farming
        seedTypes[1] = SeedConfig({
            name: "USDC Sprout",
            minAmount: 10 * 1e6, // 10 USDC minimum
            growthTime: 24 hours,
            isActive: true
        });
        
        // Premium USDC Seed - Higher yield farming
        seedTypes[2] = SeedConfig({
            name: "USDC Premium",
            minAmount: 100 * 1e6, // 100 USDC minimum
            growthTime: 48 hours,
            isActive: true
        });
        
        // Whale USDC Seed - Maximum yield
        seedTypes[3] = SeedConfig({
            name: "USDC Whale Tree",
            minAmount: 1000 * 1e6, // 1000 USDC minimum
            growthTime: 72 hours,
            isActive: true
        });
    }

    /**
     * @dev Register a new player in the game
     */
    function registerPlayer() external {
        if (players[msg.sender].isRegistered) {
            revert PlayerAlreadyRegistered();
        }
        
        players[msg.sender].isRegistered = true;
        players[msg.sender].lastPlantTime = block.timestamp;
        
        emit PlayerRegistered(msg.sender, block.timestamp);
    }

    /**
     * @dev Plant a seed which triggers a cross-chain DeFi deposit
     * @param seedType Type of seed to plant (1, 2, or 3)
     * @param amount Amount of USDC to deposit for DeFi farming
     * @param gasToken Token to pay cross-chain gas (address(0) for native)
     */
    function plantSeed(
        uint256 seedType,
        uint256 amount,
        address gasToken
    ) external payable nonReentrant {
        if (!players[msg.sender].isRegistered) {
            revert PlayerNotRegistered();
        }
        
        SeedConfig memory config = seedTypes[seedType];
        if (!config.isActive) revert InvalidSeedType();
        if (amount < config.minAmount) revert InsufficientAmount();
        
        // Generate unique seed ID
        uint256 seedId = playerSeedCount[msg.sender]++;
        bytes32 txId = keccak256(abi.encodePacked(
            msg.sender, 
            seedId, 
            block.timestamp,
            amount
        ));
        
        // Update player state
        Player storage player = players[msg.sender];
        player.totalSeeds++;
        player.lastPlantTime = block.timestamp;
        player.experience += _calculateExperience(amount);
        
        // Create seed position
        player.seeds[seedId] = SeedPosition({
            seedType: seedType,
            amount: amount,
            plantTime: block.timestamp,
            isGrowing: true,
            crossChainTxId: txId
        });
        
        // Initiate cross-chain DeFi deposit
        _initiateCrossChainCommand(Command.DEPOSIT, amount, txId, gasToken);
        
        emit SeedPlanted(msg.sender, seedId, seedType, amount, txId);
    }

    /**
     * @dev Initiate cross-chain command to DeFi vault on Arbitrum
     * @param command Command type to execute
     * @param amount USDC amount involved
     * @param txId Unique transaction identifier
     * @param gasToken Token for paying cross-chain gas fees
     */
    function _initiateCrossChainCommand(
        Command command,
        uint256 amount,
        bytes32 txId,
        address gasToken
    ) internal {
        // Encode the payload with command routing
        bytes memory payload = abi.encode(command, msg.sender, amount, txId);
        
        // Pay for cross-chain gas
        if (gasToken == address(0)) {
            // Pay with native token (SAGA)
            if (msg.value == 0) revert InvalidGasPayment();
            
            gasService.payNativeGasForContractCall{value: msg.value}(
                address(this),
                DESTINATION_CHAIN,
                defiVaultAddress,
                payload,
                msg.sender
            );
        } else {
            // Pay with ERC20 token (if supported)
            gasService.payGasForContractCall(
                address(this),
                DESTINATION_CHAIN,
                defiVaultAddress,
                payload,
                gasToken,
                msg.value, // Amount of gas token
                msg.sender
            );
        }
        
        // Send the cross-chain message
        gateway.callContract(DESTINATION_CHAIN, defiVaultAddress, payload);
        
        // Emit appropriate event based on command
        if (command == Command.DEPOSIT) {
            emit CrossChainDepositInitiated(msg.sender, amount, txId, DESTINATION_CHAIN);
        } else if (command == Command.HARVEST) {
            emit CrossChainHarvestInitiated(msg.sender, amount, txId, DESTINATION_CHAIN);
        }
    }

    /**
     * @dev Calculate experience gained from planting seeds
     * @param amount USDC amount deposited
     * @return experience Experience points gained
     */
    function _calculateExperience(uint256 amount) internal pure returns (uint256) {
        // 1 XP per 10 USDC deposited (6 decimals for USDC)
        return amount / (10 * 1e6);
    }

    /**
     * @dev Check if a seed is ready for harvest
     * @param player Player address
     * @param seedId Seed identifier
     * @return isReady Whether the seed can be harvested
     */
    function isSeedReady(address player, uint256 seedId) 
        external 
        view 
        returns (bool isReady) 
    {
        SeedPosition storage seed = players[player].seeds[seedId];
        if (!seed.isGrowing) return false;
        
        SeedConfig memory config = seedTypes[seed.seedType];
        return block.timestamp >= seed.plantTime + config.growthTime;
    }

    /**
     * @dev Harvest a mature seed with one-click cross-chain yield claim
     * @param seedId Seed identifier to harvest
     * @param gasToken Token to pay cross-chain gas (address(0) for native)
     */
    function harvestSeed(uint256 seedId, address gasToken) external payable nonReentrant {
        if (!players[msg.sender].isRegistered) {
            revert PlayerNotRegistered();
        }
        
        SeedPosition storage seed = players[msg.sender].seeds[seedId];
        if (!seed.isGrowing) revert SeedAlreadyHarvested();
        
        SeedConfig memory config = seedTypes[seed.seedType];
        if (block.timestamp < seed.plantTime + config.growthTime) {
            revert SeedNotReady();
        }
        
        // Generate unique harvest transaction ID
        bytes32 harvestTxId = keccak256(abi.encodePacked(
            msg.sender,
            seedId,
            "harvest",
            block.timestamp,
            seed.crossChainTxId
        ));
        
        // Mark seed as harvested
        seed.isGrowing = false;
        
        // Initiate cross-chain harvest command
        _initiateCrossChainCommand(Command.HARVEST, seed.amount, harvestTxId, gasToken);
        
        // Calculate estimated yield for event (actual yield calculated on Arbitrum)
        uint256 estimatedYield = _calculateEstimatedYield(seed.amount, config.growthTime);
        
        emit SeedHarvested(msg.sender, seedId, estimatedYield);
    }
    
    /**
     * @dev Batch harvest multiple seeds with one-click cross-chain yield claim
     * @param seedIds Array of seed identifiers to harvest
     * @param gasToken Token to pay cross-chain gas (address(0) for native)
     */
    function batchHarvestSeeds(uint256[] calldata seedIds, address gasToken) external payable nonReentrant {
        if (!players[msg.sender].isRegistered) {
            revert PlayerNotRegistered();
        }
        
        uint256 totalAmount = 0;
        uint256 totalEstimatedYield = 0;
        
        // Validate all seeds and calculate totals
        for (uint256 i = 0; i < seedIds.length; i++) {
            uint256 seedId = seedIds[i];
            SeedPosition storage seed = players[msg.sender].seeds[seedId];
            
            if (!seed.isGrowing) revert SeedAlreadyHarvested();
            
            SeedConfig memory config = seedTypes[seed.seedType];
            if (block.timestamp < seed.plantTime + config.growthTime) {
                revert SeedNotReady();
            }
            
            totalAmount += seed.amount;
            totalEstimatedYield += _calculateEstimatedYield(seed.amount, config.growthTime);
        }
        
        // Generate unique batch harvest transaction ID
        bytes32 batchHarvestTxId = keccak256(abi.encodePacked(
            msg.sender,
            seedIds,
            "batch_harvest",
            block.timestamp,
            totalAmount
        ));
        
        // Mark all seeds as harvested
        for (uint256 i = 0; i < seedIds.length; i++) {
            players[msg.sender].seeds[seedIds[i]].isGrowing = false;
            emit SeedHarvested(msg.sender, seedIds[i], _calculateEstimatedYield(
                players[msg.sender].seeds[seedIds[i]].amount,
                seedTypes[players[msg.sender].seeds[seedIds[i]].seedType].growthTime
            ));
        }
        
        // Initiate single cross-chain harvest command for all seeds
        _initiateCrossChainCommand(Command.HARVEST, totalAmount, batchHarvestTxId, gasToken);
    }

    /**
     * @dev Calculate estimated yield for a seed (for display purposes)
     * @param amount Principal amount
     * @param growthTime Time the seed was growing
     * @return Estimated yield amount
     */
    function _calculateEstimatedYield(uint256 amount, uint256 growthTime) 
        internal 
        pure 
        returns (uint256) 
    {
        // Simplified calculation: 5% annual yield
        // Real yield comes from DeFi protocols on Arbitrum
        uint256 annualYield = (amount * 5) / 100;
        return (annualYield * growthTime) / 365 days;
    }

    /**
     * @dev Get player's game state
     * @param player Player address
     * @return isRegistered Whether player is registered
     * @return totalSeeds Total seeds planted
     * @return lastPlantTime Last time player planted a seed
     * @return experience Player experience points
     * @return seedCount Number of seeds planted
     */
    function getPlayerState(address player) 
        external 
        view 
        returns (
            bool isRegistered,
            uint256 totalSeeds,
            uint256 lastPlantTime,
            uint256 experience,
            uint256 seedCount
        ) 
    {
        Player storage p = players[player];
        return (
            p.isRegistered,
            p.totalSeeds,
            p.lastPlantTime,
            p.experience,
            playerSeedCount[player]
        );
    }

    /**
     * @dev Get specific seed information
     * @param player Player address
     * @param seedId Seed identifier
     * @return seed Seed position data
     */
    function getSeedInfo(address player, uint256 seedId) 
        external 
        view 
        returns (SeedPosition memory seed) 
    {
        return players[player].seeds[seedId];
    }
    
    /**
     * @dev Get all harvestable seeds for a player
     * @param player Player address
     * @return harvestableSeeds Array of seed IDs that can be harvested
     * @return totalHarvestableAmount Total amount from all harvestable seeds
     * @return totalEstimatedYield Total estimated yield from all harvestable seeds
     */
    function getHarvestableSeeds(address player) 
        external 
        view 
        returns (
            uint256[] memory harvestableSeeds,
            uint256 totalHarvestableAmount,
            uint256 totalEstimatedYield
        ) 
    {
        uint256 seedCount = playerSeedCount[player];
        uint256[] memory tempSeeds = new uint256[](seedCount);
        uint256 harvestableCount = 0;
        
        // Find all harvestable seeds
        for (uint256 i = 0; i < seedCount; i++) {
            SeedPosition storage seed = players[player].seeds[i];
            if (seed.isGrowing) {
                SeedConfig memory config = seedTypes[seed.seedType];
                if (block.timestamp >= seed.plantTime + config.growthTime) {
                    tempSeeds[harvestableCount] = i;
                    totalHarvestableAmount += seed.amount;
                    totalEstimatedYield += _calculateEstimatedYield(seed.amount, config.growthTime);
                    harvestableCount++;
                }
            }
        }
        
        // Create properly sized array
        harvestableSeeds = new uint256[](harvestableCount);
        for (uint256 i = 0; i < harvestableCount; i++) {
            harvestableSeeds[i] = tempSeeds[i];
        }
    }
    
    /**
     * @dev Emergency harvest function - allows harvesting without cross-chain call
     * Only marks seeds as harvested locally (for emergency situations)
     * @param seedId Seed identifier to harvest
     */
    function emergencyHarvestSeed(uint256 seedId) external {
        if (!players[msg.sender].isRegistered) {
            revert PlayerNotRegistered();
        }
        
        SeedPosition storage seed = players[msg.sender].seeds[seedId];
        if (!seed.isGrowing) revert SeedAlreadyHarvested();
        
        SeedConfig memory config = seedTypes[seed.seedType];
        if (block.timestamp < seed.plantTime + config.growthTime) {
            revert SeedNotReady();
        }
        
        // Mark seed as harvested (no cross-chain call)
        seed.isGrowing = false;
        
        // Calculate estimated yield for event
        uint256 estimatedYield = _calculateEstimatedYield(seed.amount, config.growthTime);
        
        emit SeedHarvested(msg.sender, seedId, estimatedYield);
    }

    /**
     * @dev Owner function to set DeFi vault address on Arbitrum
     * @param vaultAddress DeFiVault contract address
     */
    function setDeFiVaultAddress(string calldata vaultAddress) external onlyOwner {
        defiVaultAddress = vaultAddress;
    }

    /**
     * @dev Owner function to add/update seed types
     * @param seedType Seed type ID
     * @param config Seed configuration
     */
    function configureSeedType(uint256 seedType, SeedConfig calldata config) 
        external 
        onlyOwner 
    {
        seedTypes[seedType] = config;
    }

    /**
     * @dev Owner function to pause/unpause seed types
     * @param seedType Seed type ID
     * @param active Whether the seed type is active
     */
    function setSeedTypeActive(uint256 seedType, bool active) external onlyOwner {
        seedTypes[seedType].isActive = active;
    }
}