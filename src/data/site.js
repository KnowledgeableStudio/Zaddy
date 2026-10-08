// Single source of truth for all site content.
// Prices live ONLY here — the cart stores product IDs and looks prices up
// from this catalog so totals can't be tampered with via localStorage.

export const ARTIST = {
  name: 'iZad Casanova',
  tagline: "De Nueva York Pa' El Universo",
  location: 'Bronx, New York',
  email: 'izadcasanovaofficial@gmail.com',
};

export const SHIPPING = 5;

export const PRODUCTS = [
  {
    id: 'signature-mask',
    name: 'Signature Mask',
    description: 'Limited edition iZad Casanova Signature Mask',
    price: 200,
    image: 'mask-signature',
    badge: null,
  },
  {
    id: 'urban-mask',
    name: 'Urban Mask',
    description: 'Premium edition iZad Casanova Urban Mask',
    price: 200,
    image: 'mask-urban',
    badge: null,
  },
  {
    id: 'elite-mask',
    name: 'Elite Mask',
    description: 'Street-inspired edition iZad Casanova Elite Mask',
    price: 200,
    image: 'mask-elite',
    badge: 'Limited',
  },
];

export const RELEASES = [
  {
    id: 'lleno-de-balas',
    title: 'Lleno de Balas',
    meta: 'Single · 2025',
    artwork: 'lleno-de-balas',
    videoId: '6uzyCcCB4Ak',
    links: [
      { label: 'Watch on YouTube', url: 'https://www.youtube.com/watch?v=6uzyCcCB4Ak&list=OLAK5uy_lVShiu6B5qmErJk-HaA3akJPpdWIqQzXY&index=1', primary: true },
      { label: 'Apple Music', url: 'https://music.apple.com/us/album/lleno-de-balas-single/1797028897', primary: false },
    ],
  },
  {
    id: 'todavia',
    title: 'Todavía te recuerdo',
    meta: 'Single · 2025',
    artwork: 'todavia',
    videoId: 'B3WeEKW2Yys',
    links: [
      { label: 'Watch on YouTube', url: 'https://www.youtube.com/watch?v=B3WeEKW2Yys', primary: true },
      { label: 'Spotify', url: 'https://open.spotify.com/artist/3OJiIxT52kCVJzQOWdmAj3', primary: false },
    ],
  },
];

export const PLATFORMS = [
  { name: 'Spotify', url: 'https://open.spotify.com/artist/3OJiIxT52kCVJzQOWdmAj3', icon: 'siSpotify' },
  { name: 'Apple Music', url: 'https://music.apple.com/us/album/lleno-de-balas-single/1797028897', icon: 'siApplemusic' },
  { name: 'YouTube', url: 'https://www.youtube.com/@iZadCasanovaOfficial', icon: 'siYoutube' },
  { name: 'Instagram', url: 'https://www.instagram.com/izadcasanovaofficial/', icon: 'siInstagram' },
  { name: 'TikTok', url: 'https://www.tiktok.com/@izadcasanovaofficial', icon: 'siTiktok' },
  { name: 'SoundCloud', url: 'https://soundcloud.com/izad-casanova', icon: 'siSoundcloud' },
  { name: 'Facebook', url: 'https://www.facebook.com/izadcasanova', icon: 'siFacebook' },
  { name: 'Threads', url: 'https://www.threads.com/@izadcasanovaofficial', icon: 'siThreads' },
  { name: 'Deezer', url: 'https://www.deezer.com/us/artist/303122241', icon: 'siDeezer' },
  { name: 'Shazam', url: 'https://www.shazam.com/artist/izad-casanova/1796466691', icon: 'siShazam' },
  { name: 'Amazon Music', url: 'https://music.amazon.es/artists/B0DX8BB36T/izad-casanova', icon: null },
  { name: 'Boomplay', url: 'https://www.boomplay.com/artists/106538924', icon: null },
];

export const PAYPAL_CLIENT_ID = 'ATREYJecc_skxjfSQa73hvdfNu8SXE77XJX5Zl2WGCNbgLPNdWbUNV6OJ5bjkTDcqOqlvGhG2Q-vZDy0';
