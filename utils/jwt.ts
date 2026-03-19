import { jwtVerify, SignJWT } from 'jose'

/**
 * Encode JWT secret string to Uint8Array for jose HMAC (HS256)
 */
function getSecretKey(secret: string): Uint8Array {
  return new TextEncoder().encode(secret)
}

/**
 * Generate a signed JWT with the given payload
 * @param payload Claims to embed in the token
 * @param expiresIn Optional expiration override (e.g. 7d)
 * @returns Signed JWT string
 */
export async function generateToken(payload: object, expiresIn?: string): Promise<string> {
  const { JWT_SECRET, JWT_EXPIRES_IN } = getJWTConfig()
  const key = getSecretKey(JWT_SECRET)
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(expiresIn ?? JWT_EXPIRES_IN)
    .sign(key)
}

/**
 * Verify a JWT and return its payload, or null if invalid/expired
 * @param token JWT string to verify
 * @returns Decoded payload or null
 */
export async function verifyToken(token: string): Promise<Record<string, unknown> | null> {
  try {
    const { JWT_SECRET } = getJWTConfig()
    const key = getSecretKey(JWT_SECRET)
    const { payload } = await jwtVerify(token, key)
    return (payload as Record<string, unknown>) ?? null
  } catch {
    return null
  }
}

function getJWTConfig() {
  const JWT_SECRET = process.env.JWT_SECRET || process.env.ACCESS_PASSWORD || 'unbnd-default-jwt-secret'
  const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d'

  return {
    JWT_SECRET,
    JWT_EXPIRES_IN,
  }
}
