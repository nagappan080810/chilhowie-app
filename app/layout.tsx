import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import './globals.css'
import { SiteBanners } from '@/components/site-banners'
import { getLiveAlert } from '@/lib/alerts'
import { AssistantWidget } from '@/components/assistant/assistant-widget'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Town of Chilhowie, Virginia | A Lasting Impression',
  description: 'A design concept for the Town of Chilhowie, Virginia. Find town services, meetings, community events and information for residents and visitors.',
  robots: { index: false, follow: false },
  openGraph: {
    title: 'Town of Chilhowie, Virginia',
    description: 'A small town with a big sense of place. Find what you need and feel right at home.',
    type: 'website',
  },
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#1f3a4d',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const initialAlert = await getLiveAlert()
  return (
    <html lang="en">
      <body className="antialiased">
        <a className="skip-link" href="#main">Skip to main content</a>
        <SiteBanners initialAlert={initialAlert} />
        {children}
        <AssistantWidget />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
