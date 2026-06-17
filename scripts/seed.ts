/**
 * Seed script — 50 North American trips with real GPS waypoints.
 * Run: npm run seed
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL?.startsWith('https://') || !SERVICE_KEY) {
  console.error('❌  Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ── Users ─────────────────────────────────────────────────────────────────────

const USERS = [
  { username: 'dave',          email: 'dave@clickshift.ca',  password: 'password' },
  { username: 'nomad_nina',    email: 'nina@example.com',    password: 'password' },
  { username: 'atlas_alex',    email: 'alex@example.com',    password: 'password' },
  { username: 'wanderer_wei',  email: 'wei@example.com',     password: 'password' },
  { username: 'roam_riya',     email: 'riya@example.com',    password: 'password' },
  { username: 'trek_tommy',    email: 'tommy@example.com',   password: 'password' },
  { username: 'drift_dana',    email: 'dana@example.com',    password: 'password' },
  { username: 'voyage_vic',    email: 'vic@example.com',     password: 'password' },
  { username: 'mile_mia',      email: 'mia@example.com',     password: 'password' },
  { username: 'horizon_hiro',  email: 'hiro@example.com',    password: 'password' },
  { username: 'trail_tara',    email: 'tara@example.com',    password: 'password' },
  { username: 'cross_cal',     email: 'cal@example.com',     password: 'password' },
  { username: 'peak_priya',    email: 'priya@example.com',   password: 'password' },
  { username: 'basin_ben',     email: 'ben@example.com',     password: 'password' },
  { username: 'range_rosa',    email: 'rosa@example.com',    password: 'password' },
  { username: 'fjord_finn',    email: 'finn@example.com',    password: 'password' },
  { username: 'delta_dee',     email: 'dee@example.com',     password: 'password' },
  { username: 'steppe_sam',    email: 'sam@example.com',     password: 'password' },
  { username: 'coast_clara',   email: 'clara@example.com',   password: 'password' },
  { username: 'mesa_marco',    email: 'marco@example.com',   password: 'password' },
]

// ── Trip data ─────────────────────────────────────────────────────────────────
// pts: [lat, lng, caption]

type Pt = [number, number, string]
interface RawTrip {
  owner: number        // USERS index
  title: string
  desc: string
  country: string      // ISO alpha-2
  daysAgo: number      // when the trip started
  pts: Pt[]
}

const TRIPS: RawTrip[] = [

  // ── USA: PACIFIC COAST ───────────────────────────────────────────────────

  {
    owner: 1, country: 'US', daysAgo: 14,
    title: 'Highway 1: Big Sur to Santa Monica',
    desc: 'The most dramatic 500-mile drive in America. Bixby Bridge, elephant seals, and perfect Pacific sunsets all the way to LA.',
    pts: [
      [37.8044, -122.2712, 'Oakland Bay Bridge — morning light over the water'],
      [37.6130, -122.4869, 'Pacifica — first glimpse of the open Pacific'],
      [37.4636, -122.4286, 'Half Moon Bay pumpkin farms along the coast'],
      [37.1650, -122.2436, 'Año Nuevo State Park — elephant seal colony'],
      [37.0502, -122.0493, 'Santa Cruz Boardwalk — classic California'],
      [36.6002, -121.8947, 'Monterey Fisherman\'s Wharf at golden hour'],
      [36.5540, -121.9233, 'Carmel-by-the-Sea — the most charming town on the coast'],
      [36.4802, -121.9303, 'Point Lobos — best snorkeling in California'],
      [36.3714, -121.9022, 'Bixby Creek Bridge — the photo everyone comes for'],
      [36.2704, -121.8081, 'Big Sur village — general store and cold brew'],
      [35.7890, -121.5687, 'McWay Falls — waterfall into the ocean'],
      [35.6869, -121.2898, 'Piedras Blancas — 15,000 elephant seals'],
      [35.3658, -120.8499, 'Morro Rock — volcanic plug at sunset'],
      [34.4208, -119.6982, 'Santa Barbara mission and wine country'],
      [34.0259, -118.7798, 'Malibu — celebrities and surf breaks'],
      [34.0086, -118.4994, 'Santa Monica Pier — end of Route 66'],
    ],
  },

  {
    owner: 0, country: 'US', daysAgo: 7,
    title: 'Yosemite Valley & Tioga Road',
    desc: 'El Capitan at dawn, Half Dome at dusk, and the best stargazing in the lower 48.',
    pts: [
      [37.6763, -119.7800, 'El Portal entrance — the valley begins'],
      [37.7167, -119.6789, 'Tunnel View — your first look at the valley'],
      [37.7553, -119.5970, 'Yosemite Falls — tallest waterfall in North America'],
      [37.7348, -119.5984, 'El Capitan meadow — watching the climbers'],
      [37.7490, -119.5885, 'Valley Visitor Center — plan your hike'],
      [37.7414, -119.5567, 'Mirror Lake — Half Dome reflection at dawn'],
      [37.7266, -119.5551, 'Happy Isles trailhead — start of the Half Dome hike'],
      [37.7196, -119.5346, 'Vernal Fall footbridge — mist soaks everything'],
      [37.7308, -119.5734, 'Glacier Point — best view of Half Dome, period'],
      [37.5133, -119.5981, 'Mariposa Grove — the giant sequoias'],
      [37.8757, -119.3573, 'Tuolumne Meadows — high Sierra at 8,600 feet'],
      [37.8387, -119.4510, 'Tenaya Lake — swim with a backdrop of granite'],
      [37.8246, -119.4869, 'Olmsted Point — the valley from a different angle'],
    ],
  },

  {
    owner: 2, country: 'US', daysAgo: 21,
    title: 'Olympic Peninsula Loop',
    desc: 'Rainforests, wild beaches, and the snowcapped Olympics — the most biodiverse corner of the US.',
    pts: [
      [47.6062, -122.3321, 'Seattle waterfront — ferry terminal start'],
      [48.1181, -123.4307, 'Port Angeles — gateway to Olympic NP'],
      [47.9660, -123.4965, 'Hurricane Ridge — 5,242 feet above the Strait'],
      [47.9762, -123.7937, 'Lake Crescent — crystal-clear glacial lake'],
      [47.9742, -124.6534, 'Sol Duc Hot Springs — soak in the rainforest'],
      [48.0956, -124.3896, 'La Push — black sand beach and sea stacks'],
      [47.7473, -124.5326, 'Hoh Rain Forest — 12 feet of rain per year'],
      [47.6140, -124.4068, 'Ruby Beach — driftwood fields and tide pools'],
      [47.3601, -124.3727, 'Kalaloch Beach — cliffside lodges above the surf'],
      [46.9771, -124.1050, 'Grays Harbor lighthouse'],
      [47.4009, -122.6543, 'Bremerton naval museum'],
      [47.8138, -122.7616, 'Kingston sunset ferry back to Seattle'],
    ],
  },

  {
    owner: 3, country: 'US', daysAgo: 30,
    title: 'Oregon Coast: Astoria to Brookings',
    desc: '360 miles of the wildest, least-crowded coastline in America.',
    pts: [
      [46.1879, -123.8313, 'Astoria Column — film location for The Goonies'],
      [45.8869, -123.9624, 'Cannon Beach — Haystack Rock at low tide'],
      [45.7200, -123.9586, 'Oswald West State Park — secret surf beach'],
      [45.6281, -123.9451, 'Manzanita — best small town on the coast'],
      [44.8396, -124.0496, 'Lincoln City glass floats hidden in the sand'],
      [44.5553, -124.0579, 'Newport — Oregon Coast Aquarium'],
      [44.2418, -124.1128, 'Florence Sea Lion Caves — 1,000 Steller sea lions'],
      [43.9690, -124.0973, 'Heceta Head Lighthouse — most photographed lighthouse in Oregon'],
      [43.4663, -124.2179, 'Coos Bay — largest coastal city in Oregon'],
      [42.8499, -124.5396, 'Bandon Faces Rock — sea stacks at golden hour'],
      [42.4237, -124.3948, 'Gold Beach — jet boats up the Rogue River'],
      [42.0500, -124.2820, 'Samuel H. Boardman — the crown jewel section'],
      [42.0529, -124.2964, 'Brookings — azalea capital of Oregon'],
    ],
  },

  {
    owner: 4, country: 'US', daysAgo: 45,
    title: 'Mount Rainier & The Cascades',
    desc: 'Wildflower meadows, glaciers you can touch, and a volcano so big it makes its own weather.',
    pts: [
      [47.1767, -121.5570, 'Enumclaw — gateway town'],
      [46.8801, -121.7269, 'Nisqually entrance to Mount Rainier NP'],
      [46.7870, -121.7370, 'Longmire museum and hot springs'],
      [46.8523, -121.7260, 'Narada Falls — roaring cascade in the forest'],
      [46.8549, -121.7267, 'Paradise visitor center at 5,400 feet'],
      [46.8696, -121.7213, 'Panorama Point — wildflower meadows above you'],
      [46.9298, -121.6506, 'Sunrise area — highest point road in Washington'],
      [46.9066, -121.6450, 'Emmons Glacier viewpoint — largest glacier in lower 48'],
      [46.9200, -121.5400, 'White River campground under the stars'],
      [47.3000, -121.8700, 'Snoqualmie Falls — 270 feet of roaring water'],
      [48.5143, -121.3260, 'North Cascades NP — the American Alps'],
      [48.4745, -121.1782, 'Diablo Lake — the most unreal turquoise color'],
    ],
  },

  {
    owner: 5, country: 'US', daysAgo: 60,
    title: 'Redwood National & State Parks',
    desc: 'Walking among 2,000-year-old trees that are taller than the Statue of Liberty.',
    pts: [
      [41.7558, -124.2026, 'Crescent City — northern gateway'],
      [41.7789, -124.0946, 'Jedediah Smith Redwoods — the most pristine grove'],
      [41.7830, -124.0650, 'Stout Grove — cathedral of ancient trees'],
      [41.6267, -124.0836, 'Howland Hill Road — off-road through giants'],
      [41.3951, -124.0677, 'Trees of Mystery gondola ride'],
      [41.3072, -124.0018, 'Prairie Creek — Roosevelt elk in the meadow'],
      [41.3050, -124.0200, 'Fern Canyon — 50-foot fern-covered walls'],
      [41.2950, -124.0750, 'Gold Bluffs Beach — drove on the sand'],
      [41.1765, -124.0572, 'Lady Bird Johnson Grove — the heart of Redwoods NP'],
      [41.1300, -124.0020, 'Tall Trees Grove — 3-mile hike to 367-foot trees'],
      [40.8021, -124.1635, 'Eureka Victorian architecture'],
      [40.5701, -124.1506, 'Humboldt Bay — largest estuary north of SF'],
    ],
  },

  {
    owner: 6, country: 'US', daysAgo: 90,
    title: 'San Francisco Bay Area & Point Reyes',
    desc: 'From the Golden Gate to elk on windswept headlands — all within an hour of downtown SF.',
    pts: [
      [37.8199, -122.4783, 'Golden Gate Bridge — every angle is the money shot'],
      [37.8270, -122.5182, 'Marin Headlands — city skyline behind you, ocean ahead'],
      [37.8897, -122.5033, 'Muir Woods — old-growth redwoods'],
      [37.9060, -122.5320, 'Mount Tamalpais summit — 360 degree views'],
      [38.0302, -122.8089, 'Stinson Beach — surfing with a view of the bridge'],
      [38.0638, -122.8697, 'Bolinas — the town that removes its own road signs'],
      [38.1155, -122.9018, 'Limantour Beach — deer walk up to you'],
      [38.0575, -122.8000, 'Point Reyes Lighthouse — 300 steps down the cliff'],
      [38.0530, -122.9810, 'Tomales Point elk reserve — 500 tule elk'],
      [38.1420, -122.8889, 'Marshall — fresh oysters from Tomales Bay'],
      [37.9524, -122.5163, 'Sausalito waterfront — houseboats and galleries'],
      [37.7749, -122.4194, 'SF Mission District — best burritos on Earth'],
    ],
  },

  {
    owner: 7, country: 'US', daysAgo: 100,
    title: 'Columbia River Gorge',
    desc: 'Waterfalls every mile along the Historic Columbia River Highway — easily the most scenic drive in the Pacific Northwest.',
    pts: [
      [45.5051, -122.6750, 'Portland Saturday Market along the river'],
      [45.5418, -122.3800, 'Crown Point Vista House — Art Deco overlook'],
      [45.5762, -122.1177, 'Latourell Falls — 249-foot single-drop plunge'],
      [45.5744, -122.0880, 'Bridal Veil Falls — two-tier cascade'],
      [45.5763, -122.1185, 'Wahkeena Falls — incredible mossy grotto'],
      [45.5764, -122.1156, 'Multnomah Falls — most visited site in Oregon'],
      [45.6000, -121.9200, 'Oneonta Gorge — wade through a slot canyon'],
      [45.7104, -121.5176, 'Hood River — windsurfing capital of the world'],
      [45.7020, -121.4830, 'Fruit Loop — cherry and lavender farms'],
      [45.6854, -121.8898, 'Mitchell Point — dramatic cliff tunnels'],
      [45.7300, -121.7300, 'Panorama Point — Mount Hood reflection'],
      [45.6236, -121.1307, 'Rowena Crest — wildflowers on the east side'],
    ],
  },

  // ── USA: SOUTHWEST ──────────────────────────────────────────────────────

  {
    owner: 8, country: 'US', daysAgo: 50,
    title: 'Grand Canyon: South Rim to North Rim',
    desc: 'One of the seven natural wonders. Nothing in words or photos prepares you for that first look over the edge.',
    pts: [
      [35.9733, -112.1299, 'South Rim entrance gate — start of something big'],
      [36.0544, -112.1267, 'Yavapai Point — geology lesson from 7,000 feet'],
      [36.0662, -112.1404, 'Mather Point — the classic panorama shot'],
      [36.0556, -112.0903, 'Yaki Point — no private cars, shuttle only'],
      [36.0100, -112.0900, 'Bright Angel trailhead — going down to the river'],
      [36.0600, -112.0450, 'Desert View Watchtower — Colter masterpiece'],
      [36.0534, -111.9731, 'Lipan Point — Colorado River visible below'],
      [36.0997, -112.3453, 'Hermit\'s Rest — Mary Colter architecture'],
      [36.2141, -112.0575, 'North Rim lodge — different canyon, same awe'],
      [36.2093, -112.0540, 'Bright Angel Point — 270-degree view'],
      [36.1947, -112.0567, 'Cape Royal — the angel\'s window rock arch'],
      [36.1800, -112.0800, 'Point Imperial — highest viewpoint in the park'],
    ],
  },

  {
    owner: 9, country: 'US', daysAgo: 55,
    title: 'Zion: Angels Landing & The Narrows',
    desc: 'Chain climbing a mile above the canyon floor, then wading a river through slot canyons. Two days, zero regrets.',
    pts: [
      [37.2679, -113.0504, 'Springdale — pizza and red rock views'],
      [37.1997, -112.9879, 'Zion Visitor Center — park shuttle only'],
      [37.2552, -112.9553, 'The Subway — permit required, 100% worth it'],
      [37.2697, -112.9473, 'Temple of Sinawava — Narrows trailhead'],
      [37.2820, -112.9460, 'The Narrows — knee-deep in the Virgin River'],
      [37.2550, -112.9550, 'Orderville Canyon junction — knee-deep narrows'],
      [37.2309, -112.9519, 'Emerald Pools — three levels of waterfalls'],
      [37.2156, -112.9544, 'Scout Lookout — last stop before chains'],
      [37.2200, -112.9500, 'Angels Landing summit — hold onto those chains'],
      [37.1877, -112.9868, 'Canyon Junction — best valley reflection photos'],
      [37.1732, -113.0049, 'Weeping Rock — spring water seeps through sandstone'],
      [37.1359, -113.0201, 'Checkerboard Mesa — Navajo sandstone patterns'],
    ],
  },

  {
    owner: 10, country: 'US', daysAgo: 62,
    title: 'Bryce Canyon: Hoodoo Forest',
    desc: 'The most otherworldly landscape in North America. Thousands of orange limestone spires glowing pink at sunrise.',
    pts: [
      [37.6435, -112.1699, 'Ruby\'s Inn — base camp for the hoodoos'],
      [37.6228, -112.1661, 'Bryce Point — overview of the amphitheater'],
      [37.6307, -112.1676, 'Inspiration Point — sunrise here is non-negotiable'],
      [37.6410, -112.1669, 'Sunset Point — top of Navajo Loop Trail'],
      [37.6355, -112.1655, 'Queen\'s Garden trail — through the hoodoos'],
      [37.6308, -112.1580, 'Navajo Loop — Wall Street slot canyon'],
      [37.6270, -112.1663, 'Thor\'s Hammer — the most photographed hoodoo'],
      [37.6228, -112.1720, 'Under-the-Rim trail section'],
      [37.5906, -112.1825, 'Natural Bridge — massive limestone arch'],
      [37.5202, -112.2047, 'Yovimpa Point — southernmost viewpoint'],
      [37.5200, -112.1930, 'Rainbow Point — bristlecone pines up here'],
      [37.6680, -112.2153, 'Red Canyon — hoodoos you can drive through'],
    ],
  },

  {
    owner: 11, country: 'US', daysAgo: 70,
    title: 'Arches & Canyonlands',
    desc: 'Over 2,000 natural stone arches. Delicate Arch, Landscape Arch, Broken Arch — each one a geological miracle.',
    pts: [
      [38.7331, -109.5925, 'Moab — adventure capital of the American Southwest'],
      [38.6839, -109.5573, 'Arches NP entrance — the fins begin immediately'],
      [38.6830, -109.5574, 'Park Avenue — skyscraper sandstone walls'],
      [38.6960, -109.5316, 'Balanced Rock — 3,600 tons, impossibly balanced'],
      [38.7364, -109.5250, 'Windows Section — four huge arches in one place'],
      [38.7434, -109.4994, 'Double Arch — the giant double-span'],
      [38.7435, -109.4993, 'Fiery Furnace — maze of sandstone fins'],
      [38.7469, -109.4997, 'Landscape Arch — longest arch in North America'],
      [38.7355, -109.5226, 'Delicate Arch — the one on the license plate'],
      [38.4580, -109.8175, 'Island in the Sky — Canyonlands mesa overlook'],
      [38.4501, -109.8207, 'Mesa Arch — sunrise with canyon below the arch'],
      [38.1576, -109.9292, 'Needles — the painted desert spires'],
    ],
  },

  {
    owner: 12, country: 'US', daysAgo: 80,
    title: 'Monument Valley & Antelope Canyon',
    desc: 'The American West as you\'ve seen it in every Western ever made, plus the most photographed slot canyon on Earth.',
    pts: [
      [36.9583, -110.0983, 'Kayenta — Navajo Nation gateway'],
      [36.9831, -110.1124, 'Monument Valley — pulling into the viewpoint'],
      [36.9958, -110.1177, 'The Mittens at sunrise — bucket list moment'],
      [36.9994, -110.1122, 'John Ford Point — where he filmed every Western'],
      [37.0271, -110.1018, 'Merrick Butte — deep red sandstone towers'],
      [36.8680, -111.3839, 'Horseshoe Bend — Colorado River below a 1,000-foot cliff'],
      [36.8620, -111.3756, 'Glen Canyon Dam overlook'],
      [36.8660, -111.4270, 'Lake Powell — blue water in the red desert'],
      [36.8596, -111.4740, 'Rainbow Bridge National Monument'],
      [36.8605, -111.3748, 'Upper Antelope Canyon — light beams at noon'],
      [36.9185, -111.4271, 'Lower Antelope Canyon — better light, fewer crowds'],
      [36.9283, -111.4484, 'Page waterfront — sunset on Lake Powell'],
    ],
  },

  {
    owner: 13, country: 'US', daysAgo: 85,
    title: 'Sedona Red Rocks',
    desc: 'Cathedral Rock, Bell Rock, Devil\'s Bridge — every hike ends at a vista that looks like a painting.',
    pts: [
      [34.8697, -111.7609, 'Oak Creek Canyon — the drive in from Flagstaff'],
      [34.8748, -111.7610, 'Slide Rock State Park — natural waterslides'],
      [34.8697, -111.7640, 'Tlaquepaque arts village'],
      [34.8555, -111.7629, 'Chapel of the Holy Cross — built into the rock'],
      [34.8612, -111.7957, 'Bell Rock — easy hike, huge presence'],
      [34.8396, -111.8004, 'Cathedral Rock — best reflection at dawn'],
      [34.8753, -111.8193, 'Devil\'s Bridge — longest natural arch in the area'],
      [34.9096, -111.8357, 'Boynton Canyon — powerful vortex energy'],
      [34.8820, -111.7656, 'Airport Mesa — vortex with 360 degree views'],
      [34.8697, -111.7609, 'Uptown Sedona at sunset — the strip glows red'],
      [34.7337, -111.9774, 'Jerome — ghost town on a cliff'],
      [34.5400, -112.4700, 'Prescott Whiskey Row — Victorian cowboy town'],
    ],
  },

  {
    owner: 14, country: 'US', daysAgo: 95,
    title: 'Death Valley: Extremes',
    desc: 'Hottest, driest, lowest — and somehow the most beautiful. Badwater Basin, Mesquite dunes, Zabriskie Point.',
    pts: [
      [36.5323, -116.9325, 'Stovepipe Wells — last gas for 40 miles'],
      [36.6072, -117.1552, 'Mesquite Flat Sand Dunes — photogenic at all hours'],
      [36.4200, -116.8670, 'Zabriskie Point — geological time made visible'],
      [36.4580, -116.9230, 'Artist\'s Drive — 9-mile rainbow geology loop'],
      [36.2301, -116.8166, 'Badwater Basin — 282 feet below sea level'],
      [36.2500, -116.8200, 'Salt Flats — walk forever on crystallized salt'],
      [36.5050, -117.0790, 'Devil\'s Golf Course — razor-sharp salt crystals'],
      [36.7507, -117.1561, 'Ubehebe Crater — 600-foot volcanic explosion crater'],
      [37.2834, -117.2386, 'Scotty\'s Castle — millionaire\'s desert getaway'],
      [36.4564, -116.8695, 'Golden Canyon — hike to Red Cathedral'],
      [36.6220, -116.9670, 'Mosaic Canyon — water-polished marble slot canyon'],
      [36.4450, -117.1420, 'Father Crowley Vista — the empty desert at sunset'],
    ],
  },

  {
    owner: 15, country: 'US', daysAgo: 110,
    title: 'Joshua Tree National Park',
    desc: 'Where the Mojave meets the Colorado Desert. Twisted trees, giant boulders, and the clearest night skies in Southern California.',
    pts: [
      [34.0522, -116.5725, 'Palm Springs — mid-century architecture and tram rides'],
      [33.8810, -116.3050, 'Joshua Tree town — hip desert art scene'],
      [34.0132, -116.1664, 'West Entrance — first Joshua trees appear'],
      [34.0135, -116.1667, 'Cholla Cactus Garden — a sea of teddy bear cholla'],
      [33.9892, -116.0667, 'Cottonwood Spring — oasis in the desert'],
      [34.0100, -116.1500, 'Ocotillo Patch — crimson blooms in spring'],
      [34.0665, -116.3132, 'Hall of Horrors boulders — climbers on everything'],
      [34.0135, -116.1613, 'Skull Rock Nature Trail'],
      [34.0669, -116.3139, 'Hidden Valley — a natural rock enclosure'],
      [34.0765, -116.2700, 'Barker Dam — rock art and wildlife'],
      [34.1210, -116.3945, 'Keys View — Salton Sea and San Andreas Fault'],
      [33.9917, -116.3230, 'Jumbo Rocks campground — boulders as big as houses'],
    ],
  },

  // ── USA: ROCKIES ────────────────────────────────────────────────────────

  {
    owner: 16, country: 'US', daysAgo: 40,
    title: 'Yellowstone: Geysers, Wolves & Bison',
    desc: 'Old Faithful is just the beginning. Lamar Valley has more wolves and bison than anywhere in the lower 48.',
    pts: [
      [44.6661, -111.0956, 'West Yellowstone entrance town'],
      [44.5353, -110.8302, 'Norris Geyser Basin — hottest hydrothermal area'],
      [44.4608, -110.8282, 'Grand Prismatic Spring — rainbow from above'],
      [44.4605, -110.8280, 'Old Faithful — erupts every 60-90 minutes'],
      [44.4267, -110.5882, 'West Thumb Geyser Basin — geysers in the lake'],
      [44.5351, -110.4027, 'Mud Volcano — sulphurous, alien landscape'],
      [44.7208, -110.7028, 'Hayden Valley — bison herd of thousands'],
      [44.7277, -110.4970, 'Tower Fall — 132 feet into the canyon'],
      [44.9214, -110.1115, 'Lamar Valley — wolf and bear country'],
      [44.9300, -110.0800, 'Slough Creek — best fly fishing in the park'],
      [44.5387, -110.7877, 'Grand Canyon of the Yellowstone — yellow walls, roaring falls'],
      [44.6564, -110.5421, 'Canyon Village — evening ranger talk'],
      [44.3938, -110.5461, 'Grant Village — Yellowstone Lake at dusk'],
    ],
  },

  {
    owner: 17, country: 'US', daysAgo: 48,
    title: 'Grand Teton: The Cathedral Group',
    desc: 'The Tetons rise 7,000 feet straight out of the valley floor — no foothills, no buildup, just sudden perfect mountains.',
    pts: [
      [43.4799, -110.7624, 'Jackson Hole town square with elk antler arches'],
      [43.6484, -110.7300, 'National Elk Refuge — 11,000 elk in winter'],
      [43.7901, -110.6818, 'Jackson Lake Lodge — direct view of the range'],
      [43.8500, -110.5500, 'Colter Bay — kayaking on Jackson Lake'],
      [43.8700, -110.6300, 'Jackson Lake overlook — mirror reflection morning'],
      [43.7500, -110.8100, 'Signal Mountain Summit — 360 degree Teton view'],
      [43.7308, -110.8500, 'Jenny Lake — shuttle boat to Hidden Falls'],
      [43.7300, -110.8500, 'Cascade Canyon trail into the range'],
      [43.7000, -110.8000, 'Inspiration Point — best view in the park'],
      [43.6601, -110.7300, 'Mormon Row barns — most photographed barn in America'],
      [43.6500, -110.7300, 'Schwabacher Landing — Teton reflection dawn'],
      [43.5940, -110.7070, 'Menor\'s Ferry historic site'],
    ],
  },

  {
    owner: 18, country: 'US', daysAgo: 56,
    title: 'Glacier National Park: Going-to-the-Sun Road',
    desc: '50 miles of road carved into mountain cliffs. Mountain goats on the road, glaciers at eye level.',
    pts: [
      [48.4961, -113.9834, 'West Glacier entrance — pick up your backcountry permit'],
      [48.5292, -113.9992, 'Lake McDonald — deepest lake in the park'],
      [48.6218, -113.8994, 'Apgar Village — park HQ and visitor center'],
      [48.6966, -113.7185, 'Trail of the Cedars — ancient cedar boardwalk'],
      [48.7004, -113.7179, 'Avalanche Lake — turquoise glacial lake'],
      [48.7580, -113.6490, 'Logan Pass — Continental Divide at 6,646 feet'],
      [48.7500, -113.6500, 'Hidden Lake Overlook — mountain goats everywhere'],
      [48.7864, -113.8094, 'Weeping Wall — waterfall over the road'],
      [48.6907, -113.3500, 'St. Mary Lake — second largest in the park'],
      [48.7002, -113.4397, 'Sun Point Nature Walk — stunning lake views'],
      [48.9998, -113.6500, 'Many Glacier Hotel — the crown jewel'],
      [48.9501, -113.9000, 'Grinnell Glacier trail — the shrinking ice'],
      [48.9998, -113.9001, 'Swiftcurrent Lake reflections at sunset'],
    ],
  },

  {
    owner: 19, country: 'US', daysAgo: 65,
    title: 'Rocky Mountain National Park',
    desc: 'Trail Ridge Road goes higher than any paved road in the US — above the tree line for 11 straight miles.',
    pts: [
      [40.3772, -105.5217, 'Estes Park — elk wander main street at dusk'],
      [40.3428, -105.6836, 'Beaver Meadows entrance — historic Frank Lloyd Wright center'],
      [40.3430, -105.6837, 'Moraine Park — summer elk rut in the meadow'],
      [40.3128, -105.7177, 'Bear Lake trailhead — the hub of the hiking network'],
      [40.3100, -105.7100, 'Nymph, Dream, Emerald Lakes chain'],
      [40.3766, -105.6468, 'Many Parks Curve — valley overview'],
      [40.3935, -105.7180, 'Forest Canyon Overlook — glacial valley below'],
      [40.4175, -105.7639, 'Rock Cut — above tree line, ptarmigan everywhere'],
      [40.4375, -105.8159, 'Alpine Visitor Center — 11,796 feet elevation'],
      [40.5072, -105.8503, 'Trail Ridge Road summit section — no guardrails'],
      [40.2628, -105.6181, 'Longs Peak trailhead — 14,259-foot summit attempt'],
      [40.2400, -105.5600, 'Wild Basin — Calypso Cascades waterfall'],
    ],
  },

  {
    owner: 0, country: 'US', daysAgo: 35,
    title: 'Maroon Bells & the Colorado Rockies',
    desc: 'Maroon Bells is the most photographed mountain in North America. Then Aspen, and then the wildflower tundra above 12,000 feet.',
    pts: [
      [39.1911, -106.8175, 'Aspen — billion-dollar mountain town'],
      [39.0708, -106.9878, 'Maroon Bells at dawn — reflection in Maroon Lake'],
      [39.0730, -106.9900, 'Maroon Creek valley hike'],
      [39.1000, -106.9300, 'West Maroon Pass — Colorado Trail crossing'],
      [38.8680, -106.9882, 'Crested Butte — wildflower capital of Colorado'],
      [38.9075, -106.9750, 'Schofield Pass — 10,707 feet of dirt road drama'],
      [38.8500, -106.9200, 'Gothic Mountain Research Station'],
      [37.9375, -107.6797, 'Ouray — Little Switzerland of America'],
      [37.9374, -107.6738, 'Box Canyon Falls — slot canyon waterfall'],
      [37.8753, -107.7164, 'Million Dollar Highway — sheer cliffs, no guardrails'],
      [37.9392, -107.6676, 'Telluride — ski town in a box canyon'],
      [38.5733, -106.9290, 'Gunnison National Forest overlook'],
    ],
  },

  {
    owner: 1, country: 'US', daysAgo: 75,
    title: 'Black Hills & Badlands',
    desc: 'Mount Rushmore, Crazy Horse, Custer State Park bison, and the painted Badlands all within 50 miles of each other.',
    pts: [
      [43.8791, -103.4591, 'Rapid City — dinosaur statues on every corner'],
      [43.8791, -103.4590, 'Mount Rushmore at sunrise — beat the crowds'],
      [43.7530, -103.6019, 'Crazy Horse Memorial — still being carved'],
      [43.7700, -103.5900, 'Custer State Park — bison roundup in fall'],
      [43.8300, -103.6300, 'Needles Highway — tunnels through granite spires'],
      [43.7030, -103.5590, 'Cathedral Spires — best hike in the Black Hills'],
      [43.5900, -103.5000, 'Wind Cave NP — rare boxwork formations'],
      [43.7440, -101.4900, 'Badlands Loop Road entrance'],
      [43.7800, -101.9400, 'Badlands Notch Trail — painted canyon panorama'],
      [43.7400, -102.1500, 'Yellow Mounds overlook'],
      [43.7500, -101.9700, 'Cedar Pass Lodge — dinosaur bone country'],
      [43.8600, -101.5000, 'Pinnacles Overlook — striped buttes at sunset'],
    ],
  },

  // ── USA: EAST & SOUTH ───────────────────────────────────────────────────

  {
    owner: 2, country: 'US', daysAgo: 25,
    title: 'Blue Ridge Parkway',
    desc: '469 miles of the most beautiful drive in the Eastern US. Peak fall color runs October through November — book cabins far ahead.',
    pts: [
      [38.8852, -78.1988, 'Shenandoah — Skyline Drive meeting point'],
      [38.5234, -78.4311, 'Big Meadows — largest open meadow in the park'],
      [38.2400, -79.0000, 'Humpback Rocks — first Blue Ridge vista point'],
      [37.8946, -79.5108, 'Otter Creek — the Blue Ridge Parkway begins'],
      [37.4660, -79.8820, 'Peaks of Otter — three-peak reflection at dawn'],
      [37.3440, -80.5810, 'Mabry Mill — most photographed mill in the world'],
      [36.7562, -80.3768, 'Groundhog Mountain — split-rail fence views'],
      [36.5412, -80.8407, 'Cumberland Knob — first section built in 1935'],
      [36.3962, -81.6934, 'Doughton Park — remote backcountry camping'],
      [35.9598, -82.2732, 'Linn Cove Viaduct — engineering marvel on Grandfather Mtn'],
      [35.7595, -82.3443, 'Craggy Gardens — rhododendrons at 6,000 feet'],
      [35.5951, -82.5515, 'Asheville — quirky mountain city, great breweries'],
      [35.3218, -83.2015, 'Waterrock Knob — highest point accessible by car'],
    ],
  },

  {
    owner: 3, country: 'US', daysAgo: 32,
    title: 'Acadia National Park & Maine Coast',
    desc: 'Cadillac Mountain is the first place in the US to see sunrise. The carriage roads and rocky shores are pure New England.',
    pts: [
      [44.2998, -68.5869, 'Bar Harbor — lobster rolls and whale watches'],
      [44.3386, -68.2733, 'Cadillac Mountain summit — first sunrise in America'],
      [44.3000, -68.2000, 'Jordan Pond — the Jordan Pond House popovers'],
      [44.2980, -68.2013, 'Jordan Stream carriage road loop'],
      [44.3309, -68.2036, 'Eagle Lake — best carriage road cycling'],
      [44.3483, -68.2017, 'North Ridge trail to Cadillac summit'],
      [44.3095, -68.2513, 'Sand Beach — surprisingly swimmable in July'],
      [44.3034, -68.1888, 'Thunder Hole — ocean roars through the slot'],
      [44.2828, -68.1979, 'Otter Cliffs — rock climbing above the Atlantic'],
      [44.3880, -68.3010, 'Echo Lake — freshwater swimming alternative'],
      [44.4540, -68.3460, 'Isle au Haut — ferry to the remote island section'],
      [44.5586, -67.8864, 'Schoodic Peninsula — the crowd-free mainland section'],
    ],
  },

  {
    owner: 4, country: 'US', daysAgo: 42,
    title: 'Great Smoky Mountains',
    desc: 'The most visited national park in the US — 12 million people per year. Once you\'re on the trail you have it to yourself.',
    pts: [
      [35.7796, -83.9207, 'Gatlinburg — kitschy gateway town with great views'],
      [35.6873, -83.7310, 'Sugarlands Visitor Center'],
      [35.6532, -83.9284, 'Newfound Gap — Tennessee/North Carolina state line'],
      [35.7930, -83.4720, 'Clingmans Dome — highest point in the park'],
      [35.6140, -83.5530, 'Alum Cave Trail to LeConte Lodge'],
      [35.6360, -83.4180, 'Chimney Tops trail — 360-degree summit view'],
      [35.5630, -83.5040, 'Roaring Fork Motor Nature Trail — old-growth forest'],
      [35.7093, -83.8617, 'Abrams Falls — the best waterfall hike'],
      [35.5780, -83.6120, 'Grotto Falls — walk behind a waterfall'],
      [35.7096, -83.8608, 'Cades Cove — white-tailed deer in every meadow'],
      [35.7100, -83.8600, 'Cades Cove loop road — historic grist mill'],
      [35.4783, -83.0978, 'Deep Creek — tubing through the park'],
    ],
  },

  {
    owner: 5, country: 'US', daysAgo: 52,
    title: 'Florida Keys: US-1 to Key West',
    desc: 'The Overseas Highway connects 42 islands through 113 miles of turquoise water. Nothing else like it in the world.',
    pts: [
      [25.7617, -80.1918, 'Miami South Beach — start of the adventure south'],
      [25.4699, -80.4776, 'Homestead — gateway to the Keys'],
      [25.3400, -80.5800, 'Key Largo — John Pennekamp coral reef'],
      [25.0865, -80.4473, 'Theater of the Sea — swimming with dolphins'],
      [24.9141, -80.6030, 'Islamorada — sport fishing capital of the world'],
      [24.7139, -81.0948, 'Marathon — Seven Mile Bridge crossing'],
      [24.7056, -81.1013, 'Pigeon Key — historic railroad workers\' island'],
      [24.6549, -81.3615, 'Big Pine Key — rare Key deer in the wild'],
      [24.5551, -81.7792, 'Looe Key reef snorkeling'],
      [24.5441, -81.8000, 'Bahia Honda — best beach in the Keys'],
      [24.5545, -81.7793, 'Old Seven Mile Bridge — walk the old railroad bridge'],
      [24.5551, -81.7997, 'Key West — Mallory Square sunset celebration'],
    ],
  },

  {
    owner: 6, country: 'US', daysAgo: 58,
    title: 'Everglades: River of Grass',
    desc: 'The only subtropical wilderness in North America. Alligators within inches of the boardwalk, manatees in the shallows.',
    pts: [
      [25.3854, -80.6842, 'Ernest Coe Visitor Center'],
      [25.3906, -80.6843, 'Royal Palm — Anhinga Trail at dawn'],
      [25.2785, -80.7553, 'Pa-hay-okee Overlook — the river of grass'],
      [25.2146, -80.8430, 'Mahogany Hammock — largest mahogany tree in US'],
      [25.1392, -80.8933, 'Nine Mile Pond canoe loop — gators in every channel'],
      [25.0850, -81.0800, 'Flamingo marina — southernmost point in mainland US'],
      [25.1417, -80.8994, 'Snake Bight Trail — roseate spoonbills in the mangroves'],
      [25.8548, -81.3596, 'Big Cypress Swamp — cypress domes and orchids'],
      [25.8587, -81.5817, 'Turner River Road — swamp buggy country'],
      [25.8605, -81.6210, 'Fakahatchee Strand — ghost orchid territory'],
      [25.9342, -81.7001, 'Ten Thousand Islands — kayak among the mangroves'],
      [25.9000, -81.7200, 'Chokoloskee Island — end of the road outpost'],
    ],
  },

  {
    owner: 7, country: 'US', daysAgo: 66,
    title: 'Outer Banks & Cape Hatteras',
    desc: 'Barrier islands stretching 200 miles off the North Carolina coast. Wild horses, shipwrecks, and the Wright Brothers.',
    pts: [
      [36.8981, -76.2592, 'Norfolk VA — start the drive east'],
      [36.8816, -75.9800, 'Corolla — wild horses on the beach'],
      [36.6881, -75.9150, 'Duck — calm sound-side kayaking'],
      [36.0576, -75.6680, 'Kill Devil Hills — Wright Brothers Monument'],
      [35.9082, -75.6796, 'Nags Head — classic beach town boardwalk'],
      [35.7668, -75.5319, 'Bodie Island Lighthouse — black and white stripes'],
      [35.5072, -75.4682, 'Pea Island NWR — migratory birds in the millions'],
      [35.2326, -75.5260, 'Cape Hatteras Lighthouse — tallest brick lighthouse in the US'],
      [35.2327, -75.5259, 'Graveyard of the Atlantic — 1,000 wrecks below you'],
      [35.0697, -75.9900, 'Ocracoke Island — ferry to the remote village'],
      [35.1138, -75.9867, 'Ocracoke ponies — descendants of Spanish mustangs'],
      [35.1068, -75.9881, 'Silver Lake Harbor — waterfront restaurants'],
    ],
  },

  {
    owner: 8, country: 'US', daysAgo: 72,
    title: 'New Orleans & The Mississippi Delta',
    desc: 'Jazz, gumbo, Mardi Gras beads, and the most unique culture in America. The French Quarter never sleeps.',
    pts: [
      [29.9511, -90.0715, 'Jackson Square — St. Louis Cathedral backdrop'],
      [29.9584, -90.0640, 'Cafe Du Monde — beignets and cafe au lait'],
      [29.9575, -90.0695, 'Bourbon Street — self-explanatory'],
      [29.9500, -90.0800, 'Garden District Victorian mansions'],
      [29.9464, -90.1159, 'Magazine Street — antiques and boutiques'],
      [29.9378, -90.1200, 'Commander\'s Palace — best food in New Orleans'],
      [29.9740, -90.0460, 'Tremé — oldest Black neighborhood in America'],
      [29.9512, -90.0716, 'Frenchmen Street — real jazz, not tourist jazz'],
      [29.9880, -90.2090, 'City Park — live oaks draped in Spanish moss'],
      [29.9100, -89.9300, 'Chalmette Battlefield — Battle of New Orleans'],
      [29.7500, -90.2000, 'Barataria Preserve — bayou boat tour with alligators'],
      [29.6800, -91.2000, 'Cajun Country — Atchafalaya swamp at sunset'],
    ],
  },

  // ── CANADA ──────────────────────────────────────────────────────────────

  {
    owner: 0, country: 'CA', daysAgo: 10,
    title: 'Banff, Lake Louise & Moraine Lake',
    desc: 'Turquoise glacier lakes that don\'t look real in photos and are even more unreal in person. The Icefields Parkway is the finest drive in North America.',
    pts: [
      [51.1784, -115.5708, 'Banff townsite — elk jam the main street'],
      [51.1755, -115.5707, 'Banff Springs Hotel — the castle in the Rockies'],
      [51.4254, -116.1773, 'Lake Louise — the most famous blue lake on Earth'],
      [51.3230, -116.1838, 'Plain of Six Glaciers teahouse hike'],
      [51.3263, -116.2395, 'Moraine Lake — even bluer than Louise'],
      [51.2500, -115.5996, 'Bow Lake — mirror-still at dawn'],
      [51.7001, -116.2165, 'Peyto Lake — wolf-shaped turquoise lake above the trees'],
      [51.9783, -117.0001, 'Saskatchewan Crossing roadside lunch stop'],
      [52.1879, -116.9476, 'Columbia Icefield — walk on the Athabasca Glacier'],
      [52.2170, -117.2340, 'Sunwapta Falls — powerful double falls'],
      [52.6501, -117.8000, 'Athabasca Falls — most powerful falls in the Rockies'],
      [52.8734, -117.9543, 'Jasper town — elk literally everywhere'],
      [52.9907, -118.0765, 'Maligne Lake — Spirit Island at golden hour'],
    ],
  },

  {
    owner: 9, country: 'CA', daysAgo: 18,
    title: 'Vancouver Island: Tofino to Victoria',
    desc: 'Old-growth rainforest, Pacific surf, and orca-filled waters. Canada\'s wild west coast at its most dramatic.',
    pts: [
      [48.4284, -123.3656, 'Victoria Inner Harbour — whale watch boats lined up'],
      [48.5200, -123.4000, 'Butchart Gardens — sunken garden illuminated at night'],
      [48.5600, -124.2700, 'Port Renfrew — start of the remote west coast'],
      [48.6800, -124.4300, 'Botanical Beach — tidal pools full of life'],
      [48.9700, -125.5500, 'Port Alberni — gateway to the Broken Group Islands'],
      [49.1500, -125.9000, 'Pacific Rim National Park — Long Beach'],
      [49.1300, -125.8800, 'Long Beach — 16km of wild Pacific surf'],
      [49.1539, -125.9028, 'Tofino surf school — first wave'],
      [49.1540, -125.9019, 'Tofino sea kayaking through the inlets'],
      [49.1600, -125.9100, 'Hot Springs Cove — boat out to natural hot springs'],
      [49.8000, -126.8500, 'Strathcona Provincial Park — highest peaks on the island'],
      [50.7200, -127.4900, 'Cape Scott — lighthouse at the island\'s tip'],
    ],
  },

  {
    owner: 10, country: 'CA', daysAgo: 22,
    title: 'Quebec City & The Laurentians',
    desc: 'The only walled city in North America north of Mexico. Cobblestones, crêpes, and the most European feeling city on the continent.',
    pts: [
      [45.5017, -73.5673, 'Montreal — Plateau-Mont-Royal brunch'],
      [45.5016, -73.5674, 'Old Montreal — cobblestones and the port'],
      [45.5048, -73.5545, 'Mont Royal Park — sunrise over the city'],
      [46.4500, -74.3000, 'Mont-Tremblant ski village — summer hiking'],
      [46.6500, -75.0000, 'Parc des Laurentides — endless boreal lakes'],
      [46.8139, -71.2080, 'Quebec City — Château Frontenac looms above'],
      [46.8140, -71.2080, 'Old Lower Town — Rue du Petit-Champlain'],
      [46.8560, -71.2085, 'Plains of Abraham — historic battle site'],
      [46.8530, -71.2690, 'Montmorency Falls — taller than Niagara'],
      [47.0500, -70.8000, 'Île d\'Orléans — farm stands and cider houses'],
      [47.5500, -70.4500, 'La Malbaie — whale watching in the St. Lawrence'],
      [47.6500, -70.1500, 'Tadoussac — beluga whales at river\'s edge'],
    ],
  },

  {
    owner: 11, country: 'CA', daysAgo: 28,
    title: 'Cape Breton Cabot Trail',
    desc: 'Scotland without the flight. The Cabot Trail is one of the world\'s great coastal drives — cliffs, whales, and Celtic music in every pub.',
    pts: [
      [46.1351, -60.1831, 'Sydney — Cape Breton\'s capital city'],
      [46.1400, -60.1800, 'Fortress of Louisbourg — reconstructed French fortress'],
      [46.3700, -60.6400, 'Baddeck — Alexander Graham Bell Museum'],
      [46.7500, -60.8600, 'Ingonish Beach — Cape Breton Highlands Golf'],
      [46.8300, -60.4900, 'Cape Breton Highlands NP entrance'],
      [46.9800, -60.4800, 'Skyline Trail — cliffs above whale-filled water'],
      [46.8000, -60.8900, 'French Mountain summit — highest point on the trail'],
      [46.6700, -61.1200, 'Chéticamp — Acadian culture and lobster'],
      [46.4800, -61.0100, 'Mabou Highlands — best hiking off the main trail'],
      [45.9700, -61.1400, 'Bras d\'Or Lake — inland sea in the middle of the island'],
      [46.1350, -59.9600, 'Glace Bay Miners\' Museum'],
      [46.1100, -60.5700, 'Iona — the Highland Village living museum'],
    ],
  },

  {
    owner: 12, country: 'CA', daysAgo: 36,
    title: 'Haida Gwaii: Canada\'s Galápagos',
    desc: 'The most remote and culturally rich destination in Canada. Ancient totem poles in old-growth Sitka spruce.',
    pts: [
      [53.2500, -132.0700, 'Masset — northern gateway of Haida Gwaii'],
      [53.2400, -132.0800, 'Naikoon Provincial Park — pristine wild beaches'],
      [53.2000, -132.0600, 'Rose Spit — where two oceans meet'],
      [53.1000, -132.1000, 'Tlell — the bohemian art community'],
      [53.0400, -132.0900, 'Old Massett — the Haida village'],
      [53.0000, -132.1200, 'Queen Charlotte City — main hub island'],
      [52.9500, -132.0800, 'Skidegate — Haida Heritage Centre'],
      [52.8000, -131.8000, 'Moresby Island — world-class kayaking'],
      [52.5000, -131.5000, 'Gwaii Haanas reserve — ancient village sites'],
      [52.3000, -131.4000, 'SGang Gwaay — UNESCO totem poles in the rain'],
      [52.0500, -131.1500, 'Cape St. James — southernmost lighthouse'],
      [53.1000, -132.0000, 'Masset Inlet — bald eagles above every tree'],
    ],
  },

  {
    owner: 13, country: 'CA', daysAgo: 44,
    title: 'Churchill: Polar Bears & Northern Lights',
    desc: 'The polar bear capital of the world. October/November they wait for Hudson Bay to freeze. Auroras overhead. Belugas in summer.',
    pts: [
      [58.7600, -94.1600, 'Churchill town — accessible only by train or plane'],
      [58.7700, -94.1800, 'Cape Merry — beluga whales in July at the river mouth'],
      [58.7600, -94.1700, 'Polar Bear Alert Program headquarters'],
      [58.7400, -93.8200, 'Wapusk National Park — polar bear denning area'],
      [58.7600, -94.1000, 'Tundra Buggy safari — bears at eye level'],
      [58.7800, -94.2000, 'Northern lights over the Hudson Bay'],
      [58.7700, -94.2000, 'Fort Prince of Wales — star-shaped stone fortress'],
      [58.7600, -94.1600, 'Itsanitaq Museum — Inuit artifacts'],
      [58.7000, -93.9000, 'Goose Creek migration — snow geese in the thousands'],
      [58.7600, -94.0800, 'Churchill Northern Studies Centre'],
      [58.8000, -94.2500, 'Twin Lakes — boreal forest edge'],
      [58.7600, -94.1600, 'Kelsey Boulevard — the one main road in town'],
    ],
  },

  {
    owner: 14, country: 'CA', daysAgo: 52,
    title: 'Prince Edward Island: Anne\'s Island',
    desc: 'Red sand beaches, the best lobster in the world, and the gentle pastoral beauty that inspired Anne of Green Gables.',
    pts: [
      [46.2382, -63.1311, 'Charlottetown — Canada\'s birthplace, confederation history'],
      [46.4360, -63.4186, 'Green Gables Heritage Place — Lucy Maud Montgomery country'],
      [46.5000, -63.7800, 'North Rustico beach — PEI\'s red sand coast'],
      [46.5400, -64.0200, 'PEI National Park — rolling dunes and warm water'],
      [46.5600, -64.1900, 'Cavendish beach — summer family crowds worth it'],
      [46.3700, -64.1100, 'Summerside — lobster suppers in church halls'],
      [46.1500, -62.7500, 'Wood Islands ferry terminal — connection to NS'],
      [46.0000, -62.6500, 'Murray River — oyster leases in the bay'],
      [46.2000, -62.5500, 'Eastern PEI — the quiet, uncrowded side'],
      [46.3900, -63.5200, 'Stanley Bridge Studios — local art scene'],
      [46.2382, -63.1311, 'Peakes Quay waterfront — craft beer and seafood'],
      [46.3400, -63.8800, 'Brackley Beach — sunset boardwalk over the dunes'],
    ],
  },

  // ── MEXICO ──────────────────────────────────────────────────────────────

  {
    owner: 15, country: 'MX', daysAgo: 30,
    title: 'Tulum & The Cenotes of Yucatán',
    desc: 'Mayan ruins on a Caribbean cliff, underground rivers you can swim through, and white sand cenotes that seem to go on forever.',
    pts: [
      [21.1619, -86.8515, 'Cancún — fly in, escape to the south immediately'],
      [20.6296, -87.0739, 'Playa del Carmen — 5th Avenue and the ferry'],
      [20.4225, -86.9225, 'Akumal — swim with sea turtles in the bay'],
      [20.2114, -87.4655, 'Cobá ruins — climb the last climbable Mayan pyramid'],
      [20.2268, -87.4655, 'Cenote Azul — jump from 10-foot ledges'],
      [20.2153, -87.4671, 'Cenote Cristal — crystal clear underground river'],
      [20.2320, -87.4340, 'Gran Cenote Tulum — snorkel the cave system'],
      [20.2121, -87.4291, 'Tulum ruins at sunrise — cliff over the Caribbean'],
      [20.2130, -87.4291, 'Tulum beach — the most photographed ruins'],
      [20.1900, -87.5600, 'Sian Ka\'an Biosphere — UNESCO boat lagoons'],
      [20.1600, -87.6500, 'Punta Allen — remote fishing village at the tip'],
      [19.8301, -87.7676, 'Muyil ruins — buried in the jungle'],
    ],
  },

  {
    owner: 16, country: 'MX', daysAgo: 38,
    title: 'Copper Canyon: Chihuahua al Pacífico',
    desc: 'Four times bigger than the Grand Canyon. The Ferrochihuahua train is one of the great rail journeys in the world.',
    pts: [
      [28.6353, -106.0889, 'Chihuahua City — start of the rail journey'],
      [28.4000, -106.8600, 'Cuauhtémoc — Mennonite cheese country'],
      [27.8400, -107.3300, 'Creel — the cowboy town in the high Sierra'],
      [27.8500, -107.3400, 'Arareko Lake — the quiet Rarámuri villages'],
      [27.7000, -107.5000, 'Basihuare viewpoint — first look at the canyon system'],
      [27.5500, -107.8900, 'Divisadero station — canyon rim at 7,700 feet'],
      [27.3800, -108.0500, 'Barranca del Cobre (Copper Canyon) — the big drop'],
      [27.3000, -108.2000, 'Urique village — canyon floor at 1,800 feet'],
      [27.0000, -108.5000, 'Los Mochis — Pacific coast descent'],
      [27.5500, -107.9000, 'Cerocahui colonial mission town'],
      [27.4000, -107.7000, 'Tarahumara villages — ultra-running culture'],
      [26.8000, -109.0000, 'El Fuerte — colonial town near the Pacific'],
    ],
  },

  {
    owner: 17, country: 'MX', daysAgo: 46,
    title: 'Oaxaca: Mezcal, Mole & Monte Albán',
    desc: 'The culinary and cultural capital of Mexico. Tlayudas, mole negro, and 2,500-year-old Zapotec ruins above the city.',
    pts: [
      [17.0732, -96.7266, 'Oaxaca City Zócalo — under the jacaranda trees'],
      [17.0732, -96.7300, 'Mercado Benito Juárez — cheese, chocolate, chapulines'],
      [17.0700, -96.7267, 'Templo de Santo Domingo — gold-dripping interior'],
      [17.0432, -96.7699, 'Monte Albán — astronomical observatory, 500 BC'],
      [17.3790, -96.5990, 'Tule — tree with the widest trunk on Earth'],
      [17.4300, -96.4600, 'Mitla — finest Zapotec stonework in the world'],
      [16.9300, -96.5900, 'Hierve el Agua — petrified waterfall and pool'],
      [17.1700, -96.6900, 'Teotitlán del Valle — natural dye weaving cooperatives'],
      [17.1000, -97.1500, 'Cuilapam de Guerrero — roofless colonial church'],
      [16.8100, -96.6100, 'Ocotlán de Morelos — Josefina Aguilar pottery market'],
      [17.0500, -96.9800, 'Etla mezcal distillery — open-fire roasted agave'],
      [17.0700, -96.7200, 'El Llano park sunset — families, music, tlayudas'],
    ],
  },

  {
    owner: 18, country: 'MX', daysAgo: 54,
    title: 'Baja Peninsula: Tijuana to Cabo',
    desc: '1,000 miles of the Pacific on one side, the Sea of Cortez on the other. Gray whale nurseries, vineyards, and desert hot springs.',
    pts: [
      [32.5149, -117.0382, 'Tijuana — cross the border on foot, eat tacos immediately'],
      [31.8333, -116.6000, 'Valle de Guadalupe — Baja wine country'],
      [29.0667, -114.0800, 'Guerrero Negro — gray whale watching January-March'],
      [27.9300, -114.1500, 'Laguna San Ignacio — whale nursery lagoon'],
      [27.2992, -112.4569, 'San Ignacio Mission — the most remote colonial town'],
      [26.9183, -111.9900, 'Santa Rosalía — French-designed iron church'],
      [26.0111, -111.3422, 'Mulegé — date palm oasis and mission'],
      [26.9012, -109.8560, 'Loreto Mission — first permanent European settlement in the Californias'],
      [24.1440, -110.3120, 'La Paz — relaxed capital with whale shark swims'],
      [23.9000, -109.9200, 'Los Barriles — kitesurfing and East Cape surf'],
      [22.9167, -109.9167, 'Cabo Pulmo reef — the only coral reef in the Sea of Cortez'],
      [22.8905, -109.9167, 'Cabo San Lucas — Land\'s End arch where two seas meet'],
    ],
  },

  {
    owner: 19, country: 'MX', daysAgo: 62,
    title: 'Mexico City & Teotihuacán',
    desc: 'The largest city in the Western Hemisphere, and the Pyramid of the Sun outside it. World-class museums, best tacos, and incredible energy.',
    pts: [
      [19.4326, -99.1332, 'Zócalo — the heartbeat of Mexico City'],
      [19.4354, -99.1386, 'Palacio de Bellas Artes — Diego Rivera murals inside'],
      [19.4270, -99.1276, 'Templo Mayor — Aztec ruins in the middle of the city'],
      [19.3543, -99.1627, 'Coyoacán — Frida Kahlo\'s blue house'],
      [19.3545, -99.1629, 'Museo Frida Kahlo — sold out 3 weeks ahead'],
      [19.3200, -99.1890, 'Xochimilco floating gardens — trajinera boats'],
      [19.4890, -99.2050, 'Chapultepec Park — the largest urban park in the Americas'],
      [19.3937, -99.1555, 'Polanco — tacos al pastor from street carts at 2am'],
      [19.6920, -98.8440, 'Teotihuacán — Sun and Moon pyramids at dawn'],
      [19.6930, -98.8432, 'Avenue of the Dead — 3km of ceremonial spine'],
      [19.7000, -98.8500, 'Pyramid of the Moon — best view of the whole site'],
      [19.4000, -99.1700, 'Roma Norte — the hippest 10 blocks in Latin America'],
    ],
  },

  {
    owner: 0, country: 'MX', daysAgo: 70,
    title: 'Guanajuato & San Miguel de Allende',
    desc: 'Two UNESCO colonial cities so beautiful they look fake. Colorful buildings stacked on hillsides, underground roads through tunnels, and mummies.',
    pts: [
      [21.0190, -101.2574, 'Guanajuato city center — subterranean road system'],
      [21.0199, -101.2570, 'Callejón del Beso — the alley of the kiss'],
      [21.0200, -101.2575, 'Pípila monument — panorama over the rainbow city'],
      [21.0190, -101.2574, 'Mercado Hidalgo — Art Nouveau iron market hall'],
      [21.0150, -101.2600, 'Mummies of Guanajuato — the famous natural mummies'],
      [20.9167, -100.7500, 'San Miguel de Allende — most beautiful town in Mexico'],
      [20.9130, -100.7430, 'La Parroquia — the pink neo-Gothic cathedral'],
      [20.9100, -100.7500, 'El Charco del Ingenio botanical garden'],
      [20.9200, -100.8000, 'Hot springs at La Gruta — outdoor thermal pools'],
      [21.1500, -101.6800, 'León — shoe capital and leather markets'],
      [20.8000, -101.2800, 'Dolores Hidalgo — where Mexican independence began'],
      [20.9130, -100.7430, 'Rooftop bar on the Jardín — tequila as the sun sets'],
    ],
  },

]

// ── Helpers ───────────────────────────────────────────────────────────────────

function daysAgoISO(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString()
}

function picsum(seed: string, idx: number): string {
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}-${idx}/1200/800`
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function seed() {
  console.log('🌱  Seeding Ritual Rollers — 50 North American trips\n')

  // 1. Users
  console.log('👤  Creating users...')
  const userIds: string[] = []

  for (const u of USERS) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: u.email, password: u.password,
      email_confirm: true,
      user_metadata: { username: u.username },
    })

    if (error && !error.message.includes('already been registered')) {
      console.error(`  ❌ ${u.username}: ${error.message}`)
      userIds.push(''); continue
    }

    let uid = data?.user?.id
    if (!uid) {
      const { data: list } = await supabase.auth.admin.listUsers()
      uid = list?.users.find(us => us.email === u.email)?.id
    }
    if (!uid) { console.error(`  ❌ no id for ${u.email}`); userIds.push(''); continue }

    userIds.push(uid)
    await supabase.from('profiles').upsert(
      { id: uid, username: u.username },
      { onConflict: 'id', ignoreDuplicates: false }
    )
    console.log(`  ✓ @${u.username}`)
  }

  // 2. Trips + photos
  console.log('\n🗺️   Creating 50 trips...')
  const tripIds: string[] = []

  for (const t of TRIPS) {
    const ownerId = userIds[t.owner]
    if (!ownerId) { tripIds.push(''); continue }

    const { data: trip, error } = await supabase
      .from('trips')
      .insert({
        owner_id: ownerId,
        title: t.title,
        description: t.desc,
        is_public: true,
        country_code: t.country,
        created_at: daysAgoISO(t.daysAgo + 1),
      })
      .select().single()

    if (error || !trip) {
      console.error(`  ❌ "${t.title}": ${error?.message}`)
      tripIds.push(''); continue
    }

    let coverId: string | null = null
    for (let i = 0; i < t.pts.length; i++) {
      const [lat, lng, caption] = t.pts[i]
      const { data: photo } = await supabase
        .from('trip_photos')
        .insert({
          trip_id: trip.id,
          uploader_id: ownerId,
          storage_path: picsum(t.title, i),   // picsum URL used directly as storage_path
          lat, lng, caption,
          taken_at: daysAgoISO(t.daysAgo - Math.floor(i * 0.5)),
          sequence_order: i,
        })
        .select().single()
      if (i === 0 && photo) coverId = photo.id
    }
    if (coverId) await supabase.from('trips').update({ cover_photo_id: coverId }).eq('id', trip.id)

    tripIds.push(trip.id)
    console.log(`  ✓ [${t.country}] "${t.title}"`)
  }

  // 3. Follows
  console.log('\n🤝  Creating follows...')
  const pairs: [number, number][] = [
    [0,1],[0,2],[0,3],[0,6],[1,0],[1,3],[1,7],[2,0],[2,5],[2,9],
    [3,0],[3,1],[4,0],[4,2],[5,0],[5,3],[6,1],[6,7],[7,0],[7,4],
    [8,0],[8,1],[9,2],[9,6],[10,0],[10,4],[11,0],[11,1],[12,3],[12,9],
    [13,0],[13,6],[14,1],[14,8],[15,0],[15,2],[16,3],[16,7],[17,0],[18,1],
    [19,0],[19,5],
  ]
  for (const [f, t] of pairs) {
    const fid = userIds[f], tid = userIds[t]
    if (fid && tid) await supabase.from('follows').upsert(
      { follower_id: fid, following_id: tid },
      { onConflict: 'follower_id,following_id', ignoreDuplicates: true }
    )
  }
  console.log(`  ✓ ${pairs.length} relationships`)

  // 4. Upvotes
  console.log('\n⬆️   Adding upvotes...')
  let total = 0
  for (let ti = 0; ti < tripIds.length; ti++) {
    const tid = tripIds[ti]
    if (!tid) continue
    const ownerIdx = TRIPS[ti].owner
    for (let ui = 0; ui < userIds.length; ui++) {
      if (ui === ownerIdx || Math.random() > 0.45) continue
      const uid = userIds[ui]
      if (!uid) continue
      await supabase.from('upvotes').upsert(
        { user_id: uid, trip_id: tid },
        { onConflict: 'user_id,trip_id', ignoreDuplicates: true }
      )
      total++
    }
  }
  console.log(`  ✓ ${total} upvotes`)

  console.log('\n✅  Done!\n')
  console.log('  Email:    dave@clickshift.ca')
  console.log('  Password: password\n')
}

seed().catch(e => { console.error(e); process.exit(1) })
