import { NextResponse } from 'next/server'
import { fallbackAlert } from '@/data/alerts'
import { getLiveAlert } from '@/lib/alerts'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const alert = await getLiveAlert()
    return NextResponse.json({ alert }, { headers: { 'Cache-Control': 'no-store, max-age=0' } })
  } catch (error) {
    console.warn('[alerts] Public alert endpoint fell back to bundled sample.', error)
    const isLive = fallbackAlert.active && Date.parse(fallbackAlert.startsAt) <= Date.now() && (!fallbackAlert.endsAt || Date.parse(fallbackAlert.endsAt) > Date.now())
    return NextResponse.json({ alert: isLive ? fallbackAlert : null }, { headers: { 'Cache-Control': 'no-store, max-age=0' } })
  }
}
