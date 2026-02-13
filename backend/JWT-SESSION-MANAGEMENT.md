# JWT Session Management System

## Overview

ClawHQ now implements a comprehensive JWT session management system with the following features:

- **Short-lived access tokens** (15 minutes)
- **Long-lived refresh tokens** (7 days)
- **Session tracking** in database
- **Session revocation** (logout)
- **Multi-device session management**
- **Automatic session cleanup**

## Architecture

### Database Model

```prisma
model Session {
  id               String   @id @default(cuid())
  token            String   @unique       // Access token
  refreshToken     String   @unique       // Refresh token
  expiresAt        DateTime              // Access token expiry
  refreshExpiresAt DateTime              // Refresh token expiry
  isRevoked        Boolean  @default(false)
  userAgent        String?
  ipAddress        String?
  lastUsedAt       DateTime @default(now())
  createdAt        DateTime @default(now())
  
  userId           String
  user             User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

### Token Types

1. **Access Token** (JWT)
   - Lifetime: 15 minutes
   - Contains: userId, jti (session ID), type
   - Used for API authentication
   - Signed with `JWT_SECRET`

2. **Refresh Token** (JWT)
   - Lifetime: 7 days
   - Contains: userId, jti (refresh session ID), type
   - Used to obtain new access tokens
   - Signed with `JWT_REFRESH_SECRET`

## API Endpoints

### Authentication

#### `POST /api/auth/login`
```json
{
  "email": "user@example.com",
  "password": "password"
}
```

Response:
```json
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "expiresAt": "2026-02-13T18:45:00.000Z",
  "user": { ... }
}
```

#### `POST /api/auth/refresh`
```json
{
  "refreshToken": "eyJ..."
}
```

Response:
```json
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "expiresAt": "2026-02-13T18:45:00.000Z"
}
```

### Session Management

#### `POST /api/auth/logout`
Headers: `Authorization: Bearer <access_token>`

Revokes the current session.

#### `POST /api/auth/logout-all`
Headers: `Authorization: Bearer <access_token>`

Revokes all sessions for the current user.

#### `GET /api/auth/sessions`
Headers: `Authorization: Bearer <access_token>`

Returns list of active sessions:
```json
{
  "sessions": [
    {
      "id": "session_id",
      "userAgent": "Mozilla/5.0...",
      "ipAddress": "192.168.1.100",
      "lastUsedAt": "2026-02-13T17:30:00.000Z",
      "createdAt": "2026-02-13T17:00:00.000Z",
      "expiresAt": "2026-02-13T18:45:00.000Z"
    }
  ]
}
```

### Cleanup

#### `POST /api/auth/cleanup-sessions`
Headers: `X-API-Key: <cleanup_api_key>`

Administrative endpoint for cleaning up expired sessions.

## Security Features

### Session Validation
- JWT signature verification
- Database session lookup
- Revocation checking
- Expiration checking
- Automatic session updates (lastUsedAt)

### Protection Against
- **Token theft**: Short access token lifetime
- **Replay attacks**: Session database tracking
- **Session fixation**: Unique session IDs
- **Concurrent sessions**: Optional session limiting

## Client Integration

### Frontend Usage

```typescript
// Store tokens securely
localStorage.setItem('accessToken', response.accessToken)
localStorage.setItem('refreshToken', response.refreshToken)
localStorage.setItem('tokenExpiry', response.expiresAt)

// API client with automatic refresh
class ApiClient {
  async request(url: string, options: RequestInit = {}) {
    let token = localStorage.getItem('accessToken')
    const expiry = localStorage.getItem('tokenExpiry')
    
    // Check if token needs refresh
    if (new Date(expiry) <= new Date()) {
      token = await this.refreshToken()
    }
    
    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`
      }
    })
  }
  
  async refreshToken() {
    const refreshToken = localStorage.getItem('refreshToken')
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    })
    
    if (response.ok) {
      const data = await response.json()
      localStorage.setItem('accessToken', data.accessToken)
      localStorage.setItem('refreshToken', data.refreshToken)
      localStorage.setItem('tokenExpiry', data.expiresAt)
      return data.accessToken
    } else {
      // Refresh failed - redirect to login
      this.logout()
      throw new Error('Session expired')
    }
  }
}
```

## Environment Variables

Required environment variables:

```env
JWT_SECRET="your-secret-key"
JWT_REFRESH_SECRET="your-refresh-secret-key"
CLEANUP_API_KEY="cleanup-api-key"
```

## Automatic Maintenance

### Startup Cleanup
- Removes expired sessions on server startup

### Periodic Cleanup
- Runs every 30 minutes
- Removes expired/revoked sessions
- Logs cleanup activity

### Manual Cleanup
- API endpoint for administrative cleanup
- Can be triggered by cron jobs

## Migration Notes

### Breaking Changes
- Login response format changed (added `refreshToken`, `expiresAt`)
- Google OAuth callback includes refresh token
- Email verification includes refresh token

### Backward Compatibility
- Old JWT tokens will be invalid (requires re-login)
- Update client code to handle new token format

## Performance Considerations

- Access tokens are validated against database (slight overhead)
- Periodic cleanup prevents session table bloat
- Indexes on token fields for fast lookups
- Session updates are batched where possible

## Monitoring

Watch for:
- High session creation rates (potential abuse)
- Many failed refresh attempts (token theft?)
- Large number of expired sessions (cleanup issues)
- Database performance on session operations

## Future Enhancements

Possible improvements:
- Redis cache for active sessions
- Session concurrency limits
- Device fingerprinting
- Suspicious activity detection
- Session analytics dashboard