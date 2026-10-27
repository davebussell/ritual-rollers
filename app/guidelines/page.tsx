import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Riding with people you meet here',
  description: 'How sessions work on Ritual Rollers, who can take part, and how to keep it good for everyone.',
  alternates: { canonical: '/guidelines' },
}

const SECTIONS: { title: string; body: React.ReactNode }[] = [
  { title: 'Sessions are public, at public spots', body: <>
    <p>A session is a post that says where and when you&apos;re riding. Anyone can read it. Meet at the spot itself, never at someone&apos;s home or car.</p>
    <p>There are no private messages. Questions go in the session&apos;s comments, where everyone can see them.</p></> },
  { title: 'Accounts are for riders 16 and over', body: <>
    <p>Anyone can browse spots, crews and sessions. To post, say you&apos;re in, comment or list yourself, you need an account, and you confirm you&apos;re 16 or older.</p>
    <p>Younger riders: crews and lessons programs are the place to start, with a parent or guardian. Many are listed under <Link href="/crews?who=kids" className="prose-link">Crews for kids</Link> and <Link href="/crews?who=families" className="prose-link">families</Link>.</p></> },
  { title: 'Keep personal details off the page', body: <>
    <p>Your profile shows the city you ride in and the spots you choose, never where you live. Don&apos;t post phone numbers, addresses or anyone else&apos;s details in sessions or comments.</p></> },
  { title: 'Ride like a local', body: <>
    <p>Take turns, call your line, and look out for newer riders. Respect DIY spots and the people who build them. At street spots, know the rules and leave the place as you found it. Wear a helmet; many parks require one.</p></> },
  { title: 'If something’s wrong, report it', body: <>
    <p>Every session and profile has a <em>Report</em> link. Reports go straight to the people who run the site, and we remove posts and accounts that break these guidelines.</p>
    <p>If someone is in danger, call 911.</p></> },
]

export default function GuidelinesPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 pt-10 sm:px-6">
      <h1 className="h-display text-[32px] sm:text-[44px]">Riding with people you meet here</h1>
      <p className="mt-4 text-[18px] leading-relaxed text-asphalt-2">
        Ritual Rollers helps riders find each other. That only works if everyone feels safe showing up, so here&apos;s how it&apos;s set up, and what we ask.
      </p>
      <div className="mt-10 space-y-10">
        {SECTIONS.map(s => (
          <section key={s.title}>
            <h2 className="h-section text-[21px]">{s.title}</h2>
            <div className="mt-3 space-y-3 text-[17px] leading-relaxed">{s.body}</div>
          </section>
        ))}
      </div>
    </div>
  )
}
