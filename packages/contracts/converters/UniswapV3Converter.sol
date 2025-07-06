// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);

    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) external returns (bool);

    function balanceOf(address account) external view returns (uint256);

    function approve(address spender, uint256 amount) external returns (bool);
}

interface IUniswapV3Factory {
    function getPool(
        address tokenA,
        address tokenB,
        uint24 fee
    ) external view returns (address pool);
}

interface IUniswapV3Pool {
    function token0() external view returns (address);

    function token1() external view returns (address);

    function fee() external view returns (uint24);

    function swap(
        address recipient,
        bool zeroForOne,
        int256 amountSpecified,
        uint160 sqrtPriceLimitX96,
        bytes calldata data
    ) external returns (int256 amount0, int256 amount1);
}

interface ISwapCallback {
    function uniswapV3SwapCallback(
        int256 amount0Delta,
        int256 amount1Delta,
        bytes calldata data
    ) external;
}

contract UniswapV3Converter is ISwapCallback {
    address public immutable factory;
    uint160 internal constant MIN_SQRT_RATIO = 4295128739;
    uint160 internal constant MAX_SQRT_RATIO =
        1461446703485210103287273052203988822378723970342;

    constructor(address _factory) {
        factory = _factory;
    }

    function swap(
        address tokenIn,
        address tokenOut,
        uint24 fee,
        uint256 amountIn,
        uint256 amountOutMin,
        address recipient
    ) external returns (uint256 amountOut) {
        require(tokenIn != tokenOut, "Same token");

        address pool = IUniswapV3Factory(factory).getPool(
            tokenIn,
            tokenOut,
            fee
        );
        require(pool != address(0), "Pool does not exist");

        bool zeroForOne = tokenIn < tokenOut;
        uint160 sqrtPriceLimitX96 = zeroForOne
            ? MIN_SQRT_RATIO + 1
            : MAX_SQRT_RATIO - 1;

        (int256 amount0, int256 amount1) = IUniswapV3Pool(pool).swap(
            recipient,
            zeroForOne,
            int256(amountIn),
            sqrtPriceLimitX96,
            abi.encode(msg.sender, tokenIn, tokenOut)
        );

        amountOut = uint256(-(zeroForOne ? amount1 : amount0));
        require(amountOut >= amountOutMin, "Insufficient output amount");
    }

    function uniswapV3SwapCallback(
        int256 amount0Delta,
        int256 amount1Delta,
        bytes calldata data
    ) external override {
        (address payer, address tokenIn, ) = abi.decode(
            data,
            (address, address, address)
        );

        uint256 amountToPay = amount0Delta > 0
            ? uint256(amount0Delta)
            : uint256(amount1Delta);

        IERC20(tokenIn).transferFrom(payer, msg.sender, amountToPay);
    }
}
