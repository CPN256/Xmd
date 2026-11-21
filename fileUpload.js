const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');

const uploadDirectory = path.join(__dirname, '..', 'storage', 'uploads');
fs.mkdirSync(uploadDirectory, { recursive: true });

// Deliberately exclude executable scripts such as .exe, .bat, .sh and .js.
// Upload only files that you own or have permission to distribute.
const allowedTypes = {
  '.apk': ['application/vnd.android.package-archive', 'application/octet-stream'],
  '.pdf': ['application/pdf', 'application/octet-stream'],
  '.zip': ['application/zip', 'application/x-zip-compressed', 'application/octet-stream'],
  '.rar': ['application/vnd.rar', 'application/x-rar-compressed', 'application/octet-stream'],
  '.7z': ['application/x-7z-compressed', 'application/octet-stream'],
  '.txt': ['text/plain', 'application/octet-stream'],
  '.csv': ['text/csv', 'application/csv', 'application/octet-stream'],
  '.doc': ['application/msword', 'application/octet-stream'],
  '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/octet-stream'],
  '.ppt': ['application/vnd.ms-powerpoint', 'application/octet-stream'],
  '.pptx': ['application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/octet-stream'],
  '.xls': ['application/vnd.ms-excel', 'application/octet-stream'],
  '.xlsx': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/octet-stream'],
  '.jpg': ['image/jpeg', 'application/octet-stream'],
  '.jpeg': ['image/jpeg', 'application/octet-stream'],
  '.png': ['image/png', 'application/octet-stream'],
  '.webp': ['image/webp', 'application/octet-stream'],
  '.gif': ['image/gif', 'application/octet-stream'],
  '.mp3': ['audio/mpeg', 'audio/mp3', 'application/octet-stream'],
  '.wav': ['audio/wav', 'audio/x-wav', 'application/octet-stream'],
  '.mp4': ['video/mp4', 'application/octet-stream'],
  '.mov': ['video/quicktime', 'application/octet-stream']
};

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDirectory),
  filename: (_req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${crypto.randomBytes(12).toString('hex')}${extension}`);
  }
});

const maxUploadMb = Number(process.env.MAX_UPLOAD_MB) || 100;

const upload = multer({
  storage,
  limits: { fileSize: maxUploadMb * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const acceptedMimes = allowedTypes[extension];
    if (!acceptedMimes || !acceptedMimes.includes(file.mimetype)) {
      return cb(new Error('File type not allowed. Upload a supported document, archive, image, audio/video file or Android APK.'));
    }
    return cb(null, true);
  }
});

module.exports = { upload, uploadDirectory };
