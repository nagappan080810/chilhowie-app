import { revalidatePath } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { alertInputSchema, isAlertLive } from '@/lib/alert-types'
import { createPublishedAlert, getStoredAlert, saveAlert } from '@/lib/alerts'
import { getRedis } from '@/lib/redis'

export const dynamic = 'force-dynamic'
const noStore = { 'Cache-Control': 'no-store, max-age=0' }

export async function GET() {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: noStore })
  const alert = await getStoredAlert()
  return NextResponse.json({ alert, isLive: isAlertLive(alert) }, { headers: noStore })
}

export async function POST(request: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: noStore })
  if (!getRedis()) return NextResponse.json({ error: 'Alert publishing is unavailable until Redis is configured.' }, { status: 503, headers: noStore })

  const body = await request.json().catch(() => null)
  const parsed = alertInputSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Please review the highlighted alert fields.', issues: parsed.error.flatten() }, { status: 400, headers: noStore })

  const value = parsed.data
  const alert = await createPublishedAlert({
    level: value.level,
    title: value.title,
    body: value.body,
    link: value.linkLabel && value.linkHref ? { label: value.linkLabel, href: value.linkHref } : undefined,
    active: value.active,
    startsAt: new Date(value.startsAt).toISOString(),
    endsAt: value.endsAt ? new Date(value.endsAt).toISOString() : undefined,
    updatedBy: session.name,
  })
  const previous = await getStoredAlert()
  const action = Date.parse(alert.startsAt) > Date.now() ? 'scheduled' : previous.isSample ? 'published' : 'updated'
  await saveAlert(alert, action)
  revalidatePath('/', 'layout')
  return NextResponse.json({ alert, action }, { headers: noStore })
}

export async function PATCH(request: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: noStore })
  if (!getRedis()) return NextResponse.json({ error: 'Alert publishing is unavailable until Redis is configured.' }, { status: 503, headers: noStore })

  const body = await request.json().catch(() => null)
  if (!body || typeof body.active !== 'boolean') return NextResponse.json({ error: 'Expected an active boolean.' }, { status: 400, headers: noStore })
  const current = await getStoredAlert()
  const alert = await createPublishedAlert({ ...current, active: body.active, updatedBy: session.name, updatedAt: new Date().toISOString() })
  await saveAlert(alert, body.active ? 'updated' : 'unpublished')
  revalidatePath('/', 'layout')
  return NextResponse.json({ alert, isLive: isAlertLive(alert) }, { headers: noStore })
}
