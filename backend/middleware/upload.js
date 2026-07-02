/**
 * File upload handling for registration documents (ID, selfie, vehicle docs).
 * Stored on local disk under backend/uploads/ — files are NOT served publicly;
 * they're only readable via the authenticated, admin-only document route.
 */
const fs   = require('fs')
const path = require('path')
const multer = require('multer')

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads')
fs.mkdirSync(UPLOAD_DIR, { recursive: true })

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).slice(0, 10)
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024, files: 12 }, // 10MB per file
  fileFilter: (req, file, cb) => {
    cb(null, ALLOWED_MIME.has(file.mimetype))
  },
})

// Every document field the registration wizard may send — unknown fields are ignored
const DOC_FIELDS = [
  'selfie', 'idDoc', 'otherIdDoc', 'driverLicense', 'vehicleReg', 'insurance',
  'profilePhoto', 'carFront', 'carSide', 'roadworthiness', 'utilityBill',
].map(name => ({ name, maxCount: 1 }))

module.exports = { upload, DOC_FIELDS, UPLOAD_DIR }
