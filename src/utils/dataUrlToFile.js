// Converts a base64 data URL (from canvas.toDataURL or FileReader.readAsDataURL)
// into a File for multipart upload. Done synchronously with atob rather than
// fetch(dataUrl) — the app's CSP connect-src doesn't allow data: URLs, so
// fetch-based conversion silently fails and the file never gets uploaded.
export function dataUrlToFile(dataUrl, filename) {
  const [meta, base64] = dataUrl.split(',')
  const mime = meta.match(/^data:([^;]+)/)?.[1] || 'image/jpeg'
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new File([bytes], filename, { type: mime })
}
