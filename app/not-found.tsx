'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowRight, BellRing, BriefcaseBusiness, Droplets, FileText, Landmark, Search, TriangleAlert, Waves } from 'lucide-react'
import { SiteChrome } from '@/components/site-chrome'

const commonTasks = [
  { title: 'Pay a bill', href: '/residents/pay-a-bill', icon: Droplets },
  { title: 'Report a problem', href: '/residents/report-a-problem', icon: TriangleAlert },
  { title: 'Meetings & agendas', href: '/government/meetings', icon: Landmark },
  { title: 'Get alerts', href: '/residents/alerts', icon: BellRing },
  { title: 'Start water service', href: '/residents/start-stop-service', icon: Waves },
  { title: 'Bids & RFPs', href: '/business/bids', icon: FileText },
  { title: 'Jobs', href: '/government/jobs', icon: BriefcaseBusiness },
  { title: 'Search the site', href: '/search', icon: Search },
]

export default function NotFound() {
  const pathname = usePathname() ?? ''
  const query = decodeURIComponent(pathname.split('/').filter(Boolean).join(' ').replace(/[-_]+/g, ' '))
  return <SiteChrome><main id="main" className="not-found-page"><div className="wrap"><p className="eyebrow"><span/> PAGE NOT FOUND</p><h1>We can&apos;t find that page</h1><p className="coming-lead">The link may be old or mistyped. Try searching, or pick one of these common tasks.</p><form className="not-found-search" action="/search"><label htmlFor="not-found-query">Search Chilhowie</label><div><Search size={19}/><input id="not-found-query" name="q" defaultValue={query} placeholder="Search services, meetings, news…"/><button type="submit">Search <ArrowRight size={16}/></button></div></form><section className="coming-popular" aria-labelledby="not-found-tasks"><div className="section-head"><div><p className="eyebrow"><span/> QUICK LINKS</p><h2 id="not-found-tasks">Popular right now</h2></div></div><div className="task-grid">{commonTasks.map(({ title, href, icon: Icon }, index) => <Link className="task-card" href={href} key={href}><span className={`task-icon icon-${index % 4}`}><Icon size={20}/></span><span className="task-text"><strong>{title}</strong><small>Town of Chilhowie service</small></span><ArrowRight className="task-arrow" size={15}/></Link>)}</div></section><p className="not-found-call">Still stuck? Call Town Hall at <a href="tel:+12766463232">(276) 646-3232</a>.</p><aside className="old-site-note"><strong>Coming from the old website?</strong><p>Pages have moved as part of the new design. Most old links will redirect automatically in the full build.</p></aside><Link href="/" className="text-link">← Back to the homepage</Link></div></main></SiteChrome>
}
