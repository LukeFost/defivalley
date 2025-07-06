// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title IMantleStaking
 * @notice Interface for the Mantle staking contract on Sepolia testnet
 * @dev Staking contract at 0xCAfD88816f07d4FFF671D0aAc5E4c1E29875AB2D
 */
interface IMantleStaking {
    /**
     * @notice Stake ETH into the Mantle staking contract
     * @dev Payable function that accepts ETH and records the staked amount
     */
    function stake() external payable;
    
    /**
     * @notice Get the staked balance of a specific account
     * @param account The address to query the balance for
     * @return The amount of ETH staked by the account
     */
    function balanceOf(address account) external view returns (uint256);
    
    /**
     * @notice Get the total amount of ETH staked in the contract
     * @return The total amount of ETH staked across all users
     */
    function totalStaked() external view returns (uint256);
    
    // Events
    event Staked(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
}