import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { getAlertHistory } from '@/lib/alerts'

export const dynamic = 'force-dynamic'

export async function GET() {
  if (!await getAdminSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const history = await getAlertHistory(20)
  return NextResponse.json({ history }, { headers: { 'Cache-Control': 'no-store, max-age=0' } })
}
