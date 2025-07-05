'use client'

import { usePrivy, useWallets } from '@privy-io/react-auth'
import { useAccount, useBalance, useChainId, useSwitchChain } from 'wagmi'
import { sagaChainlet } from '../app/wagmi'
import { arbitrumSepolia } from 'wagmi/chains'
import { useEffect, useState } from 'react'
import { useAppStore, useTransactions, usePlayerData, useConfig } from '../app/store'

export function Auth() {
  const { ready, authenticated, user, login, logout } = usePrivy()
  const { wallets } = useWallets()
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()
  const [isMounted, setIsMounted] = useState(false)
  
  // DeFi Valley state integration
  const { active: activeTransactions } = useTransactions()
  // Use granular selectors for better performance
  const showPlantModal = useAppStore((state) => state.showPlantModal)
  const showTransactionTracker = useAppStore((state) => state.ui.showTransactionTracker)
  const toggleTransactionTracker = useAppStore((state) => state.toggleTransactionTracker)
  const showSettingsModal = useAppStore((state) => state.showSettingsModal)
  const { playerState, seedPositions, vaultPosition } = usePlayerData()
  const config = useConfig()

  // Handle hydration
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Get balance for current chain
  const { data: balance } = useBalance({
    address: address,
    chainId: chainId,
  })

  // Don't render until mounted and ready
  if (!isMounted || !ready) {
    return (
      <div className="auth-component">
        <div className="loading-placeholder">
          <div className="loading-spinner"></div>
          <span>Loading...</span>
        </div>
        <style jsx>{`
          .auth-component {
            background: rgba(255, 255, 255, 0.95);
            border-radius: 12px;
            padding: 20px;
            margin: 20px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            min-width: 320px;
            max-width: 400px;
          }
          .loading-placeholder {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            padding: 20px;
            color: #666;
          }
          .loading-spinner {
            width: 20px;
            height: 20px;
            border: 2px solid #f3f3f3;
            border-radius: 50%;
            border-top: 2px solid #4CAF50;
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  const currentChain = chainId === sagaChainlet.id ? sagaChainlet : arbitrumSepolia
  const isOnSaga = chainId === sagaChainlet.id
  const isOnArbitrum = chainId === arbitrumSepolia.id
  const embeddedWallet = wallets.find(wallet => wallet.walletClientType === 'privy')

  return (
    <div className="auth-component">
      {authenticated && user ? (
        <div className="authenticated">
          <div className="user-info">
            <div className="welcome">
              <h3>Welcome to DeFi Valley!</h3>
              <div className="user-details">
                {user.email && (
                  <div className="user-email">
                    📧 {user.email.address}
                  </div>
                )}
                {user.google && (
                  <div className="user-google">
                    🔗 Connected via Google
                  </div>
                )}
                {user.twitter && (
                  <div className="user-twitter">
                    🐦 Connected via Twitter
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Wallet Information */}
          {(isConnected && address) || embeddedWallet ? (
            <div className="wallet-info">
              <div className="wallet-header">
                <h4>🪙 Your Wallet</h4>
              </div>
              
              <div className="address-section">
                <div className="address-label">Wallet Address:</div>
                <div className="address-value">
                  {address ? (
                    <code>{address.slice(0, 6)}...{address.slice(-4)}</code>
                  ) : embeddedWallet ? (
                    <code>{embeddedWallet.address.slice(0, 6)}...{embeddedWallet.address.slice(-4)}</code>
                  ) : (
                    'No address'
                  )}
                </div>
              </div>

              <div className="chain-info">
                <div className="current-chain">
                  <span className="chain-label">Network:</span>
                  <span className={`chain-name ${isOnSaga ? 'saga' : 'arbitrum'}`}>
                    {currentChain.name}
                  </span>
                </div>
                {balance && (
                  <div className="balance">
                    <span className="balance-label">Balance:</span>
                    <span className="balance-value">
                      {parseFloat(balance.formatted).toFixed(4)} {balance.symbol}
                    </span>
                  </div>
                )}
              </div>

              <div className="chain-actions">
                {!isOnSaga && (
                  <button
                    onClick={() => switchChain({ chainId: sagaChainlet.id })}
                    className="switch-chain-btn saga"
                  >
                    🎮 Switch to Saga (Gaming)
                  </button>
                )}
                {!isOnArbitrum && (
                  <button
                    onClick={() => switchChain({ chainId: arbitrumSepolia.id })}
                    className="switch-chain-btn arbitrum"
                  >
                    💰 Switch to Arbitrum (DeFi)
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="no-wallet">
              <p>🔗 Wallet connection initializing...</p>
            </div>
          )}

          {/* DeFi Valley Dashboard */}
          {address && (
            <div className="defi-dashboard">
              <div className="dashboard-header">
                <h4>🌱 Your Farm</h4>
                <div className="header-buttons">
                  <button 
                    onClick={() => {
                      console.log('⚙️ [AUTH] Settings button clicked!');
                      console.log('⚙️ [AUTH] showSettingsModal function:', typeof showSettingsModal);
                      showSettingsModal();
                      console.log('⚙️ [AUTH] showSettingsModal called');
                    }}
                    className="settings-btn"
                    title="Settings"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </button>
                  {activeTransactions.length > 0 && (
                    <button 
                      onClick={toggleTransactionTracker}
                      className="tx-indicator"
                    >
                      <div className="tx-count">{activeTransactions.length}</div>
                      <div className="tx-pulse"></div>
                    </button>
                  )}
                </div>
              </div>

              <div className="farm-stats">
                <div className="stat">
                  <span className="stat-label">Seeds Growing:</span>
                  <span className="stat-value">
                    {seedPositions.filter(s => s.isGrowing).length}
                  </span>
                </div>
                
                <div className="stat">
                  <span className="stat-label">Ready to Harvest:</span>
                  <span className="stat-value ready">
                    {seedPositions.filter(s => s.isReady).length}
                  </span>
                </div>
                
                {playerState && (
                  <div className="stat">
                    <span className="stat-label">Experience:</span>
                    <span className="stat-value">
                      {playerState.experience} XP (Level {playerState.level})
                    </span>
                  </div>
                )}
                
                {vaultPosition && (
                  <div className="stat">
                    <span className="stat-label">Total Invested:</span>
                    <span className="stat-value">
                      ${(Number(vaultPosition.depositedAmount) / 1e6).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>

              <div className="farm-actions">
                <button 
                  onClick={() => {
                    console.log('🌱 [AUTH] Plant Seeds button clicked!');
                    console.log('🌱 [AUTH] showPlantModal function type:', typeof showPlantModal);
                    console.log('🌱 [AUTH] showPlantModal function:', showPlantModal);
                    console.log('🌱 [AUTH] Current chain ID:', chainId);
                    console.log('🌱 [AUTH] Expected chain ID:', config.sagaChainId);
                    console.log('🌱 [AUTH] Button disabled?', chainId !== config.sagaChainId);
                    console.log('🌱 [AUTH] Calling showPlantModal...');
                    showPlantModal();
                    console.log('🌱 [AUTH] showPlantModal called successfully');
                  }}
                  className="action-btn plant"
                  disabled={chainId !== config.sagaChainId}
                >
                  🌱 Plant Seeds
                </button>
                
                <button 
                  onClick={() => {
                    console.log('Transactions button clicked!');
                    console.log('toggleTransactionTracker function:', toggleTransactionTracker);
                    console.log('showTransactionTracker state:', showTransactionTracker);
                    toggleTransactionTracker();
                    console.log('toggleTransactionTracker called');
                  }}
                  className="action-btn transactions"
                >
                  📊 Transactions
                  {activeTransactions.length > 0 && (
                    <span className="tx-badge">{activeTransactions.length}</span>
                  )}
                </button>
              </div>

              {chainId !== config.sagaChainId && (
                <div className="switch-prompt">
                  <p>Switch to Saga network to plant seeds</p>
                </div>
              )}
            </div>
          )}

          <button onClick={logout} className="logout-btn">
            🚪 Logout
          </button>
        </div>
      ) : (
        <div className="not-authenticated">
          <div className="welcome-message">
            <h3>🌱 Join DeFi Valley</h3>
            <p>Connect your wallet or create a new one to start farming and earning real DeFi yields!</p>
          </div>
          
          <button onClick={login} className="login-btn">
            🎮 Connect & Play
          </button>
          
          <div className="features-list">
            <div className="feature">🌾 Plant virtual seeds</div>
            <div className="feature">💰 Earn real DeFi yields</div>
            <div className="feature">👥 Play with friends</div>
            <div className="feature">⛓️ Cross-chain farming</div>
          </div>
        </div>
      )}

      <style jsx>{`
        .auth-component {
          background: rgba(255, 255, 255, 0.95);
          border-radius: 12px;
          padding: 24px;
          margin: 20px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          min-width: 320px;
          max-width: 400px;
          font-family: var(--font-geist-sans);
        }
        
        .welcome h3 {
          margin: 0 0 12px 0;
          color: #2d5016;
          font-size: 20px;
        }
        
        .user-details {
          margin-bottom: 20px;
        }
        
        .user-email, .user-google, .user-twitter {
          font-size: 14px;
          color: #666;
          margin-bottom: 6px;
        }
        
        .wallet-info {
          background: #f8fdf6;
          border: 1px solid #d4edda;
          border-radius: 8px;
          padding: 16px;
          margin: 16px 0;
        }
        
        .wallet-header h4 {
          margin: 0 0 12px 0;
          color: #2d5016;
          font-size: 16px;
        }
        
        .address-section {
          margin-bottom: 12px;
        }
        
        .address-label {
          font-size: 12px;
          color: #666;
          margin-bottom: 4px;
        }
        
        .address-value code {
          background: #e9ecef;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 13px;
          color: #333;
        }
        
        .chain-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
          font-size: 14px;
        }
        
        .chain-label, .balance-label {
          color: #666;
        }
        
        .chain-name {
          font-weight: 500;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 12px;
        }
        
        .chain-name.saga {
          background: #d4edda;
          color: #155724;
        }
        
        .chain-name.arbitrum {
          background: #d1ecf1;
          color: #0c5460;
        }
        
        .balance-value {
          font-weight: 500;
          color: #333;
        }
        
        .chain-actions {
          display: flex;
          gap: 8px;
          margin-bottom: 12px;
        }
        
        .switch-chain-btn {
          flex: 1;
          padding: 8px 12px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 11px;
          font-weight: 500;
          transition: all 0.2s;
        }
        
        .switch-chain-btn.saga {
          background: #28a745;
          color: white;
        }
        
        .switch-chain-btn.arbitrum {
          background: #007bff;
          color: white;
        }
        
        .switch-chain-btn:hover {
          opacity: 0.9;
          transform: translateY(-1px);
        }
        
        .no-wallet {
          background: #fff3cd;
          border: 1px solid #ffeaa7;
          border-radius: 6px;
          padding: 12px;
          margin: 16px 0;
          text-align: center;
          color: #856404;
        }
        
        .logout-btn {
          width: 100%;
          padding: 12px;
          background: #dc3545;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s;
        }
        
        .logout-btn:hover {
          background: #c82333;
          transform: translateY(-1px);
        }
        
        .not-authenticated {
          text-align: center;
        }
        
        .welcome-message h3 {
          margin: 0 0 12px 0;
          color: #2d5016;
          font-size: 24px;
        }
        
        .welcome-message p {
          margin: 0 0 24px 0;
          color: #666;
          line-height: 1.5;
        }
        
        .login-btn {
          width: 100%;
          padding: 16px;
          background: linear-gradient(135deg, #4CAF50, #45a049);
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 16px;
          font-weight: 600;
          transition: all 0.2s;
          margin-bottom: 20px;
        }
        
        .login-btn:hover {
          background: linear-gradient(135deg, #45a049, #3d8b40);
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(76, 175, 80, 0.3);
        }
        
        .features-list {
          text-align: left;
        }
        
        .feature {
          font-size: 14px;
          color: #666;
          margin-bottom: 8px;
          padding-left: 4px;
        }
        
        /* DeFi Valley Dashboard Styles */
        .defi-dashboard {
          background: linear-gradient(135deg, #f8fdf6, #e8f5e8);
          border: 1px solid #4CAF50;
          border-radius: 12px;
          padding: 16px;
          margin: 16px 0;
        }
        
        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        
        .dashboard-header h4 {
          margin: 0;
          color: #2d5016;
          font-size: 18px;
        }
        
        .header-buttons {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .settings-btn {
          background: #f8f9fa;
          border: 1px solid #dee2e6;
          border-radius: 6px;
          width: 32px;
          height: 32px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #6c757d;
          transition: all 0.2s;
        }
        
        .settings-btn:hover {
          background: #e9ecef;
          color: #495057;
          border-color: #adb5bd;
        }
        
        .tx-indicator {
          position: relative;
          background: #ff6b35;
          color: white;
          border: none;
          border-radius: 50%;
          width: 32px;
          height: 32px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: bold;
        }
        
        .tx-count {
          position: relative;
          z-index: 2;
        }
        
        .tx-pulse {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          border-radius: 50%;
          background: #ff6b35;
          animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          70% { transform: scale(1.4); opacity: 0; }
          100% { transform: scale(1.4); opacity: 0; }
        }
        
        .farm-stats {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 16px;
        }
        
        .stat {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        
        .stat-label {
          font-size: 12px;
          color: #666;
        }
        
        .stat-value {
          font-weight: 600;
          color: #2d5016;
          font-size: 14px;
        }
        
        .stat-value.ready {
          color: #ff6b35;
        }
        
        .farm-actions {
          display: flex;
          gap: 8px;
          margin-bottom: 12px;
        }
        
        .action-btn {
          flex: 1;
          padding: 12px 16px;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          transition: all 0.2s;
          position: relative;
        }
        
        .action-btn.plant {
          background: #4CAF50;
          color: white;
        }
        
        .action-btn.plant:hover {
          background: #45a049;
          transform: translateY(-2px);
        }
        
        .action-btn.plant:disabled {
          background: #ccc;
          cursor: not-allowed;
          transform: none;
        }
        
        .action-btn.transactions {
          background: #007bff;
          color: white;
        }
        
        .action-btn.transactions:hover {
          background: #0056b3;
          transform: translateY(-2px);
        }
        
        .tx-badge {
          position: absolute;
          top: -6px;
          right: -6px;
          background: #ff6b35;
          color: white;
          border-radius: 50%;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: bold;
        }
        
        .switch-prompt {
          background: #fff3cd;
          border: 1px solid #ffeaa7;
          border-radius: 6px;
          padding: 8px 12px;
          text-align: center;
          margin-top: 8px;
        }
        
        .switch-prompt p {
          margin: 0;
          font-size: 12px;
          color: #856404;
        }
      `}</style>
    </div>
  )
}
