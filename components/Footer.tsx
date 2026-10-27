import Link from 'next/link'
import Wheel from '@/components/Wheel'

export default function Footer() {
  return (
    <footer className="mt-24 bg-asphalt text-flyer/80">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.3fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2.5 text-flyer">
            <Wheel size={28} />
            <span className="font-display text-lg font-semibold">Ritual Rollers</span>
          </div>
          <p className="mt-3 max-w-sm text-[15px] leading-relaxed">
            Spots to ride and people to ride with: skateboards, roller and inline skates, scooters, BMX and mountain bikes,
            across Canada, the US and Mexico.
          </p>
        </div>
        <nav aria-label="Find" className="text-[15px]">
          <p className="font-semibold text-flyer">Find</p>
          <ul className="mt-3 space-y-2">
            <li><Link className="hover:text-flyer" href="/spots">Spots</Link></li>
            <li><Link className="hover:text-flyer" href="/cities">Cities</Link></li>
            <li><Link className="hover:text-flyer" href="/ride">Ride it in 3D</Link></li>
            <li><Link className="hover:text-flyer" href="/sessions">Sessions</Link></li>
            <li><Link className="hover:text-flyer" href="/crews">Crews</Link></li>
            <li><Link className="hover:text-flyer" href="/riders">Riders</Link></li>
          </ul>
        </nav>
        <nav aria-label="Take part" className="text-[15px]">
          <p className="font-semibold text-flyer">Take part</p>
          <ul className="mt-3 space-y-2">
            <li><Link className="hover:text-flyer" href="/sessions/new">Post a session</Link></li>
            <li><Link className="hover:text-flyer" href="/crews/add">Add your crew</Link></li>
            <li><Link className="hover:text-flyer" href="/guidelines">Riding with people you meet here</Link></li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-flyer/10">
        <p className="mx-auto max-w-6xl px-4 py-5 text-[13px] text-flyer/60 sm:px-6">
          Mapped parks and map tiles © <a className="underline underline-offset-2 hover:text-flyer" href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>.
          Accounts are for riders 16 and over.
        </p>
      </div>
    </footer>
  )
}
