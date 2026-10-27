import Script from 'next/script'
import type { Metadata } from 'next'
import { Barlow_Condensed, Work_Sans } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/Navbar'

const barlow = Barlow_Condensed({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--font-barlow' })
const work = Work_Sans({ subsets: ['latin'], variable: '--font-work' })

const SITE_URL = 'https://ritualrollers.com'
const TITLE = 'Ritual Rollers — Is it dry? Skateparks, pump tracks & bike parks'
const DESCRIPTION = 'Anything on wheels across Canada, the US and Mexico: skateparks, plazas, DIYs, pump tracks, BMX tracks and bike parks, each with a live read of whether the ground is dry — and when it will be.'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
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
    <html lang="en">
      <body className={`${barlow.variable} ${work.variable} ${work.className} tx-canvas bg-zinc-950 text-white min-h-screen antialiased`} suppressHydrationWarning>
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
        <Navbar />
        <main>{children}</main>
      </body>
    </html>
  )
}
