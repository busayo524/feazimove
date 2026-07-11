/**
 * Client-side image compression for uploads.
 *
 * Phone cameras produce 2–8MB photos; nothing in the KYC/avatar flow needs
 * more than ~1600px. Downscaling before upload cuts registration data usage
 * and makes admin document viewing several times faster.
 *
 * Non-images (PDFs), GIFs, and already-small files pass through untouched.
 * Any failure falls back to the original file — compression must never
 * block a signup.
 */
export async function compressImage(file, { maxDim = 1600, quality = 0.85, skipBelow = 300 * 1024 } = {}) {
  if (!(file instanceof Blob) || !file.type?.startsWith('image/')) return file
  if (file.type === 'image/gif' || file.size <= skipBelow) return file
  try {
    const source = await loadImage(file)
    const width  = source.naturalWidth  || source.width
    const height = source.naturalHeight || source.height
    const scale  = Math.min(1, maxDim / Math.max(width, height))
    const canvas = document.createElement('canvas')
    canvas.width  = Math.max(1, Math.round(width * scale))
    canvas.height = Math.max(1, Math.round(height * scale))
    canvas.getContext('2d').drawImage(source, 0, 0, canvas.width, canvas.height)
    if (source.close) source.close()

    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality))
    if (!blob || blob.size >= file.size) return file // no gain — keep the original

    const name = (file.name || 'photo').replace(/\.[^.]+$/, '') + '.jpg'
    return new File([blob], name, { type: 'image/jpeg' })
  } catch {
    return file
  }
}

async function loadImage(file) {
  if (typeof createImageBitmap === 'function') {
    // 'from-image' applies EXIF rotation so portrait phone photos stay upright
    try { return await createImageBitmap(file, { imageOrientation: 'from-image' }) } catch { /* fall through */ }
    try { return await createImageBitmap(file) } catch { /* fall through */ }
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload  = () => { URL.revokeObjectURL(url); resolve(img) }
    img.onerror = err => { URL.revokeObjectURL(url); reject(err) }
    img.src = url
  })
}
