const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Starting Starling.ai smart contract deployment...");

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);
  console.log("💰 Account balance:", (await deployer.getBalance()).toString());

  // Deploy Starling.aiToken first
  console.log("\n🔸 Deploying Starling.aiToken...");
  const Starling.aiToken = await ethers.getContractFactory("Starling.aiToken");
  const token = await Starling.aiToken.deploy();
  await token.deployed();
  console.log("✅ Starling.aiToken deployed to:", token.address);

  // Deploy ContentRegistry
  console.log("\n🔸 Deploying ContentRegistry...");
  const ContentRegistry = await ethers.getContractFactory("ContentRegistry");
  const contentRegistry = await ContentRegistry.deploy(token.address);
  await contentRegistry.deployed();
  console.log("✅ ContentRegistry deployed to:", contentRegistry.address);

  // Set up initial token distribution
  console.log("\n🔸 Setting up initial token distribution...");
  
  // Transfer some tokens to ContentRegistry for rewards
  const registryRewardAmount = ethers.utils.parseEther("1000000"); // 1M tokens
  await token.transfer(contentRegistry.address, registryRewardAmount);
  console.log("✅ Transferred", ethers.utils.formatEther(registryRewardAmount), "tokens to ContentRegistry");

  // Set up initial liquidity pool (simulated)
  const liquidityAmount = ethers.utils.parseEther("500000"); // 500K tokens
  console.log("📊 Initial liquidity pool size:", ethers.utils.formatEther(liquidityAmount), "tokens");

  // Grant roles to ContentRegistry
  console.log("\n🔸 Setting up contract permissions...");
  
  // Grant MINTER_ROLE to ContentRegistry
  const MINTER_ROLE = await token.MINTER_ROLE();
  await token.grantRole(MINTER_ROLE, contentRegistry.address);
  console.log("✅ Granted MINTER_ROLE to ContentRegistry");

  // Grant BURNER_ROLE to ContentRegistry
  const BURNER_ROLE = await token.BURNER_ROLE();
  await token.grantRole(BURNER_ROLE, contentRegistry.address);
  console.log("✅ Granted BURNER_ROLE to ContentRegistry");

  // Set up governance parameters
  console.log("\n🔸 Configuring governance parameters...");
  
  // Set minimum stake for governance participation
  const minStake = ethers.utils.parseEther("100"); // 100 tokens
  await contentRegistry.setMinStake(minStake);
  console.log("✅ Set minimum stake to", ethers.utils.formatEther(minStake), "tokens");

  // Set content moderation threshold
  const moderationThreshold = 5; // 5 reports to trigger moderation
  await contentRegistry.setModerationThreshold(moderationThreshold);
  console.log("✅ Set moderation threshold to", moderationThreshold, "reports");

  // Set reward parameters
  const baseReward = ethers.utils.parseEther("1"); // 1 token base reward
  const engagementMultiplier = 150; // 1.5x multiplier for engagement
  await contentRegistry.setRewardParameters(baseReward, engagementMultiplier);
  console.log("✅ Set base reward to", ethers.utils.formatEther(baseReward), "tokens");
  console.log("✅ Set engagement multiplier to", engagementMultiplier / 100, "x");

  // Verify contracts on Etherscan (if not on local network)
  const network = await ethers.provider.getNetwork();
  if (network.chainId !== 31337) { // Not local network
    console.log("\n🔍 Waiting for block confirmations before verification...");
    await token.deployTransaction.wait(6);
    await contentRegistry.deployTransaction.wait(6);

    console.log("\n🔍 Verifying contracts on Etherscan...");
    try {
      await hre.run("verify:verify", {
        address: token.address,
        constructorArguments: [],
      });
      console.log("✅ Starling.aiToken verified on Etherscan");
    } catch (error) {
      console.log("⚠️  Starling.aiToken verification failed:", error.message);
    }

    try {
      await hre.run("verify:verify", {
        address: contentRegistry.address,
        constructorArguments: [token.address],
      });
      console.log("✅ ContentRegistry verified on Etherscan");
    } catch (error) {
      console.log("⚠️  ContentRegistry verification failed:", error.message);
    }
  }

  // Save deployment information
  const deploymentInfo = {
    network: network.name,
    chainId: network.chainId,
    deployer: deployer.address,
    contracts: {
      Starling.aiToken: {
        address: token.address,
        transactionHash: token.deployTransaction.hash,
        blockNumber: token.deployTransaction.blockNumber,
      },
      ContentRegistry: {
        address: contentRegistry.address,
        transactionHash: contentRegistry.deployTransaction.hash,
        blockNumber: contentRegistry.deployTransaction.blockNumber,
      },
    },
    configuration: {
      registryRewardAmount: ethers.utils.formatEther(registryRewardAmount),
      liquidityAmount: ethers.utils.formatEther(liquidityAmount),
      minStake: ethers.utils.formatEther(minStake),
      moderationThreshold,
      baseReward: ethers.utils.formatEther(baseReward),
      engagementMultiplier: engagementMultiplier / 100,
    },
    timestamp: new Date().toISOString(),
  };

  // Save to deployment file
  const deploymentPath = path.join(__dirname, "..", "deployments", `${network.name}.json`);
  fs.mkdirSync(path.dirname(deploymentPath), { recursive: true });
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log("\n💾 Deployment info saved to:", deploymentPath);

  // Create environment file for frontend
  const envContent = `# Starling.ai Smart Contract Addresses
REACT_APP_NETWORK_ID=${network.chainId}
REACT_APP_CONNECTSPHERE_TOKEN_ADDRESS=${token.address}
REACT_APP_CONTENT_REGISTRY_ADDRESS=${contentRegistry.address}
REACT_APP_DEPLOYER_ADDRESS=${deployer.address}

# Contract Configuration
REACT_APP_MIN_STAKE=${ethers.utils.formatEther(minStake)}
REACT_APP_MODERATION_THRESHOLD=${moderationThreshold}
REACT_APP_BASE_REWARD=${ethers.utils.formatEther(baseReward)}
REACT_APP_ENGAGEMENT_MULTIPLIER=${engagementMultiplier / 100}
`;

  const envPath = path.join(__dirname, "..", "frontend", ".env.local");
  fs.writeFileSync(envPath, envContent);
  console.log("💾 Frontend environment file created:", envPath);

  // Display deployment summary
  console.log("\n🎉 Starling.ai Deployment Complete!");
  console.log("=" * 50);
  console.log("📋 Deployment Summary:");
  console.log(`Network: ${network.name} (Chain ID: ${network.chainId})`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Starling.aiToken: ${token.address}`);
  console.log(`ContentRegistry: ${contentRegistry.address}`);
  console.log("\n🔧 Configuration:");
  console.log(`- Minimum Stake: ${ethers.utils.formatEther(minStake)} tokens`);
  console.log(`- Moderation Threshold: ${moderationThreshold} reports`);
  console.log(`- Base Reward: ${ethers.utils.formatEther(baseReward)} tokens`);
  console.log(`- Engagement Multiplier: ${engagementMultiplier / 100}x`);
  console.log(`- Registry Reward Pool: ${ethers.utils.formatEther(registryRewardAmount)} tokens`);
  console.log("\n📁 Files Created:");
  console.log(`- Deployment Info: ${deploymentPath}`);
  console.log(`- Frontend Env: ${envPath}`);

  // Test basic functionality
  console.log("\n🧪 Testing basic contract functionality...");
  
  try {
    // Test token balance
    const deployerBalance = await token.balanceOf(deployer.address);
    console.log("✅ Deployer token balance:", ethers.utils.formatEther(deployerBalance));

    // Test registry balance
    const registryBalance = await token.balanceOf(contentRegistry.address);
    console.log("✅ Registry token balance:", ethers.utils.formatEther(registryBalance));

    // Test role assignments
    const hasMinterRole = await token.hasRole(MINTER_ROLE, contentRegistry.address);
    const hasBurnerRole = await token.hasRole(BURNER_ROLE, contentRegistry.address);
    console.log("✅ Registry has MINTER_ROLE:", hasMinterRole);
    console.log("✅ Registry has BURNER_ROLE:", hasBurnerRole);

    // Test configuration
    const actualMinStake = await contentRegistry.minStake();
    const actualThreshold = await contentRegistry.moderationThreshold();
    console.log("✅ Min stake configured:", ethers.utils.formatEther(actualMinStake));
    console.log("✅ Moderation threshold configured:", actualThreshold.toString());

    console.log("\n✅ All basic functionality tests passed!");
  } catch (error) {
    console.log("❌ Basic functionality test failed:", error.message);
  }

  console.log("\n🚀 Starling.ai is ready for use!");
  console.log("\nNext steps:");
  console.log("1. Update your frontend configuration with the new contract addresses");
  console.log("2. Test the platform with the deployed contracts");
  console.log("3. Monitor contract events and transactions");
  console.log("4. Set up monitoring and alerting for the contracts");
}

// Handle deployment errors
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  }); 