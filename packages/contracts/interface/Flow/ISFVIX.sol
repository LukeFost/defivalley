// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title ISFVIX
 * @notice Interface for the sFVIX staking vault (ERC4626-compliant)
 * @dev Minimal interface for interacting with the StakingVault at 0x2751dB789ab49e4f1CFA192831c19D8f40c708c9
 */
interface ISFVIX {
    // ERC4626 Core Functions
    function deposit(uint256 assets, address receiver) external returns (uint256 shares);
    function mint(uint256 shares, address receiver) external returns (uint256 assets);
    function withdraw(uint256 assets, address receiver, address owner) external returns (uint256 shares);
    function redeem(uint256 shares, address receiver, address owner) external returns (uint256 assets);
    
    // ERC4626 View Functions
    function totalAssets() external view returns (uint256);
    function convertToShares(uint256 assets) external view returns (uint256);
    function convertToAssets(uint256 shares) external view returns (uint256);
    function previewDeposit(uint256 assets) external view returns (uint256);
    function previewMint(uint256 shares) external view returns (uint256);
    function previewWithdraw(uint256 assets) external view returns (uint256);
    function previewRedeem(uint256 shares) external view returns (uint256);
    function maxDeposit(address receiver) external view returns (uint256);
    function maxMint(address receiver) external view returns (uint256);
    function maxWithdraw(address owner) external view returns (uint256);
    function maxRedeem(address owner) external view returns (uint256);
    
    // ERC20 Functions (for sFVIX token)
    function balanceOf(address account) external view returns (uint256);
    function totalSupply() external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    
    // StakingVault Specific Functions
    function asset() external view returns (address);
    function rewardToken() external view returns (address);
    function minimumDeposit() external view returns (uint256);
    function feeBps() external view returns (uint256);
    function feeReceiver() external view returns (address);
    
    // Reward Functions
    function claimRewards() external;
    function calculateRewards(address user) external view returns (uint256);
    function pendingRewardsFor(address user) external view returns (uint256);
    function pendingRewards(address user) external view returns (uint256);
    function lastClaimBlock(address user) external view returns (uint256);
    
    // Events
    event Deposit(address indexed caller, address indexed owner, uint256 assets, uint256 shares);
    event Withdraw(address indexed caller, address indexed receiver, address indexed owner, uint256 assets, uint256 shares);
    event RewardsClaimed(address indexed user, uint256 amount);
}