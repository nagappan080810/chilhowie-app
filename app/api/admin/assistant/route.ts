import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAdminSession } from '@/lib/auth'
import { alertLevels } from '@/lib/alert-types'
import { AssistantUnavailableError, callClaudeTool, easternLocalInput, easternNow } from '@/lib/assistant/claude'
import { allowedHrefs } from '@/lib/assistant/knowledge'
import { checkAssistantRateLimit } from '@/lib/assistant/rate-limit'

export const dynamic = 'force-dynamic'
const noStore = { 'Cache-Control': 'no-store, max-age=0' }

const requestSchema = z.object({ request: z.string().trim().min(5).max(800) })
const etLocal = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/

const draftTool = {
  name: 'draft_site_alert',
  description: 'Fill in the Town website alert form from the staff member\'s description.',
  input_schema: {
    type: 'object',
    properties: {
      level: { type: 'string', enum: [...alertLevels], description: 'emergency = boil water, road closures, severe weather, public safety (cannot be dismissed). notice = office closures and schedule changes. info = general announcements.' },
      title: { type: 'string', description: 'Headline, 5 to 80 characters, plain text, sentence case.' },
      body: { type: 'string', description: 'Details, at most 240 characters, plain text. Say what residents should do and until when.' },
      linkLabel: { type: 'string', description: 'Optional link label, or empty string.' },
      linkHref: { type: 'string', description: 'Optional site path such as /residents/alerts, or empty string.' },
      startsAt: { type: 'string', description: 'When to start showing it, Eastern Time, format YYYY-MM-DDTHH:mm. Empty string means now.' },
      endsAt: { type: 'string', description: 'When to remove it automatically, Eastern Time, format YYYY-MM-DDTHH:mm, or empty string if no end was given.' },
      checkNotes: { type: 'string', description: 'One short sentence telling staff what to double-check (for example an assumed time or street). Empty if nothing.' },
    },
    required: ['level', 'title', 'body', 'linkLabel', 'linkHref', 'startsAt', 'endsAt', 'checkNotes'],
  },
}

const clean = (value: unknown, max: number) => typeof value === 'string' ? value.replace(/<[^>]*>/g, '').replace(/[#*_`~]/g, '').replace(/\s+/g, ' ').trim().slice(0, max) : ''

export async function POST(request: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: noStore })
  const parsed = requestSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Describe the alert in at least a few words.' }, { status: 400, headers: noStore })
  if (!await checkAssistantRateLimit(`admin:${session.sub}`, 30)) return NextResponse.json({ error: 'Too many drafts in a short time. Please wait a few minutes.' }, { status: 429, headers: noStore })

  const system = [
    'You help Town of Chilhowie, Virginia staff write the site-wide alert banner for the Town website.',
    'Turn the staff member\'s description into the alert form fields by calling draft_site_alert.',
    'Write in plain, calm, specific language for residents. Use American English. No exclamation marks, no emoji.',
    'Only use facts the staff member gave. Do not invent streets, times, phone numbers or causes. If something important is missing (such as an end time), leave the field empty and mention it in checkNotes.',
    'Resolve relative times ("until Friday 5pm", "tomorrow morning") against the current Eastern time below. If you assume a time, say so in checkNotes.',
    'Only suggest a link if it clearly helps, using one of these site paths: /residents/alerts, /residents/water-sewer, /residents/report-a-problem, /government/meetings, /contact.',
    `CURRENT EASTERN TIME: ${easternNow()}`,
  ].join('\n')

  try {
    const draft = await callClaudeTool<Record<string, unknown>>({ system, messages: [{ role: 'user', content: parsed.data.request }], tool: draftTool, maxTokens: 500 })
    const level = alertLevels.includes(draft.level as never) ? draft.level as typeof alertLevels[number] : 'notice'
    const linkHref = clean(draft.linkHref, 200)
    const linkLabel = clean(draft.linkLabel, 60)
    const validLink = Boolean(linkHref && linkLabel && linkHref.startsWith('/') && allowedHrefs.has(linkHref))
    const startsAt = typeof draft.startsAt === 'string' && etLocal.test(draft.startsAt) ? draft.startsAt : easternLocalInput()
    const endsAt = typeof draft.endsAt === 'string' && etLocal.test(draft.endsAt) ? draft.endsAt : ''
    return NextResponse.json({
      draft: {
        level,
        title: clean(draft.title, 80),
        body: clean(draft.body, 240),
        linkLabel: validLink ? linkLabel : '',
        linkHref: validLink ? linkHref : '',
        startsAt,
        endsAt,
      },
      checkNotes: clean(draft.checkNotes, 240),
    }, { headers: noStore })
  } catch (error) {
    const status = error instanceof AssistantUnavailableError ? 503 : 500
    return NextResponse.json({ error: 'The AI drafting assistant is not available right now. You can still fill in the form yourself.' }, { status, headers: noStore })
  }
}
