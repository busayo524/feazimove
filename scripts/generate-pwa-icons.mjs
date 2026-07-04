// Generates PWA icons from public/favicon.png into public/
// - pwa-192x192.png, pwa-512x512.png: logo on transparent, contain-fit
// - pwa-maskable-512x512.png: logo at ~60% inside the maskable safe zone,
//   on the FeaziMove deep-olive brand background so Android's circle crop looks right
import sharp from 'sharp'

const SRC = 'public/favicon.png'
const BG = { r: 26, g: 36, b: 0, alpha: 1 } // #1a2400 sidebar brand dark

async function plain(size, out) {
  await sharp(SRC)
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(out)
  console.log('wrote', out)
}

async function maskable(size, out) {
  const inner = Math.round(size * 0.6)
  const logo = await sharp(SRC)
    .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer()
  await sharp({ create: { width: size, height: size, channels: 4, background: BG } })
    .composite([{ input: logo, gravity: 'centre' }])
    .png()
    .toFile(out)
  console.log('wrote', out)
}

await plain(192, 'public/pwa-192x192.png')
await plain(512, 'public/pwa-512x512.png')
await maskable(512, 'public/pwa-maskable-512x512.png')
await sharp(SRC).resize(180, 180, { fit: 'contain', background: BG }).flatten({ background: BG }).png().toFile('public/apple-touch-icon.png')
console.log('wrote public/apple-touch-icon.png')
