const hre = require("hardhat");

async function main() {
  const contract = await hre.ethers.deployContract("NexusQuest");
  await contract.waitForDeployment();

  console.log(`Contract deployed to: ${contract.target}`);

  // We need the ABI for Python later
  console.log(
    "Artifacts are in /artifacts/contracts/NexusQuest.sol/NexusQuest.json"
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
