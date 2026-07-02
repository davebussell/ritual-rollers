import type { Metadata } from 'next'
import { Bricolage_Grotesque, Geist, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/Navbar'

const bricolage = Bricolage_Grotesque({ subsets: ['latin'], variable: '--font-bricolage' })
const geist = Geist({ subsets: ['latin'], variable: '--font-geist' })
const jbmono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jbmono' })

export const metadata: Metadata = {
  title: 'Ritual Rollers — Adventures worth sharing',
  description: 'Pin your photos to the map, retrace every journey, and explore the world\'s adventures one coordinate at a time.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${bricolage.variable} ${geist.variable} ${jbmono.variable} ${geist.className} bg-zinc-950 text-white min-h-screen`} suppressHydrationWarning>
        <Navbar />
        <main>{children}</main>
      </body>
    </html>
  )
}
