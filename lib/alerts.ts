import { randomUUID } from 'node:crypto'
import { fallbackAlert } from '@/data/alerts'
import type { AlertAuditEntry, SiteAlert } from '@/lib/alert-types'
import { getRedis } from '@/lib/redis'

export const ALERT_CURRENT_KEY = 'chilhowie:alert:current'
export const ALERT_DEFAULT_KEY = 'chilhowie:alert:default'
export const ALERT_HISTORY_KEY = 'chilhowie:alert:history'

export function createAlertId() {
  return randomUUID()
}

export async function getStoredAlert(): Promise<SiteAlert> {
  const redis = getRedis()
  if (!redis) return fallbackAlert

  try {
    const current = await redis.get<SiteAlert>(ALERT_CURRENT_KEY)
    if (current) return current
    const seeded = { ...fallbackAlert, updatedAt: new Date().toISOString() }
    await redis.set(ALERT_CURRENT_KEY, seeded)
    await redis.set(ALERT_DEFAULT_KEY, seeded)
    await redis.lpush(ALERT_HISTORY_KEY, JSON.stringify({ at: seeded.updatedAt, by: seeded.updatedBy, action: 'reset-by-system', snapshot: seeded } satisfies AlertAuditEntry))
    await redis.ltrim(ALERT_HISTORY_KEY, 0, 49)
    return seeded
  } catch (error) {
    console.warn('[alerts] Redis read failed; using the bundled fallback alert.', error)
    return fallbackAlert
  }
}

export async function getLiveAlert() {
  const alert = await getStoredAlert()
  const now = Date.now()
  return alert.active && Date.parse(alert.startsAt) <= now && (!alert.endsAt || Date.parse(alert.endsAt) > now) ? alert : null
}

export async function getAlertHistory(limit = 20): Promise<AlertAuditEntry[]> {
  const redis = getRedis()
  if (!redis) return []
  try {
    const entries = await redis.lrange<string | AlertAuditEntry>(ALERT_HISTORY_KEY, 0, Math.max(0, Math.min(limit, 50) - 1))
    return entries.map((entry) => typeof entry === 'string' ? JSON.parse(entry) as AlertAuditEntry : entry)
  } catch (error) {
    console.warn('[alerts] Redis history read failed.', error)
    return []
  }
}

export async function saveAlert(alert: SiteAlert, action: AlertAuditEntry['action']) {
  const redis = getRedis()
  if (!redis) throw new Error('Redis is not configured.')
  const entry: AlertAuditEntry = { at: alert.updatedAt, by: alert.updatedBy, action, snapshot: alert }
  const pipeline = redis.pipeline()
  pipeline.set(ALERT_CURRENT_KEY, alert)
  pipeline.lpush(ALERT_HISTORY_KEY, JSON.stringify(entry))
  pipeline.ltrim(ALERT_HISTORY_KEY, 0, 49)
  await pipeline.exec()
}

export async function createPublishedAlert(input: Omit<SiteAlert, 'id' | 'updatedAt'> & { updatedAt?: string }): Promise<SiteAlert> {
  return { ...input, id: createAlertId(), updatedAt: input.updatedAt ?? new Date().toISOString(), isSample: false }
}
