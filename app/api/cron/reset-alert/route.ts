import { revalidatePath } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'
import type { AlertAuditEntry, SiteAlert } from '@/lib/alert-types'
import { ALERT_CURRENT_KEY, ALERT_DEFAULT_KEY, ALERT_HISTORY_KEY } from '@/lib/alerts'
import { getRedis } from '@/lib/redis'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const redis = getRedis()
  if (!redis) return NextResponse.json({ error: 'Redis is not configured.' }, { status: 503 })

  try {
    const fallback = await redis.get<SiteAlert>(ALERT_DEFAULT_KEY)
    if (!fallback) return NextResponse.json({ error: 'Alert default has not been seeded yet.' }, { status: 409 })
    const alert: SiteAlert = { ...fallback, id: crypto.randomUUID(), updatedAt: new Date().toISOString(), updatedBy: 'System', isSample: true }
    const audit: AlertAuditEntry = { at: alert.updatedAt, by: alert.updatedBy, action: 'reset-by-system', snapshot: alert }
    const pipeline = redis.pipeline()
    pipeline.set(ALERT_CURRENT_KEY, alert)
    pipeline.lpush(ALERT_HISTORY_KEY, JSON.stringify(audit))
    pipeline.ltrim(ALERT_HISTORY_KEY, 0, 49)
    await pipeline.exec()
    revalidatePath('/', 'layout')
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[alerts] Nightly alert reset failed.', error)
    return NextResponse.json({ error: 'Unable to reset the alert.' }, { status: 500 })
  }
}
