// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../../src/v3/PredictionMarket_v3.sol";
import "../../src/v3/MarketFactory_v3.sol";
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

contract PredictionMarketV3Test is Test {
    MockUSDC usdc;
    MarketFactoryV3 factory;
    PredictionMarketV3 market;

    address admin = address(1);
    address alice = address(2);
    address bob = address(3);

    uint256 constant USDC_UNIT = 1e6;
    int256 constant SNAPSHOT_PRICE = 1e18; // $1.00

    // Oracle metadata constants
    string constant ORACLE_ENDPOINT = "https://api.uniswap.org/v2/quote";
    uint256 constant SOURCE_CHAIN_ID = 1;
    address constant SOURCE_POOL = address(0xBEEF);
    address constant SOURCE_TOKEN = address(0xCAFE);

    function setUp() public {
        usdc = new MockUSDC();

        // Deploy factory as admin
        vm.prank(admin);
        factory = new MarketFactoryV3(address(usdc));

        // Mint USDC to participants
        usdc.mint(admin, 100_000 * USDC_UNIT);
        usdc.mint(alice, 100_000 * USDC_UNIT);
        usdc.mint(bob, 100_000 * USDC_UNIT);

        // Alice creates a market permissionlessly with 100 USDC
        vm.startPrank(alice);
        usdc.approve(address(factory), 100 * USDC_UNIT);
        address marketAddr = factory.createMarket(
            "Will $MEME be UP in 10 min?",
            block.timestamp + 600,
            100 * USDC_UNIT,
            ORACLE_ENDPOINT,
            SOURCE_CHAIN_ID,
            SOURCE_POOL,
            SOURCE_TOKEN,
            SNAPSHOT_PRICE
        );
        market = PredictionMarketV3(marketAddr);
        vm.stopPrank();
    }

    // ========== Creation Tests ==========

    function test_permissionlessCreation() public view {
        // Alice (non-admin) created the market successfully
        assertEq(factory.getMarketCount(), 1);
        assertEq(factory.getMarkets()[0], address(market));
        assertEq(market.question(), "Will $MEME be UP in 10 min?");
        // Admin on the market is the factory's admin, not the creator
        assertEq(market.admin(), admin);
    }

    function test_minLiquidityReverts() public {
        vm.startPrank(bob);
        usdc.approve(address(factory), 5 * USDC_UNIT);
        vm.expectRevert("below min liquidity");
        factory.createMarket(
            "test",
            block.timestamp + 600,
            5 * USDC_UNIT, // below 10 USDC minimum
            ORACLE_ENDPOINT,
            SOURCE_CHAIN_ID,
            SOURCE_POOL,
            SOURCE_TOKEN,
            SNAPSHOT_PRICE
        );
        vm.stopPrank();
    }

    function test_oracleMetadataStored() public view {
        assertEq(market.oracleEndpoint(), ORACLE_ENDPOINT);
        assertEq(market.sourceChainId(), SOURCE_CHAIN_ID);
        assertEq(market.sourcePool(), SOURCE_POOL);
        assertEq(market.sourceToken(), SOURCE_TOKEN);
        assertEq(market.snapshotPrice(), SNAPSHOT_PRICE);
    }

    // ========== Resolution Tests ==========

    function test_resolve_priceUp() public {
        vm.warp(block.timestamp + 601);
        int256 higherPrice = SNAPSHOT_PRICE + 1e17; // $1.10

        vm.prank(admin);
        market.resolve(higherPrice);

        assertTrue(market.resolved());
        assertTrue(market.yesWins());
        assertEq(market.resolutionPrice(), higherPrice);
    }

    function test_resolve_priceDown() public {
        vm.warp(block.timestamp + 601);
        int256 lowerPrice = SNAPSHOT_PRICE - 1e17; // $0.90

        vm.prank(admin);
        market.resolve(lowerPrice);

        assertTrue(market.resolved());
        assertFalse(market.yesWins());
        assertEq(market.resolutionPrice(), lowerPrice);
    }

    function test_resolve_priceEqual() public {
        vm.warp(block.timestamp + 601);

        vm.prank(admin);
        market.resolve(SNAPSHOT_PRICE); // exact same price

        assertTrue(market.resolved());
        assertFalse(market.yesWins()); // equal → NO wins
    }

    function test_resolve_tooEarly() public {
        // Don't warp — still before resolutionTime
        vm.prank(admin);
        vm.expectRevert("PredictionMarketV3: too early");
        market.resolve(SNAPSHOT_PRICE + 1);
    }

    function test_resolve_onlyAdmin() public {
        vm.warp(block.timestamp + 601);

        vm.prank(alice); // not admin
        vm.expectRevert("PredictionMarketV3: not admin");
        market.resolve(SNAPSHOT_PRICE + 1);
    }

    function test_resolve_twice() public {
        vm.warp(block.timestamp + 601);

        vm.startPrank(admin);
        market.resolve(SNAPSHOT_PRICE + 1);

        vm.expectRevert("PredictionMarketV3: already resolved");
        market.resolve(SNAPSHOT_PRICE - 1);
        vm.stopPrank();
    }

    // ========== Full Lifecycle ==========

    function test_fullLifecycle() public {
        // Bob buys YES
        vm.startPrank(bob);
        usdc.approve(address(market), 50 * USDC_UNIT);
        market.buy(true, 50 * USDC_UNIT);
        vm.stopPrank();

        uint256 bobYes = market.yesToken().balanceOf(bob);
        assertGt(bobYes, 0, "Bob should have YES tokens");

        // Warp past resolution time
        vm.warp(block.timestamp + 601);

        // Admin resolves with price UP → YES wins
        int256 higherPrice = SNAPSHOT_PRICE + 5e17; // $1.50
        vm.prank(admin);
        market.resolve(higherPrice);

        assertTrue(market.yesWins());

        // Bob claims winnings
        uint256 bobUsdcBefore = usdc.balanceOf(bob);
        vm.prank(bob);
        market.claim();
        uint256 bobUsdcAfter = usdc.balanceOf(bob);

        assertEq(bobUsdcAfter - bobUsdcBefore, bobYes, "Bob should receive USDC equal to YES balance");
        assertEq(market.yesToken().balanceOf(bob), 0, "YES tokens should be burned");
    }

    // ========== CPMM Sanity (unchanged from V2) ==========

    function test_buyPriceSumsToOne() public {
        vm.startPrank(bob);
        usdc.approve(address(market), 30 * USDC_UNIT);
        market.buy(true, 30 * USDC_UNIT);
        vm.stopPrank();

        uint256 yesPrice = market.getYesPrice();
        uint256 noPrice = market.getNoPrice();
        assertApproxEqAbs(yesPrice + noPrice, 10_000, 1, "prices should sum to ~100%");
    }

    function test_collateralInvariant() public {
        vm.startPrank(bob);
        usdc.approve(address(market), 50 * USDC_UNIT);
        market.buy(true, 50 * USDC_UNIT);

        uint256 yesBalance = market.yesToken().balanceOf(bob);
        market.sell(true, yesBalance);
        vm.stopPrank();

        uint256 yesSupply = market.yesToken().totalSupply();
        uint256 noSupply = market.noToken().totalSupply();
        assertEq(yesSupply, noSupply, "YES and NO supply must be equal");

        uint256 contractUsdc = usdc.balanceOf(address(market));
        assertGe(contractUsdc, yesSupply, "USDC must cover all tokens");
    }
}
