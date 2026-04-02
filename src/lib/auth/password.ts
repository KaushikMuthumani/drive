// Edge-compatible SHA-256 password hashing (no bcrypt needed)
// Salt is derived from JWT_SECRET so it's unique per deployment
export async function hashPassword(password: string): Promise<string> {
  const salt = process.env.JWT_SECRET ?? 'dev-salt-change-in-prod'
  const data = new TextEncoder().encode(password + salt)
  const buf  = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return (await hashPassword(plain)) === hash
}
