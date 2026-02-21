// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/v1/PredictionMarket.sol";
import "../src/v1/MarketFactory.sol";
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

contract PredictionMarketTest is Test {
    MockUSDC usdc;
    PredictionMarket market;
    MarketFactory factory;

    address admin = address(1);
    address alice = address(2);
    address bob = address(3);
    address carol = address(4);

    uint256 constant USDC_UNIT = 1e6; // 6 decimals

    function setUp() public {
        usdc = new MockUSDC();

        // Deploy factory as admin
        vm.prank(admin);
        factory = new MarketFactory(address(usdc));

        // Mint USDC to participants
        usdc.mint(admin, 10_000 * USDC_UNIT);
        usdc.mint(alice, 10_000 * USDC_UNIT);
        usdc.mint(bob, 10_000 * USDC_UNIT);
        usdc.mint(carol, 10_000 * USDC_UNIT);

        // Admin creates a market with 1000 USDC liquidity
        vm.startPrank(admin);
        usdc.approve(address(factory), 1000 * USDC_UNIT);
        address marketAddr = factory.createMarket(
            "Will ETH hit $10k by 2026?",
            block.timestamp + 30 days,
            1000 * USDC_UNIT
        );
        market = PredictionMarket(marketAddr);
        vm.stopPrank();
    }

    // ========== Setup Verification ==========

    function test_setUp() public view {
        assertEq(market.question(), "Will ETH hit $10k by 2026?");
        assertEq(market.admin(), admin);
        assertEq(market.yesReserve(), 1000 * USDC_UNIT);
        assertEq(market.noReserve(), 1000 * USDC_UNIT);
        assertEq(market.totalLpSupply(), 1000 * USDC_UNIT);
        assertEq(market.getYesPrice(), 5000); // 50%
        assertEq(market.getNoPrice(), 5000);
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

        // Redeem
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

        // Alice should have exact same USDC (no loss)
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

        // Alice should have YES tokens but no NO tokens
        uint256 yesBalance = market.yesToken().balanceOf(alice);
        assertGt(yesBalance, 0, "should have YES tokens");
        assertEq(market.noToken().balanceOf(alice), 0, "should have no NO tokens");

        // YES price should increase after buying YES
        assertGt(market.getYesPrice(), 5000, "YES price should increase");
    }

    function test_buyNo() public {
        vm.startPrank(alice);
        usdc.approve(address(market), 100 * USDC_UNIT);
        market.buy(false, 100 * USDC_UNIT);
        vm.stopPrank();

        uint256 noBalance = market.noToken().balanceOf(alice);
        assertGt(noBalance, 0, "should have NO tokens");
        assertEq(market.yesToken().balanceOf(alice), 0, "should have no YES tokens");

        // NO price should increase after buying NO
        assertGt(market.getNoPrice(), 5000, "NO price should increase");
    }

    function test_buyPriceSumsToOne() public {
        vm.startPrank(alice);
        usdc.approve(address(market), 100 * USDC_UNIT);
        market.buy(true, 100 * USDC_UNIT);
        vm.stopPrank();

        uint256 yesPrice = market.getYesPrice();
        uint256 noPrice = market.getNoPrice();
        // Allow 1 unit rounding from integer division
        assertApproxEqAbs(yesPrice + noPrice, 10_000, 1, "prices should sum to ~100%");
    }

    function test_buyRevertNoLiquidity() public {
        // Create a fresh market without liquidity
        PredictionMarket emptyMarket = new PredictionMarket(
            address(usdc), admin, "test", block.timestamp + 1 days
        );

        vm.startPrank(alice);
        usdc.approve(address(emptyMarket), 100 * USDC_UNIT);
        vm.expectRevert("no liquidity");
        emptyMarket.buy(true, 100 * USDC_UNIT);
        vm.stopPrank();
    }

    // ========== Sell ==========

    function test_sellYes() public {
        // Alice buys YES, then sells
        vm.startPrank(alice);
        usdc.approve(address(market), 100 * USDC_UNIT);
        market.buy(true, 100 * USDC_UNIT);

        uint256 yesBalance = market.yesToken().balanceOf(alice);
        uint256 usdcBefore = usdc.balanceOf(alice);

        market.sell(true, yesBalance);
        vm.stopPrank();

        // Alice should have USDC back (minus fees from buy+sell)
        uint256 usdcAfter = usdc.balanceOf(alice);
        assertGt(usdcAfter, usdcBefore, "should receive USDC");
        assertEq(market.yesToken().balanceOf(alice), 0, "should have no YES tokens");
    }

    function test_sellNo() public {
        vm.startPrank(alice);
        usdc.approve(address(market), 100 * USDC_UNIT);
        market.buy(false, 100 * USDC_UNIT);

        uint256 noBalance = market.noToken().balanceOf(alice);
        uint256 usdcBefore = usdc.balanceOf(alice);

        market.sell(false, noBalance);
        vm.stopPrank();

        uint256 usdcAfter = usdc.balanceOf(alice);
        assertGt(usdcAfter, usdcBefore, "should receive USDC");
        assertEq(market.noToken().balanceOf(alice), 0, "should have no NO tokens");
    }

    function test_buyThenSellLosesToFees() public {
        uint256 usdcBefore = usdc.balanceOf(alice);

        vm.startPrank(alice);
        usdc.approve(address(market), 100 * USDC_UNIT);
        market.buy(true, 100 * USDC_UNIT);

        uint256 yesBalance = market.yesToken().balanceOf(alice);
        market.sell(true, yesBalance);
        vm.stopPrank();

        uint256 usdcAfter = usdc.balanceOf(alice);
        // Should have less than before due to 2% fee on buy + 2% fee on sell
        assertLt(usdcAfter, usdcBefore, "should lose to fees");
    }

    // ========== Liquidity ==========

    function test_addLiquidityBalanced() public {
        vm.startPrank(alice);
        usdc.approve(address(market), 500 * USDC_UNIT);
        market.addLiquidity(500 * USDC_UNIT);
        vm.stopPrank();

        // Pool should be bigger
        assertEq(market.yesReserve(), 1500 * USDC_UNIT);
        assertEq(market.noReserve(), 1500 * USDC_UNIT);
        assertGt(market.lpBalances(alice), 0, "should have LP shares");
    }

    function test_addLiquidityImbalanced() public {
        // First, make the pool imbalanced by buying YES
        vm.startPrank(bob);
        usdc.approve(address(market), 200 * USDC_UNIT);
        market.buy(true, 200 * USDC_UNIT);
        vm.stopPrank();

        uint256 yesR = market.yesReserve();
        uint256 noR = market.noReserve();
        // After buying YES: yesR < noR

        // Alice adds liquidity
        vm.startPrank(alice);
        usdc.approve(address(market), 500 * USDC_UNIT);
        market.addLiquidity(500 * USDC_UNIT);
        vm.stopPrank();

        // Price ratio should be preserved
        uint256 newYesR = market.yesReserve();
        uint256 newNoR = market.noReserve();

        // Ratio should be approximately the same
        // old ratio: yesR / noR, new ratio: newYesR / newNoR
        // Allow 1 unit rounding error
        uint256 oldRatio = (yesR * 1e18) / noR;
        uint256 newRatio = (newYesR * 1e18) / newNoR;
        assertApproxEqAbs(oldRatio, newRatio, 1e12, "ratio should be preserved");

        // Alice should have received excess tokens
        bool hasExcessYes = market.yesToken().balanceOf(alice) > 0;
        bool hasExcessNo = market.noToken().balanceOf(alice) > 0;
        assertTrue(hasExcessYes || hasExcessNo, "should have excess tokens");
    }

    function test_removeLiquidity() public {
        // Alice adds then removes
        vm.startPrank(alice);
        usdc.approve(address(market), 500 * USDC_UNIT);
        market.addLiquidity(500 * USDC_UNIT);

        uint256 lpBalance = market.lpBalances(alice);
        market.removeLiquidity(lpBalance);
        vm.stopPrank();

        assertEq(market.lpBalances(alice), 0, "LP balance should be 0");
    }

    // ========== Resolution ==========

    function test_resolveYes() public {
        vm.prank(admin);
        market.resolve(true);

        assertTrue(market.resolved());
        assertTrue(market.yesWins());
    }

    function test_resolveNo() public {
        vm.prank(admin);
        market.resolve(false);

        assertTrue(market.resolved());
        assertFalse(market.yesWins());
    }

    function test_resolveOnlyAdmin() public {
        vm.prank(alice);
        vm.expectRevert("PredictionMarket: not admin");
        market.resolve(true);
    }

    function test_resolveOnce() public {
        vm.startPrank(admin);
        market.resolve(true);
        vm.expectRevert("PredictionMarket: already resolved");
        market.resolve(false);
        vm.stopPrank();
    }

    // ========== Claim ==========

    function test_claimWinnerYes() public {
        // Alice buys YES
        vm.startPrank(alice);
        usdc.approve(address(market), 100 * USDC_UNIT);
        market.buy(true, 100 * USDC_UNIT);
        vm.stopPrank();

        uint256 yesBalance = market.yesToken().balanceOf(alice);

        // Resolve YES wins
        vm.prank(admin);
        market.resolve(true);

        // Alice claims
        uint256 usdcBefore = usdc.balanceOf(alice);
        vm.prank(alice);
        market.claim();
        uint256 usdcAfter = usdc.balanceOf(alice);

        assertEq(usdcAfter - usdcBefore, yesBalance, "should receive USDC equal to YES balance");
        assertEq(market.yesToken().balanceOf(alice), 0, "YES tokens should be burned");
    }

    function test_claimLoserGetsNothing() public {
        // Alice buys NO
        vm.startPrank(alice);
        usdc.approve(address(market), 100 * USDC_UNIT);
        market.buy(false, 100 * USDC_UNIT);
        vm.stopPrank();

        // Resolve YES wins (Alice loses)
        vm.prank(admin);
        market.resolve(true);

        // Alice has NO tokens but tries to claim (she has no YES tokens)
        vm.prank(alice);
        vm.expectRevert("nothing to claim");
        market.claim();
    }

    function test_cannotBuyAfterResolution() public {
        vm.prank(admin);
        market.resolve(true);

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

        // Resolve: YES wins
        vm.prank(admin);
        market.resolve(true);

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
        // Buy YES
        vm.startPrank(alice);
        usdc.approve(address(market), 100 * USDC_UNIT);
        market.buy(true, 100 * USDC_UNIT);

        // Sell YES
        uint256 yesBalance = market.yesToken().balanceOf(alice);
        market.sell(true, yesBalance);
        vm.stopPrank();

        // YES and NO total supply should be equal
        uint256 yesSupply = market.yesToken().totalSupply();
        uint256 noSupply = market.noToken().totalSupply();
        assertEq(yesSupply, noSupply, "YES and NO supply must be equal");

        // Contract USDC balance should be >= total token supply
        uint256 contractUsdc = usdc.balanceOf(address(market));
        assertGe(contractUsdc, yesSupply, "USDC must cover all tokens");
    }

    // ========== Small Amount Edge Cases (6 decimals) ==========

    function test_smallAmountBuy() public {
        // Buy with 1 USDC (1e6 units)
        vm.startPrank(alice);
        usdc.approve(address(market), USDC_UNIT);
        market.buy(true, USDC_UNIT);
        vm.stopPrank();

        assertGt(market.yesToken().balanceOf(alice), 0, "should get tokens even for small amount");
    }

    function test_verySmallAmountBuy() public {
        // Buy with 0.50 USDC (500000 units)
        vm.startPrank(alice);
        usdc.approve(address(market), 500_000);
        market.buy(true, 500_000);
        vm.stopPrank();

        assertGt(market.yesToken().balanceOf(alice), 0, "should get tokens for $0.50");
    }
}
