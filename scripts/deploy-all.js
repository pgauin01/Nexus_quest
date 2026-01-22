const hre = require("hardhat");

async function main() {
  console.log("🚀 Starting Deployment...");

  // 1. Deploy Game
  const Game = await hre.ethers.getContractFactory("NexusQuest");
  const game = await Game.deploy();
  await game.waitForDeployment();
  const gameAddress = await game.getAddress();
  console.log("✅ Game Deployed to:", gameAddress);

  // 2. Deploy Marketplace (Pass Game Address)
  const Market = await hre.ethers.getContractFactory("Marketplace");
  const market = await Market.deploy(gameAddress);
  await market.waitForDeployment();
  const marketAddress = await market.getAddress();
  console.log("✅ Market Deployed to:", marketAddress);

  console.log("\n--- COPY THESE TO REACT ---");
  console.log('const GAME_ADDRESS = "' + gameAddress + '";');
  console.log('const MARKET_ADDRESS = "' + marketAddress + '";');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
