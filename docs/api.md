# RugFork API Documentation

## Overview

RugFork is a gamified crypto trading platform on Solana that allows users to launch tokens, place sidebets, and compete in leaderboards.

## Base URL

- Development: `http://localhost:3000`
- Production: `https://api.rugfork.com`

## Authentication

Most endpoints require authentication via JWT token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

## Endpoints

### Health Check

#### GET /health

Check if the API is running.

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600,
  "environment": "development"
}
```

### Tokens

#### GET /api/tokens

Get all active token pools.

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20)
- `sortBy` (string): Sort field (default: 'createdAt')
- `sortOrder` (string): Sort order 'asc' or 'desc' (default: 'desc')

**Response:**
```json
{
  "pools": [
    {
      "id": "pool_id",
      "tokenMint": "token_mint_address",
      "tokenName": "Token Name",
      "tokenSymbol": "TKN",
      "liquidity": "1000000000",
      "totalVolume": "5000000000",
      "totalBets": 150,
      "rugScore": 45,
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "creator": {
        "id": "user_id",
        "username": "creator_name",
        "avatar": "avatar_url"
      },
      "_count": {
        "bets": 150
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

#### GET /api/tokens/:id

Get a specific token pool by ID.

**Response:**
```json
{
  "id": "pool_id",
  "tokenMint": "token_mint_address",
  "tokenName": "Token Name",
  "tokenSymbol": "TKN",
  "liquidity": "1000000000",
  "totalVolume": "5000000000",
  "totalBets": 150,
  "rugScore": 45,
  "isActive": true,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "creator": {
    "id": "user_id",
    "username": "creator_name",
    "avatar": "avatar_url",
    "level": 5
  },
  "bets": [
    {
      "id": "bet_id",
      "amount": "100000000",
      "multiplier": 2,
      "isSettled": false,
      "winnings": "0",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "user": {
        "id": "user_id",
        "username": "bettor_name",
        "avatar": "avatar_url"
      }
    }
  ],
  "_count": {
    "bets": 150
  }
}
```

#### POST /api/tokens

Create a new token pool.

**Request Body:**
```json
{
  "tokenMint": "token_mint_address",
  "tokenName": "Token Name",
  "tokenSymbol": "TKN",
  "initialLiquidity": 1000000000
}
```

**Response:**
```json
{
  "id": "pool_id",
  "tokenMint": "token_mint_address",
  "tokenName": "Token Name",
  "tokenSymbol": "TKN",
  "liquidity": "1000000000",
  "creatorId": "user_id",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

### Bets

#### GET /api/bets

Get user's bets.

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20)
- `poolId` (string): Filter by pool ID
- `status` (string): Filter by status ('settled' or 'active')

**Response:**
```json
{
  "bets": [
    {
      "id": "bet_id",
      "amount": "100000000",
      "multiplier": 2,
      "isSettled": false,
      "winnings": "0",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "pool": {
        "id": "pool_id",
        "tokenMint": "token_mint_address",
        "tokenName": "Token Name",
        "tokenSymbol": "TKN",
        "isActive": true
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "pages": 3
  }
}
```

#### POST /api/bets

Place a new bet.

**Request Body:**
```json
{
  "poolId": "pool_id",
  "amount": 100000000,
  "multiplier": 2
}
```

**Response:**
```json
{
  "id": "bet_id",
  "userId": "user_id",
  "poolId": "pool_id",
  "amount": "100000000",
  "multiplier": 2,
  "isSettled": false,
  "winnings": "0",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "pool": {
    "id": "pool_id",
    "tokenMint": "token_mint_address",
    "tokenName": "Token Name",
    "tokenSymbol": "TKN"
  }
}
```

#### PATCH /api/bets/:id/settle

Settle a bet (admin only).

**Request Body:**
```json
{
  "crashPoint": 2.5
}
```

**Response:**
```json
{
  "id": "bet_id",
  "userId": "user_id",
  "poolId": "pool_id",
  "amount": "100000000",
  "multiplier": 2,
  "isSettled": true,
  "winnings": "200000000",
  "crashPoint": 2.5,
  "settledAt": "2024-01-01T00:00:00.000Z"
}
```

### Users

#### GET /api/users/profile

Get current user's profile.

**Response:**
```json
{
  "id": "user_id",
  "walletAddress": "wallet_address",
  "username": "username",
  "email": "email@example.com",
  "avatar": "avatar_url",
  "totalXp": 5000,
  "level": 5,
  "totalBets": 25,
  "totalWinnings": "5000000000",
  "totalLosses": "2000000000",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "lastActiveAt": "2024-01-01T00:00:00.000Z"
}
```

#### PUT /api/users/profile

Update user profile.

**Request Body:**
```json
{
  "username": "new_username",
  "email": "new_email@example.com",
  "avatar": "avatar_url"
}
```

**Response:**
```json
{
  "id": "user_id",
  "walletAddress": "wallet_address",
  "username": "new_username",
  "email": "new_email@example.com",
  "avatar": "avatar_url",
  "totalXp": 5000,
  "level": 5,
  "totalBets": 25,
  "totalWinnings": "5000000000",
  "totalLosses": "2000000000",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### Leaderboard

#### GET /api/leaderboard

Get leaderboard rankings.

**Query Parameters:**
- `type` (string): Leaderboard type ('top_traders', 'top_winners', 'top_volume', 'top_xp')
- `period` (string): Time period ('daily', 'weekly', 'monthly', 'all_time')

**Response:**
```json
{
  "type": "top_traders",
  "period": "weekly",
  "rankings": [
    {
      "rank": 1,
      "user": {
        "id": "user_id",
        "username": "top_trader",
        "avatar": "avatar_url",
        "level": 10
      },
      "score": 95.5,
      "totalBets": 100,
      "winRate": 75.5
    }
  ],
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### Analytics

#### GET /api/analytics/stats

Get platform statistics.

**Response:**
```json
{
  "totalPools": 150,
  "totalBets": 5000,
  "totalVolume": "100000000000",
  "totalUsers": 500,
  "activePools": 25,
  "averageRugScore": 45.5
}
```

#### GET /api/analytics/pool/:id

Get pool analytics.

**Query Parameters:**
- `period` (string): Time period ('1h', '24h', '7d', '30d')

**Response:**
```json
{
  "period": "24h",
  "betStats": {
    "totalBets": 50,
    "totalVolume": "5000000000",
    "totalWinnings": "2000000000",
    "averageMultiplier": 3.2
  },
  "recentBets": [
    {
      "id": "bet_id",
      "amount": "100000000",
      "multiplier": 2,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "user": {
        "id": "user_id",
        "username": "bettor_name",
        "avatar": "avatar_url"
      }
    }
  ]
}
```

## Error Responses

All error responses follow this format:

```json
{
  "error": {
    "message": "Error description",
    "statusCode": 400,
    "stack": "Error stack trace (development only)"
  }
}
```

## Rate Limiting

API requests are rate limited to 100 requests per 15 minutes per IP address.

## WebSocket Events

The API supports WebSocket connections for real-time updates:

- `pool_created`: New pool created
- `bet_placed`: New bet placed
- `bet_settled`: Bet settled
- `pool_crashed`: Pool crashed

## Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `429` - Too Many Requests
- `500` - Internal Server Error
