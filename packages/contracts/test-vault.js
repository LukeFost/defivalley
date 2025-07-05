const { ethers } = require('hardhat');

async function main() {
  const vaultAddress = '0x2b2034AD5e2E0b4634002dDA83d1fd536cb4e673';
  const vault = await ethers.getContractAt('DeFiVault', vaultAddress);
  
  console.log('Testing DeFiVault contract connection...');
  
  try {
    const depositToken = await vault.depositToken();
    console.log(`✅ DeFiVault connected\! Deposit token: ${depositToken}`);
    
    const gateway = await vault.gateway();
    console.log(`✅ Gateway address: ${gateway}`);
    
    const owner = await vault.owner();
    console.log(`✅ Contract owner: ${owner}`);
    
    console.log('🎉 DeFiVault contract is operational\!');
  } catch (error) {
    console.error('❌ DeFiVault connection failed:', error.message);
  }
}

main().catch(console.error);
