import { NextRequest, NextResponse } from 'next/server'
import { ADMIN_COOKIE, verifySessionToken } from '@/lib/auth'

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  if (pathname === '/admin/login' || pathname === '/admin/login/' || pathname === '/api/admin/login') return NextResponse.next()
  const token = request.cookies.get(ADMIN_COOKIE)?.value
  const session = token ? await verifySessionToken(token) : null
  if (session) return NextResponse.next()
  if (pathname.startsWith('/api/admin/')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const loginUrl = new URL('/admin/login', request.url)
  loginUrl.searchParams.set('next', pathname)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
}
