// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./interfaces/IUniswapV3Factory.sol";

/// @dev Minimal mock memecoin for Ethereum Sepolia testing.
///      Mints 1,000,000 tokens to the deployer.
contract MockMemecoin is ERC20 {
    uint8 private _dec;

    constructor(string memory name, string memory symbol, uint8 dec) ERC20(name, symbol) {
        _dec = dec;
        _mint(msg.sender, 1_000_000 * (10 ** dec));
    }

    function decimals() public view override returns (uint8) {
        return _dec;
    }
}

contract DeployMockToken is Script {
    // Ethereum Sepolia Uniswap V3 factory
    address constant UNI_V3_FACTORY = 0x0227628f3F023bb0B980b67D528571c95c6DaC1c;

    // Ethereum Sepolia WETH
    address constant WETH = 0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14;

    // Pool fee tier: 1% (10000). Use 3000 for 0.3%, 500 for 0.05%.
    // Clanker tokens typically use 1% pools.
    uint24 constant FEE = 10_000;

    // Initial price: 1 MEME = 0.000001 WETH (very cheap memecoin, realistic)
    // sqrtPriceX96 = sqrt(price) * 2^96
    // price = token1/token0 in terms of token ordering
    // We compute this off-chain and hardcode a reasonable value.
    // For price ≈ 1e-6 (WETH per MEME when token0=MEME):
    //   sqrtPrice = sqrt(1e-6) = 0.001
    //   sqrtPriceX96 = 0.001 * 2^96 ≈ 79228162514264337593
    // For price ≈ 1e6 (MEME per WETH when token0=WETH):
    //   sqrtPrice = sqrt(1e6) = 1000
    //   sqrtPriceX96 = 1000 * 2^96 ≈ 79228162514264337593543950336000
    // We set a mid-range price and let the script log the actual tick.
    // sqrtPriceX96 for ~1:1 ratio (used as starting point, adjust as needed)
    uint160 constant SQRT_PRICE_1_1 = 79228162514264337593543950336; // = 2^96, price = 1.0

    function run() external {
        uint256 deployerKey = vm.envUint("ADMIN_PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);

        vm.startBroadcast(deployerKey);

        // 1. Deploy mock memecoin (18 decimals, like real Clanker tokens)
        MockMemecoin meme = new MockMemecoin("Mock Horus Coin", "HORUS", 18);
        console.log("MockMemecoin deployed: ", address(meme));

        // 2. Create Uniswap V3 pool (MEME/WETH, 1% fee)
        IUniswapV3Factory factory = IUniswapV3Factory(UNI_V3_FACTORY);
        address poolAddr = factory.createPool(address(meme), WETH, FEE);
        console.log("Uniswap V3 pool created:", poolAddr);

        // 3. Initialize pool price
        //    token0 is the lexicographically smaller address — determined at runtime.
        //    We initialize at a 1:1 sqrtPrice as a baseline.
        //    The actual tick direction doesn't matter for testing — we control it via
        //    the mock pool's setTick() in unit tests, and via real swaps on Sepolia.
        IUniswapV3PoolInit pool = IUniswapV3PoolInit(poolAddr);
        pool.initialize(SQRT_PRICE_1_1);

        // 4. Read back state
        address token0 = pool.token0();
        address token1 = pool.token1();
        (, int24 tick,,,,,) = pool.slot0();
        bool token0IsQuote = (token0 == WETH);

        vm.stopBroadcast();

        console.log("");
        console.log("=== Mock Token + Pool Deployment ===");
        console.log("Deployer:        ", deployer);
        console.log("MockMemecoin:    ", address(meme));
        console.log("Pool address:    ", poolAddr);
        console.log("Pool token0:     ", token0);
        console.log("Pool token1:     ", token1);
        console.log("Initial tick:    ", tick);
        console.log("token0IsQuote:   ", token0IsQuote);
        console.log("");
        console.log("Use these values when creating a test market via POST /api/admin/markets:");
        console.log("  tokenAddress =", address(meme));
        console.log("  poolAddress  =", poolAddr);
        console.log("  token0IsQuote=", token0IsQuote);
        console.log("");
        console.log("To simulate price movement on Sepolia, swap WETH<>MEME on the pool.");
        console.log("The auto-resolver will call resolve() and the contract reads the new tick.");
    }
}
