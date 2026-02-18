// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../../src/v2/PredictionMarket.sol";
import "../../src/v2/MarketFactory.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @dev Mock USDC with 6 decimals
contract MockUSDC is ERC20 {
    constructor() ERC20("USD Coin", "USDC") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

/// @dev Mock Uniswap V3 pool with settable tick
contract MockUniswapV3Pool {
    int24 public currentTick;
    address public _token0;
    address public _token1;

    constructor(int24 _tick, address token0Addr, address token1Addr) {
        currentTick = _tick;
        _token0 = token0Addr;
        _token1 = token1Addr;
    }

    function setTick(int24 _tick) external {
        currentTick = _tick;
    }

    function slot0() external view returns (
        uint160 sqrtPriceX96,
        int24 tick,
        uint16 observationIndex,
        uint16 observationCardinality,
        uint16 observationCardinalityNext,
        uint8 feeProtocol,
        bool unlocked
    ) {
        return (0, currentTick, 0, 1, 1, 0, true);
    }

    function token0() external view returns (address) {
        return _token0;
    }

    function token1() external view returns (address) {
        return _token1;
    }
}

contract PredictionMarketV2Test is Test {
    MockUSDC usdc;
    MockUniswapV3Pool mockPool;
    PredictionMarket market;
    MarketFactory factory;

    address admin = address(1);
    address alice = address(2);
    address bob = address(3);
    address carol = address(4);
    address weth = address(0x4200000000000000000000000000000000000006); // WETH on Base
    address meme = address(0x1111111111111111111111111111111111111111); // mock memecoin

    int24 constant SNAPSHOT_TICK = -230400;
    uint256 constant USDC_UNIT = 1e6;
    uint256 constant RESOLUTION_DELAY = 600; // 10 minutes

    function setUp() public {
        usdc = new MockUSDC();

        // Pool: token0=WETH (quote), token1=MEME → token0IsQuote=true
        mockPool = new MockUniswapV3Pool(SNAPSHOT_TICK, weth, meme);

        vm.prank(admin);
        factory = new MarketFactory(address(usdc));

        usdc.mint(admin, 10_000 * USDC_UNIT);
        usdc.mint(alice, 10_000 * USDC_UNIT);
        usdc.mint(bob, 10_000 * USDC_UNIT);
        usdc.mint(carol, 10_000 * USDC_UNIT);

        vm.startPrank(admin);
        usdc.approve(address(factory), 1000 * USDC_UNIT);
        address marketAddr = factory.createMarket(
            "Will $MEME be UP in 10 min?",
            block.timestamp + RESOLUTION_DELAY,
            1000 * USDC_UNIT,
            address(mockPool),
            true // token0IsQuote: token0 is WETH
        );
        market = PredictionMarket(marketAddr);
        vm.stopPrank();
    }

    // ========== Setup Verification ==========

    function test_setUp() public view {
        assertEq(market.question(), "Will $MEME be UP in 10 min?");
        assertEq(market.admin(), admin);
        assertEq(market.yesReserve(), 1000 * USDC_UNIT);
        assertEq(market.noReserve(), 1000 * USDC_UNIT);
        assertEq(market.totalLpSupply(), 1000 * USDC_UNIT);
        assertEq(market.getYesPrice(), 5000);
        assertEq(market.getNoPrice(), 5000);
    }

    function test_snapshotTickStoredAtCreation() public view {
        assertEq(market.snapshotTick(), SNAPSHOT_TICK);
    }

    function test_token0IsQuoteStored() public view {
        assertTrue(market.token0IsQuote());
    }

    function test_factoryTracksMarkets() public view {
        assertEq(factory.getMarketCount(), 1);
        assertEq(factory.getMarkets()[0], address(market));
    }

    // ========== Mint / Redeem ==========

    function test_mintAndRedeem() public {
        vm.startPrank(alice);
        usdc.approve(address(market), 100 * USDC_UNIT);
        market.mint(100 * USDC_UNIT);

        assertEq(market.yesToken().balanceOf(alice), 100 * USDC_UNIT);
        assertEq(market.noToken().balanceOf(alice), 100 * USDC_UNIT);

        market.redeem(50 * USDC_UNIT);
        assertEq(market.yesToken().balanceOf(alice), 50 * USDC_UNIT);
        assertEq(market.noToken().balanceOf(alice), 50 * USDC_UNIT);
        vm.stopPrank();
    }

    function test_mintRedeemInvariant() public {
        uint256 usdcBefore = usdc.balanceOf(alice);

        vm.startPrank(alice);
        usdc.approve(address(market), 100 * USDC_UNIT);
        market.mint(100 * USDC_UNIT);
        market.redeem(100 * USDC_UNIT);
        vm.stopPrank();

        assertEq(usdc.balanceOf(alice), usdcBefore);
    }

    function test_revertMintZero() public {
        vm.prank(alice);
        vm.expectRevert("zero amount");
        market.mint(0);
    }

    // ========== Buy ==========

    function test_buyYes() public {
        vm.startPrank(alice);
        usdc.approve(address(market), 100 * USDC_UNIT);
        market.buy(true, 100 * USDC_UNIT);
        vm.stopPrank();

        assertGt(market.yesToken().balanceOf(alice), 0);
        assertEq(market.noToken().balanceOf(alice), 0);
        assertGt(market.getYesPrice(), 5000);
    }

    function test_buyNo() public {
        vm.startPrank(alice);
        usdc.approve(address(market), 100 * USDC_UNIT);
        market.buy(false, 100 * USDC_UNIT);
        vm.stopPrank();

        assertGt(market.noToken().balanceOf(alice), 0);
        assertEq(market.yesToken().balanceOf(alice), 0);
        assertGt(market.getNoPrice(), 5000);
    }

    function test_buyPriceSumsToOne() public {
        vm.startPrank(alice);
        usdc.approve(address(market), 100 * USDC_UNIT);
        market.buy(true, 100 * USDC_UNIT);
        vm.stopPrank();

        assertApproxEqAbs(market.getYesPrice() + market.getNoPrice(), 10_000, 1);
    }

    function test_buyRevertNoLiquidity() public {
        PredictionMarket emptyMarket = new PredictionMarket(
            address(usdc), admin, "test", block.timestamp + 1 days,
            address(mockPool), true
        );

        vm.startPrank(alice);
        usdc.approve(address(emptyMarket), 100 * USDC_UNIT);
        vm.expectRevert("no liquidity");
        emptyMarket.buy(true, 100 * USDC_UNIT);
        vm.stopPrank();
    }

    // ========== Sell ==========

    function test_sellYes() public {
        vm.startPrank(alice);
        usdc.approve(address(market), 100 * USDC_UNIT);
        market.buy(true, 100 * USDC_UNIT);

        uint256 yesBalance = market.yesToken().balanceOf(alice);
        uint256 usdcBefore = usdc.balanceOf(alice);

        market.sell(true, yesBalance);
        vm.stopPrank();

        assertGt(usdc.balanceOf(alice), usdcBefore);
        assertEq(market.yesToken().balanceOf(alice), 0);
    }

    function test_sellNo() public {
        vm.startPrank(alice);
        usdc.approve(address(market), 100 * USDC_UNIT);
        market.buy(false, 100 * USDC_UNIT);

        uint256 noBalance = market.noToken().balanceOf(alice);
        uint256 usdcBefore = usdc.balanceOf(alice);

        market.sell(false, noBalance);
        vm.stopPrank();

        assertGt(usdc.balanceOf(alice), usdcBefore);
        assertEq(market.noToken().balanceOf(alice), 0);
    }

    function test_buyThenSellLosesToFees() public {
        uint256 usdcBefore = usdc.balanceOf(alice);

        vm.startPrank(alice);
        usdc.approve(address(market), 100 * USDC_UNIT);
        market.buy(true, 100 * USDC_UNIT);

        uint256 yesBalance = market.yesToken().balanceOf(alice);
        market.sell(true, yesBalance);
        vm.stopPrank();

        assertLt(usdc.balanceOf(alice), usdcBefore);
    }

    // ========== Liquidity ==========

    function test_addLiquidityBalanced() public {
        vm.startPrank(alice);
        usdc.approve(address(market), 500 * USDC_UNIT);
        market.addLiquidity(500 * USDC_UNIT);
        vm.stopPrank();

        assertEq(market.yesReserve(), 1500 * USDC_UNIT);
        assertEq(market.noReserve(), 1500 * USDC_UNIT);
        assertGt(market.lpBalances(alice), 0);
    }

    function test_addLiquidityImbalanced() public {
        vm.startPrank(bob);
        usdc.approve(address(market), 200 * USDC_UNIT);
        market.buy(true, 200 * USDC_UNIT);
        vm.stopPrank();

        uint256 yesR = market.yesReserve();
        uint256 noR = market.noReserve();

        vm.startPrank(alice);
        usdc.approve(address(market), 500 * USDC_UNIT);
        market.addLiquidity(500 * USDC_UNIT);
        vm.stopPrank();

        uint256 oldRatio = (yesR * 1e18) / noR;
        uint256 newRatio = (market.yesReserve() * 1e18) / market.noReserve();
        assertApproxEqAbs(oldRatio, newRatio, 1e12);

        bool hasExcess = market.yesToken().balanceOf(alice) > 0
            || market.noToken().balanceOf(alice) > 0;
        assertTrue(hasExcess);
    }

    function test_removeLiquidity() public {
        vm.startPrank(alice);
        usdc.approve(address(market), 500 * USDC_UNIT);
        market.addLiquidity(500 * USDC_UNIT);

        uint256 lpBalance = market.lpBalances(alice);
        market.removeLiquidity(lpBalance);
        vm.stopPrank();

        assertEq(market.lpBalances(alice), 0);
    }

    // ========== Resolution: Oracle Logic ==========

    function test_resolveTooEarly() public {
        // resolutionTime not reached yet
        vm.prank(admin);
        vm.expectRevert("PredictionMarket: too early");
        market.resolve();
    }

    function test_resolveOnlyAdmin() public {
        vm.warp(block.timestamp + RESOLUTION_DELAY);
        vm.prank(alice);
        vm.expectRevert("PredictionMarket: not admin");
        market.resolve();
    }

    function test_resolveOnce() public {
        vm.warp(block.timestamp + RESOLUTION_DELAY);
        // price up: token0IsQuote=true, tick goes down
        mockPool.setTick(SNAPSHOT_TICK - 100);

        vm.startPrank(admin);
        market.resolve();
        vm.expectRevert("PredictionMarket: already resolved");
        market.resolve();
        vm.stopPrank();
    }

    function test_resolveYes_priceUp_token0IsQuote() public {
        // token0=WETH (quote), tick DOWN = MEME price UP → YES wins
        vm.warp(block.timestamp + RESOLUTION_DELAY);
        mockPool.setTick(SNAPSHOT_TICK - 500);

        vm.prank(admin);
        market.resolve();

        assertTrue(market.resolved());
        assertTrue(market.yesWins());
    }

    function test_resolveNo_priceDown_token0IsQuote() public {
        // token0=WETH (quote), tick UP = MEME price DOWN → NO wins
        vm.warp(block.timestamp + RESOLUTION_DELAY);
        mockPool.setTick(SNAPSHOT_TICK + 500);

        vm.prank(admin);
        market.resolve();

        assertTrue(market.resolved());
        assertFalse(market.yesWins());
    }

    function test_resolveNo_priceEqual() public {
        // Tick unchanged → not strictly "up" → NO wins
        vm.warp(block.timestamp + RESOLUTION_DELAY);
        // mockPool tick stays at SNAPSHOT_TICK

        vm.prank(admin);
        market.resolve();

        assertTrue(market.resolved());
        assertFalse(market.yesWins()); // equal is not "up"
    }

    function test_resolveYes_token0IsMeme() public {
        // Create a market where token0=MEME, token1=WETH → token0IsQuote=false
        // tick UP = MEME price UP → YES wins
        MockUniswapV3Pool invertedPool = new MockUniswapV3Pool(SNAPSHOT_TICK, meme, weth);

        vm.startPrank(admin);
        usdc.approve(address(factory), 500 * USDC_UNIT);
        address marketAddr = factory.createMarket(
            "Will $MEME be UP in 10 min?",
            block.timestamp + RESOLUTION_DELAY,
            500 * USDC_UNIT,
            address(invertedPool),
            false // token0IsQuote=false: token0 is MEME
        );
        vm.stopPrank();

        PredictionMarket invertedMarket = PredictionMarket(marketAddr);

        vm.warp(block.timestamp + RESOLUTION_DELAY);
        invertedPool.setTick(SNAPSHOT_TICK + 500); // tick UP = price UP when token0IsQuote=false

        vm.prank(admin);
        invertedMarket.resolve();

        assertTrue(invertedMarket.resolved());
        assertTrue(invertedMarket.yesWins());
    }

    function test_resolveNo_token0IsMeme() public {
        MockUniswapV3Pool invertedPool = new MockUniswapV3Pool(SNAPSHOT_TICK, meme, weth);

        vm.startPrank(admin);
        usdc.approve(address(factory), 500 * USDC_UNIT);
        address marketAddr = factory.createMarket(
            "Will $MEME be UP in 10 min?",
            block.timestamp + RESOLUTION_DELAY,
            500 * USDC_UNIT,
            address(invertedPool),
            false
        );
        vm.stopPrank();

        PredictionMarket invertedMarket = PredictionMarket(marketAddr);

        vm.warp(block.timestamp + RESOLUTION_DELAY);
        invertedPool.setTick(SNAPSHOT_TICK - 500); // tick DOWN = price DOWN when token0IsQuote=false

        vm.prank(admin);
        invertedMarket.resolve();

        assertTrue(invertedMarket.resolved());
        assertFalse(invertedMarket.yesWins());
    }

    function test_getCurrentTick() public view {
        assertEq(market.getCurrentTick(), SNAPSHOT_TICK);
    }

    // ========== Claim ==========

    function test_claimWinnerYes() public {
        vm.startPrank(alice);
        usdc.approve(address(market), 100 * USDC_UNIT);
        market.buy(true, 100 * USDC_UNIT);
        vm.stopPrank();

        uint256 yesBalance = market.yesToken().balanceOf(alice);

        vm.warp(block.timestamp + RESOLUTION_DELAY);
        mockPool.setTick(SNAPSHOT_TICK - 500); // price up → YES wins
        vm.prank(admin);
        market.resolve();

        uint256 usdcBefore = usdc.balanceOf(alice);
        vm.prank(alice);
        market.claim();

        assertEq(usdc.balanceOf(alice) - usdcBefore, yesBalance);
        assertEq(market.yesToken().balanceOf(alice), 0);
    }

    function test_claimLoserGetsNothing() public {
        vm.startPrank(alice);
        usdc.approve(address(market), 100 * USDC_UNIT);
        market.buy(false, 100 * USDC_UNIT);
        vm.stopPrank();

        vm.warp(block.timestamp + RESOLUTION_DELAY);
        mockPool.setTick(SNAPSHOT_TICK - 500); // price up → YES wins, Alice (NO) loses
        vm.prank(admin);
        market.resolve();

        vm.prank(alice);
        vm.expectRevert("nothing to claim");
        market.claim();
    }

    function test_cannotBuyAfterResolution() public {
        vm.warp(block.timestamp + RESOLUTION_DELAY);
        mockPool.setTick(SNAPSHOT_TICK - 500);
        vm.prank(admin);
        market.resolve();

        vm.startPrank(alice);
        usdc.approve(address(market), 100 * USDC_UNIT);
        vm.expectRevert("PredictionMarket: already resolved");
        market.buy(true, 100 * USDC_UNIT);
        vm.stopPrank();
    }

    // ========== Full Lifecycle ==========

    function test_fullLifecycle() public {
        // Alice buys YES, Bob buys NO
        vm.startPrank(alice);
        usdc.approve(address(market), 500 * USDC_UNIT);
        market.buy(true, 500 * USDC_UNIT);
        vm.stopPrank();

        vm.startPrank(bob);
        usdc.approve(address(market), 300 * USDC_UNIT);
        market.buy(false, 300 * USDC_UNIT);
        vm.stopPrank();

        // Carol adds liquidity
        vm.startPrank(carol);
        usdc.approve(address(market), 200 * USDC_UNIT);
        market.addLiquidity(200 * USDC_UNIT);
        vm.stopPrank();

        // 10 min pass, price goes up → YES wins
        vm.warp(block.timestamp + RESOLUTION_DELAY);
        mockPool.setTick(SNAPSHOT_TICK - 1000);
        vm.prank(admin);
        market.resolve();

        assertTrue(market.yesWins());

        // Alice claims (winner)
        uint256 aliceYes = market.yesToken().balanceOf(alice);
        assertGt(aliceYes, 0);
        vm.prank(alice);
        market.claim();
        assertEq(market.yesToken().balanceOf(alice), 0);

        // Bob can't claim (loser)
        vm.prank(bob);
        vm.expectRevert("nothing to claim");
        market.claim();
    }

    // ========== Collateral Invariant ==========

    function test_collateralInvariantAfterBuySell() public {
        vm.startPrank(alice);
        usdc.approve(address(market), 100 * USDC_UNIT);
        market.buy(true, 100 * USDC_UNIT);

        uint256 yesBalance = market.yesToken().balanceOf(alice);
        market.sell(true, yesBalance);
        vm.stopPrank();

        uint256 yesSupply = market.yesToken().totalSupply();
        uint256 noSupply = market.noToken().totalSupply();
        assertEq(yesSupply, noSupply);

        uint256 contractUsdc = usdc.balanceOf(address(market));
        assertGe(contractUsdc, yesSupply);
    }

    // ========== Small Amount Edge Cases ==========

    function test_smallAmountBuy() public {
        vm.startPrank(alice);
        usdc.approve(address(market), USDC_UNIT);
        market.buy(true, USDC_UNIT);
        vm.stopPrank();

        assertGt(market.yesToken().balanceOf(alice), 0);
    }

    function test_verySmallAmountBuy() public {
        vm.startPrank(alice);
        usdc.approve(address(market), 500_000);
        market.buy(true, 500_000);
        vm.stopPrank();

        assertGt(market.yesToken().balanceOf(alice), 0);
    }
}
