/**
 * Ritual Rollers — sample data seed script
 * Run: node scripts/seed.mjs
 *
 * Needs: SUPABASE_URL and SUPABASE_SERVICE_KEY in .env.local (or set below)
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// --- config ----------------------------------------------------------------
const SUPABASE_URL = 'https://jzswsyvilydebcmtsnsq.supabase.co'
// Paste your service role key here (Settings → API → service_role secret)
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY ?? 'PASTE_SERVICE_KEY_HERE'
// ---------------------------------------------------------------------------

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// Sample users
const USERS = [
  { email: 'kai@ritualrollers.com',     password: 'password123', username: 'kaisurf',      bio: 'Chasing waves from Bali to Byron. Surf photographer & weekend nomad.' },
  { email: 'maya@ritualrollers.com',    password: 'password123', username: 'mayaonwheels', bio: 'Skateboarding every plaza from LA to Barcelona. Street art hunter.' },
  { email: 'tomasz@ritualrollers.com',  password: 'password123', username: 'tomasz_peaks',  bio: 'Alpine climber. If it has a summit I want to be on it.' },
  { email: 'priya@ritualrollers.com',   password: 'password123', username: 'priya_wanders', bio: 'Solo traveller, street food critic, accidental yogi.' },
  { email: 'luca@ritualrollers.com',    password: 'password123', username: 'luca_moto',     bio: 'Two wheels, no plan. Riding the Balkans one village at a time.' },
]

// Sample trips — each has photos from Unsplash (free, no key needed for direct image URLs)
const TRIPS = [
  {
    ownerUsername: 'kaisurf',
    title: 'Uluwatu Barrel Season',
    description: 'The reef at Uluwatu was firing for three weeks straight. Caught the best barrels of my life on a borrowed 6\'2" step-up. If you haven\'t surfed this break at dawn with the cliff temples glowing behind you, add it to the list.',
    country_code: 'ID',
    activity_tags: ['surfing', 'photography'],
    is_public: true,
    photos: [
      { url: 'https://images.unsplash.com/photo-1502680390469-be75c86b636f?w=1200', caption: 'Dawn patrol at Uluwatu', lat: -8.8291, lng: 115.0849 },
      { url: 'https://images.unsplash.com/photo-1455729552865-3658a5d39692?w=1200', caption: 'Reading the sets from the cliff', lat: -8.8295, lng: 115.0852 },
      { url: 'https://images.unsplash.com/photo-1531722569936-825d4eaf91d1?w=1200', caption: 'Temple backdrop between sessions', lat: -8.8280, lng: 115.0860 },
    ],
  },
  {
    ownerUsername: 'kaisurf',
    title: 'Byron Bay Golden Hour',
    description: 'A week in Byron between swells. Longboard vibes, whale sightings, and the best fish tacos on the east coast. The Pass at sunrise is something else entirely.',
    country_code: 'AU',
    activity_tags: ['surfing', 'camping'],
    is_public: true,
    photos: [
      { url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200', caption: 'The Pass at sunrise', lat: -28.6474, lng: 153.6148 },
      { url: 'https://images.unsplash.com/photo-1504701954957-2010ec3bcec1?w=1200', caption: 'Camping behind the dunes', lat: -28.6500, lng: 153.6120 },
    ],
  },
  {
    ownerUsername: 'mayaonwheels',
    title: 'Barcelona Concrete Jungle',
    description: 'MACBA, Sants, Parallel — three spots that put Barcelona on the skate map for good. The marble is fast, the locals are welcoming, and the tapas refuel is undefeated. Sessioned MACBA for four days straight.',
    country_code: 'ES',
    activity_tags: ['road-trip', 'photography'],
    is_public: true,
    photos: [
      { url: 'https://images.unsplash.com/photo-1583422409516-2895a77efded?w=1200', caption: 'MACBA marble — smooth as butter', lat: 41.3818, lng: 2.1685 },
      { url: 'https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=1200', caption: 'Barceloneta after the session', lat: 41.3789, lng: 2.1900 },
      { url: 'https://images.unsplash.com/photo-1464790719320-516ecd75af6c?w=1200', caption: 'Gothic Quarter sunset cruise', lat: 41.3833, lng: 2.1767 },
    ],
  },
  {
    ownerUsername: 'mayaonwheels',
    title: 'LA Street: Venice to Downtown',
    description: 'Skateboarding the full length of LA — Venice Beach boardwalk, through Mid City, all the way to the DTLA plazas. 20 miles on a board. My legs are destroyed but my camera roll is stacked.',
    country_code: 'US',
    activity_tags: ['road-trip', 'photography'],
    is_public: true,
    photos: [
      { url: 'https://images.unsplash.com/photo-1564419320461-6870880221ad?w=1200', caption: 'Venice Beach boardwalk morning', lat: 33.9850, lng: -118.4695 },
      { url: 'https://images.unsplash.com/photo-1534430480872-3498386e7856?w=1200', caption: 'DTLA plaza sunset', lat: 34.0522, lng: -118.2437 },
    ],
  },
  {
    ownerUsername: 'tomasz_peaks',
    title: 'Dolomites Via Ferrata Circuit',
    description: 'Five days on the Dolomites via ferrata routes. The Tre Cime loop, the Lagazuoi climb, and a final push up the Tofana. Vertical limestone, cable rungs, and views that reset your nervous system.',
    country_code: 'IT',
    activity_tags: ['rock-climbing', 'hiking', 'photography'],
    is_public: true,
    photos: [
      { url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200', caption: 'Tre Cime from the ridge', lat: 46.6177, lng: 12.3027 },
      { url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200', caption: 'Via ferrata cables above the clouds', lat: 46.5400, lng: 12.1900 },
      { url: 'https://images.unsplash.com/photo-1491555103944-7c647fd857e6?w=1200', caption: 'Camp at 2600m', lat: 46.5800, lng: 12.2200 },
    ],
  },
  {
    ownerUsername: 'tomasz_peaks',
    title: 'Chamonix Winter Ascent',
    description: 'January in Chamonix. The Aiguille du Midi cable car to 3842m, then skins on for the Vallée Blanche glacier run. 24km of untouched powder in the shadow of Mont Blanc.',
    country_code: 'FR',
    activity_tags: ['skiing', 'hiking'],
    is_public: true,
    photos: [
      { url: 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=1200', caption: 'Vallée Blanche first tracks', lat: 45.9237, lng: 6.9170 },
      { url: 'https://images.unsplash.com/photo-1520208422220-d12a3c588e6c?w=1200', caption: 'Mont Blanc in full alpenglow', lat: 45.8326, lng: 6.8652 },
    ],
  },
  {
    ownerUsername: 'priya_wanders',
    title: 'Kerala Backwaters by Houseboat',
    description: 'Three nights floating through the Kerala backwaters on a converted rice barge. Coconut palms dragging in the water, kingfishers everywhere, and a cook who made the best fish curry I\'ve ever had.',
    country_code: 'IN',
    activity_tags: ['kayaking', 'photography', 'camping'],
    is_public: true,
    photos: [
      { url: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=1200', caption: 'Morning mist on the backwaters', lat: 9.4981, lng: 76.3388 },
      { url: 'https://images.unsplash.com/photo-1506461883276-594a12b11cf3?w=1200', caption: 'Houseboat sunset', lat: 9.5012, lng: 76.3310 },
      { url: 'https://images.unsplash.com/photo-1555400038-63f5ba517a47?w=1200', caption: 'Village fishing nets at dusk', lat: 9.9312, lng: 76.2673 },
    ],
  },
  {
    ownerUsername: 'priya_wanders',
    title: 'Rajasthan Desert Road Trip',
    description: 'Jaisalmer to Jodhpur across the Thar Desert. Blue city walls, camel treks, and a night in a desert camp under the Milky Way. The forts here feel like they belong to another planet.',
    country_code: 'IN',
    activity_tags: ['road-trip', 'photography'],
    is_public: true,
    photos: [
      { url: 'https://images.unsplash.com/photo-1477587458883-47145ed94245?w=1200', caption: 'Jaisalmer fort at golden hour', lat: 26.9124, lng: 70.9116 },
      { url: 'https://images.unsplash.com/photo-1524613032530-449a5537b5b0?w=1200', caption: 'Thar Desert camp at night', lat: 26.9157, lng: 70.8909 },
      { url: 'https://images.unsplash.com/photo-1603792907191-89e55f70099a?w=1200', caption: 'Blue city rooftops, Jodhpur', lat: 26.2389, lng: 73.0243 },
    ],
  },
  {
    ownerUsername: 'luca_moto',
    title: 'Balkans by Bike: Albania to Montenegro',
    description: 'Three weeks on a KTM 790 from Tirana to Kotor. The Albanian Alps are the real hidden gem — roads carved into cliff faces, villages with no running water, hospitality that makes you feel like family.',
    country_code: 'AL',
    activity_tags: ['motorcycling', 'road-trip', 'photography'],
    is_public: true,
    photos: [
      { url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200', caption: 'KTM on the Valbona pass', lat: 42.4280, lng: 20.0749 },
      { url: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200', caption: 'Bay of Kotor arrival', lat: 42.4247, lng: 18.7712 },
      { url: 'https://images.unsplash.com/photo-1530521954074-e64f6810b32d?w=1200', caption: 'Mountain village guesthouse', lat: 42.4500, lng: 20.0200 },
    ],
  },
  {
    ownerUsername: 'luca_moto',
    title: 'Morocco: Atlas Mountains Loop',
    description: 'Ten days looping through the High Atlas from Marrakech. Over the Tizi n\'Tichka pass into the Draa Valley, then back via the Dades Gorge. The road through the gorge is a motorcyclist\'s fever dream.',
    country_code: 'MA',
    activity_tags: ['motorcycling', 'road-trip', 'camping'],
    is_public: true,
    photos: [
      { url: 'https://images.unsplash.com/photo-1539020140153-e479b8c22e70?w=1200', caption: 'Tizi n\'Tichka summit 2260m', lat: 31.2020, lng: -7.3661 },
      { url: 'https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?w=1200', caption: 'Dades Gorge switchbacks', lat: 31.5600, lng: -5.9800 },
      { url: 'https://images.unsplash.com/photo-1548013146-72479768bada?w=1200', caption: 'Sahara edge camp at sunrise', lat: 31.0600, lng: -4.0100 },
    ],
  },
]

async function fetchImageBuffer(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`)
  const ab = await res.arrayBuffer()
  return Buffer.from(ab)
}

async function uploadPhoto(buffer, path) {
  const { error } = await supabase.storage.from('trip-photos').upload(path, buffer, {
    contentType: 'image/jpeg',
    upsert: true,
  })
  if (error) throw new Error(`Upload failed: ${error.message}`)
  return path
}

async function createUser({ email, password, username, bio }) {
  // Check if already exists
  const { data: existing } = await supabase
    .from('profiles').select('id').eq('username', username).single()
  if (existing) {
    console.log(`  ↩  ${username} already exists`)
    return existing.id
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { username },
  })
  if (error) throw new Error(`Create user ${username}: ${error.message}`)

  // Upsert profile (trigger may have already run)
  await supabase.from('profiles').upsert(
    { id: data.user.id, username, bio },
    { onConflict: 'id' }
  )
  console.log(`  ✓  Created user @${username}`)
  return data.user.id
}

async function seedTrip(trip, userMap) {
  const ownerId = userMap[trip.ownerUsername]
  if (!ownerId) throw new Error(`Unknown owner: ${trip.ownerUsername}`)

  // Check duplicate
  const { data: existing } = await supabase
    .from('trips').select('id').eq('title', trip.title).eq('owner_id', ownerId).single()
  if (existing) {
    console.log(`  ↩  Trip "${trip.title}" already exists`)
    return
  }

  const { data: tripRow, error: tripErr } = await supabase.from('trips').insert({
    owner_id: ownerId,
    title: trip.title,
    description: trip.description,
    country_code: trip.country_code,
    activity_tags: trip.activity_tags,
    is_public: trip.is_public,
    upvotes_count: Math.floor(Math.random() * 40) + 5,
  }).select().single()

  if (tripErr) throw new Error(`Insert trip: ${tripErr.message}`)

  console.log(`  + Trip: ${trip.title}`)

  for (let i = 0; i < trip.photos.length; i++) {
    const photo = trip.photos[i]
    const storagePath = `seed/${tripRow.id}/${i}.jpg`

    try {
      console.log(`    ↓ Downloading photo ${i + 1}/${trip.photos.length}…`)
      const buf = await fetchImageBuffer(photo.url)
      await uploadPhoto(buf, storagePath)

      await supabase.from('trip_photos').insert({
        trip_id: tripRow.id,
        uploader_id: ownerId,
        storage_path: storagePath,
        caption: photo.caption,
        lat: photo.lat ?? null,
        lng: photo.lng ?? null,
        sequence_order: i,
      })
      console.log(`    ✓ Photo ${i + 1}: ${photo.caption}`)
    } catch (e) {
      console.warn(`    ✗ Photo ${i + 1} failed: ${e.message}`)
    }
  }
}

async function main() {
  console.log('\n🌍 Ritual Rollers — seeding sample data\n')

  if (SERVICE_KEY === 'PASTE_SERVICE_KEY_HERE') {
    console.error('❌  Set SUPABASE_SERVICE_KEY before running.\n   SUPABASE_SERVICE_KEY=your_key node scripts/seed.mjs')
    process.exit(1)
  }

  // Create users
  console.log('👤 Creating users…')
  const userMap = {}
  for (const u of USERS) {
    try {
      userMap[u.username] = await createUser(u)
    } catch (e) {
      console.warn(`  ✗ ${u.username}: ${e.message}`)
    }
  }

  // Seed trips
  console.log('\n🗺️  Seeding trips…')
  for (const trip of TRIPS) {
    try {
      await seedTrip(trip, userMap)
    } catch (e) {
      console.warn(`  ✗ ${trip.title}: ${e.message}`)
    }
  }

  console.log('\n✅  Done! Visit your site to see the sample data.')
}

main()
