// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@axelar-network/axelar-gmp-sdk-solidity/contracts/executable/AxelarExecutable.sol";

/**
 * @title DeFiVault
 * @dev Cross-chain DeFi vault that receives deposits from game actions on other chains
 * Integrates with EulerSwap to generate yield for players' farming activities
 * Enhanced with circuit breaker and deposit cap security features
 */
contract DeFiVault is Ownable, ReentrancyGuard, Pausable, AxelarExecutable {
    using SafeERC20 for IERC20;

    // State variables
    IERC20 public immutable depositToken; // USDC
    address public immutable eulerVault; // EulerSwap vault address
    
    // Security features
    uint256 public totalDepositCap; // Maximum total deposits allowed
    uint256 public totalDeposited; // Running total of all deposits
    mapping(address => bool) public pauseOperators; // Addresses that can pause
    uint256 public pauseOperatorCount;
    
    // Emergency state tracking
    bool public emergencyMode;
    uint256 public emergencyActivatedAt;
    string public emergencyReason;
    
    // Command enum for cross-chain message routing
    enum Command {
        INVALID,
        DEPOSIT,
        HARVEST,
        EMERGENCY_WITHDRAW,
        UPDATE_PLAYER_STATE
    }
    
    // Player positions tracking
    struct PlayerPosition {
        uint256 depositedAmount;
        uint256 lastYieldClaim;
        uint256 totalYieldEarned;
        bool isActive;
    }
    
    mapping(address => PlayerPosition) public playerPositions;
    mapping(string => bool) public processedCommands; // Prevent replay attacks
    
    // Events
    event DepositReceived(
        address indexed player,
        uint256 amount,
        bytes32 indexed commandId,
        string sourceChain
    );
    
    event YieldClaimed(
        address indexed player,
        uint256 yieldAmount,
        uint256 timestamp
    );
    
    event EmergencyWithdraw(
        address indexed player,
        uint256 amount,
        uint256 timestamp
    );
    
    event HarvestExecuted(
        address indexed player,
        uint256 yieldAmount,
        uint256 timestamp
    );
    
    event EmergencyPauseActivated(
        address indexed operator,
        string reason
    );
    
    event EmergencyUnpauseActivated(
        address indexed operator
    );
    
    event PauseOperatorAdded(
        address indexed operator
    );
    
    event PauseOperatorRemoved(
        address indexed operator
    );
    
    event DepositCapChanged(
        uint256 oldCap,
        uint256 newCap
    );

    // Errors
    error InvalidGateway();
    error InvalidAmount();
    error CommandAlreadyProcessed();
    error PlayerNotActive();
    error InsufficientYield();
    error DepositCapExceeded();
    error InvalidCommand();
    error UnauthorizedPauseOperator();
    error InvalidDepositCap();

    modifier onlyPauseOperator() {
        if (!pauseOperators[msg.sender]) revert UnauthorizedPauseOperator();
        _;
    }
    
    /**
     * @dev Constructor
     * @param _gateway Axelar Gateway contract address
     * @param _depositToken USDC token address on Arbitrum
     * @param _eulerVault EulerSwap vault address for yield generation
     * @param _initialDepositCap Initial deposit cap (can be adjusted later)
     */
    constructor(
        address _gateway,
        address _depositToken,
        address _eulerVault,
        uint256 _initialDepositCap
    ) Ownable(msg.sender) AxelarExecutable(_gateway) {
        depositToken = IERC20(_depositToken);
        eulerVault = _eulerVault;
        totalDepositCap = _initialDepositCap;
        
        // Add deployer as initial pause operator
        pauseOperators[msg.sender] = true;
        pauseOperatorCount = 1;
    }

    // =============================================================
    //                     PAUSE MANAGEMENT
    // =============================================================
    
    /**
     * @dev Emergency pause function - stops all deposits and claims
     */
    function emergencyPause(string calldata reason) external onlyPauseOperator {
        emergencyMode = true;
        emergencyActivatedAt = block.timestamp;
        emergencyReason = reason;
        _pause();
        emit EmergencyPauseActivated(msg.sender, reason);
    }
    
    /**
     * @dev Emergency unpause function - only owner can unpause
     */
    function emergencyUnpause() external onlyOwner {
        emergencyMode = false;
        emergencyActivatedAt = 0;
        emergencyReason = "";
        _unpause();
        emit EmergencyUnpauseActivated(msg.sender);
    }
    
    /**
     * @dev Add a pause operator
     */
    function addPauseOperator(address operator) external onlyOwner {
        require(operator != address(0), "Invalid operator address");
        if (!pauseOperators[operator]) {
            pauseOperators[operator] = true;
            pauseOperatorCount++;
            emit PauseOperatorAdded(operator);
        }
    }
    
    /**
     * @dev Remove a pause operator
     */
    function removePauseOperator(address operator) external onlyOwner {
        if (pauseOperators[operator]) {
            pauseOperators[operator] = false;
            pauseOperatorCount--;
            emit PauseOperatorRemoved(operator);
        }
    }
    
    /**
     * @dev Set deposit cap
     */
    function setDepositCap(uint256 newCap) external onlyOwner {
        if (newCap < totalDeposited) revert InvalidDepositCap();
        uint256 oldCap = totalDepositCap;
        totalDepositCap = newCap;
        emit DepositCapChanged(oldCap, newCap);
    }
    
    /**
     * @dev Get emergency state information
     */
    function getEmergencyState() external view returns (
        bool isEmergency,
        uint256 activatedAt,
        string memory reason,
        bool isPaused
    ) {
        return (emergencyMode, emergencyActivatedAt, emergencyReason, paused());
    }
    
    // =============================================================
    //                 CROSS-CHAIN MESSAGE ROUTING
    // =============================================================
    
    /**
     * @dev Enhanced Axelar cross-chain message receiver with command routing
     * Called when GameController sends instructions from Saga
     */
    function _execute(
        bytes32 commandId,
        string calldata sourceChain,
        string calldata sourceAddress,
        bytes calldata payload
    ) internal override whenNotPaused {
        // Prevent replay attacks
        string memory commandKey = string(abi.encodePacked(sourceChain, commandId));
        if (processedCommands[commandKey]) {
            revert CommandAlreadyProcessed();
        }
        processedCommands[commandKey] = true;
        
        // Decode command and route appropriately
        (Command command, address player, uint256 amount, bytes32 txId) = abi.decode(
            payload,
            (Command, address, uint256, bytes32)
        );
        
        // Route to appropriate handler based on command type
        if (command == Command.DEPOSIT) {
            _processDeposit(player, amount, commandId, sourceChain);
        } else if (command == Command.HARVEST) {
            _processHarvest(player, amount, commandId, sourceChain);
        } else if (command == Command.EMERGENCY_WITHDRAW) {
            _processEmergencyWithdraw(player, commandId, sourceChain);
        } else {
            revert InvalidCommand();
        }
    }

    /**
     * @dev Internal function to process DeFi deposits with deposit cap check
     * @param player The player address making the deposit
     * @param amount Amount of USDC to deposit
     * @param commandId Unique command identifier from cross-chain call
     * @param sourceChain The source chain name
     */
    function _processDeposit(
        address player,
        uint256 amount,
        bytes32 commandId,
        string memory sourceChain
    ) internal nonReentrant {
        if (amount == 0) revert InvalidAmount();
        
        // Check deposit cap
        if (totalDeposited + amount > totalDepositCap) {
            revert DepositCapExceeded();
        }
        
        // Update total deposited counter
        totalDeposited += amount;

        // Initialize player position if first deposit
        if (!playerPositions[player].isActive) {
            playerPositions[player].isActive = true;
            playerPositions[player].lastYieldClaim = block.timestamp;
        }

        // Update player position
        playerPositions[player].depositedAmount += amount;

        // Deposit USDC into EulerSwap vault for yield generation
        // Note: This assumes USDC was already sent to this contract via Avail bridge
        _depositToEulerVault(amount);

        emit DepositReceived(player, amount, commandId, sourceChain);
    }
    
    /**
     * @dev Process harvest command from cross-chain message
     * @param player The player address requesting harvest
     * @param amount Original deposit amount (for validation)
     * @param commandId Unique command identifier from cross-chain call
     * @param sourceChain The source chain name
     */
    function _processHarvest(
        address player,
        uint256 amount,
        bytes32 commandId,
        string memory sourceChain
    ) internal nonReentrant {
        PlayerPosition storage position = playerPositions[player];
        if (!position.isActive) revert PlayerNotActive();

        uint256 availableYield = _calculateYield(player);
        if (availableYield == 0) revert InsufficientYield();

        // Update player state
        position.lastYieldClaim = block.timestamp;
        position.totalYieldEarned += availableYield;

        // Withdraw yield from EulerSwap vault and transfer to player
        _withdrawFromEulerVault(availableYield);
        depositToken.safeTransfer(player, availableYield);

        emit HarvestExecuted(player, availableYield, block.timestamp);
    }
    
    /**
     * @dev Process emergency withdraw command from cross-chain message
     * @param player The player address requesting emergency withdraw
     * @param commandId Unique command identifier from cross-chain call
     * @param sourceChain The source chain name
     */
    function _processEmergencyWithdraw(
        address player,
        bytes32 commandId,
        string memory sourceChain
    ) internal nonReentrant {
        PlayerPosition storage position = playerPositions[player];
        if (!position.isActive) revert PlayerNotActive();

        uint256 withdrawAmount = position.depositedAmount;
        if (withdrawAmount == 0) revert InvalidAmount();

        // Update total deposited counter
        totalDeposited -= withdrawAmount;

        // Reset player position
        position.depositedAmount = 0;
        position.isActive = false;

        // Withdraw from EulerSwap and transfer to player
        _withdrawFromEulerVault(withdrawAmount);
        depositToken.safeTransfer(player, withdrawAmount);

        emit EmergencyWithdraw(player, withdrawAmount, block.timestamp);
    }

    /**
     * @dev Deposit funds into EulerSwap vault
     * @param amount Amount to deposit
     */
    function _depositToEulerVault(uint256 amount) internal {
        // Approve EulerSwap vault to spend USDC
        depositToken.safeIncreaseAllowance(eulerVault, amount);
        
        // Call EulerSwap deposit function
        // Note: This interface depends on EulerSwap's actual implementation
        // You'll need to update this based on their docs/ABI
        (bool success,) = eulerVault.call(
            abi.encodeWithSignature("deposit(uint256)", amount)
        );
        require(success, "EulerSwap deposit failed");
    }

    /**
     * @dev Players can claim their accumulated yield (with pause protection)
     */
    function claimYield() external nonReentrant whenNotPaused {
        PlayerPosition storage position = playerPositions[msg.sender];
        if (!position.isActive) revert PlayerNotActive();

        uint256 availableYield = _calculateYield(msg.sender);
        if (availableYield == 0) revert InsufficientYield();

        // Update player state
        position.lastYieldClaim = block.timestamp;
        position.totalYieldEarned += availableYield;

        // Transfer yield from EulerSwap vault
        _withdrawFromEulerVault(availableYield);
        depositToken.safeTransfer(msg.sender, availableYield);

        emit YieldClaimed(msg.sender, availableYield, block.timestamp);
    }

    /**
     * @dev Calculate available yield for a player
     * @param player Player address
     * @return Available yield amount
     */
    function _calculateYield(address player) internal view returns (uint256) {
        PlayerPosition memory position = playerPositions[player];
        if (!position.isActive || position.depositedAmount == 0) {
            return 0;
        }

        // Calculate time-based yield (simplified for demo)
        // In production, you'd query the actual EulerSwap vault yield
        uint256 timeSinceLastClaim = block.timestamp - position.lastYieldClaim;
        uint256 dailyYieldRate = 5; // 0.05% daily yield (adjustable)
        
        return (position.depositedAmount * dailyYieldRate * timeSinceLastClaim) / 
               (100 * 1000 * 86400); // Convert to daily percentage
    }

    /**
     * @dev Withdraw yield from EulerSwap vault
     * @param amount Amount to withdraw
     */
    function _withdrawFromEulerVault(uint256 amount) internal {
        // Call EulerSwap withdraw function
        // Note: This interface depends on EulerSwap's actual implementation
        (bool success,) = eulerVault.call(
            abi.encodeWithSignature("withdraw(uint256)", amount)
        );
        require(success, "EulerSwap withdrawal failed");
    }

    /**
     * @dev Emergency withdraw function for players (only works when paused)
     * Allows withdrawal of principal in case of emergencies
     */
    function emergencyWithdraw() external nonReentrant whenPaused {
        PlayerPosition storage position = playerPositions[msg.sender];
        if (!position.isActive) revert PlayerNotActive();

        uint256 withdrawAmount = position.depositedAmount;
        if (withdrawAmount == 0) revert InvalidAmount();

        // Update total deposited counter
        totalDeposited -= withdrawAmount;

        // Reset player position
        position.depositedAmount = 0;
        position.isActive = false;

        // Withdraw from EulerSwap and transfer to player
        _withdrawFromEulerVault(withdrawAmount);
        depositToken.safeTransfer(msg.sender, withdrawAmount);

        emit EmergencyWithdraw(msg.sender, withdrawAmount, block.timestamp);
    }

    /**
     * @dev Get player position details
     * @param player Player address
     * @return position Player's DeFi position
     * @return availableYield Current claimable yield
     */
    function getPlayerPosition(address player) 
        external 
        view 
        returns (PlayerPosition memory position, uint256 availableYield) 
    {
        position = playerPositions[player];
        availableYield = _calculateYield(player);
    }

    /**
     * @dev Owner function to update EulerSwap vault address if needed
     * @param newVault New vault address
     */
    function updateEulerVault(address newVault) external onlyOwner {
        // Would need to implement vault migration logic here
        // For now, just a placeholder for future upgrades
    }

    /**
     * @dev Owner function to rescue stuck tokens (emergency only)
     * @param token Token address to rescue
     * @param amount Amount to rescue
     */
    function rescueTokens(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(owner(), amount);
    }
}