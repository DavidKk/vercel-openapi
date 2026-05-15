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
  const { SignJWT } = await import('jose')
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
    const { jwtVerify } = await import('jose')
    const { payload } = await jwtVerify(token, key)
    return (payload as Record<string, unknown>) ?? null
  } catch {
    return null
  }
}

/**
 * Resolves JWT expiry for interactive password login.
 * @param rememberMe When true, uses `JWT_EXPIRES_IN` from the environment; when false, forces one day.
 * @returns Duration string passed to `generateToken`
 */
export function getLoginJwtExpiresIn(rememberMe: boolean): string {
  const { JWT_EXPIRES_IN } = getJWTConfig()
  return rememberMe ? JWT_EXPIRES_IN : '1d'
}

/**
 * Approximate cookie Max-Age seconds from a simple duration string (numeric prefix + d|h|m|s).
 * @param expiresIn Value such as `7d` or `12h`
 * @returns Non-negative seconds suitable for Set-Cookie Max-Age
 */
export function jwtExpiresInToMaxAgeSeconds(expiresIn: string): number {
  const m = /^(\d+)\s*([dhms])$/i.exec(expiresIn.trim())
  if (!m) {
    return 86400
  }
  const amount = parseInt(m[1], 10)
  const unit = m[2].toLowerCase()
  switch (unit) {
    case 'd':
      return amount * 86400
    case 'h':
      return amount * 3600
    case 'm':
      return amount * 60
    case 's':
      return amount
    default:
      return 86400
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
