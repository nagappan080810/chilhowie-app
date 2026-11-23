'use client'

import { useEffect, useId, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowRight, ArrowUp, MessageCircle, Phone, Sparkles, X } from 'lucide-react'
import { assistantPageFor } from '@/lib/assistant/pages'

type Action = { label: string; href: string }
type Message =
  | { kind: 'user'; content: string }
  | { kind: 'assistant'; content: string; actions?: Action[] }
  | { kind: 'context'; content: string }
  | { kind: 'error'; content: string }

const STORAGE_KEY = 'chilhowie-assistant:v1'

function loadMessages(): Message[] {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Message[]).slice(-30) : []
  } catch {
    return []
  }
}

function AnswerText({ text }: { text: string }) {
  const blocks: Array<{ type: 'p'; text: string } | { type: 'ul'; items: string[] }> = []
  for (const line of text.split('\n').map((value) => value.trim()).filter(Boolean)) {
    const item = line.match(/^[-•*]\s+(.*)$/) ?? line.match(/^\d+[.)]\s+(.*)$/)
    const last = blocks[blocks.length - 1]
    if (item) {
      if (last?.type === 'ul') last.items.push(item[1])
      else blocks.push({ type: 'ul', items: [item[1]] })
    } else blocks.push({ type: 'p', text: line })
  }
  return <>{blocks.map((block, index) => block.type === 'p' ? <p key={index}>{block.text}</p> : <ul key={index}>{block.items.map((item, itemIndex) => <li key={itemIndex}>{item}</li>)}</ul>)}</>
}

function ActionLink({ action, onNavigate }: { action: Action; onNavigate: () => void }) {
  const external = !action.href.startsWith('/')
  const Icon = action.href.startsWith('tel:') ? Phone : ArrowRight
  return external
    ? <a className="assistant-action" href={action.href}>{action.label}<Icon size={14} aria-hidden="true"/></a>
    : <Link className="assistant-action" href={action.href} onClick={onNavigate}>{action.label}<Icon size={14} aria-hidden="true"/></Link>
}

export function AssistantWidget() {
  const pathname = usePathname()
  const page = assistantPageFor(pathname)
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const lastPath = useRef<string | null>(null)
  const launcherRef = useRef<HTMLButtonElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const titleId = useId()

  useEffect(() => { setMessages(loadMessages()) }, [])
  useEffect(() => {
    try { window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-30))) } catch { /* storage unavailable */ }
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  // Screen awareness: when the visitor moves to another page mid-conversation, note it in the thread.
  useEffect(() => {
    if (!page) return
    if (lastPath.current && lastPath.current !== page.path) {
      setMessages((current) => current.some((message) => message.kind !== 'context') ? [...current, { kind: 'context', content: `You’re now on ${page.title}` }] : current)
    }
    lastPath.current = page.path
  }, [page?.path, page?.title])

  useEffect(() => { if (open) inputRef.current?.focus() }, [open])

  if (!page) return null

  function close() {
    setOpen(false)
    window.requestAnimationFrame(() => launcherRef.current?.focus())
  }

  async function ask(question: string) {
    const text = question.trim().slice(0, 600)
    if (!text || busy || !page) return
    const next: Message[] = [...messages, { kind: 'user', content: text }]
    setMessages(next)
    setInput('')
    setBusy(true)
    const history = next
      .filter((message): message is Extract<Message, { kind: 'user' | 'assistant' }> => message.kind === 'user' || message.kind === 'assistant')
      .slice(-10)
      .map((message) => ({ role: message.kind, content: message.content }))
    try {
      const response = await fetch('/api/assistant', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: page.path, messages: history }) })
      const result = await response.json().catch(() => ({}))
      if (!response.ok || typeof result.answer !== 'string') throw new Error(result.error ?? 'The assistant is not available right now. Please call Town Hall at (276) 646-3232.')
      setMessages((current) => [...current, { kind: 'assistant', content: result.answer, actions: result.actions ?? [] }])
    } catch (error) {
      setMessages((current) => [...current, { kind: 'error', content: error instanceof Error ? error.message : 'Something went wrong.' }])
    } finally {
      setBusy(false)
      window.requestAnimationFrame(() => inputRef.current?.focus())
    }
  }

  const conversation = messages.filter((message) => message.kind !== 'context')

  return <div className="assistant-root">
    {!open && <button ref={launcherRef} type="button" className="assistant-launcher" aria-haspopup="dialog" aria-expanded={false} onClick={() => setOpen(true)}>
      <MessageCircle size={20} aria-hidden="true"/><span>Ask Chilhowie</span>
    </button>}
    {open && <section className="assistant-panel" role="dialog" aria-modal="false" aria-labelledby={titleId} onKeyDown={(event) => { if (event.key === 'Escape') close() }}>
      <header className="assistant-header">
        <span className="assistant-badge" aria-hidden="true"><Sparkles size={17}/></span>
        <div><h2 id={titleId}>Ask Chilhowie</h2><p>AI assistant · {page.title}</p></div>
        <button type="button" className="assistant-close" aria-label="Close assistant" onClick={close}><X size={18}/></button>
      </header>
      <div className="assistant-messages" ref={listRef} aria-live="polite" aria-busy={busy}>
        {!conversation.length && <div className="assistant-msg assistant-msg-bot"><p>{page.greeting}</p></div>}
        {messages.map((message, index) => {
          if (message.kind === 'context') return <p key={index} className="assistant-context">{message.content}</p>
          if (message.kind === 'user') return <div key={index} className="assistant-msg assistant-msg-user"><span className="sr-only">You said: </span><p>{message.content}</p></div>
          if (message.kind === 'error') return <div key={index} className="assistant-msg assistant-msg-error" role="alert"><p>{message.content}</p></div>
          return <div key={index} className="assistant-msg assistant-msg-bot"><span className="sr-only">Assistant: </span><AnswerText text={message.content}/>{message.actions?.length ? <div className="assistant-actions">{message.actions.map((action) => <ActionLink key={action.href} action={action} onNavigate={() => undefined}/>)}</div> : null}</div>
        })}
        {busy && <div className="assistant-msg assistant-msg-bot assistant-typing"><span className="sr-only">Checking Town information…</span><i/><i/><i/></div>}
      </div>
      {!conversation.length && <div className="assistant-suggestions" aria-label="Suggested questions" role="group">{page.suggestions.map((suggestion) => <button key={suggestion} type="button" onClick={() => ask(suggestion)} disabled={busy}>{suggestion}</button>)}</div>}
      <form className="assistant-form" onSubmit={(event) => { event.preventDefault(); void ask(input) }}>
        <label htmlFor="assistant-input" className="sr-only">Ask a question about Town services</label>
        <textarea id="assistant-input" ref={inputRef} rows={1} maxLength={600} value={input} placeholder="Ask a question…" onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void ask(input) } }}/>
        <button type="submit" aria-label="Send question" disabled={busy || !input.trim()}><ArrowUp size={18}/></button>
      </form>
      <p className="assistant-disclaimer">Answers come from Town website content and can be wrong. Check with Town Hall before you act. In an emergency, call 911.</p>
    </section>}
  </div>
}
