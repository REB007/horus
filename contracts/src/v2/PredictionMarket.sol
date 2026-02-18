// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "../OutcomeToken.sol";
import "./interfaces/IUniswapV3Pool.sol";

contract PredictionMarket {
    using SafeERC20 for IERC20;

    // --- Tokens ---
    OutcomeToken public yesToken;
    OutcomeToken public noToken;
    IERC20 public immutable usdc;

    // --- CPMM Pool ---
    uint256 public yesReserve;
    uint256 public noReserve;
    uint256 public totalLpSupply;
    mapping(address => uint256) public lpBalances;

    // --- Resolution ---
    bool public resolved;
    bool public yesWins;

    // --- Price Oracle ---
    IUniswapV3Pool public pricePool;
    int24 public snapshotTick;
    bool public token0IsQuote; // true if token0 is the quote asset (WETH)

    // --- Metadata ---
    address public admin;
    string public question;
    uint256 public resolutionTime;

    // --- Constants ---
    uint256 public constant FEE_BPS = 200; // 2%
    uint256 public constant BPS = 10_000;

    // --- Events ---
    event Buy(address indexed user, bool indexed buyYes, uint256 usdcIn, uint256 tokensOut);
    event Sell(address indexed user, bool indexed sellYes, uint256 tokensIn, uint256 usdcOut);
    event LiquidityAdded(address indexed provider, uint256 usdcAmount, uint256 lpShares);
    event LiquidityRemoved(address indexed provider, uint256 lpShares, uint256 usdcOut, uint256 yesOut, uint256 noOut);
    event MarketResolved(bool yesWins);
    event Claimed(address indexed user, uint256 usdcAmount);
    event Minted(address indexed user, uint256 usdcAmount);
    event Redeemed(address indexed user, uint256 amount);

    modifier onlyAdmin() {
        require(msg.sender == admin, "PredictionMarket: not admin");
        _;
    }

    modifier notResolved() {
        require(!resolved, "PredictionMarket: already resolved");
        _;
    }

    constructor(
        address _usdc,
        address _admin,
        string memory _question,
        uint256 _resolutionTime,
        address _pricePool,
        bool _token0IsQuote
    ) {
        usdc = IERC20(_usdc);
        admin = _admin;
        question = _question;
        resolutionTime = _resolutionTime;

        yesToken = new OutcomeToken("YES Token", "YES", address(this));
        noToken = new OutcomeToken("NO Token", "NO", address(this));

        pricePool = IUniswapV3Pool(_pricePool);
        token0IsQuote = _token0IsQuote;
        (, snapshotTick,,,,,) = pricePool.slot0();
    }

    // ========== Mint / Redeem (1 YES + 1 NO = 1 USDC) ==========

    function mint(uint256 usdcAmount) external notResolved {
        require(usdcAmount > 0, "zero amount");
        usdc.safeTransferFrom(msg.sender, address(this), usdcAmount);
        yesToken.mint(msg.sender, usdcAmount);
        noToken.mint(msg.sender, usdcAmount);
        emit Minted(msg.sender, usdcAmount);
    }

    function redeem(uint256 amount) external {
        require(amount > 0, "zero amount");
        yesToken.burn(msg.sender, amount);
        noToken.burn(msg.sender, amount);
        usdc.safeTransfer(msg.sender, amount);
        emit Redeemed(msg.sender, amount);
    }

    // ========== CPMM Trading ==========
    //
    // Buy: user deposits USDC, receives outcome tokens.
    //   1. Split USDC into YES+NO (mint to contract)
    //   2. Compute output using old k = yesR * noR
    //   3. Transfer desired tokens to user
    //
    // Sell: user sends outcome tokens, receives USDC.
    //   1. Tokens enter the contract (burn from user, mint to contract)
    //   2. Compute how many complete sets to merge (quadratic formula)
    //   3. Burn complete sets, send USDC to user

    function buy(bool buyYes, uint256 usdcAmount) external notResolved {
        require(usdcAmount > 0, "zero amount");
        require(yesReserve > 0 && noReserve > 0, "no liquidity");

        usdc.safeTransferFrom(msg.sender, address(this), usdcAmount);

        uint256 fee = (usdcAmount * FEE_BPS) / BPS;
        uint256 investmentAmount = usdcAmount - fee;

        yesToken.mint(address(this), investmentAmount);
        noToken.mint(address(this), investmentAmount);

        uint256 k = yesReserve * noReserve;
        uint256 tokensOut;

        if (buyYes) {
            uint256 newNoReserve = noReserve + investmentAmount;
            tokensOut = yesReserve + investmentAmount - k / newNoReserve;
            yesReserve = yesReserve + investmentAmount - tokensOut;
            noReserve = newNoReserve;
            yesToken.transfer(msg.sender, tokensOut);
        } else {
            uint256 newYesReserve = yesReserve + investmentAmount;
            tokensOut = noReserve + investmentAmount - k / newYesReserve;
            noReserve = noReserve + investmentAmount - tokensOut;
            yesReserve = newYesReserve;
            noToken.transfer(msg.sender, tokensOut);
        }

        emit Buy(msg.sender, buyYes, usdcAmount, tokensOut);
    }

    function sell(bool sellYes, uint256 tokenAmount) external notResolved {
        require(tokenAmount > 0, "zero amount");
        require(yesReserve > 0 && noReserve > 0, "no liquidity");

        uint256 fee = (tokenAmount * FEE_BPS) / BPS;
        uint256 effectiveAmount = tokenAmount - fee;

        uint256 usdcOut;

        if (sellYes) {
            yesToken.burn(msg.sender, tokenAmount);
            yesToken.mint(address(this), tokenAmount);

            usdcOut = _computeSellReturn(yesReserve, noReserve, effectiveAmount);
            yesReserve = yesReserve + effectiveAmount - usdcOut;
            noReserve = noReserve - usdcOut;

            yesToken.burn(address(this), usdcOut);
            noToken.burn(address(this), usdcOut);
        } else {
            noToken.burn(msg.sender, tokenAmount);
            noToken.mint(address(this), tokenAmount);

            usdcOut = _computeSellReturn(noReserve, yesReserve, effectiveAmount);
            noReserve = noReserve + effectiveAmount - usdcOut;
            yesReserve = yesReserve - usdcOut;

            noToken.burn(address(this), usdcOut);
            yesToken.burn(address(this), usdcOut);
        }

        usdc.safeTransfer(msg.sender, usdcOut);
        emit Sell(msg.sender, sellYes, tokenAmount, usdcOut);
    }

    /// @dev Solves: m^2 - m*(sellReserve + eff + otherReserve) + eff * otherReserve = 0
    ///      Returns the smaller root m (= USDC out).
    function _computeSellReturn(
        uint256 sellReserve,
        uint256 otherReserve,
        uint256 effectiveAmount
    ) internal pure returns (uint256) {
        uint256 sum = sellReserve + effectiveAmount + otherReserve;
        uint256 discriminant = sum * sum - 4 * effectiveAmount * otherReserve;
        uint256 sqrtDisc = Math.sqrt(discriminant);
        return (sum - sqrtDisc) / 2;
    }

    // ========== Liquidity ==========

    function addLiquidity(uint256 usdcAmount) external notResolved {
        require(usdcAmount > 0, "zero amount");

        usdc.safeTransferFrom(msg.sender, address(this), usdcAmount);

        yesToken.mint(address(this), usdcAmount);
        noToken.mint(address(this), usdcAmount);

        uint256 lpShares;

        if (totalLpSupply == 0) {
            yesReserve = usdcAmount;
            noReserve = usdcAmount;
            lpShares = usdcAmount;
        } else {
            uint256 maxReserve = yesReserve > noReserve ? yesReserve : noReserve;
            uint256 yesAdd = (usdcAmount * yesReserve) / maxReserve;
            uint256 noAdd = (usdcAmount * noReserve) / maxReserve;

            yesReserve += yesAdd;
            noReserve += noAdd;

            lpShares = (usdcAmount * totalLpSupply) / maxReserve;

            uint256 excessYes = usdcAmount - yesAdd;
            uint256 excessNo = usdcAmount - noAdd;
            if (excessYes > 0) yesToken.transfer(msg.sender, excessYes);
            if (excessNo > 0) noToken.transfer(msg.sender, excessNo);
        }

        totalLpSupply += lpShares;
        lpBalances[msg.sender] += lpShares;
        emit LiquidityAdded(msg.sender, usdcAmount, lpShares);
    }

    function removeLiquidity(uint256 lpAmount) external {
        require(lpAmount > 0, "zero amount");
        require(lpBalances[msg.sender] >= lpAmount, "insufficient LP");

        uint256 yesAmount = (lpAmount * yesReserve) / totalLpSupply;
        uint256 noAmount = (lpAmount * noReserve) / totalLpSupply;

        lpBalances[msg.sender] -= lpAmount;
        totalLpSupply -= lpAmount;
        yesReserve -= yesAmount;
        noReserve -= noAmount;

        uint256 pairs = yesAmount < noAmount ? yesAmount : noAmount;
        uint256 excessYes = yesAmount - pairs;
        uint256 excessNo = noAmount - pairs;

        if (pairs > 0) {
            yesToken.burn(address(this), pairs);
            noToken.burn(address(this), pairs);
            usdc.safeTransfer(msg.sender, pairs);
        }
        if (excessYes > 0) yesToken.transfer(msg.sender, excessYes);
        if (excessNo > 0) noToken.transfer(msg.sender, excessNo);

        emit LiquidityRemoved(msg.sender, lpAmount, pairs, excessYes, excessNo);
    }

    // ========== Resolution ==========

    /// @notice Admin triggers resolution. The contract reads the current Uniswap V3
    ///         spot price and compares it to the snapshot taken at market creation.
    ///         Admin cannot choose the outcome — the price oracle decides.
    function resolve() external onlyAdmin notResolved {
        require(block.timestamp >= resolutionTime, "PredictionMarket: too early");

        (, int24 currentTick,,,,,) = pricePool.slot0();

        // If token0 is the quote asset (WETH):
        //   tick DOWN means memecoin got more expensive relative to WETH → price UP
        // If token0 is the memecoin:
        //   tick UP means memecoin got more expensive → price UP
        bool priceUp = token0IsQuote
            ? currentTick < snapshotTick
            : currentTick > snapshotTick;

        resolved = true;
        yesWins = priceUp;
        emit MarketResolved(priceUp);
    }

    function claim() external {
        require(resolved, "PredictionMarket: not resolved");

        uint256 amount;
        if (yesWins) {
            amount = yesToken.balanceOf(msg.sender);
            require(amount > 0, "nothing to claim");
            yesToken.burn(msg.sender, amount);
        } else {
            amount = noToken.balanceOf(msg.sender);
            require(amount > 0, "nothing to claim");
            noToken.burn(msg.sender, amount);
        }

        usdc.safeTransfer(msg.sender, amount);
        emit Claimed(msg.sender, amount);
    }

    // ========== Views ==========

    function getYesPrice() external view returns (uint256) {
        if (yesReserve == 0 && noReserve == 0) return 5000;
        return (noReserve * BPS) / (yesReserve + noReserve);
    }

    function getNoPrice() external view returns (uint256) {
        if (yesReserve == 0 && noReserve == 0) return 5000;
        return (yesReserve * BPS) / (yesReserve + noReserve);
    }

    function getReserves() external view returns (uint256, uint256) {
        return (yesReserve, noReserve);
    }

    function getCurrentTick() external view returns (int24) {
        (, int24 tick,,,,,) = pricePool.slot0();
        return tick;
    }
}
