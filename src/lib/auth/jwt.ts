import { SignJWT, jwtVerify } from 'jose'

export interface AuthPayload {
  sub: string
  school_id: string
  role: 'admin' | 'instructor'
  iat?: number
  exp?: number
}

function getSecret() {
  return new TextEncoder().encode(
    process.env.JWT_SECRET ?? 'dev-secret-change-in-production-please'
  )
}

// Access token — 30 days (long enough that users stay logged in)
export async function signToken(payload: Omit<AuthPayload, 'iat' | 'exp'>): Promise<string> {
  return new SignJWT(payload as any)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(getSecret())
}

// Refresh token — 1 year (stored in separate cookie, used to get new access token)
export async function signRefreshToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId, type: 'refresh' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('365d')
    .sign(getSecret())
}

export async function verifyToken(token: string): Promise<AuthPayload> {
  const { payload } = await jwtVerify(token, getSecret())
  return payload as unknown as AuthPayload
}

export async function verifyRefreshToken(token: string): Promise<{ sub: string }> {
  const { payload } = await jwtVerify(token, getSecret())
  if ((payload as any).type !== 'refresh') throw new Error('Not a refresh token')
  return payload as { sub: string }
}

// Check if token expires within 7 days — trigger silent refresh
export function shouldRefresh(payload: AuthPayload): boolean {
  if (!payload.exp) return false
  const sevenDays = 7 * 24 * 60 * 60
  return payload.exp - Math.floor(Date.now() / 1000) < sevenDays
}
