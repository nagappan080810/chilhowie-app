import bcrypt from 'bcryptjs'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { ADMIN_COOKIE, createSessionToken, getAdminUsers, SESSION_TTL_SECONDS } from '@/lib/auth'
import { checkLoginRateLimit } from '@/lib/login-rate-limit'

const credentialsSchema = z.object({
  username: z.string().trim().min(1).max(80),
  password: z.string().min(1).max(200),
})

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const parsed = credentialsSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'That username and password don\'t match. Try again.' }, { status: 400 })

  const ip = request.headers.get('x-real-ip') ?? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const username = parsed.data.username.toLowerCase()
  let limit: Awaited<ReturnType<typeof checkLoginRateLimit>>
  try {
    limit = await checkLoginRateLimit(`${ip}:${username}`)
  } catch {
    return NextResponse.json({ error: 'Sign-in is temporarily unavailable. Please try again shortly.' }, { status: 503 })
  }
  if (!limit.success) return NextResponse.json({ error: 'Too many attempts. Please wait 15 minutes and try again.' }, { status: 429 })

  const users = getAdminUsers()
  const user = users.find((candidate) => candidate.username.toLowerCase() === username)
  const valid = user ? await bcrypt.compare(parsed.data.password, user.hash).catch(() => false) : false
  if (!user || !valid) return NextResponse.json({ error: 'That username and password don\'t match. Try again.' }, { status: 401 })

  try {
    const token = await createSessionToken({ sub: user.username, name: user.name, role: user.role })
    const response = NextResponse.json({ ok: true })
    response.cookies.set(ADMIN_COOKIE, token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_TTL_SECONDS,
    })
    return response
  } catch {
    return NextResponse.json({ error: 'Sign-in is temporarily unavailable. Please try again shortly.' }, { status: 503 })
  }
}
