'use client'

import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import type { AlertLevel } from '@/lib/alert-types'

export type DraftPatch = { level: AlertLevel; title: string; body: string; linkLabel: string; linkHref: string; startsAt: string; endsAt: string }

/** Staff describe a notice in their own words; the AI fills in the form. Nothing is published until staff press Publish. */
export function AlertDrafter({ onDraft }: { onDraft: (patch: DraftPatch) => void }) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<{ tone: 'ok' | 'error'; message: string } | null>(null)

  async function draft() {
    if (text.trim().length < 5 || busy) return
    setBusy(true)
    setStatus(null)
    try {
      const response = await fetch('/api/admin/assistant', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ request: text }) })
      const result = await response.json().catch(() => ({}))
      if (!response.ok || !result.draft) throw new Error(result.error ?? 'The AI drafting assistant is not available right now.')
      onDraft(result.draft as DraftPatch)
      setStatus({ tone: 'ok', message: `Draft filled in below. Check every field and the preview before you publish.${result.checkNotes ? ` ${result.checkNotes}` : ''}` })
    } catch (error) {
      setStatus({ tone: 'error', message: error instanceof Error ? error.message : 'Something went wrong.' })
    } finally {
      setBusy(false)
    }
  }

  return <div className="admin-ai-drafter">
    <div className="admin-ai-heading"><span className="admin-ai-icon" aria-hidden="true"><Sparkles size={17}/></span><div><strong>Draft with AI</strong><small>Describe the notice in your own words. The assistant fills in the form; you review and publish.</small></div></div>
    <div className="admin-field">
      <label htmlFor="alert-ai-request">What do residents need to know? <span>Plain text</span></label>
      <textarea id="alert-ai-request" rows={2} maxLength={800} value={text} placeholder="e.g. Boil water advisory for East Lee Highway until Friday 5pm because of a main break" onChange={(event) => setText(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) { event.preventDefault(); void draft() } }}/>
    </div>
    <div className="admin-ai-row"><button type="button" className="admin-secondary" onClick={draft} disabled={busy || text.trim().length < 5}>{busy ? 'Drafting…' : 'Fill in the form'}</button><p role="status" className={status?.tone === 'error' ? 'admin-ai-status is-error' : 'admin-ai-status'}>{status?.message ?? ''}</p></div>
  </div>
}
