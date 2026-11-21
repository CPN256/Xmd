const mongoose = require('mongoose');

const downloadSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 90 },
    description: { type: String, default: '', trim: true, maxlength: 700 },
    category: {
      type: String,
      required: true,
      enum: ['Apps', 'Games', 'Documents', 'Tools', 'Music', 'Videos', 'Other']
    },
    version: { type: String, default: '1.0', trim: true, maxlength: 30 },
    originalName: { type: String, required: true },
    storedName: { type: String, required: true, unique: true },
    mimeType: { type: String, default: 'application/octet-stream' },
    size: { type: Number, required: true },
    downloads: { type: Number, default: 0, min: 0 },
    featured: { type: Boolean, default: false },
    coverUrl: { type: String, default: '', trim: true, maxlength: 500 }
  },
  { timestamps: true }
);

downloadSchema.index({ title: 'text', description: 'text', category: 'text' });
downloadSchema.index({ category: 1, createdAt: -1 });

module.exports = mongoose.model('Download', downloadSchema);
