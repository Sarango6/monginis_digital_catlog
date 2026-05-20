const mongoose = require('mongoose');

const ImageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    width: { type: Number },
    height: { type: Number },
    format: { type: String },
  },
  { _id: false }
);

const CakeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, default: '', trim: true },
    imageUrl: { type: String, default: '', trim: true },

    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    categoryName: { type: String, required: true, trim: true },
    categorySlug: { type: String, required: true, lowercase: true, trim: true },

    images: { type: [ImageSchema], default: [] },

    likes: { type: Number, default: 0 },
    dislikes: { type: Number, default: 0 },
  },
  { timestamps: true }
);

CakeSchema.index({ category: 1, createdAt: -1 });
CakeSchema.index({ likes: -1 });

module.exports = mongoose.model('Cake', CakeSchema);
