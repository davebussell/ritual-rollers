import Script from 'next/script'
import type { Metadata } from 'next'
import { Bricolage_Grotesque, Geist, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/Navbar'

const bricolage = Bricolage_Grotesque({ subsets: ['latin'], variable: '--font-bricolage' })
const geist = Geist({ subsets: ['latin'], variable: '--font-geist' })
const jbmono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jbmono' })

export const metadata: Metadata = {
  title: 'Ritual Rollers — Adventures worth sharing',
  description: 'Ride wind, water, mountain and river with your crew — scout what\'s firing near you, roll it together, and turn the photos into a mapped story.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${bricolage.variable} ${geist.variable} ${jbmono.variable} ${geist.className} bg-zinc-950 text-white min-h-screen`} suppressHydrationWarning>
        {/* Google tag (gtag.js) — Click Shift Portfolio */}
        <Script src="https://www.googletagmanager.com/gtag/js?id=G-QK0ETT28BD" strategy="afterInteractive" />
        <Script id="ga4-portfolio" strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: `
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-QK0ETT28BD');
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
