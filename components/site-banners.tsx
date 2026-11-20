'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import useSWR from 'swr'
import { BellRing, Info, TriangleAlert, X } from 'lucide-react'
import type { SiteAlert } from '@/lib/alert-types'

const fetcher = async (url: string) => {
  const response = await fetch(url, { cache: 'no-store' })
  if (!response.ok) throw new Error('Unable to load the site alert')
  return response.json() as Promise<{ alert: SiteAlert | null }>
}

export function SiteBanners({ initialAlert }: { initialAlert: SiteAlert | null }) {
  const [dismissedId, setDismissedId] = useState<string | null>(null)
  const pathname = usePathname()
  const { data } = useSWR('/api/alert', fetcher, {
    fallbackData: { alert: initialAlert },
    refreshInterval: 20_000,
    revalidateOnFocus: true,
  })
  const alert = data?.alert ?? null

  useEffect(() => {
    if (!alert || alert.level === 'emergency') return
    try {
      if (window.localStorage.getItem(`dismissed-alert:${alert.id}`) === 'true') setDismissedId(alert.id)
    } catch {
      setDismissedId(null)
    }
  }, [alert?.id, alert?.level])

  const isAdmin = pathname === '/admin' || pathname.startsWith('/admin/')
  const isDismissed = alert?.level !== 'emergency' && dismissedId === alert?.id
  const Icon = alert?.level === 'emergency' ? TriangleAlert : alert?.level === 'info' ? Info : BellRing

  return <>
    <div className="concept"><span className="concept-dot" /> Design concept for the Town of Chilhowie website proposal <span className="concept-sep">·</span> Sample content, not the official Town website <Link href="/about-this-concept">About this concept</Link></div>
    {!isAdmin && alert && !isDismissed && <section className={`site-alert alert-${alert.level}`} aria-label="Site alert" role={alert.level === 'emergency' ? 'alert' : undefined} aria-live={alert.level === 'emergency' ? undefined : 'polite'}>
      <div className="site-alert-inner wrap"><span className="site-alert-icon"><Icon size={19} aria-hidden="true" /></span><div className="site-alert-copy"><span className="site-alert-level">{alert.level}{alert.isSample ? ' · Sample alert' : ''}</span><strong>{alert.title}</strong>{alert.body && <p>{alert.body}</p>}{alert.link && <Link className="site-alert-link" href={alert.link.href}>Read the full notice <span aria-hidden="true">→</span></Link>}</div>{alert.level !== 'emergency' && <button className="site-alert-dismiss" type="button" aria-label="Dismiss alert" onClick={() => { setDismissedId(alert.id); try { window.localStorage.setItem(`dismissed-alert:${alert.id}`, 'true') } catch { /* Storage can be unavailable in private browsing. */ } }}><X size={18}/></button>}</div>
    </section>}
  </>
}

