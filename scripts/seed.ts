/**
 * Seed script — creates test users, trips, follows, and upvotes.
 * Run with: npx tsx scripts/seed.ts
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL?.startsWith('https://') || !SERVICE_KEY) {
  console.error('❌  Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ─── Sample data ────────────────────────────────────────────────────────────

const USERS = [
  { username: 'dave',         email: 'dave@clickshift.ca',       password: 'password' },
  { username: 'nomad_nina',   email: 'nina@example.com',         password: 'password' },
  { username: 'atlas_alex',   email: 'alex@example.com',         password: 'password' },
  { username: 'wanderer_wei', email: 'wei@example.com',          password: 'password' },
  { username: 'roam_riya',    email: 'riya@example.com',         password: 'password' },
  { username: 'trek_tommy',   email: 'tommy@example.com',        password: 'password' },
  { username: 'drift_dana',   email: 'dana@example.com',         password: 'password' },
  { username: 'voyage_vic',   email: 'vic@example.com',          password: 'password' },
  { username: 'mile_mia',     email: 'mia@example.com',          password: 'password' },
  { username: 'horizon_hiro', email: 'hiro@example.com',         password: 'password' },
  { username: 'trail_tara',   email: 'tara@example.com',         password: 'password' },
  { username: 'cross_cal',    email: 'cal@example.com',          password: 'password' },
  { username: 'peak_priya',   email: 'priya@example.com',        password: 'password' },
  { username: 'basin_ben',    email: 'ben@example.com',          password: 'password' },
  { username: 'range_rosa',   email: 'rosa@example.com',         password: 'password' },
  { username: 'fjord_finn',   email: 'finn@example.com',         password: 'password' },
  { username: 'delta_dee',    email: 'dee@example.com',          password: 'password' },
  { username: 'steppe_sam',   email: 'sam@example.com',          password: 'password' },
  { username: 'coast_clara',  email: 'clara@example.com',        password: 'password' },
  { username: 'mesa_marco',   email: 'marco@example.com',        password: 'password' },
]

const TRIPS = [
  {
    ownerIndex: 1, // nina
    title: 'Pacific Coast Highway',
    description: 'The ultimate California road trip — Big Sur cliffs, coastal fog, and perfect sunsets.',
    photos: [
      { lat: 37.8716, lng: -122.2727, caption: 'Oakland Bay Bridge morning light', daysAgo: 30 },
      { lat: 37.5485, lng: -122.0597, caption: 'Fremont hills', daysAgo: 30 },
      { lat: 36.6002, lng: -121.8947, caption: 'Monterey waterfront', daysAgo: 29 },
      { lat: 36.2704, lng: -121.8081, caption: 'Big Sur — Bixby Creek Bridge', daysAgo: 29 },
      { lat: 35.6869, lng: -121.2898, caption: 'Elephant seal colony', daysAgo: 28 },
      { lat: 35.3733, lng: -120.8573, caption: 'San Luis Obispo', daysAgo: 28 },
      { lat: 34.4208, lng: -119.6982, caption: 'Santa Barbara mission', daysAgo: 27 },
      { lat: 34.0195, lng: -118.4912, caption: 'Santa Monica Pier sunset', daysAgo: 27 },
    ],
  },
  {
    ownerIndex: 2, // alex
    title: 'Scottish Highlands Loop',
    description: 'Lochs, castles, and whisky — three weeks through the wild north.',
    photos: [
      { lat: 55.8642, lng: -4.2518,  caption: 'Glasgow city centre', daysAgo: 60 },
      { lat: 56.1165, lng: -3.9369,  caption: 'Stirling Castle', daysAgo: 59 },
      { lat: 56.6879, lng: -4.0255,  caption: 'Loch Lomond', daysAgo: 58 },
      { lat: 57.2740, lng: -4.5130,  caption: 'Loch Ness shore', daysAgo: 57 },
      { lat: 57.4778, lng: -4.2247,  caption: 'Inverness', daysAgo: 56 },
      { lat: 57.8880, lng: -5.5218,  caption: 'Torridon mountains', daysAgo: 55 },
      { lat: 58.5987, lng: -5.1674,  caption: 'Cape Wrath cliffs', daysAgo: 54 },
      { lat: 58.2070, lng: -6.3608,  caption: 'Isle of Lewis standing stones', daysAgo: 53 },
    ],
  },
  {
    ownerIndex: 3, // wei
    title: 'Japan Cherry Blossom Chase',
    description: 'Following the sakura front from Kyushu to Hokkaido.',
    photos: [
      { lat: 33.5904, lng: 130.4017, caption: 'Fukuoka Canal City', daysAgo: 45 },
      { lat: 34.3853, lng: 132.4553, caption: 'Hiroshima Peace Park', daysAgo: 44 },
      { lat: 34.6937, lng: 135.5023, caption: 'Osaka Dotonbori night lights', daysAgo: 43 },
      { lat: 35.0116, lng: 135.7681, caption: 'Kyoto Arashiyama bamboo', daysAgo: 42 },
      { lat: 35.6762, lng: 139.6503, caption: 'Tokyo Shinjuku Gyoen', daysAgo: 40 },
      { lat: 36.5613, lng: 138.1804, caption: 'Matsumoto Castle', daysAgo: 39 },
      { lat: 43.0642, lng: 141.3469, caption: 'Sapporo Odori Park blossoms', daysAgo: 37 },
    ],
  },
  {
    ownerIndex: 0, // dave
    title: 'Banff & Jasper National Parks',
    description: 'Two weeks in the Canadian Rockies — turquoise lakes, elk jams, and perfect stargazing.',
    photos: [
      { lat: 51.1784, lng: -115.5708, caption: 'Banff townsite arrival', daysAgo: 14 },
      { lat: 51.4254, lng: -116.1773, caption: 'Lake Louise — impossibly blue', daysAgo: 13 },
      { lat: 51.7001, lng: -116.2165, caption: 'Peyto Lake viewpoint', daysAgo: 13 },
      { lat: 52.1879, lng: -116.9476, caption: 'Columbia Icefield', daysAgo: 12 },
      { lat: 52.8734, lng: -117.9543, caption: 'Jasper town elk herd', daysAgo: 11 },
      { lat: 52.9907, lng: -118.0765, caption: 'Maligne Lake Spirit Island', daysAgo: 11 },
      { lat: 53.2123, lng: -117.8236, caption: 'Athabasca Falls', daysAgo: 10 },
    ],
  },
  {
    ownerIndex: 4, // riya
    title: 'Morocco Desert to Medina',
    description: 'Sahara dunes, ancient riads, and the best mint tea of my life.',
    photos: [
      { lat: 33.9716, lng: -6.8498,  caption: 'Rabat old medina walls', daysAgo: 90 },
      { lat: 34.0209, lng: -5.0078,  caption: 'Fez tanneries at dawn', daysAgo: 89 },
      { lat: 31.6295, lng: -7.9811,  caption: 'Marrakech Djemaa el-Fna', daysAgo: 87 },
      { lat: 30.9335, lng: -6.9370,  caption: 'Aït Benhaddou kasbah', daysAgo: 86 },
      { lat: 31.5085, lng: -4.2258,  caption: 'Draa Valley palm grove', daysAgo: 85 },
      { lat: 31.1377, lng: -3.9931,  caption: 'Merzouga — Sahara dunes', daysAgo: 84 },
      { lat: 33.9987, lng: -5.7364,  caption: 'Volubilis Roman ruins', daysAgo: 82 },
    ],
  },
  {
    ownerIndex: 5, // tommy
    title: 'New Zealand South Island',
    description: "Fiords, glaciers, and filming locations you'll recognise from every fantasy film.",
    photos: [
      { lat: -43.5321, lng: 172.6362, caption: 'Christchurch botanical garden', daysAgo: 120 },
      { lat: -44.0200, lng: 170.4637, caption: 'Lake Tekapo — Church of the Good Shepherd', daysAgo: 119 },
      { lat: -43.7415, lng: 170.1028, caption: 'Mount Cook base camp', daysAgo: 118 },
      { lat: -44.6681, lng: 168.3663, caption: 'Wanaka lake view', daysAgo: 117 },
      { lat: -45.0311, lng: 168.6626, caption: 'Queenstown skyline', daysAgo: 116 },
      { lat: -45.4145, lng: 167.7190, caption: 'Milford Sound from the water', daysAgo: 115 },
      { lat: -43.3896, lng: 170.1908, caption: 'Fox Glacier hike', daysAgo: 113 },
    ],
  },
  {
    ownerIndex: 6, // dana
    title: 'Iceland Ring Road',
    description: '10 days, 1332 km, one unforgettable loop around the island.',
    photos: [
      { lat: 64.1466, lng: -21.9426, caption: 'Reykjavik Hallgrímskirkja', daysAgo: 20 },
      { lat: 63.5320, lng: -19.5044, caption: 'Seljalandsfoss waterfall behind the falls', daysAgo: 19 },
      { lat: 63.4050, lng: -18.7750, caption: 'Reynisfjara black sand beach', daysAgo: 19 },
      { lat: 64.0140, lng: -16.1769, caption: 'Vatnajökull glacier lagoon', daysAgo: 18 },
      { lat: 65.2640, lng: -14.4010, caption: 'East Fjords', daysAgo: 17 },
      { lat: 65.6833, lng: -18.0999, caption: 'Lake Mývatn geothermal area', daysAgo: 16 },
      { lat: 65.9650, lng: -18.5260, caption: 'Goðafoss waterfall', daysAgo: 16 },
      { lat: 64.9631, lng: -23.9371, caption: 'Snæfellsnes peninsula', daysAgo: 15 },
    ],
  },
  {
    ownerIndex: 7, // vic
    title: 'Patagonia End of the World',
    description: 'Torres del Paine, glaciers, and condors the size of small aircraft.',
    photos: [
      { lat: -33.4489, lng: -70.6693, caption: 'Santiago Plaza de Armas', daysAgo: 180 },
      { lat: -38.7369, lng: -72.5897, caption: 'Villarrica volcano smoke', daysAgo: 178 },
      { lat: -41.4693, lng: -72.9370, caption: 'Puerto Montt lakefront', daysAgo: 176 },
      { lat: -45.5752, lng: -72.0662, caption: 'Carretera Austral gravel road', daysAgo: 174 },
      { lat: -50.9423, lng: -73.4068, caption: 'Torres del Paine base', daysAgo: 172 },
      { lat: -50.5908, lng: -73.1447, caption: 'Grey Glacier calving', daysAgo: 171 },
      { lat: -51.7224, lng: -72.5014, caption: 'Puerto Natales', daysAgo: 170 },
    ],
  },
  {
    ownerIndex: 8, // mia
    title: 'Vietnam North to South',
    description: 'Hanoii street food, Halong Bay, Hội An lanterns, Mekong delta.',
    photos: [
      { lat: 21.0285, lng: 105.8542, caption: 'Hanoi Hoan Kiem Lake', daysAgo: 55 },
      { lat: 20.9101, lng: 107.1839, caption: 'Halong Bay — limestone karsts', daysAgo: 53 },
      { lat: 20.2671, lng: 105.9755, caption: 'Ninh Bình boat caves', daysAgo: 52 },
      { lat: 16.0544, lng: 108.2022, caption: 'Da Nang Marble Mountains', daysAgo: 50 },
      { lat: 15.8801, lng: 108.3380, caption: 'Hội An Ancient Town lanterns', daysAgo: 49 },
      { lat: 12.2388, lng: 109.1967, caption: 'Nha Trang beach', daysAgo: 47 },
      { lat: 10.8231, lng: 106.6297, caption: 'Ho Chi Minh City rooftop', daysAgo: 45 },
      { lat: 10.0452, lng: 105.7469, caption: 'Mekong Delta sunrise', daysAgo: 44 },
    ],
  },
  {
    ownerIndex: 9, // hiro
    title: 'Trans-Siberian Railway',
    description: '9,289 km. 7 time zones. The longest train journey on Earth.',
    photos: [
      { lat: 55.7558, lng: 37.6173,  caption: 'Moscow Red Square', daysAgo: 200 },
      { lat: 56.8519, lng: 60.6122,  caption: 'Yekaterinburg Asia-Europe border', daysAgo: 197 },
      { lat: 55.0415, lng: 82.9346,  caption: 'Novosibirsk train station', daysAgo: 194 },
      { lat: 52.2978, lng: 104.2964, caption: 'Irkutsk along the Angara', daysAgo: 191 },
      { lat: 51.8357, lng: 107.5866, caption: 'Lake Baikal frozen edge', daysAgo: 190 },
      { lat: 51.5347, lng: 107.6128, caption: 'Ulan-Ude Buryat temple', daysAgo: 189 },
      { lat: 47.9105, lng: 106.9052, caption: 'Ulaanbaatar, Mongolia', daysAgo: 186 },
      { lat: 43.8171, lng: 125.3235, caption: 'Changchun, Manchuria', daysAgo: 183 },
    ],
  },
  {
    ownerIndex: 10, // tara
    title: 'West Africa Overland',
    description: 'Dakar to Accra through Senegal, Guinea, and Ghana.',
    photos: [
      { lat: 14.6928, lng: -17.4467, caption: 'Dakar Pink Lake', daysAgo: 70 },
      { lat: 12.3666, lng: -15.5783, caption: 'Bissau colonial waterfront', daysAgo: 68 },
      { lat: 9.5370,  lng: -13.6773, caption: 'Conakry market', daysAgo: 66 },
      { lat: 8.4850,  lng: -13.2340, caption: 'Freetown beach, Sierra Leone', daysAgo: 64 },
      { lat: 6.3703,  lng: -10.7969, caption: 'Monrovia harbour', daysAgo: 62 },
      { lat: 5.3600,  lng: -4.0083,  caption: 'Abidjan Plateau skyline', daysAgo: 59 },
      { lat: 5.5600,  lng: -0.2057,  caption: 'Accra Labadi beach', daysAgo: 57 },
    ],
  },
  {
    ownerIndex: 0, // dave second trip
    title: 'Kyoto to Tokyo by Shinkansen',
    description: 'A short but epic bullet train sprint through the heart of Japan.',
    photos: [
      { lat: 35.0116, lng: 135.7681, caption: 'Kyoto Fushimi Inari torii gates', daysAgo: 7 },
      { lat: 35.0045, lng: 135.7680, caption: 'Nishiki Market morning', daysAgo: 7 },
      { lat: 34.9858, lng: 135.7585, caption: 'Kinkaku-ji Golden Pavilion', daysAgo: 6 },
      { lat: 35.3606, lng: 136.9269, caption: 'Nagoya Castle', daysAgo: 6 },
      { lat: 35.1709, lng: 136.8815, caption: 'Nagoya station shinkansen platform', daysAgo: 6 },
      { lat: 35.6762, lng: 139.6503, caption: 'Tokyo Shibuya scramble', daysAgo: 5 },
      { lat: 35.6586, lng: 139.7454, caption: 'Tokyo Tower at dusk', daysAgo: 5 },
    ],
  },
  {
    ownerIndex: 11, // cal
    title: 'Camino de Santiago',
    description: '800 km on foot. Blisters, friendship, and arrival tears at the cathedral.',
    photos: [
      { lat: 43.1630, lng: -1.2385,  caption: 'Saint-Jean-Pied-de-Port start', daysAgo: 35 },
      { lat: 42.8169, lng: -1.6440,  caption: 'Pamplona city walls', daysAgo: 33 },
      { lat: 42.4640, lng: -2.4449,  caption: 'Logroño wine fountain', daysAgo: 31 },
      { lat: 42.3440, lng: -3.6960,  caption: 'Burgos cathedral', daysAgo: 27 },
      { lat: 42.5987, lng: -5.5671,  caption: 'León stained glass basilica', daysAgo: 22 },
      { lat: 42.8805, lng: -8.5456,  caption: 'Santiago de Compostela — arrival', daysAgo: 7 },
    ],
  },
  {
    ownerIndex: 12, // priya
    title: 'Rajasthan Royal Circuit',
    description: 'Pink cities, blue cities, golden forts, and camel sunsets.',
    photos: [
      { lat: 26.9124, lng: 75.7873,  caption: 'Jaipur Hawa Mahal', daysAgo: 100 },
      { lat: 26.4499, lng: 74.6399,  caption: 'Ajmer Dargah', daysAgo: 99 },
      { lat: 24.5854, lng: 73.7125,  caption: 'Udaipur City Palace lake view', daysAgo: 97 },
      { lat: 26.2389, lng: 73.0243,  caption: 'Jodhpur blue city rooftops', daysAgo: 95 },
      { lat: 27.4948, lng: 72.9880,  caption: 'Jaisalmer golden fort', daysAgo: 93 },
      { lat: 27.2046, lng: 72.6060,  caption: 'Sam Sand Dunes camel ride', daysAgo: 92 },
      { lat: 27.1767, lng: 77.9306,  caption: 'Agra Taj Mahal sunrise', daysAgo: 90 },
    ],
  },
  {
    ownerIndex: 13, // ben
    title: 'Cycling the Danube',
    description: '800 km by bike from Passau to Budapest along the Donauradweg.',
    photos: [
      { lat: 48.5742, lng: 13.4581,  caption: 'Passau — three rivers confluence', daysAgo: 40 },
      { lat: 48.3069, lng: 14.2858,  caption: 'Linz steel city modernism', daysAgo: 38 },
      { lat: 48.1960, lng: 15.6257,  caption: 'Melk Abbey above the Danube', daysAgo: 37 },
      { lat: 48.2082, lng: 16.3738,  caption: 'Vienna Ringstrasse evening', daysAgo: 35 },
      { lat: 47.8141, lng: 16.5344,  caption: 'Bratislava old town', daysAgo: 33 },
      { lat: 47.9025, lng: 18.9362,  caption: 'Esztergom Basilica from river', daysAgo: 31 },
      { lat: 47.4979, lng: 19.0402,  caption: 'Budapest Chain Bridge arrival', daysAgo: 30 },
    ],
  },
  {
    ownerIndex: 14, // rosa
    title: 'Havana & the Cuban Interior',
    description: 'Classic cars, salsa, and tobacco farms — a country frozen in time.',
    photos: [
      { lat: 23.1136, lng: -82.3666, caption: 'Havana Malecón sunset', daysAgo: 150 },
      { lat: 23.1358, lng: -82.3591, caption: 'Old Havana Capitolio', daysAgo: 149 },
      { lat: 22.8132, lng: -83.7534, caption: 'Viñales valley tobacco farm', daysAgo: 148 },
      { lat: 22.8947, lng: -83.6882, caption: 'Viñales mogotes karst', daysAgo: 147 },
      { lat: 22.1456, lng: -80.4439, caption: 'Trinidad cobblestones', daysAgo: 145 },
      { lat: 22.0660, lng: -80.3873, caption: 'Trinidad music on the plaza', daysAgo: 144 },
      { lat: 20.0100, lng: -75.8200, caption: 'Santiago de Cuba — Castillo', daysAgo: 142 },
    ],
  },
  {
    ownerIndex: 15, // finn
    title: 'Norwegian Fjords by Ferry',
    description: 'Hurtigruten coastal voyage from Bergen to Tromsø.',
    photos: [
      { lat: 60.3913, lng: 5.3221,   caption: 'Bergen Bryggen wharf', daysAgo: 22 },
      { lat: 61.0295, lng: 6.0874,   caption: 'Flåm railway valley', daysAgo: 21 },
      { lat: 60.8644, lng: 6.8552,   caption: 'Nærøyfjord narrowest point', daysAgo: 21 },
      { lat: 62.1537, lng: 5.7861,   caption: 'Ålesund art nouveau town', daysAgo: 20 },
      { lat: 63.4305, lng: 10.3951,  caption: 'Trondheim Nidaros Cathedral', daysAgo: 19 },
      { lat: 67.2804, lng: 14.3750,  caption: 'Arctic Circle crossing celebration', daysAgo: 17 },
      { lat: 69.6492, lng: 18.9553,  caption: 'Tromsø northern lights', daysAgo: 15 },
    ],
  },
  {
    ownerIndex: 16, // dee
    title: 'Ethiopian Highlands to Danakil',
    description: 'Lalibela rock churches, Simien Mountains baboons, and an alien lava lake.',
    photos: [
      { lat: 9.0054,  lng: 38.7636,  caption: 'Addis Ababa National Museum', daysAgo: 80 },
      { lat: 11.5741, lng: 37.3708,  caption: 'Lake Tana monastery boats', daysAgo: 78 },
      { lat: 13.0303, lng: 38.1895,  caption: 'Simien Mountains gelada baboons', daysAgo: 76 },
      { lat: 12.0300, lng: 39.0483,  caption: 'Lalibela rock-hewn church', daysAgo: 74 },
      { lat: 14.4699, lng: 40.7637,  caption: 'Danakil Depression yellow sulphur', daysAgo: 72 },
      { lat: 13.6100, lng: 40.6700,  caption: 'Erta Ale lava lake at night', daysAgo: 71 },
    ],
  },
  {
    ownerIndex: 17, // sam
    title: 'Mongolia Eagle Hunters',
    description: 'Two weeks on horseback with the Kazakh eagle hunters of Bayan-Ölgii.',
    photos: [
      { lat: 47.9105, lng: 106.9052, caption: 'Ulaanbaatar ger district', daysAgo: 65 },
      { lat: 47.6500, lng: 104.2000, caption: 'Orkhon Valley steppe', daysAgo: 63 },
      { lat: 46.8700, lng: 102.7800, caption: 'Karakorum ancient capital ruins', daysAgo: 62 },
      { lat: 48.0900, lng: 99.1000,  caption: 'Tsetserleg monastery', daysAgo: 60 },
      { lat: 48.5000, lng: 89.9700,  caption: 'Bayan-Ölgii eagle hunter camp', daysAgo: 57 },
      { lat: 48.4800, lng: 89.9600,  caption: 'Eagle festival sunrise', daysAgo: 56 },
    ],
  },
  {
    ownerIndex: 18, // clara
    title: 'Amalfi Coast & Cinque Terre',
    description: 'Lemon granitas, cliffside trails, and anchovy pasta. Italy at its most dramatic.',
    photos: [
      { lat: 40.8364, lng: 14.2490,  caption: 'Naples Spaccanapoli', daysAgo: 25 },
      { lat: 40.6335, lng: 14.6026,  caption: 'Positano cliffside houses', daysAgo: 24 },
      { lat: 40.6501, lng: 14.6028,  caption: 'Amalfi Cathedral steps', daysAgo: 23 },
      { lat: 40.5531, lng: 14.7477,  caption: 'Ravello garden infinity view', daysAgo: 23 },
      { lat: 44.1214, lng: 9.7172,   caption: 'Riomaggiore harbour', daysAgo: 21 },
      { lat: 44.1414, lng: 9.7362,   caption: 'Via dell\'Amore coastal path', daysAgo: 20 },
      { lat: 44.1461, lng: 9.6400,   caption: 'Vernazza view from the trail', daysAgo: 20 },
      { lat: 44.1677, lng: 9.6414,   caption: 'Monterosso sunset beach', daysAgo: 19 },
    ],
  },
  {
    ownerIndex: 19, // marco
    title: 'Silk Road: Uzbekistan',
    description: 'Samarkand, Bukhara, and Khiva — the turquoise domes of Central Asia.',
    photos: [
      { lat: 41.2995, lng: 69.2401,  caption: 'Tashkent metro mosaics', daysAgo: 110 },
      { lat: 39.6270, lng: 66.9749,  caption: 'Samarkand Registan square', daysAgo: 108 },
      { lat: 39.6550, lng: 66.9597,  caption: 'Bibi-Khanym Mosque', daysAgo: 107 },
      { lat: 39.7770, lng: 64.4286,  caption: 'Bukhara Kalon Minaret', daysAgo: 105 },
      { lat: 39.7747, lng: 64.4147,  caption: 'Lyab-i-Hauz evening', daysAgo: 104 },
      { lat: 41.3775, lng: 60.3619,  caption: 'Khiva Itchan Kala inner city', daysAgo: 102 },
      { lat: 41.3744, lng: 60.3643,  caption: 'Islam Khoja minaret sunrise', daysAgo: 101 },
    ],
  },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function daysAgoISO(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString()
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function seed() {
  console.log('🌱 Seeding Ritual Rollers...\n')

  // 1. Create users
  console.log('👤 Creating users...')
  const userIds: string[] = []

  for (const u of USERS) {
    // Try to create; if already exists, fetch by email
    const { data, error } = await supabase.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
      user_metadata: { username: u.username },
    })

    if (error && !error.message.includes('already been registered')) {
      console.error(`  ❌ ${u.username}: ${error.message}`)
      userIds.push('')
      continue
    }

    let uid = data?.user?.id
    if (!uid) {
      // User already exists — look up by listing users
      const { data: list } = await supabase.auth.admin.listUsers()
      uid = list?.users.find(us => us.email === u.email)?.id
    }

    if (!uid) { console.error(`  ❌ Could not resolve id for ${u.email}`); userIds.push(''); continue }

    userIds.push(uid)
    console.log(`  ✓ ${u.username} (${uid.slice(0, 8)}...)`)

    // Upsert profile (trigger should handle it, but be safe)
    await supabase.from('profiles').upsert(
      { id: uid, username: u.username },
      { onConflict: 'id', ignoreDuplicates: false }
    )
  }

  // 2. Create trips + photos
  console.log('\n🗺️  Creating trips...')

  const tripIds: string[] = []

  for (const t of TRIPS) {
    const ownerId = userIds[t.ownerIndex]
    if (!ownerId) { tripIds.push(''); continue }

    const createdAt = daysAgoISO(t.photos[0].daysAgo + 1)

    const { data: trip, error } = await supabase
      .from('trips')
      .insert({
        owner_id: ownerId,
        title: t.title,
        description: t.description,
        is_public: true,
        created_at: createdAt,
      })
      .select()
      .single()

    if (error || !trip) { console.error(`  ❌ ${t.title}: ${error?.message}`); tripIds.push(''); continue }

    // Insert photos (no real images — storage_path is left as a placeholder)
    let coverId: string | null = null
    for (let i = 0; i < t.photos.length; i++) {
      const p = t.photos[i]
      const { data: photo } = await supabase
        .from('trip_photos')
        .insert({
          trip_id: trip.id,
          uploader_id: ownerId,
          storage_path: `seed/placeholder-${(i % 6) + 1}.jpg`,
          lat: p.lat,
          lng: p.lng,
          taken_at: daysAgoISO(p.daysAgo),
          caption: p.caption,
          sequence_order: i,
        })
        .select()
        .single()
      if (i === 0 && photo) coverId = photo.id
    }

    if (coverId) {
      await supabase.from('trips').update({ cover_photo_id: coverId }).eq('id', trip.id)
    }

    tripIds.push(trip.id)
    console.log(`  ✓ "${t.title}" by @${USERS[t.ownerIndex].username}`)
  }

  // 3. Follows — each user follows a few others
  console.log('\n🤝 Creating follows...')
  const followPairs: [number, number][] = [
    [0,1],[0,2],[0,3],[0,6],[0,8],
    [1,0],[1,3],[1,4],[1,7],
    [2,0],[2,1],[2,5],[2,9],
    [3,0],[3,1],[3,2],
    [4,0],[4,2],[4,6],[4,10],
    [5,0],[5,3],[5,8],
    [6,1],[6,2],[6,7],
    [7,0],[7,4],[7,5],
    [8,0],[8,1],[8,3],
    [9,2],[9,6],[9,7],
    [10,0],[10,4],[10,8],
    [11,0],[11,1],[11,5],
    [12,3],[12,4],[12,9],
    [13,0],[13,6],[13,7],
    [14,1],[14,8],[14,9],
    [15,0],[15,2],[15,5],
    [16,3],[16,7],[16,10],
    [17,0],[17,4],[17,6],
    [18,1],[18,2],[18,8],
    [19,0],[19,5],[19,9],
  ]

  for (const [from, to] of followPairs) {
    const fid = userIds[from], tid = userIds[to]
    if (!fid || !tid) continue
    await supabase.from('follows').upsert(
      { follower_id: fid, following_id: tid },
      { onConflict: 'follower_id,following_id', ignoreDuplicates: true }
    )
  }
  console.log(`  ✓ ${followPairs.length} follow relationships`)

  // 4. Upvotes
  console.log('\n⬆️  Creating upvotes...')
  let upvoteCount = 0
  for (let ti = 0; ti < tripIds.length; ti++) {
    const tid = tripIds[ti]
    if (!tid) continue
    // Each trip gets upvotes from several random users (not the owner)
    const ownerIdx = TRIPS[ti].ownerIndex
    const voters = userIds
      .map((uid, i) => ({ uid, i }))
      .filter(({ i }) => i !== ownerIdx && Math.random() > 0.4)
      .map(({ uid }) => uid)

    for (const uid of voters) {
      if (!uid) continue
      await supabase.from('upvotes').upsert(
        { user_id: uid, trip_id: tid },
        { onConflict: 'user_id,trip_id', ignoreDuplicates: true }
      )
      upvoteCount++
    }
  }
  console.log(`  ✓ ${upvoteCount} upvotes`)

  console.log('\n✅ Seed complete!')
  console.log('\nLog in with:')
  console.log('  Email:    dave@clickshift.ca')
  console.log('  Password: password')
  console.log('  (Switch to "Password" tab on the login page)\n')
}

seed().catch(e => { console.error(e); process.exit(1) })
