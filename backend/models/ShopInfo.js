const mongoose = require('mongoose');

const ShopInfoSchema = new mongoose.Schema(
  {
    address: { type: String, default: '' },
    phone: { type: String, default: '' },
    email: { type: String, default: '' },
    openingHours: { type: String, default: '' },

    instagramUrl: { type: String, default: '' },
    facebookUrl: { type: String, default: '' },
    whatsappNumber: { type: String, default: '' },

    googleMapsUrl: { type: String, default: '' },
    googleMapsEmbedUrl: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ShopInfo', ShopInfoSchema);
