const hre = require("hardhat");

async function main() {
  console.log("Starting ConnectSphere smart contract deployment...");

  // Get the contract factories
  const ConnectSphereToken = await hre.ethers.getContractFactory("ConnectSphereToken");
  const ContentRegistry = await hre.ethers.getContractFactory("ContentRegistry");

  // Deploy ConnectSphereToken
  console.log("Deploying ConnectSphereToken...");
  const token = await ConnectSphereToken.deploy();
  await token.deployed();
  console.log("ConnectSphereToken deployed to:", token.address);

  // Deploy ContentRegistry with token address
  console.log("Deploying ContentRegistry...");
  const contentRegistry = await ContentRegistry.deploy(token.address);
  await contentRegistry.deployed();
  console.log("ContentRegistry deployed to:", contentRegistry.address);

  // Grant MINTER_ROLE to ContentRegistry
  console.log("Granting MINTER_ROLE to ContentRegistry...");
  const MINTER_ROLE = await token.MINTER_ROLE();
  await token.grantRole(MINTER_ROLE, contentRegistry.address);
  console.log("MINTER_ROLE granted successfully");

  // Log deployment summary
  console.log("\n=== Deployment Summary ===");
  console.log("Network:", hre.network.name);
  console.log("ConnectSphereToken:", token.address);
  console.log("ContentRegistry:", contentRegistry.address);
  console.log("=========================\n");

  // Save deployment addresses
  const fs = require("fs");
  const deploymentData = {
    network: hre.network.name,
    timestamp: new Date().toISOString(),
    contracts: {
      ConnectSphereToken: {
        address: token.address,
        deployer: (await hre.ethers.getSigners())[0].address
      },
      ContentRegistry: {
        address: contentRegistry.address,
        deployer: (await hre.ethers.getSigners())[0].address
      }
    }
  };

  const deploymentPath = `./deployments/${hre.network.name}.json`;
  if (!fs.existsSync("./deployments")) {
    fs.mkdirSync("./deployments");
  }
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentData, null, 2));
  console.log(`Deployment data saved to ${deploymentPath}`);

  // Verify contracts if not on localhost
  if (hre.network.name !== "localhost" && hre.network.name !== "hardhat") {
    console.log("\nWaiting for block confirmations...");
    await token.deployTransaction.wait(5);
    await contentRegistry.deployTransaction.wait(5);

    console.log("Verifying contracts on Etherscan...");
    try {
      await hre.run("verify:verify", {
        address: token.address,
        constructorArguments: [],
      });

      await hre.run("verify:verify", {
        address: contentRegistry.address,
        constructorArguments: [token.address],
      });
      console.log("Contracts verified successfully!");
    } catch (error) {
      console.error("Error verifying contracts:", error);
    }
  }
}

// Execute deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 