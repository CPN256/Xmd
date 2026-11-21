const express = require('express');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Download = require('../models/Download');
const { requireAdmin } = require('../middleware/auth');
const { upload, uploadDirectory } = require('../utils/fileUpload');

const router = express.Router();
const categories = ['Apps', 'Games', 'Documents', 'Tools', 'Music', 'Videos', 'Other'];

function asPublicDownload(item) {
  return {
    id: item._id,
    title: item.title,
    description: item.description,
    category: item.category,
    version: item.version,
    size: item.size,
    downloads: item.downloads,
    featured: item.featured,
    coverUrl: item.coverUrl,
    fileExtension: path.extname(item.originalName).replace('.', '').toUpperCase(),
    createdAt: item.createdAt,
    downloadUrl: `/api/downloads/${item._id}/file`
  };
}

function isValidId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

router.get('/categories', (_req, res) => res.json({ categories }));

router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(48, Math.max(1, Number.parseInt(req.query.limit, 10) || 12));
    const search = String(req.query.search || '').trim().slice(0, 80);
    const category = String(req.query.category || '').trim();
    const filter = {};

    if (category && category !== 'All' && categories.includes(category)) filter.category = category;
    if (search) {
      const safeSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { title: { $regex: safeSearch, $options: 'i' } },
        { description: { $regex: safeSearch, $options: 'i' } },
        { category: { $regex: safeSearch, $options: 'i' } }
      ];
    }

    const [items, total] = await Promise.all([
      Download.find(filter).sort({ featured: -1, createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Download.countDocuments(filter)
    ]);

    res.json({ items: items.map(asPublicDownload), total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    next(error);
  }
});

router.get('/:id/file', async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ message: 'Invalid download ID.' });
    const item = await Download.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'This download could not be found.' });

    const safeStoredName = path.basename(item.storedName);
    const filePath = path.join(uploadDirectory, safeStoredName);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'The file is missing from the server. Contact the site administrator.' });
    }
    await Download.updateOne({ _id: item._id }, { $inc: { downloads: 1 } });

    return res.download(filePath, item.originalName, (error) => {
      if (error && !res.headersSent) next(error);
    });
  } catch (error) {
    next(error);
  }
});

router.post('/', requireAdmin, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Choose a file to upload.' });
    const { title, description = '', category, version = '1.0', featured = 'false', coverUrl = '' } = req.body;

    if (!title || title.trim().length < 2 || title.trim().length > 90) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'Title must be between 2 and 90 characters.' });
    }
    if (!categories.includes(category)) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'Choose a valid category.' });
    }

    const item = await Download.create({
      title: title.trim(),
      description: String(description).trim().slice(0, 700),
      category,
      version: String(version).trim().slice(0, 30) || '1.0',
      originalName: req.file.originalname,
      storedName: req.file.filename,
      mimeType: req.file.mimetype,
      size: req.file.size,
      featured: featured === 'true',
      coverUrl: String(coverUrl).trim().slice(0, 500)
    });

    res.status(201).json({ message: 'Your download has been published.', item: asPublicDownload(item) });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    next(error);
  }
});

router.patch('/:id', requireAdmin, async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ message: 'Invalid download ID.' });
    const allowed = ['title', 'description', 'category', 'version', 'featured', 'coverUrl'];
    const updates = {};
    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) updates[key] = req.body[key];
    }
    if (updates.category && !categories.includes(updates.category)) {
      return res.status(400).json({ message: 'Choose a valid category.' });
    }
    if (typeof updates.title === 'string') updates.title = updates.title.trim().slice(0, 90);
    if (typeof updates.description === 'string') updates.description = updates.description.trim().slice(0, 700);
    const item = await Download.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!item) return res.status(404).json({ message: 'Download not found.' });
    res.json({ message: 'Download updated.', item: asPublicDownload(item) });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ message: 'Invalid download ID.' });
    const item = await Download.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ message: 'Download not found.' });
    const filePath = path.join(uploadDirectory, path.basename(item.storedName));
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    res.json({ message: 'Download and its stored file have been deleted.' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
