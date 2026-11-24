// Client-safe page settings for the website assistant. No secrets here.

export type AssistantPage = {
  title: string
  greeting: string
  suggestions: string[]
}

/** Pages where the assistant is switched on. Add a path here to enable it elsewhere. */
export const assistantPages: Record<string, AssistantPage> = {
  '/': {
    title: 'Homepage',
    greeting: 'Hi! I can help you find Town services, check today’s notices and get to the right page.',
    suggestions: ['Is Town Hall open this week?', 'How do I pay my water bill?', 'When is the next Council meeting?', 'How do I get emergency alerts?'],
  },
  '/business/permits': {
    title: 'Building permits & inspections',
    greeting: 'You’re on Building Permits & Inspections. I can help you work out whether you need a permit and how to apply.',
    suggestions: ['Do I need a permit for a deck or fence?', 'How do I apply online?', 'Which Cloudpermit login do I use?', 'How do I book an inspection?', 'Who do I call?'],
  },
}

export function assistantPageFor(pathname: string | null | undefined) {
  if (!pathname) return null
  const clean = pathname.length > 1 ? pathname.replace(/\/$/, '') : pathname
  return assistantPages[clean] ? { path: clean, ...assistantPages[clean] } : null
}
