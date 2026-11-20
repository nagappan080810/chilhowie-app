import { z } from 'zod'

export const alertLevels = ['emergency', 'notice', 'info'] as const
export type AlertLevel = (typeof alertLevels)[number]

export interface SiteAlert {
  id: string
  level: AlertLevel
  title: string
  body: string
  link?: { label: string; href: string }
  active: boolean
  startsAt: string
  endsAt?: string
  updatedBy: string
  updatedAt: string
  isSample?: boolean
}

export interface AlertAuditEntry {
  at: string
  by: string
  action: 'published' | 'updated' | 'unpublished' | 'scheduled' | 'reset-by-system'
  snapshot: SiteAlert
}

const safeText = (value: string) => value.replace(/<[^>]*>/g, '').replace(/[#*_`~]/g, '').replace(/\s+/g, ' ').trim()

export const alertInputSchema = z.object({
  level: z.enum(alertLevels),
  title: z.string().transform(safeText).pipe(z.string().min(5).max(80)),
  body: z.string().optional().default('').transform(safeText).pipe(z.string().max(240)),
  linkLabel: z.string().optional().default('').transform(safeText).pipe(z.string().max(60)),
  linkHref: z.string().trim().max(2048).optional().default(''),
  active: z.boolean().default(true),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime().optional().or(z.literal('')),
}).superRefine((value, ctx) => {
  if (Boolean(value.linkLabel) !== Boolean(value.linkHref)) {
    ctx.addIssue({ code: 'custom', message: 'Enter both a link label and destination.', path: ['linkHref'] })
  }
  const localPath = value.linkHref.startsWith('/') && !value.linkHref.startsWith('//') && !value.linkHref.includes(String.fromCharCode(92))
  const secureExternalUrl = value.linkHref.startsWith('https://') && (() => { try { return new URL(value.linkHref).protocol === 'https:' } catch { return false } })()
  if (value.linkHref && !localPath && !secureExternalUrl) {
    ctx.addIssue({ code: 'custom', message: 'Links must be a local path or an https:// URL.', path: ['linkHref'] })
  }
  if (value.endsAt && new Date(value.endsAt) <= new Date(value.startsAt)) {
    ctx.addIssue({ code: 'custom', message: 'Choose a removal time after the start time.', path: ['endsAt'] })
  }
})

export function isAlertLive(alert: SiteAlert | null | undefined, now = new Date()): alert is SiteAlert {
  return Boolean(alert?.active && new Date(alert.startsAt) <= now && (!alert.endsAt || new Date(alert.endsAt) > now))
}
