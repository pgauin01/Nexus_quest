const hre = require("hardhat");

async function main() {
  // 1. PASTE YOUR EXISTING GAME CONTRACT ADDRESS HERE
  const GAME_ADDRESS = "0xfF8B8E7AceA00e8503cd03eD10Ce6353E31817Ff";

  // 2. Deploy Marketplace
  const Marketplace = await hre.ethers.getContractFactory("Marketplace");
  const market = await Marketplace.deploy(GAME_ADDRESS);

  await market.waitForDeployment();

  console.log("🏪 Marketplace deployed to:", await market.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
