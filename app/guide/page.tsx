import Link from 'next/link'
import { Map, Upload, ChevronRight, Globe, Camera, Users, Heart } from 'lucide-react'
import { ACTIVITIES } from '@/lib/activities'

export default function GuidePage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">

      {/* Hero */}
      <div className="relative overflow-hidden border-b border-zinc-800">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-40 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-orange-500/8 blur-3xl" />
          <div className="absolute top-1/3 right-0 h-64 w-64 rounded-full bg-orange-600/5 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-3xl px-6 py-24 text-center">
          <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-orange-400">
            Explore the world through photos
          </p>
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl leading-tight">
            The best adventures are waiting.<br />
            <span className="text-orange-500">Someone's already been there.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-zinc-400 leading-relaxed">
            Ritual Rollers connects you with people who've stood where you want to stand —
            who've ridden those trails, surfed those breaks, and climbed those walls.
            Their photos are your invitation.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/"
              className="flex items-center gap-2 rounded-xl bg-orange-500 px-6 py-3 font-bold text-white hover:bg-orange-400 transition-all active:scale-95">
              <Globe className="h-4 w-4" /> Open the Map
            </Link>
            <Link href="/trips/new"
              className="flex items-center gap-2 rounded-xl border border-zinc-700 px-6 py-3 font-semibold text-zinc-300 hover:border-zinc-500 hover:text-white transition-all">
              <Upload className="h-4 w-4" /> Share a Trip
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-6 py-16 space-y-24">

        {/* The idea */}
        <section>
          <Overline>Why Ritual Rollers Exists</Overline>
          <h2 className="mt-3 text-3xl font-black leading-tight">
            You don't need a travel agent.<br />You need someone who's been there.
          </h2>
          <div className="mt-6 space-y-4 text-zinc-400 text-base leading-relaxed">
            <p>
              Maybe you've stared at a photo of a ridge trail at golden hour and thought: <em className="text-zinc-300">where is that, and who do I need to know to get there?</em> Or you've got a week off, a board strapped to the roof, and no idea which coast is firing right now.
            </p>
            <p>
              That's the gap we're closing. Ritual Rollers is built for people who find places through pictures — who plan trips based on one perfect shot from someone they've never met, but whose taste they trust completely.
            </p>
            <p>
              Every trip uploaded here is a data point, a proof of concept, and an open invitation. The photos are real. The GPS is real. The community is built around actually going.
            </p>
          </div>
        </section>

        {/* Activities */}
        <section>
          <Overline>Find Your People by Activity</Overline>
          <h2 className="mt-3 text-3xl font-black leading-tight">
            Filter by what moves you.
          </h2>
          <p className="mt-4 text-zinc-400 leading-relaxed">
            Every trip on Ritual Rollers is tagged with the activities that made it worth doing. Search for the people who ride the same trails, chase the same swells, or skin up the same couloirs as you.
            Finding a trip partner starts with finding your tribe.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {ACTIVITIES.map(a => (
              <div key={a.id}
                className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium"
                style={{ borderColor: `${a.color}40`, background: `${a.color}12`, color: a.color }}>
                {a.emoji} {a.label}
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-zinc-600">
            More activities on the way — suggest one in the community.
          </p>
        </section>

        {/* How to use it */}
        <section>
          <Overline>How It Works</Overline>
          <h2 className="mt-3 text-3xl font-black">Three moves. That's it.</h2>
          <div className="mt-8 space-y-0 divide-y divide-zinc-800/60">
            {[
              {
                n: '01',
                icon: <Map className="h-5 w-5" />,
                color: '#f97316',
                title: 'Browse the map like it\'s a menu',
                body: `Click into a continent, zoom to a country, and see every trip pinned to its exact location. Cluster pins mean multiple trips in one area — click to rank them by community votes. Scroll through. Screenshot what makes your stomach drop. That's your next trip.`,
                cta: { label: 'Open the map', href: '/' },
              },
              {
                n: '02',
                icon: <Users className="h-5 w-5" />,
                color: '#3b82f6',
                title: 'Find your co-pilot',
                body: `See a trip that looks like your kind of thing? Click through to the person who posted it. Follow them. Message them. Tag them as a collaborator on your next upload. This isn't just content — it's a roster of people who are actually going places and want company.`,
                cta: { label: 'Browse the feed', href: '/feed' },
              },
              {
                n: '03',
                icon: <Upload className="h-5 w-5" />,
                color: '#a855f7',
                title: 'Put your own trips on the map',
                body: `Every place you've been deserves to be on the map. Upload your photos — we pull the GPS automatically — tag the activities, credit your crew, and publish. From that moment on, someone scrolling the map in six months might find exactly what you've left behind, and decide to go.`,
                cta: { label: 'Share a trip', href: '/trips/new' },
              },
            ].map(({ n, icon, color, title, body, cta }) => (
              <div key={n} className="py-8 flex gap-6">
                <div className="shrink-0 flex flex-col items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl"
                    style={{ background: `${color}18`, color }}>
                    {icon}
                  </div>
                  <span className="text-2xl font-black text-zinc-800">{n}</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{title}</h3>
                  <p className="mt-2 text-zinc-400 leading-relaxed text-sm">{body}</p>
                  <Link href={cta.href}
                    className="mt-3 inline-flex items-center gap-1 text-sm font-semibold transition-colors"
                    style={{ color }}>
                    {cta.label} <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Earning your mark */}
        <section>
          <Overline>Leave Your Mark</Overline>
          <h2 className="mt-3 text-3xl font-black">Every trip builds your reputation.</h2>
          <p className="mt-4 text-zinc-400 leading-relaxed">
            This isn't Instagram. There are no followers-as-vanity-metrics. On Ritual Rollers, your reputation is built on where you've been and what you've done — documented, mapped, and verified by the community through upvotes.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {[
              {
                emoji: '✦',
                color: '#f97316',
                title: 'Explorer Badge',
                body: 'Publish a trip anywhere and you\'ve earned your first badge. One per region — collect all six continents and you\'re a World Traveller.',
              },
              {
                emoji: '🥇',
                color: '#eab308',
                title: 'First Explorer',
                body: 'Be the first person to add a trip to a country or region on the platform. Rare. Permanent. Yours.',
              },
              {
                emoji: '🏆',
                color: '#a855f7',
                title: 'Most Upvoted',
                body: 'Hold the #1 upvoted trip in any country. The community decides — defend your title.',
              },
              {
                emoji: '🔄',
                color: '#10b981',
                title: 'Moment Keeper',
                body: 'Recreated a legendary shot? Tag it as a recreation. If the community votes yours best, you own the badge.',
              },
            ].map(({ emoji, color, title, body }) => (
              <div key={title} className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl text-xl"
                    style={{ background: `${color}15`, border: `1.5px solid ${color}30` }}>
                    {emoji}
                  </div>
                  <h3 className="font-bold text-white">{title}</h3>
                </div>
                <p className="text-sm text-zinc-500 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Bringing people together */}
        <section>
          <Overline>Adventure Partners</Overline>
          <h2 className="mt-3 text-3xl font-black">Going solo is a choice, not a default.</h2>
          <div className="mt-6 space-y-4 text-zinc-400 leading-relaxed">
            <p>
              When you upload a trip, you can tag everyone who was with you. They get shared credit — their names appear on the trip card, they earn the same badges, and the adventure shows up on their profile too.
            </p>
            <p>
              If you're looking to join someone else's adventure, follow the people whose trips you respect. When they post something new, it surfaces in your feed — ranked not just by how recent it is, but by how much the community has already validated it, and how rare the location is.
            </p>
            <p className="text-zinc-300 font-medium">
              The right person is already out there, putting up routes and posting shots. You just need to find them.
            </p>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/feed"
              className="flex items-center gap-2 rounded-xl bg-zinc-800 px-5 py-2.5 text-sm font-semibold text-zinc-200 hover:bg-zinc-700 hover:text-white transition-all active:scale-95">
              <Heart className="h-4 w-4 text-orange-400" /> Browse the friend feed
            </Link>
            <Link href="/trips/new"
              className="flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-orange-400 transition-all active:scale-95">
              <Camera className="h-4 w-4" /> Post your first trip
            </Link>
          </div>
        </section>

        {/* Import flow */}
        <section>
          <Overline>Already Been Places</Overline>
          <h2 className="mt-3 text-3xl font-black">Your camera roll is a trip archive. Let's map it.</h2>
          <p className="mt-4 text-zinc-400 leading-relaxed">
            Drop your whole camera roll into the Import tool. We read the GPS coordinates and timestamps from every photo, automatically group them into trips by how far apart they were in time and space, and let you review before anything goes public. One import can put years of adventures on the map in minutes.
          </p>
          <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/30 p-5 text-sm text-zinc-500 space-y-2.5">
            <p className="flex items-start gap-2"><span className="text-orange-400 font-bold shrink-0">1.</span> Drop photos — we handle the sorting by date and location</p>
            <p className="flex items-start gap-2"><span className="text-orange-400 font-bold shrink-0">2.</span> Review the detected trips, rename them, tag the activities</p>
            <p className="flex items-start gap-2"><span className="text-orange-400 font-bold shrink-0">3.</span> Hit publish — every trip with GPS data pins itself to the map automatically</p>
            <p className="text-zinc-600 text-xs mt-3">Photos without GPS still publish as a trip — they just won't appear as map pins. Add a caption or location note so people know where you were.</p>
          </div>
          <Link href="/import"
            className="mt-6 inline-flex items-center gap-2 rounded-xl border border-zinc-700 px-5 py-2.5 text-sm font-semibold text-zinc-300 hover:text-white hover:border-zinc-500 transition-all">
            <Upload className="h-4 w-4" /> Go to the importer <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </section>

        {/* Closing */}
        <section className="text-center pb-8">
          <div className="rounded-3xl border border-zinc-800 bg-gradient-to-b from-zinc-900/60 to-zinc-950 px-8 py-16">
            <div className="text-5xl mb-5">🗺️</div>
            <h2 className="text-2xl font-black text-white">The map is full of blank spots.</h2>
            <p className="mt-3 text-zinc-400 max-w-md mx-auto">
              Every blank spot is a place no one's documented yet. Every photo you upload narrows that list for the next person.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/"
                className="flex items-center gap-2 rounded-xl bg-orange-500 px-6 py-3 font-bold text-white hover:bg-orange-400 transition-all active:scale-95">
                <Globe className="h-4 w-4" /> Start Exploring
              </Link>
              <Link href="/import"
                className="flex items-center gap-2 rounded-xl border border-zinc-700 px-6 py-3 font-semibold text-zinc-300 hover:text-white hover:border-zinc-500 transition-all">
                <Camera className="h-4 w-4" /> Import My Photos
              </Link>
            </div>
          </div>
        </section>

      </div>
    </div>
  )
}

function Overline({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-bold uppercase tracking-widest text-orange-500">{children}</p>
  )
}
