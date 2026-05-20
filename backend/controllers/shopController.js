const ShopInfo = require('../models/ShopInfo');

const DEFAULT_SHOP_INFO = {
  address: 'Monginis Cake Shop, Beed Bypass, Near Nishant Park Hotel, CSN',
  phone: '9613661155',
  email: 'kaizenservice1@gmail.com',
  openingHours: 'Daily 10:00 AM – 9:00 PM',
  whatsappNumber: '919613661155',
  instagramUrl: '',
  facebookUrl: '',
  googleMapsUrl: 'https://maps.app.goo.gl/WbYHNrevSWsr88Fx5?g_st=ac',
  googleMapsEmbedUrl: '',
};

const getShopInfo = async (req, res) => {
  let info = await ShopInfo.findOne();
  if (!info) {
    info = await ShopInfo.create(DEFAULT_SHOP_INFO);
  }

  res.json({
    address: info.address,
    phone: info.phone,
    email: info.email,
    openingHours: info.openingHours,
    whatsappNumber: info.whatsappNumber,
    instagramUrl: info.instagramUrl,
    facebookUrl: info.facebookUrl,
    googleMapsUrl: info.googleMapsUrl,
    googleMapsEmbedUrl: info.googleMapsEmbedUrl,
  });
};

const updateShopInfo = async (req, res) => {
  const payload = {
    address: String(req.body?.address || ''),
    phone: String(req.body?.phone || ''),
    email: String(req.body?.email || ''),
    openingHours: String(req.body?.openingHours || ''),
    whatsappNumber: String(req.body?.whatsappNumber || ''),
    instagramUrl: String(req.body?.instagramUrl || ''),
    facebookUrl: String(req.body?.facebookUrl || ''),
    googleMapsUrl: String(req.body?.googleMapsUrl || ''),
    googleMapsEmbedUrl: String(req.body?.googleMapsEmbedUrl || ''),
  };

  let info = await ShopInfo.findOne();
  if (!info) info = await ShopInfo.create(payload);
  else {
    Object.assign(info, payload);
    await info.save();
  }

  res.json({ ok: true });
};

module.exports = { getShopInfo, updateShopInfo };
