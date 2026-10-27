import Script from 'next/script'
import type { Metadata } from 'next'
import { Unbounded, Overpass } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

const unbounded = Unbounded({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--font-unbounded' })
const overpass = Overpass({ subsets: ['latin'], weight: ['400', '600', '700', '800'], variable: '--font-overpass' })

const SITE_URL = 'https://ritualrollers.com'
const TITLE = 'Ritual Rollers: find spots to ride and people to ride with'
const DESCRIPTION = 'Skateparks, pump tracks and bike parks across Canada, the US and Mexico, and the riders and crews who session them. Find a spot, find a session, show up.'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: TITLE, template: '%s · Ritual Rollers' },
  description: DESCRIPTION,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    url: SITE_URL,
    siteName: 'Ritual Rollers',
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: '/og-default.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['/og-default.png'],
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: 'Ritual Rollers',
      url: `${SITE_URL}/`,
      logo: `${SITE_URL}/og-default.png`,
      description: DESCRIPTION,
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      name: 'Ritual Rollers',
      url: `${SITE_URL}/`,
      inLanguage: 'en',
      publisher: { '@id': `${SITE_URL}/#organization` },
    },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${unbounded.variable} ${overpass.variable}`}>
      <body className="flex min-h-screen flex-col font-sans antialiased" suppressHydrationWarning>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        {/* GA4 (G-QK0ETT28BD). Netlify's snippet injection (ga4-portfolio) reached the old static pages but not
            the pages Next renders on request, so the tag lives here — and stands down if Netlify's copy is already
            on the page, so a view is counted once either way. Runs after the page is parsed, when an injected
            snippet would already be in the DOM. */}
        <Script id="ga4" strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: `
      (function(){
        if (document.querySelector('script[src*="googletagmanager.com/gtag/js"]')) return;
        window.dataLayer = window.dataLayer || [];
        window.gtag = window.gtag || function(){ window.dataLayer.push(arguments); };
        var s = document.createElement('script'); s.async = true;
        s.src = 'https://www.googletagmanager.com/gtag/js?id=G-QK0ETT28BD';
        document.head.appendChild(s);
        window.gtag('js', new Date()); window.gtag('config', 'G-QK0ETT28BD');
      })();
        ` }} />
        {/* Microsoft Clarity */}
        <Script id="ms-clarity" strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: `
      (function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
      })(window, document, "clarity", "script", "yjaeee242b");
        ` }} />
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-[60] focus:rounded focus:bg-curb focus:px-3 focus:py-2 focus:font-bold">Skip to content</a>
        <Navbar />
        <main id="main" className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  )
}
