import type { SiteAlert } from '@/lib/alert-types'

export const fallbackAlert: SiteAlert = {
  id: 'chilhowie-sample-notice',
  level: 'notice',
  title: 'Town Hall closes at noon Wednesday, Nov 25',
  body: 'Offices reopen Monday, Nov 30.',
  active: true,
  startsAt: '2026-11-19T00:00:00.000Z',
  updatedBy: 'Town Clerk (demo)',
  updatedAt: '2026-11-19T00:00:00.000Z',
  isSample: true,
}
