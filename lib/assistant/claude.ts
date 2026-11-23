
const API_URL = `${process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com'}/v1/messages`
const DEFAULT_MODEL = 'claude-haiku-5-5'

export type ChatTurn = { role: 'user' | 'assistant'; content: string }

export class AssistantUnavailableError extends Error {}

export function assistantConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY)
}

/**
 * Calls the Claude Messages API and forces a single tool call, so the reply
 * always comes back as structured JSON that the server can validate.
 * The API key is read on the server only and never reaches the browser.
 */
export async function callClaudeTool<T>({ system, messages, tool, maxTokens = 700 }: {
  system: string
  messages: ChatTurn[]
  tool: { name: string; description: string; input_schema: Record<string, unknown> }
  maxTokens?: number
}): Promise<T> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new AssistantUnavailableError('ANTHROPIC_API_KEY is not set.')

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 25_000)
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || DEFAULT_MODEL,
        max_tokens: maxTokens,
        system,
        messages,
        tools: [tool],
        tool_choice: { type: 'tool', name: tool.name },
      }),
    })
    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      console.warn('[assistant] Claude API error', response.status, detail.slice(0, 300))
      throw new AssistantUnavailableError(`Claude API returned ${response.status}.`)
    }
    const data = await response.json() as { content?: Array<{ type: string; name?: string; input?: unknown }> }
    const block = data.content?.find((item) => item.type === 'tool_use' && item.name === tool.name)
    if (!block?.input) throw new AssistantUnavailableError('Claude did not return a structured answer.')
    return block.input as T
  } catch (error) {
    if (error instanceof AssistantUnavailableError) throw error
    console.warn('[assistant] Claude request failed', error)
    throw new AssistantUnavailableError('Claude request failed.')
  } finally {
    clearTimeout(timeout)
  }
}

export function easternNow(date = new Date()) {
  return new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', dateStyle: 'full', timeStyle: 'short' }).format(date) + ' ET'
}

/** Current Eastern time in the admin form's datetime-local format (YYYY-MM-DDTHH:mm). */
export function easternLocalInput(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date)
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '00'
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`
}
