# Security Architecture

## Overview

DeFi Valley implements enterprise-grade security features to protect users and their assets while maintaining a seamless gaming experience. This document outlines the security measures implemented across the application stack.

## Authentication System

### Player Identification
- **Wallet-Based IDs**: Players are identified by their wallet addresses or Privy user IDs, not session IDs
- **Secure Sessions**: Token-based session management with 1-hour expiration
- **Permission Verification**: All actions verified server-side against authenticated player ID

### Authentication Flow
```
1. User connects wallet via Privy
2. Frontend obtains wallet address/user ID
3. Player ID sent with room join request
4. Server validates and stores authenticated client info
5. All subsequent actions verified against stored authentication
```

## API Security

### Input Validation
All user inputs are validated to prevent injection attacks:

```typescript
// World ID validation (apps/server/src/utils/validation.ts)
export function isValidWorldId(worldId: string): boolean {
  const worldIdRegex = /^[a-zA-Z0-9._-]{1,100}$/;
  return worldIdRegex.test(worldId);
}
```

### Rate Limiting
API endpoints are protected with rate limiting:
- **Limit**: 100 requests per 15 minutes per IP
- **Applied to**: All `/api/` routes
- **Response**: 429 Too Many Requests with retry information

### Request Size Limits
- **JSON payload limit**: 10MB maximum
- **Prevents**: Large payload DoS attacks

## Database Security

### Query Safety
- **Parameterized Queries**: All database queries use parameterized statements
- **Transaction Safety**: Critical operations wrapped in transactions
- **Error Handling**: Errors propagated properly without exposing internals

### Performance Indexes
Optimized indexes prevent slow query attacks:
```sql
CREATE INDEX idx_crops_player_harvested ON crops(player_id, harvested);
CREATE INDEX idx_players_updated_at ON players(updated_at DESC);
```

## Permission System

### Farm Ownership
- **Owner Actions**: Only farm owners can plant/harvest crops
- **Visitor Access**: Read-only access for visiting other farms
- **Server Validation**: All permissions checked server-side

### Action Verification
```typescript
// Example permission check
const authClient = this.authenticatedClients.get(client.sessionId);
if (!authClient || !authClient.isHost) {
  this.sendError(client, {
    code: ERROR_CODES.INVALID_REQUEST,
    message: 'Only the farm owner can plant seeds'
  });
  return;
}
```

## Smart Contract Security

### Circuit Breaker System
- **Emergency Pause**: Multiple operators can pause the protocol
- **Owner-Only Unpause**: Only contract owner can resume operations
- **Protected Functions**: All critical functions check pause state

### Deposit Caps
- **Default Cap**: 1M USDC total protocol deposits
- **Dynamic Updates**: Owner can adjust caps based on TVL
- **Validation**: Every deposit checked against current cap

### Command Routing
- **Enum-Based**: Commands validated against known types
- **Invalid Rejection**: Unknown commands explicitly rejected
- **Replay Protection**: Command tracking prevents duplicate execution

## Network Security

### WebSocket Protection
- **Connection Validation**: All WebSocket connections authenticated
- **Message Validation**: All messages validated for structure and content
- **Error Isolation**: Malformed messages don't affect other players

### Cross-Origin Requests
- **CORS Configuration**: Properly configured for production domains
- **Origin Validation**: Requests validated against allowed origins

## Development Security

### Environment Variables
- **Never Committed**: All `.env` files in `.gitignore`
- **Example Files**: Safe `.env.example` files provided
- **Key Management**: Use Hardhat keystore for secure key storage

### Repository Safety
- **Clean History**: No secrets ever committed to git
- **Database Files**: SQLite files excluded from repository
- **Public Ready**: Safe for open-source viewing

## Security Checklist

### For Developers
- [ ] Never commit `.env` files or private keys
- [ ] Always validate user inputs before database queries
- [ ] Use parameterized queries for all database operations
- [ ] Check permissions server-side, never trust client
- [ ] Handle errors gracefully without exposing internals
- [ ] Keep dependencies updated for security patches

### For Deployment
- [ ] Set strong private keys for all accounts
- [ ] Configure rate limiting for production traffic
- [ ] Enable HTTPS for all endpoints
- [ ] Set up monitoring for suspicious activity
- [ ] Regular security audits of smart contracts
- [ ] Implement proper backup strategies

## Incident Response

### If Suspicious Activity Detected
1. **Emergency Pause**: Any pause operator can halt the protocol
2. **Investigation**: Review logs and transaction history
3. **Communication**: Notify users of the situation
4. **Resolution**: Fix issues before unpausing
5. **Post-Mortem**: Document and learn from incident

### Contact
For security concerns or bug reports, please contact:
- GitHub Issues: [Private Security Issue](https://github.com/LukeFost/defivalley/security)
- Email: [security@defivalley.example]