'use client'

import { useMemo, useRef, useState } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { ArrowUpRight, BellRing, CalendarClock, Check, ChevronRight, CircleAlert, ExternalLink, FileText, Info, LogOut, Newspaper, ShieldCheck, Users, BriefcaseBusiness } from 'lucide-react'
import type { AlertAuditEntry, AlertLevel, SiteAlert } from '@/lib/alert-types'
import { AlertDrafter } from '@/components/admin/alert-drafter'

const fetcher = async (url: string) => {
  const response = await fetch(url, { cache: 'no-store' })
  if (!response.ok) throw new Error('Unable to load alert data')
  return response.json()
}

type Draft = { level: AlertLevel; title: string; body: string; linkLabel: string; linkHref: string; startsAt: string; endsAt: string; active: boolean }
const quickTemplates: Array<{ label: string; draft: Partial<Draft> }> = [
  { label: 'Boil water advisory', draft: { level: 'emergency', title: 'Boil water advisory in effect', body: 'Use bottled or boiled water until further notice. Check back for updates.' } },
  { label: 'Road closure', draft: { level: 'emergency', title: 'Road closure on Main Street', body: 'Please use the signed detour while crews work in the area.' } },
  { label: 'Office closed for holiday', draft: { level: 'notice', title: 'Town offices closed for the holiday', body: 'Offices will reopen on the next business day.' } },
  { label: 'Council meeting rescheduled', draft: { level: 'notice', title: 'Council meeting rescheduled', body: 'The meeting date has changed. Please check the calendar for details.' } },
  { label: 'Farmers Market this Saturday', draft: { level: 'info', title: 'Farmers Market this Saturday', body: 'Visit downtown this Saturday for local produce and handmade goods.' } },
]
const levelCopy: Record<AlertLevel, string> = { emergency: 'Boil water, road closures, severe weather. Cannot be dismissed.', notice: 'Office closures and schedule changes.', info: 'General announcements.' }
const comingAdmin = [
  { label: 'News', icon: Newspaper }, { label: 'Meetings & agendas', icon: Users }, { label: 'Bids & RFPs', icon: FileText }, { label: 'Events', icon: CalendarClock }, { label: 'Jobs', icon: BriefcaseBusiness },
]
function etInput(date: string) {
  let parts
  try {
    parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(date))
  } catch {
    parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(new Date(date))
  }
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`
}
function etToISO(value: string) {
  const [datePart, timePart] = value.split('T')
  const [year, month, day] = datePart.split('-').map(Number)
  const [hour, minute] = timePart.split(':').map(Number)
  const wallTimeAsUtc = Date.UTC(year, month - 1, day, hour, minute)
  let offsetLabel
  try {
    offsetLabel = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', timeZoneName: 'shortOffset' }).formatToParts(new Date(wallTimeAsUtc)).find((part) => part.type === 'timeZoneName')?.value
  } catch {
    offsetLabel = undefined
  }
  offsetLabel ??= 'GMT-5'
  const match = offsetLabel.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/) 
  const offsetMinutes = match ? (match[1] === '+' ? 1 : -1) * (Number(match[2]) * 60 + Number(match[3] ?? 0)) : -300
  return new Date(wallTimeAsUtc - offsetMinutes * 60_000).toISOString()
}
function blankDraft(): Draft {
  const now = new Date().toISOString()
  return { level: 'notice', title: '', body: '', linkLabel: '', linkHref: '', startsAt: etInput(now), endsAt: '', active: true }
}
function toDraft(alert: SiteAlert): Draft {
  return { level: alert.level, title: alert.title, body: alert.body, linkLabel: alert.link?.label ?? '', linkHref: alert.link?.href ?? '', startsAt: etInput(alert.startsAt), endsAt: alert.endsAt ? etInput(alert.endsAt) : '', active: alert.active }
}
function dateLabel(value?: string) {
  if (!value) return '—'
  try {
    return new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', dateStyle: 'medium', timeStyle: 'short', timeZoneName: 'short' }).format(new Date(value))
  } catch {
    return new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
  }
}

export function AdminDashboard({ staffName }: { staffName: string }) {
  const { data: alertData, mutate: mutateAlert } = useSWR<{ alert: SiteAlert; isLive: boolean }>('/api/admin/alert', fetcher, { refreshInterval: 20_000 })
  const { data: historyData, mutate: mutateHistory } = useSWR<{ history: AlertAuditEntry[] }>('/api/admin/alert/history', fetcher, { refreshInterval: 30_000 })
  const [draft, setDraft] = useState<Draft>(() => blankDraft())
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const errorSummaryRef = useRef<HTMLDivElement>(null)
  const alert = alertData?.alert
  const history = historyData?.history ?? []
  const isLive = alertData?.isLive ?? false
  const isScheduled = Boolean(alert?.active && alert.startsAt && Date.parse(alert.startsAt) > Date.now())
  const statusText = isLive && alert ? `Live now — ${alert.level[0].toUpperCase()}${alert.level.slice(1)}: ${alert.title}` : isScheduled && alert ? `Scheduled — starts ${dateLabel(alert.startsAt)}` : alert?.active ? 'Expired' : 'No alert showing'
  const actionLabel = useMemo(() => draft.startsAt && Date.parse(etToISO(draft.startsAt)) > Date.now() ? 'Schedule' : 'Publish now', [draft.startsAt])

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [key]: value }))
    setFieldErrors((current) => ({ ...current, [key]: '' }))
  }

  async function publish(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setMessage('')
    setFieldErrors({})
    if (draft.level === 'emergency' && !window.confirm('This will show a red emergency banner on every page and cannot be dismissed by visitors. Publish?')) return
    setSaving(true)
    try {
      const response = await fetch('/api/admin/alert', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...draft, startsAt: etToISO(draft.startsAt), endsAt: draft.endsAt ? etToISO(draft.endsAt) : '' }) })
      const result = await response.json()
      if (!response.ok) {
        setError(result.error ?? 'We could not save the alert.')
        window.requestAnimationFrame(() => errorSummaryRef.current?.focus())
        const flattened = result.issues?.fieldErrors
        if (flattened) setFieldErrors(Object.fromEntries(Object.entries(flattened).map(([key, values]) => [key, Array.isArray(values) ? values[0] : ''])))
        return
      }
      await Promise.all([mutateAlert(), mutateHistory()])
      setEditing(false)
      setMessage(result.action === 'scheduled' ? 'Scheduled. It will appear on the website at the selected time.' : 'Published. It is live on the website now.')
    } catch {
      setError('We could not save the alert. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function toggleAlert() {
    if (!alert) return
    const active = !alert.active
    if (!active && !window.confirm('Remove the alert from the website?')) return
    setError('')
    const response = await fetch('/api/admin/alert', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active }) })
    const result = await response.json()
    if (!response.ok) setError(result.error ?? 'We could not update the alert.')
    else {
      await Promise.all([mutateAlert(), mutateHistory()])
      setMessage(active ? 'Alert turned on.' : 'Alert removed from the website.')
    }
  }

  async function signOut() {
    await fetch('/api/admin/logout', { method: 'POST' })
    window.location.assign('/admin/login?message=signed-out')
  }

  const preview = { ...draft, id: 'admin-preview', startsAt: draft.startsAt ? etToISO(draft.startsAt) : new Date().toISOString(), endsAt: draft.endsAt ? etToISO(draft.endsAt) : undefined, updatedBy: staffName, updatedAt: new Date().toISOString(), link: draft.linkLabel && draft.linkHref ? { label: draft.linkLabel, href: draft.linkHref } : undefined, isSample: false }

  return <div className="admin-page">
    <header className="admin-topbar"><Link href="/" className="admin-wordmark"><span className="admin-seal"><ShieldCheck size={20}/></span><span><strong>Town of Chilhowie</strong><small>Staff dashboard</small></span></Link><div className="admin-top-actions"><span>{staffName}</span><Link href="/" target="_blank">View website <ExternalLink size={14}/><span className="sr-only"> (opens in new tab)</span></Link><button type="button" onClick={signOut}><LogOut size={15}/> Sign out</button></div></header>
    <div className="admin-layout"><aside className="admin-sidebar" aria-label="Dashboard sections"><p className="admin-nav-label">CONTENT</p><a className="admin-nav-active" href="#site-alert"><BellRing size={17}/> Site alert</a>{comingAdmin.map(({ label, icon: Icon }) => <span className="admin-nav-disabled" key={label}><Icon size={16}/>{label}<small>Coming in full build</small></span>)}</aside>
      <main id="main" className="admin-main"><div className="admin-page-heading"><div><p className="admin-kicker">TOWN OF CHILHOWIE · DEMO ADMIN</p><h1>Site alert</h1><p>Publish a clear, timely notice across the town website.</p></div><Link className="admin-view-link" href="/" target="_blank">View website <ArrowUpRight size={16}/><span className="sr-only"> (opens in new tab)</span></Link></div>
        <div className="admin-tip"><span className="admin-tip-icon"><Info size={18}/></span><p><strong>Try it:</strong> open the website in another window, publish a change here, and watch the banner update within about 20 seconds — no refresh needed.</p></div>
        <div role="status">{(message || error) && <div className={error ? 'admin-feedback is-error' : 'admin-feedback'}>{error || message}</div>}</div>
        <section className="admin-status-card" id="site-alert" aria-labelledby="alert-status-heading"><div><div className="admin-status-label"><span className={isLive ? 'admin-status-dot live' : 'admin-status-dot'}/>{isLive ? 'LIVE NOW' : isScheduled ? 'SCHEDULED' : alert?.active ? 'EXPIRED' : 'NO ALERT SHOWING'}</div><h2 id="alert-status-heading">{statusText}</h2><p>Last changed by {alert?.updatedBy ?? '—'} · {dateLabel(alert?.updatedAt)}</p></div><div className="admin-status-actions"><button type="button" className="admin-secondary" onClick={() => { setDraft(alert ? toDraft(alert) : blankDraft()); setEditing(true); setMessage(''); setError('') }}>Edit</button><button type="button" className="admin-secondary" onClick={toggleAlert}>{alert?.active ? 'Turn off' : 'Turn on'}</button></div></section>
        {editing && <form className="admin-editor" onSubmit={publish} noValidate>
          <div className="admin-editor-heading"><div><p className="admin-kicker">ALERT EDITOR</p><h2>{alert ? 'Edit site alert' : 'Create site alert'}</h2></div><button type="button" className="admin-text-button" onClick={() => { setEditing(false); setFieldErrors({}) }}>Cancel</button></div>
          {error && <div ref={errorSummaryRef} className="admin-error-summary" role="alert" tabIndex={-1}><strong>There is a problem with this alert.</strong><p>{error}</p></div>}
          <AlertDrafter onDraft={(patch) => { setDraft((current) => ({ ...current, ...patch, active: true })); setFieldErrors({}) }}/>
          <div className="admin-templates"><span>Quick templates</span>{quickTemplates.map((template) => <button key={template.label} type="button" onClick={() => { setDraft((current) => ({ ...current, ...template.draft })); setFieldErrors({}) }}>{template.label}</button>)}</div>
          <fieldset className="admin-fieldset"><legend>Alert type</legend><div className="admin-level-options">{(['emergency', 'notice', 'info'] as const).map((level) => <label key={level} className={`admin-level-card level-${level} ${draft.level === level ? 'selected' : ''}`}><input type="radio" name="level" value={level} checked={draft.level === level} onChange={() => update('level', level)}/><span>{level === 'emergency' ? <CircleAlert size={19}/> : level === 'notice' ? <BellRing size={19}/> : <Info size={19}/>}<strong>{level[0].toUpperCase() + level.slice(1)}</strong></span><small>{levelCopy[level]}</small></label>)}</div></fieldset>
          <div className="admin-field"><label htmlFor="alert-title">Headline <span>Required · plain text</span></label><input id="alert-title" value={draft.title} maxLength={80} onChange={(event) => update('title', event.target.value)} aria-invalid={Boolean(fieldErrors.title)} aria-describedby={fieldErrors.title ? 'title-error title-count' : 'title-count'} required/><div className="admin-field-meta">{fieldErrors.title ? <span id="title-error" className="field-error">{fieldErrors.title}</span> : <span/>}<small id="title-count">{draft.title.length}/80</small></div></div>
          <div className="admin-field"><label htmlFor="alert-body">Details <span>Optional · plain text</span></label><textarea id="alert-body" rows={3} maxLength={240} value={draft.body} onChange={(event) => update('body', event.target.value)} aria-invalid={Boolean(fieldErrors.body)} aria-describedby={fieldErrors.body ? 'body-error body-count' : 'body-count'}/><div className="admin-field-meta">{fieldErrors.body ? <span id="body-error" className="field-error">{fieldErrors.body}</span> : <span/>}<small id="body-count">{draft.body.length}/240</small></div></div>
          <div className="admin-two-fields"><div className="admin-field"><label htmlFor="alert-link-label">Link label <span>Optional</span></label><input id="alert-link-label" value={draft.linkLabel} maxLength={60} onChange={(event) => update('linkLabel', event.target.value)} aria-invalid={Boolean(fieldErrors.linkLabel)} aria-describedby={fieldErrors.linkLabel ? 'link-label-error' : undefined}/>{fieldErrors.linkLabel && <span className="field-error" id="link-label-error">{fieldErrors.linkLabel}</span>}</div><div className="admin-field"><label htmlFor="alert-link-href">Link destination <span>/path or https://…</span></label><input id="alert-link-href" value={draft.linkHref} maxLength={2048} onChange={(event) => update('linkHref', event.target.value)} aria-invalid={Boolean(fieldErrors.linkHref)} aria-describedby={fieldErrors.linkHref ? 'link-href-error' : undefined}/>{fieldErrors.linkHref && <span className="field-error" id="link-href-error">{fieldErrors.linkHref}</span>}</div></div>
          <div className="admin-two-fields"><div className="admin-field"><label htmlFor="alert-start">Show from <span>Eastern Time (ET)</span></label><input id="alert-start" type="datetime-local" value={draft.startsAt} onChange={(event) => update('startsAt', event.target.value)} aria-invalid={Boolean(fieldErrors.startsAt)} aria-describedby={fieldErrors.startsAt ? 'start-error' : undefined} required/>{fieldErrors.startsAt && <span className="field-error" id="start-error">{fieldErrors.startsAt}</span>}</div><div className="admin-field"><label htmlFor="alert-end">Remove automatically <span>Optional · Eastern Time (ET)</span></label><input id="alert-end" type="datetime-local" value={draft.endsAt} onChange={(event) => update('endsAt', event.target.value)} aria-invalid={Boolean(fieldErrors.endsAt)} aria-describedby={fieldErrors.endsAt ? 'end-error' : undefined}/>{fieldErrors.endsAt && <span className="field-error" id="end-error">{fieldErrors.endsAt}</span>}</div></div>
          <label className="admin-switch-row"><input type="checkbox" checked={draft.active} onChange={(event) => update('active', event.target.checked)}/><span><strong>Show on website</strong><small>Turn this off to keep the alert saved but hidden.</small></span></label>
          <div className="admin-preview"><p>Preview — this is how it will look on the website.</p><AlertPreview alert={preview}/></div>
          <div className="admin-form-actions"><button className="admin-primary" type="submit" disabled={saving}>{saving ? 'Saving…' : actionLabel}</button><button type="button" className="admin-secondary" onClick={() => setEditing(false)}>Cancel</button></div>
        </form>}
        <section className="admin-history" aria-labelledby="history-heading"><div className="admin-section-heading"><div><p className="admin-kicker">AUDIT TRAIL</p><h2 id="history-heading">Change history</h2></div><span>Last 20 entries</span></div><p className="admin-muted">Every change is recorded so the Town knows who changed what and when.</p>{history.length ? <div className="admin-table-scroll"><table><thead><tr><th>When (ET)</th><th>Who</th><th>Action</th><th>Alert</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{history.map((entry, index) => <tr key={`${entry.at}-${index}`}><td>{dateLabel(entry.at)}</td><td>{entry.by}</td><td><span className={`admin-action-badge action-${entry.snapshot.level}`}>{entry.action.replaceAll('-', ' ')}</span></td><td><span className="history-title">{entry.snapshot.title}</span></td><td><button type="button" className="admin-text-button" onClick={() => { setDraft(toDraft(entry.snapshot)); setEditing(true); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>Use again</button></td></tr>)}</tbody></table></div> : <div className="admin-empty"><Check size={18}/> Alert changes will appear here.</div>}</section>
        <p className="admin-demo-footer">Demo environment — the alert resets to the default every night.</p>
      </main>
    </div>
  </div>
}

function AlertPreview({ alert }: { alert: SiteAlert }) {
  const Icon = alert.level === 'emergency' ? CircleAlert : alert.level === 'info' ? Info : BellRing
  return <section className={`site-alert alert-${alert.level} admin-alert-preview`} aria-label="Site alert preview"><div className="site-alert-inner"><span className="site-alert-icon"><Icon size={19}/></span><div className="site-alert-copy"><span className="site-alert-level">{alert.level}{alert.isSample ? ' · Sample alert' : ''}</span><strong>{alert.title || 'Your alert headline'}</strong>{alert.body && <p>{alert.body}</p>}{alert.link && <a className="site-alert-link" href={alert.link.href}>Read the full notice →</a>}</div>{alert.level !== 'emergency' && <span className="admin-preview-dismiss" aria-hidden="true">×</span>}</div></section>
}
