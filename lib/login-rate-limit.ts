import { Ratelimit } from '@upstash/ratelimit'
import { getRedis } from '@/lib/redis'

const localAttempts = new Map<string, { count: number; resetAt: number }>()

export async function checkLoginRateLimit(key: string) {
  const redis = getRedis()
  if (redis) {
    const limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '15 m'),
      prefix: 'ratelimit:login',
    })
    return limiter.limit(key)
  }

  if (process.env.NODE_ENV === 'production') throw new Error('Login rate limiting is unavailable.')
  const now = Date.now()
  const entry = localAttempts.get(key)
  if (!entry || entry.resetAt <= now) {
    localAttempts.set(key, { count: 1, resetAt: now + 15 * 60_000 })
    return { success: true, limit: 5, remaining: 4, reset: now + 15 * 60_000 }
  }
  entry.count += 1
  return { success: entry.count <= 5, limit: 5, remaining: Math.max(0, 5 - entry.count), reset: entry.resetAt }
}
