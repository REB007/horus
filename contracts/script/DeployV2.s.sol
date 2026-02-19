// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/v2/MarketFactory_v2.sol";

contract DeployV2 is Script {
    // Ethereum Sepolia USDC (Circle)
    address constant USDC = 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238;

    function run() external {
        uint256 deployerKey = vm.envUint("ADMIN_PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);

        vm.startBroadcast(deployerKey);

        MarketFactoryV2 factory = new MarketFactoryV2(USDC);

        vm.stopBroadcast();

        console.log("=== Horus V2 Deployment ===");
        console.log("Deployer:          ", deployer);
        console.log("MarketFactoryV2:   ", address(factory));
        console.log("USDC:              ", USDC);
        console.log("");
        console.log("Add to api/.env:");
        console.log("  FACTORY_ADDRESS=", address(factory));
    }
}
