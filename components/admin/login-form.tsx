'use client'

import { FormEvent, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, Landmark } from 'lucide-react'

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const result = await response.json()
      if (!response.ok) {
        setError(result.error || 'That username and password don\'t match. Try again.')
        return
      }
      const next = searchParams.get('next')
      router.replace(next?.startsWith('/admin') ? next : '/admin')
      router.refresh()
    } catch {
      setError('Sign-in is temporarily unavailable. Please try again shortly.')
    } finally {
      setBusy(false)
    }
  }

  return <main className="admin-login-page">
    <section className="admin-login-card" aria-labelledby="login-title">
      <Link href="/" className="admin-wordmark"><span className="admin-seal"><Landmark size={20}/></span><span><strong>Town of Chilhowie</strong><small>Staff workspace</small></span></Link>
      <p className="admin-kicker">STAFF ACCESS</p>
      <h1 id="login-title">Staff sign-in</h1>
      <p className="admin-muted">For Town of Chilhowie staff. This demo shows how staff will update the website.</p>
      {searchParams.get('message') === 'signed-out' && <p className="admin-signed-out" role="status">You&apos;ve signed out.</p>}
      <form className="admin-login-form" onSubmit={submit}>
        <label htmlFor="admin-username">Username</label>
        <input id="admin-username" name="username" autoComplete="username" required maxLength={80} value={username} onChange={(event) => setUsername(event.target.value)} />
        <label htmlFor="admin-password">Password</label>
        <div className="password-field"><input id="admin-password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required maxLength={200} value={password} onChange={(event) => setPassword(event.target.value)} /><button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((value) => !value)}>{showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}</button></div>
        <p className="admin-form-error" aria-live="polite">{error}</p>
        <button className="admin-primary" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
      <p className="admin-setup-note">Staff accounts are configured privately for this demo. Contact the project administrator if your account is not enabled.</p>
      <Link href="/" className="admin-back-link">← Back to website</Link>
    </section>
  </main>
}
