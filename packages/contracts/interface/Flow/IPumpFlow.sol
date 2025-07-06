// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title IPumpFlow
 * @notice Interface for the PumpFlow meme token factory on Flow blockchain
 * @dev Factory contract at 0x576Be17F4dFa0E4964034e2E3dD29465B225B8d4
 */
interface IPumpFlow {
    // Struct definitions
    struct MemeToken {
        address tokenAddress;
        string name;
        string symbol;
        address creatorAddress;
        uint256 fundingRaised;
        string uniqueId;
        bool isBlocked;
    }
    
    /**
     * @notice Create a new meme token with specified parameters
     * @param name The name of the meme token (e.g., "Doge Coin")
     * @param symbol The symbol of the meme token (e.g., "DOGE")
     * @param fundingRaised The initial funding target or raised amount
     * @param uniqueId A unique identifier for the meme token
     * @return The address of the newly created meme token contract
     * @dev Requires payment of creation fee
     */
    function createMemeToken(
        string memory name,
        string memory symbol,
        uint256 fundingRaised,
        string memory uniqueId
    ) external payable returns (address);

    /**
     * @notice Buy tokens from a created meme token
     * @param memeTokenAddress The address of the meme token to buy
     * @param totalCost The total cost for the purchase
     * @dev Requires payment equal to totalCost
     */
    function buyTokens(
        address memeTokenAddress,
        uint256 totalCost
    ) external payable;
    
    /**
     * @notice Get the percentage of the current supply relative to the maximum supply before reaching the bounding curve.
     * If the maxAvailableBalance is 0, it returns 10000 (100%).
     * @param memeTokenAddress The address of the meme token.
     * @return The percentage of tokens minted relative to the available tokens before reaching the bounding curve, with two decimals (e.g., 10000 means 100.00%).
     */
    function getBoundingCurvePercentage(address memeTokenAddress) external view returns (uint256);

    /**
     * @notice Get the total number of meme tokens created through the platform.
     * @return The total number of meme tokens created.
     */
    function getTotalTokensCreated() external view returns (uint256);

    /**
     * @notice Get all meme tokens created by a specific creator address.
     * @param creatorAddress The address of the creator.
     * @return An array of MemeToken structs containing the information of all tokens created by the creator.
     */
    function getTokensByCreator(address creatorAddress) external view returns (MemeToken[] memory);

    /**
     * @notice Retrieve the remaining tokens in the launchpad for a given meme token.
     * @param memeTokenAddress The address of the meme token.
     * @return The remaining tokens in the launchpad.
     */
    function getRemainingTokensInLaunchpad(address memeTokenAddress) external view returns (uint256);

    /**
     * @notice Retrieve all meme tokens created through the platform, excluding blocked tokens.
     * @return An array of all meme tokens that are not blocked.
     */
    function getAllMemeTokens() external view returns (MemeToken[] memory);

    /**
     * @notice Calculate the Ether (flow) required to buy all the tokens available before reaching the bounding curve,
     * considering a 1% trading fee.
     * @param memeTokenAddress The address of the meme token.
     * @return The total amount of Ether required to buy the tokens, including the trading fee.
     */
    function calculateFlowToBuyMaxAvailableTokens(address memeTokenAddress) external view returns (uint256);
    
    // Events that might be emitted (inferred from typical factory patterns)
    event MemeTokenCreated(
        address indexed tokenAddress,
        string name,
        string symbol,
        address indexed creator,
        uint256 fundingRaised,
        string uniqueId
    );
    
    event TokensPurchased(
        address indexed tokenAddress,
        address indexed buyer,
        uint256 amount,
        uint256 cost
    );
}