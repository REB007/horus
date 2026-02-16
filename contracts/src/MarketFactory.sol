// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./PredictionMarket.sol";

contract MarketFactory {
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

    function createMarket(
        string calldata _question,
        uint256 _resolutionTime,
        uint256 _initialLiquidity
    ) external onlyAdmin returns (address) {
        require(_initialLiquidity > 0, "need initial liquidity");

        PredictionMarket market = new PredictionMarket(
            address(usdc),
            admin,
            _question,
            _resolutionTime
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
