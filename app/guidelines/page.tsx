import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Riding with people you meet here',
  description: 'How tagging spots, friends and photos work on Ritual Rollers, who can take part, and how to keep it good for everyone.',
  alternates: { canonical: '/guidelines' },
}

const SECTIONS: { title: string; body: React.ReactNode }[] = [
  { title: 'Tag public spots, meet at the spot', body: <>
    <p>When you tag a park with the day you&apos;re riding it, everyone sees how many riders are heading there, never who. Meet at the spot itself, never at someone&apos;s home or car.</p>
    <p>There are no private messages here, on purpose.</p></> },
  { title: 'Plans are for your friends', body: <>
    <p>On any spot or park you can say you&apos;ll be there on a day. Everyone sees how many riders plan to come; only your friends see that it&apos;s you. A plan disappears after that day.</p>
    <p>Friends are riders who accepted your request, or whose request you accepted. Being friends doesn&apos;t open messages: there still aren&apos;t any. Only accept people you know or have ridden with, and remove a friend any time from their page.</p></> },
  { title: 'Accounts are for riders 16 and over', body: <>
    <p>Anyone can browse spots, crews and who&apos;s riding. To tag a spot, add friends, post photos or list yourself, you need an account, and you confirm you&apos;re 16 or older.</p>
    <p>Younger riders: crews and lessons programs are the place to start, with a parent or guardian. Many are listed under <Link href="/crews?who=kids" className="prose-link">Crews for kids</Link> and <Link href="/crews?who=families" className="prose-link">families</Link>.</p></> },
  { title: 'Photos: yours, and with people’s OK', body: <>
    <p>Only post photos you took. Anyone you can recognise has to be OK with being posted, and no photos of kids without their parent&apos;s say-so. Photos are shrunk and the camera&apos;s location data is removed before they&apos;re stored. Every photo has a report link, and you can delete yours any time.</p>
    <p>The other photos on the site are ones their photographers have shared openly (public domain or Creative Commons), each credited with a link to where it came from. If one of them is you and you&apos;d like it down, report it and it comes down.</p></> },
  { title: 'Keep personal details off the page', body: <>
    <p>Your profile shows the city you ride in and the spots you choose, never where you live. Don&apos;t post phone numbers, addresses or anyone else&apos;s details in captions or notes.</p></> },
  { title: 'Ride like a local', body: <>
    <p>Take turns, call your line, and look out for newer riders. Respect DIY spots and the people who build them. At street spots, know the rules and leave the place as you found it. Wear a helmet; many parks require one.</p></> },
  { title: 'If something’s wrong, report it', body: <>
    <p>Every photo and profile has a <em>Report</em> link. Reports go straight to the people who run the site, and we remove posts and accounts that break these guidelines.</p>
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
