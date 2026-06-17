import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/Navbar'

const geist = Geist({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Ritual Rollers',
  description: 'Share your journeys, discover the world.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geist.className} bg-zinc-950 text-white min-h-screen`} suppressHydrationWarning>
        <Navbar />
        <main>{children}</main>
      </body>
    </html>
  )
}
