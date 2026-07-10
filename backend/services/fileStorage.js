/**
 * Durable file storage for uploads (KYC documents, avatars).
 *
 * On Catalyst AppSail files are stored in Catalyst File Store so they survive
 * redeploys (local disk is wiped on every deployment). During local
 * development files go to backend/uploads/ on disk as before.
 *
 * Storage keys stored in the DB (user_documents.file_path, users.avatar_path):
 *   'fs:<fileId>:<filename>'  → Catalyst File Store
 *   anything else             → legacy file on local disk / bundled uploads/
 */
const fs   = require('fs')
const os   = require('os')
const path = require('path')

const UPLOAD_DIR  = path.join(__dirname, '..', 'uploads')
const FOLDER_NAME = 'feazimove_uploads' // File Store allows only alphanumerics + underscore
const ON_CATALYST = !!process.env.X_ZOHO_CATALYST_LISTEN_PORT

let cachedFolderId = null

function initCatalyst(req) {
  const catalyst = require('zcatalyst-sdk-node')
  // Requests from the public internet carry no Zoho user session, so the SDK
  // must act with the app's own project credentials (admin scope). Fall back
  // to default init for environments where admin scope isn't applicable.
  try { return catalyst.initialize(req, { scope: 'admin' }) }
  catch { return catalyst.initialize(req) }
}

// SDK returns Folder class instances — details live behind toJSON()
function folderDetails(f) {
  return (f && typeof f.toJSON === 'function' ? f.toJSON() : f) || {}
}

async function getFolder(req) {
  const store = initCatalyst(req).filestore()
  if (cachedFolderId) return store.folder(cachedFolderId)

  const folders = await store.getAllFolders()
  let folder = (folders || []).find(f => folderDetails(f).folder_name === FOLDER_NAME)
  if (!folder) folder = await store.createFolder(FOLDER_NAME)
  cachedFolderId = Number(folderDetails(folder).id)
  return folder
}

function genFilename(originalname) {
  const ext = path.extname(originalname || '').slice(0, 10)
  return `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`
}

// Persist a multer memory-storage file; returns the storage key for the DB.
// The SDK's multipart upload requires a real file stream (in-memory streams
// are rejected as "wrong format"), so the buffer takes a brief trip via tmp.
async function saveUpload(req, file) {
  const filename = genFilename(file.originalname)
  if (ON_CATALYST) {
    const tmpPath = path.join(os.tmpdir(), filename)
    try {
      const folder = await getFolder(req)
      fs.writeFileSync(tmpPath, file.buffer)
      const uploaded = await folder.uploadFile({ code: fs.createReadStream(tmpPath), name: filename })
      return `fs:${uploaded.id}:${filename}`
    } catch (err) {
      console.error('fileStorage upload failed:', err.message, err.stack)
      throw err
    } finally {
      fs.unlink(tmpPath, () => {})
    }
  }
  fs.mkdirSync(UPLOAD_DIR, { recursive: true })
  fs.writeFileSync(path.join(UPLOAD_DIR, filename), file.buffer)
  return filename
}

// Stream a stored file to the response, whatever backend it lives in.
async function sendStored(req, res, key) {
  if (String(key).startsWith('fs:')) {
    const [, fileId, ...nameParts] = String(key).split(':')
    const folder = await getFolder(req)
    const data = await folder.downloadFile(fileId)
    res.type(path.extname(nameParts.join(':')) || 'bin')
    if (data && typeof data.pipe === 'function') return data.pipe(res)
    return res.send(Buffer.isBuffer(data) ? data : Buffer.from(data))
  }
  const filePath = path.join(UPLOAD_DIR, path.basename(key)) // basename — defeats path traversal
  if (!fs.existsSync(filePath)) return res.status(404).json({ message: 'File not found.' })
  res.sendFile(filePath)
}

// Best-effort delete — callers must not fail if the file is already gone.
async function deleteStored(req, key) {
  try {
    if (String(key).startsWith('fs:')) {
      const [, fileId] = String(key).split(':')
      const folder = await getFolder(req)
      await folder.deleteFile(fileId)
    } else {
      fs.unlinkSync(path.join(UPLOAD_DIR, path.basename(key)))
    }
  } catch { /* already gone or store unreachable — DB is the source of truth */ }
}

module.exports = { saveUpload, sendStored, deleteStored }
