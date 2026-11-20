import { cookies } from 'next/headers'
import { jwtVerify, SignJWT } from 'jose'
import { z } from 'zod'

export const ADMIN_COOKIE = 'chilhowie_admin'
export const SESSION_TTL_SECONDS = 60 * 60 * 8

const adminUsersSchema = z.array(z.object({
  username: z.string().min(1).max(80),
  name: z.string().min(1).max(120),
  role: z.enum(['editor', 'publisher']),
  hash: z.string().startsWith('$2'),
})).min(1).max(3)

export interface AdminSession {
  sub: string
  name: string
  role: 'editor' | 'publisher'
}

function sessionKey() {
  const secret = process.env.SESSION_SECRET
  if (!secret || secret.length < 32) throw new Error('SESSION_SECRET must contain at least 32 characters.')
  return new TextEncoder().encode(secret)
}

export function getAdminUsers() {
  const raw = process.env.ADMIN_USERS
  if (!raw) return []
  try {
    const parsed = adminUsersSchema.safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data : []
  } catch {
    return []
  }
}

export async function createSessionToken(user: AdminSession) {
  return new SignJWT({ name: user.name, role: user.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(sessionKey())
}

export async function verifySessionToken(token: string): Promise<AdminSession | null> {
  try {
    const { payload } = await jwtVerify(token, sessionKey(), { algorithms: ['HS256'] })
    if (typeof payload.sub !== 'string' || typeof payload.name !== 'string' || (payload.role !== 'editor' && payload.role !== 'publisher')) return null
    return { sub: payload.sub, name: payload.name, role: payload.role }
  } catch {
    return null
  }
}

export async function getAdminSession() {
  const jar = await cookies()
  const token = jar.get(ADMIN_COOKIE)?.value
  return token ? verifySessionToken(token) : null
}
