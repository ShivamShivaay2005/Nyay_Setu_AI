const hre = require("hardhat");

async function main() {
  console.log("Deploying KisanNyayLedger...");

  const KisanNyayLedger = await hre.ethers.getContractFactory("KisanNyayLedger");
  const ledger = await KisanNyayLedger.deploy();

  await ledger.waitForDeployment();

  console.log("KisanNyayLedger deployed to:", await ledger.getAddress());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
