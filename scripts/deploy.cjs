const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying KisanNyayLedger from:", deployer.address);

  const Ledger = await hre.ethers.getContractFactory("KisanNyayLedger");
  const ledger = await Ledger.deploy();
  await ledger.waitForDeployment();

  console.log("KisanNyayLedger deployed to:", await ledger.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
