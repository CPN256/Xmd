require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const authRoutes = require('./routes/auth');
const downloadRoutes = require('./routes/downloads');

const app = express();
const port = Number(process.env.PORT) || 5000;
const adminBuild = path.join(__dirname, '..', 'admin', 'dist');

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('Startup blocked: set JWT_SECRET to a random secret of at least 32 characters in .env.');
  process.exit(1);
}
if (!process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD.length < 12) {
  console.error('Startup blocked: set ADMIN_PASSWORD to a unique password of at least 12 characters in .env.');
  process.exit(1);
}

app.disable('x-powered-by');
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"]
    }
  }
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 180,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many requests. Please try again in a little while.' }
});
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many sign-in attempts. Please wait 15 minutes and try again.' }
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected', app: 'CAT CPN Downloads' });
});

app.use('/api', apiLimiter);
app.use('/api/admin/login', loginLimiter);
app.use('/api/admin', authRoutes);
app.use('/api/downloads', downloadRoutes);

const publicDirectory = path.join(__dirname, '..', 'public');
app.use(express.static(publicDirectory, { extensions: ['html'] }));

if (fs.existsSync(adminBuild)) {
  app.use('/admin', express.static(adminBuild));
  app.get(/^\/admin(?:\/.*)?$/, (_req, res) => res.sendFile(path.join(adminBuild, 'index.html')));
} else {
  app.get(/^\/admin(?:\/.*)?$/, (_req, res) => {
    const adminDevUrl = process.env.ADMIN_DEV_URL || 'http://localhost:5173';
    res.redirect(adminDevUrl);
  });
}

app.use('/api', (_req, res) => res.status(404).json({ message: 'API route not found.' }));
app.use((req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ message: 'Not found.' });
  res.status(404).sendFile(path.join(publicDirectory, '404.html'));
});

app.use((error, _req, res, _next) => {
  console.error(error);
  if (error.name === 'MulterError') {
    const message = error.code === 'LIMIT_FILE_SIZE'
      ? `File is too large. Maximum upload size is ${Number(process.env.MAX_UPLOAD_MB) || 100} MB.`
      : error.message;
    return res.status(400).json({ message });
  }
  if (error.message && error.message.startsWith('File type not allowed')) {
    return res.status(400).json({ message: error.message });
  }
  if (error.name === 'ValidationError') {
    return res.status(400).json({ message: 'Some details are not valid. Check the form and try again.' });
  }
  return res.status(500).json({ message: 'Something went wrong on the server. Please try again.' });
});

async function start() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/cat_cpn_downloads';
  try {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 10000 });
    console.log('MongoDB connected successfully.');
    app.listen(port, () => {
      console.log(`CAT CPN Downloads is running at http://localhost:${port}`);
      console.log(`Admin dashboard: http://localhost:${port}/admin`);
    });
  } catch (error) {
    console.error('Could not connect to MongoDB. Check that MongoDB is running and MONGODB_URI is correct.');
    console.error(error.message);
    process.exit(1);
  }
}

start();
