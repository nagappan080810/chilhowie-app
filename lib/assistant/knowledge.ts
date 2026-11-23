import { plannedPages, plannedPageByPath } from '@/data/coming-soon'
import type { SiteAlert } from '@/lib/alert-types'

// Facts the assistant may use. Keep this list short and checked: the assistant is
// told to answer only from this text, so anything missing here becomes
// "please confirm with Town Hall" rather than a guess.
export const TOWN_PHONE = 'tel:+12766463232'

export const townFacts = `
TOWN OF CHILHOWIE, VIRGINIA (design concept website, sample content)
- Town Hall: 325 East Lee Highway, P.O. Box 5012, Chilhowie, VA 24319. Phone (276) 646-3232. Fax (276) 646-3012.
- Office hours are not confirmed on this concept site. Tell people to call Town Hall to confirm hours.
- Emergencies: call 911. The assistant is not monitored and cannot dispatch help.
- Town Council meets the second Thursday of each month at 7:00 PM at Town Hall. Meetings are open to the public. The next meeting is Thursday, December 10, 2026 at 7:00 PM; its agenda is posted before the meeting.
- Paying water and sewer bills: online through the Town's secure payment partner (CardX), or by phone, mail or in person at Town Hall. Page: /residents/pay-a-bill.
- Starting, stopping or transferring water service: /residents/start-stop-service.
- Reporting a non-emergency problem (water leak, streetlight, pothole): /residents/report-a-problem.
- Emergency alerts by text or email (Nixle): /residents/alerts.
- Open bids (sealed proposals due Monday, November 30, 2026 at 4:00 PM ET, by mail to P.O. Box 5012, Chilhowie, VA 24319 or hand-delivered to Town Hall): Website Design & Development RFP, IT Services RFP, Security Camera System RFP. Page: /business/bids.
- Chilhowie Community Apple Festival: held every September since 1953. Page: /visit/apple-festival.
- Jobs: /government/jobs. Meetings and agendas: /government/meetings. Public records (FOIA): /government/public-records.
`.trim()

export const permitGuide = `
BUILDING PERMITS & INSPECTIONS (page /business/permits)
- Building permits are applied for online through Cloudpermit, the Town's permit portal.
- Applicants (homeowners and contractors) use Cloudpermit's applicant sign-in. The "government" sign-in on Cloudpermit is for Town staff only. Using the staff link is a common mistake.
- In this design concept the Cloudpermit link is not connected yet; it is connected in the full website build. Until then, people can call Town Hall at (276) 646-3232.
- Typically useful to have ready (confirm exact requirements with Building Inspection): the project address, a description of the work and its estimated cost, contractor details if a contractor is used, and plans or drawings for the work.
- Whether a project needs a permit (for example a deck, fence, shed, roof, addition or electrical work) depends on the Virginia Uniform Statewide Building Code and the Town's zoning rules. Do not say a project is exempt. Say it often depends on size and type, and that Building Inspection can confirm. Zoning setbacks may apply: /business/zoning.
- Inspections are requested through Cloudpermit once a permit is issued, or by contacting Building Inspection. Exact scheduling steps are to be confirmed with the Town.
- Permit fees follow the Town's fee schedule. Never state a fee amount; say the fee schedule will be on this page and Town Hall can confirm current fees.
- Building Inspection contact listed on the current Town website: jprater@chilhowieva.gov. Town Hall phone: (276) 646-3232.
`.trim()

/** Links the assistant is allowed to offer as buttons. Anything else is dropped. */
export const allowedHrefs = new Set<string>([
  '/',
  ...plannedPages.map((page) => page.path),
  TOWN_PHONE,
  'tel:911',
  'mailto:jprater@chilhowieva.gov',
])

export function describePage(path: string) {
  if (path === '/') return 'The user is on the homepage, which has quick links to top tasks, the next Council meeting, news, events and the alert banner.'
  const page = plannedPageByPath.get(path)
  if (!page) return `The user is on ${path}.`
  return `The user is on "${page.title}" (${path}), in the ${page.section} section. Page summary: ${page.summary} In the full build this page will include: ${page.willInclude.join('; ')}.`
}

export function describeAlert(alert: SiteAlert | null) {
  if (!alert) return 'No site alert is showing on the website right now.'
  const fmt = (value?: string) => value ? new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) + ' ET' : 'no end time set'
  return `The site alert showing on every page right now (published by Town staff): level ${alert.level.toUpperCase()}; headline "${alert.title}"${alert.body ? `; details "${alert.body}"` : ''}; showing since ${fmt(alert.startsAt)}; ends ${fmt(alert.endsAt)}.${alert.link ? ` Link: ${alert.link.href}.` : ''} Treat this alert as the most current information and mention it whenever it affects the answer (for example office hours or closures).`
}

export function sanitizeActions(actions: unknown) {
  if (!Array.isArray(actions)) return []
  return actions
    .filter((action): action is { label: string; href: string } => typeof action?.label === 'string' && typeof action?.href === 'string')
    .map((action) => ({ label: action.label.replace(/\s+/g, ' ').trim().slice(0, 48), href: action.href.trim() }))
    .filter((action) => action.label && allowedHrefs.has(action.href))
    .slice(0, 3)
}
