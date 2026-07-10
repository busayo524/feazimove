/**
 * File upload handling for registration documents (ID, selfie, vehicle docs).
 * Files are buffered in memory and persisted via services/fileStorage
 * (Catalyst File Store on AppSail, local disk in development) — they are NOT
 * served publicly; only readable via authenticated routes.
 */
const path = require('path')
const multer = require('multer')

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads')

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])

const upload = multer({
  storage: multer.memoryStorage(),
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
