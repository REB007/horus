// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./PredictionMarket_v3.sol";

contract MarketFactoryV3 {
    using SafeERC20 for IERC20;

    IERC20 public immutable usdc;
    address public admin;
    address[] public markets;

    uint256 public constant MIN_LIQUIDITY = 10 * 1e6; // 10 USDC

    event MarketCreated(
        address indexed market,
        address indexed creator,
        string question,
        uint256 resolutionTime,
        uint256 initialLiquidity
    );
    event AdminTransferred(address indexed oldAdmin, address indexed newAdmin);

    constructor(address _usdc) {
        usdc = IERC20(_usdc);
        admin = msg.sender;
    }

    /// @notice Anyone can create a market by providing ≥ MIN_LIQUIDITY USDC.
    /// @param _question          Human-readable question
    /// @param _resolutionTime    Unix timestamp when the market can be resolved
    /// @param _initialLiquidity  USDC amount (6 decimals) to seed the CPMM pool
    /// @param _oracleEndpoint    API endpoint used for price (e.g. Uniswap API)
    /// @param _sourceChainId     Chain ID where the token lives (1 = Ethereum, 8453 = Base, etc.)
    /// @param _sourcePool        Uniswap V3 pool address on source chain
    /// @param _sourceToken       Memecoin address on source chain
    /// @param _snapshotPrice     Current price at creation (int256, 18 decimals)
    function createMarket(
        string calldata _question,
        uint256 _resolutionTime,
        uint256 _initialLiquidity,
        string calldata _oracleEndpoint,
        uint256 _sourceChainId,
        address _sourcePool,
        address _sourceToken,
        int256 _snapshotPrice
    ) external returns (address) {
        require(_initialLiquidity >= MIN_LIQUIDITY, "below min liquidity");

        PredictionMarketV3 market = new PredictionMarketV3(
            address(usdc),
            admin,
            _question,
            _resolutionTime,
            _oracleEndpoint,
            _sourceChainId,
            _sourcePool,
            _sourceToken,
            _snapshotPrice
        );

        // Transfer USDC from creator and seed liquidity
        usdc.safeTransferFrom(msg.sender, address(this), _initialLiquidity);
        usdc.approve(address(market), _initialLiquidity);
        market.addLiquidity(_initialLiquidity);

        markets.push(address(market));

        emit MarketCreated(address(market), msg.sender, _question, _resolutionTime, _initialLiquidity);
        return address(market);
    }

    function getMarkets() external view returns (address[] memory) {
        return markets;
    }

    function getMarketCount() external view returns (uint256) {
        return markets.length;
    }

    function transferAdmin(address newAdmin) external {
        require(msg.sender == admin, "MarketFactoryV3: not admin");
        require(newAdmin != address(0), "zero address");
        emit AdminTransferred(admin, newAdmin);
        admin = newAdmin;
    }
}
