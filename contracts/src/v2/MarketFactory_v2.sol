// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./PredictionMarket_v2.sol";
import "./interfaces/IUniswapV3Pool.sol";

contract MarketFactoryV2 {
    using SafeERC20 for IERC20;

    IERC20 public immutable usdc;
    address public admin;
    address[] public markets;

    event MarketCreated(
        address indexed market,
        string question,
        uint256 resolutionTime,
        uint256 initialLiquidity
    );
    event AdminTransferred(address indexed oldAdmin, address indexed newAdmin);

    modifier onlyAdmin() {
        require(msg.sender == admin, "MarketFactory: not admin");
        _;
    }

    constructor(address _usdc) {
        usdc = IERC20(_usdc);
        admin = msg.sender;
    }

    /// @notice Create a new 10-minute prediction market for a Clanker memecoin.
    /// @param _question      Human-readable question e.g. "Will $MEME be UP in 10 min?"
    /// @param _resolutionTime Unix timestamp when the market can be resolved (now + 600s)
    /// @param _initialLiquidity USDC amount (6 decimals) to seed the CPMM pool
    /// @param _pricePool     Address of the Uniswap V3 pool for the memecoin (from Clanker API)
    /// @param _token0IsQuote true if pool.token0() is the quote asset (WETH), false if it's the memecoin
    function createMarket(
        string calldata _question,
        uint256 _resolutionTime,
        uint256 _initialLiquidity,
        address _pricePool,
        bool _token0IsQuote
    ) external onlyAdmin returns (address) {
        require(_initialLiquidity > 0, "need initial liquidity");
        require(_pricePool != address(0), "need price pool");

        PredictionMarketV2 market = new PredictionMarketV2(
            address(usdc),
            admin,
            _question,
            _resolutionTime,
            _pricePool,
            _token0IsQuote
        );

        // Transfer USDC from admin and seed liquidity
        usdc.safeTransferFrom(msg.sender, address(this), _initialLiquidity);
        usdc.approve(address(market), _initialLiquidity);
        market.addLiquidity(_initialLiquidity);

        markets.push(address(market));

        emit MarketCreated(address(market), _question, _resolutionTime, _initialLiquidity);
        return address(market);
    }

    function getMarkets() external view returns (address[] memory) {
        return markets;
    }

    function getMarketCount() external view returns (uint256) {
        return markets.length;
    }

    function transferAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "zero address");
        emit AdminTransferred(admin, newAdmin);
        admin = newAdmin;
    }
}
