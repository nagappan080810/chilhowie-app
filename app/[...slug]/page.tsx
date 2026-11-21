import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowRight, CalendarDays, Check, Droplets, TriangleAlert, BellRing, Landmark } from 'lucide-react'
import { plannedPages, plannedPageByPath } from '@/data/coming-soon'
import { SiteChrome } from '@/components/site-chrome'

export const dynamicParams = true

export function generateStaticParams() {
  return plannedPages.map(({ path }) => ({ slug: path.slice(1).split('/') }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string[] }> }): Promise<Metadata> {
  const { slug } = await params
  const path = `/${slug.join('/')}`
  const page = plannedPageByPath.get(path)
  return page ? { title: `${page.title} (coming soon) — Town of Chilhowie`, description: page.summary, robots: { index: false, follow: false } } : { robots: { index: false, follow: false } }
}

const popularTasks = [
  { title: 'Pay a bill', href: '/residents/pay-a-bill', icon: Droplets },
  { title: 'Report a problem', href: '/residents/report-a-problem', icon: TriangleAlert },
  { title: 'Meetings & agendas', href: '/government/meetings', icon: Landmark },
  { title: 'Get alerts', href: '/residents/alerts', icon: BellRing },
]

export default async function PlannedRoute({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params
  const path = `/${slug.join('/')}`
  if (path === '/government/news') redirect('/news')
  const page = plannedPageByPath.get(path)
  if (!page) notFound()
  if (path === '/about-this-concept') return <AboutConceptPage />
  return <SiteChrome><main id="main" className="coming-page"><div className="wrap"><nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><span>›</span><Link href={`/${page.section === 'Visit Chilhowie' ? 'visit' : page.section.toLowerCase()}`}>{page.section}</Link><span>›</span><span aria-current="page" lang={page.titleLang}>{page.title}</span></nav><div className="coming-hero"><div className="coming-copy"><span className="coming-pill"><CalendarDays size={15}/> Coming in the full website</span><p className="eyebrow"><span/> {page.section.toUpperCase()}</p><h1 lang={page.titleLang}>{page.title}</h1><p className="coming-lead">{page.summary}</p><p className="coming-intro">This page is part of the full website build. The information and tools below outline what Town residents can expect.</p></div><svg className="coming-ridge" viewBox="0 0 520 200" aria-hidden="true" focusable="false"><path d="M4 162 79 103l47 33 91-85 57 60 51-35 71 69 52-44 68 60" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/><path d="M5 180h510" fill="none" stroke="currentColor" strokeWidth="2" opacity=".45"/></svg></div><div className="coming-grid"><section className="coming-card" aria-labelledby="include-title"><p className="eyebrow"><span/> THE FULL BUILD</p><h2 id="include-title">What this page will include</h2><ul className="coming-checklist">{page.willInclude.map((item) => <li key={item}><Check size={17}/><span>{item}</span></li>)}</ul></section><section className="coming-card need-card" aria-labelledby="need-title"><p className="eyebrow"><span/> HERE TO HELP</p><h2 id="need-title">Need this today?</h2><p>These Town resources can help right now.</p><ul>{page.meanwhile.map((item) => <li key={item.href}><Link href={item.href}>{item.label}<ArrowRight size={15}/></Link></li>)}<li><a href="tel:+12766463232">Call Town Hall: (276) 646-3232<ArrowRight size={15}/></a></li></ul><small>Office hours: [confirm with Town]</small></section></div><section className="coming-popular" aria-labelledby="popular-title"><div className="section-head"><div><p className="eyebrow"><span/> QUICK LINKS</p><h2 id="popular-title">Popular right now</h2></div><Link className="text-link" href="/residents">All resident services <ArrowRight size={15}/></Link></div><div className="task-grid">{popularTasks.map(({ title, href, icon: Icon }, index) => <Link className="task-card" href={href} key={href}><span className={`task-icon icon-${index}`}><Icon size={20}/></span><span className="task-text"><strong>{title}</strong><small>Town of Chilhowie service</small></span><ArrowRight className="task-arrow" size={15}/></Link>)}</div></section><div className="coming-back"><Link href="/" className="text-link">← Back to the homepage</Link></div></div></main></SiteChrome>
}

function AboutConceptPage() {
  return <SiteChrome><main id="main" className="coming-page about-concept-page"><div className="wrap"><nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><span>›</span><span aria-current="page">About this concept</span></nav><p className="eyebrow"><span/> A THOUGHTFUL DIGITAL FRONT DOOR</p><h1>About this concept</h1><p className="coming-lead">A clear, welcoming website can make it easier to find services, follow local decisions and feel connected to Chilhowie.</p><div className="about-comparison"><h2>What we found → How this design fixes it</h2><div className="about-row"><strong>Staff depend on a developer to post urgent notices.</strong><p>The staff dashboard lets an authorized staff member preview, schedule and publish site-wide alerts, with a change log and automatic expiry.</p></div><div className="about-row"><strong>Dead links and empty menu items.</strong><p>Planned sections have useful coming-soon pages, and unknown URLs get a friendly page with search and common tasks.</p></div></div><section className="coming-card about-demo"><p className="eyebrow"><span/> SEE STAFF EDITING IN ACTION</p><h2>Make a change. See it go live.</h2><p>Use the demo sign-in provided in the proposal at <Link href="/admin/login">/admin/login</Link>. Change the alert and watch the homepage update. In the full build, news, meetings, bids, events, jobs, documents and staff pages are managed the same way.</p><p className="about-production"><strong>Production note:</strong> This demo stores the alert in a managed Redis database for speed. The full build uses the content management system proposed in the response, with named staff accounts, editor and publisher roles, two-factor sign-in and the same audit trail.</p><Link className="button-light about-admin-link" href="/admin/login">Open staff sign-in <ArrowRight size={15}/></Link></section><Link className="text-link" href="/">← Back to the homepage</Link></div></main></SiteChrome>
}
