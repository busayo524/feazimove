// One-time (re-runnable) optimizer for src/assets photos.
// Downscales anything wider than 1920px and re-encodes JPEGs (quality 78,
// progressive) / PNGs over 300 KB. Skips SVGs and already-small files.
// Originals remain recoverable from git history.
import sharp from 'sharp'
import { readdirSync, statSync, renameSync, unlinkSync } from 'fs'
import { join, extname } from 'path'

sharp.cache(false) // Windows: keep input files unlocked so they can be replaced

const DIR = 'src/assets'
const MAX_W = 1920
const SKIP_BYTES = 300 * 1024

let before = 0, after = 0
for (const name of readdirSync(DIR)) {
  const ext = extname(name).toLowerCase()
  if (!['.jpg', '.jpeg', '.png'].includes(ext)) continue
  const file = join(DIR, name)
  const size = statSync(file).size
  if (size < SKIP_BYTES) continue

  const img = sharp(file)
  const meta = await img.metadata()
  let pipe = img.rotate() // bake in EXIF orientation before stripping metadata
  if (meta.width > MAX_W) pipe = pipe.resize({ width: MAX_W })
  pipe = ext === '.png'
    ? pipe.png({ compressionLevel: 9, palette: true })
    : pipe.jpeg({ quality: 78, progressive: true, mozjpeg: true })

  const tmp = file + '.tmp'
  await pipe.toFile(tmp)
  const newSize = statSync(tmp).size
  if (newSize < size) {
    unlinkSync(file)
    renameSync(tmp, file)
    console.log(`${name}: ${(size / 1048576).toFixed(1)} MB -> ${(newSize / 1048576).toFixed(2)} MB`)
    before += size; after += newSize
  } else {
    unlinkSync(tmp)
  }
}
console.log(`\nTotal: ${(before / 1048576).toFixed(1)} MB -> ${(after / 1048576).toFixed(1)} MB`)
