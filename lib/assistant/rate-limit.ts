import { Ratelimit } from '@upstash/ratelimit'
import { getRedis } from '@/lib/redis'

const local = new Map<string, { count: number; resetAt: number }>()

/** 20 questions per visitor every 10 minutes keeps the demo's API spend predictable. */
export async function checkAssistantRateLimit(key: string, limit = 20) {
  const redis = getRedis()
  if (redis) {
    const limiter = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(limit, '10 m'), prefix: 'ratelimit:assistant' })
    const result = await limiter.limit(key)
    return result.success
  }
  const now = Date.now()
  const entry = local.get(key)
  if (!entry || entry.resetAt <= now) {
    local.set(key, { count: 1, resetAt: now + 10 * 60_000 })
    return true
  }
  entry.count += 1
  return entry.count <= limit
}
