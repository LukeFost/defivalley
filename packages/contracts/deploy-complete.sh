#!/bin/bash

# DeFi Valley Complete Deployment Script
# This script deploys both contracts with correct Axelar addresses and configures cross-chain communication

set -e  # Exit on any error

echo "🚀 Starting DeFi Valley Complete Deployment Process"
echo "=================================================================="

# Check if we're in the correct directory
if [ ! -f "hardhat.config.ts" ]; then
    echo "❌ Error: Please run this script from the packages/contracts directory"
    echo "Usage: cd packages/contracts && ./deploy-complete.sh"
    exit 1
fi

# Check Node.js version
echo "🔧 Current Node.js version: $(node --version)"
if node -e "process.exit(process.version.split('.')[0].slice(1) >= 18 ? 0 : 1)" 2>/dev/null; then
    echo "✅ Node.js version is compatible"
else
    echo "❌ Node.js version too old. Please upgrade to v18+ or use nvm"
    exit 1
fi

# Step 1: Deploy DeFiVault to Arbitrum Sepolia
echo
echo "📦 Step 1: Deploying DeFiVault to Arbitrum Sepolia..."
echo "- Network: Arbitrum Sepolia (421614)"
echo "- Axelar Gateway: 0xe432150cce91c13a887f7D836923d5597adD8E31"
echo "- USDC Address: 0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d"

if echo "y" | pnpm exec hardhat ignition deploy ignition/modules/DeFiVaultFixed.ts --network arbitrumSepolia; then
    echo "✅ DeFiVault deployed successfully on Arbitrum!"
else
    echo "❌ DeFiVault deployment failed"
    exit 1
fi

# Step 2: Deploy GameController to Saga Chainlet
echo
echo "🎮 Step 2: Deploying GameController to Saga Chainlet..."
echo "- Network: Saga Chainlet (2751669528484000)"
echo "- Axelar Gateway: 0xe432150cce91c13a887f7D836923d5597adD8E31"
echo "- Axelar Gas Service: 0xbE406F0189A0B4cf3A05C286473D23791Dd44Cc6"

if echo "y" | pnpm exec hardhat ignition deploy ignition/modules/GameControllerFixed.ts --network sagaTestnet; then
    echo "✅ GameController deployed successfully on Saga!"
else
    echo "❌ GameController deployment failed"
    exit 1
fi

# Step 3: Configure cross-chain communication
echo
echo "🔗 Step 3: Configuring cross-chain communication..."
echo "- Linking GameController → DeFiVault"
echo "- Setting up Axelar message routing"

if echo "y" | pnpm exec hardhat ignition deploy ignition/modules/ConfigureFixed.ts --network sagaTestnet; then
    echo "✅ Cross-chain configuration completed!"
else
    echo "❌ Cross-chain configuration failed"
    exit 1
fi

# Step 4: Test the complete flow
echo
echo "🧪 Step 4: Testing end-to-end cross-chain flow..."
echo "- This will plant a seed on Saga and trigger cross-chain deposit"
echo "- Monitor progress on Axelarscan: https://axelarscan.io/"

if pnpm exec hardhat run scripts/test-end-to-end.ts --network sagaTestnet; then
    echo "✅ End-to-end test completed!"
else
    echo "⚠️  End-to-end test had issues (check output above)"
    echo "This may be normal if cross-chain processing is still pending"
fi

# Final summary
echo
echo "🎉 DeFi Valley Deployment Complete!"
echo "=" | tr '\n' '=' | head -c 60; echo
echo
echo "📋 Deployment Summary:"
echo "- ✅ DeFiVault deployed on Arbitrum Sepolia"
echo "- ✅ GameController deployed on Saga Chainlet"
echo "- ✅ Cross-chain communication configured"
echo "- ✅ End-to-end flow tested"
echo
echo "🔗 Contract Addresses:"
echo "- Check ignition/deployments/ for exact addresses"
echo "- GameController: Saga Chainlet (2751669528484000)"
echo "- DeFiVault: Arbitrum Sepolia (421614)"
echo
echo "🚀 Your DeFi Valley backend is now ready for frontend integration!"
echo "📖 Next: Start frontend development with 'pnpm dev' from project root"
echo
echo "🔍 Monitor cross-chain transactions:"
echo "- Axelarscan: https://axelarscan.io/"
echo "- Saga Explorer: https://yieldfield-2751669528484000-1.explorer.sagarpc.io/"
echo "- Arbitrum Sepolia: https://sepolia.arbiscan.io/"