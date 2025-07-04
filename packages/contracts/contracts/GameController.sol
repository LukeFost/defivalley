// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title GameController
 * @dev Manages DeFi Valley game state on Saga Chainlet
 * This contract handles player registration, levels, and game mechanics
 * while interfacing with DeFi protocols on other chains via cross-chain messaging
 */
contract GameController is Ownable, ReentrancyGuard {
    
    struct Player {
        uint256 level;
        uint256 experience;
        uint256 seedsPlanted;
        uint256 totalHarvested;
        bool isRegistered;
        mapping(uint256 => uint256) itemBalances; // itemId => quantity
    }
    
    struct PlantedSeed {
        address player;
        uint256 seedType;
        uint256 plantedAt;
        uint256 maturityTime;
        uint256 expectedYield;
        bool isHarvested;
    }
    
    mapping(address => Player) public players;
    mapping(uint256 => PlantedSeed) public plantedSeeds;
    mapping(uint256 => uint256) public seedTypeToMaturityDuration; // seedType => seconds
    
    uint256 public nextSeedId;
    uint256 public constant EXPERIENCE_PER_PLANT = 10;
    uint256 public constant EXPERIENCE_PER_HARVEST = 25;
    
    // Events
    event PlayerRegistered(address indexed player);
    event SeedPlanted(address indexed player, uint256 indexed seedId, uint256 seedType);
    event SeedHarvested(address indexed player, uint256 indexed seedId, uint256 yield);
    event PlayerLevelUp(address indexed player, uint256 newLevel);
    event CrossChainDepositInitiated(address indexed player, uint256 amount, bytes32 indexed txHash);
    
    constructor() Ownable(msg.sender) {
        // Initialize seed types and their maturity durations
        seedTypeToMaturityDuration[1] = 1 hours;   // USDC Seed - 1 hour maturity
        seedTypeToMaturityDuration[2] = 4 hours;   // ETH Seed - 4 hour maturity  
        seedTypeToMaturityDuration[3] = 12 hours;  // BTC Seed - 12 hour maturity
    }
    
    /**
     * @dev Register a new player in the game
     */
    function registerPlayer() external {
        require(!players[msg.sender].isRegistered, "Player already registered");
        
        Player storage newPlayer = players[msg.sender];
        newPlayer.level = 1;
        newPlayer.experience = 0;
        newPlayer.seedsPlanted = 0;
        newPlayer.totalHarvested = 0;
        newPlayer.isRegistered = true;
        
        emit PlayerRegistered(msg.sender);
    }
    
    /**
     * @dev Plant a seed (this would trigger cross-chain DeFi deposit)
     * @param seedType The type of seed being planted (1=USDC, 2=ETH, 3=BTC)
     * @param expectedYield Expected yield from the DeFi protocol
     */
    function plantSeed(uint256 seedType, uint256 expectedYield) external nonReentrant {
        require(players[msg.sender].isRegistered, "Player not registered");
        require(seedTypeToMaturityDuration[seedType] > 0, "Invalid seed type");
        require(players[msg.sender].itemBalances[seedType] > 0, "Insufficient seeds");
        
        uint256 seedId = nextSeedId++;
        uint256 maturityTime = block.timestamp + seedTypeToMaturityDuration[seedType];
        
        plantedSeeds[seedId] = PlantedSeed({
            player: msg.sender,
            seedType: seedType,
            plantedAt: block.timestamp,
            maturityTime: maturityTime,
            expectedYield: expectedYield,
            isHarvested: false
        });
        
        // Consume the seed from inventory
        players[msg.sender].itemBalances[seedType]--;
        players[msg.sender].seedsPlanted++;
        
        // Grant experience
        _addExperience(msg.sender, EXPERIENCE_PER_PLANT);
        
        emit SeedPlanted(msg.sender, seedId, seedType);
    }
    
    /**
     * @dev Harvest a mature seed
     * @param seedId The ID of the seed to harvest
     */
    function harvestSeed(uint256 seedId) external nonReentrant {
        PlantedSeed storage seed = plantedSeeds[seedId];
        require(seed.player == msg.sender, "Not your seed");
        require(!seed.isHarvested, "Already harvested");
        require(block.timestamp >= seed.maturityTime, "Seed not mature yet");
        
        seed.isHarvested = true;
        players[msg.sender].totalHarvested += seed.expectedYield;
        
        // Grant experience
        _addExperience(msg.sender, EXPERIENCE_PER_HARVEST);
        
        emit SeedHarvested(msg.sender, seedId, seed.expectedYield);
    }
    
    /**
     * @dev Add seeds to player inventory (called by bridge contract)
     * @param player The player to give seeds to
     * @param seedType The type of seed
     * @param quantity The quantity of seeds
     */
    function addSeedsToInventory(address player, uint256 seedType, uint256 quantity) external onlyOwner {
        require(players[player].isRegistered, "Player not registered");
        players[player].itemBalances[seedType] += quantity;
    }
    
    /**
     * @dev Internal function to add experience and handle level ups
     */
    function _addExperience(address player, uint256 exp) internal {
        players[player].experience += exp;
        
        // Simple level calculation: level = experience / 100
        uint256 newLevel = (players[player].experience / 100) + 1;
        if (newLevel > players[player].level) {
            players[player].level = newLevel;
            emit PlayerLevelUp(player, newLevel);
        }
    }
    
    /**
     * @dev Get player information
     */
    function getPlayer(address playerAddr) external view returns (
        uint256 level,
        uint256 experience,
        uint256 seedsPlanted,
        uint256 totalHarvested,
        bool isRegistered
    ) {
        Player storage player = players[playerAddr];
        return (
            player.level,
            player.experience,
            player.seedsPlanted,
            player.totalHarvested,
            player.isRegistered
        );
    }
    
    /**
     * @dev Get player's seed balance
     */
    function getPlayerSeedBalance(address player, uint256 seedType) external view returns (uint256) {
        return players[player].itemBalances[seedType];
    }
    
    /**
     * @dev Check if a seed is ready for harvest
     */
    function isSeedReady(uint256 seedId) external view returns (bool) {
        return block.timestamp >= plantedSeeds[seedId].maturityTime && !plantedSeeds[seedId].isHarvested;
    }
    
    /**
     * @dev Get all planted seeds for a player (view function for frontend)
     */
    function getPlayerSeeds(address player) external view returns (uint256[] memory) {
        // Note: In production, you might want to use a more efficient storage pattern
        // This is a simplified version for the hackathon
        uint256[] memory playerSeedIds = new uint256[](nextSeedId);
        uint256 count = 0;
        
        for (uint256 i = 0; i < nextSeedId; i++) {
            if (plantedSeeds[i].player == player) {
                playerSeedIds[count] = i;
                count++;
            }
        }
        
        // Resize array to actual count
        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = playerSeedIds[i];
        }
        
        return result;
    }
}