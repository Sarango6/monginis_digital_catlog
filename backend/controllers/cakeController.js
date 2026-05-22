const slugify = require('slugify');

const Cake = require('../models/Cake');
const Category = require('../models/Category');
const { cloudinary } = require('../config/cloudinary');

const normalizeImages = (value) => {
  if (!Array.isArray(value)) return [];

  return value
    .filter(im => im && im.url && im.publicId)
    .map(im => ({
      url: String(im.url),
      publicId: String(im.publicId),
      width: im.width ? Number(im.width) : undefined,
      height: im.height ? Number(im.height) : undefined,
      format: im.format ? String(im.format) : undefined,
    }));
};

const getPrimaryImageUrl = (images) => {
  const first = Array.isArray(images) ? images[0] : null;
  return first && first.url ? String(first.url) : '';
};

const uniqueSlug = async (base) => {
  let slug = base;
  let i = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    // eslint-disable-next-line no-await-in-loop
    const exists = await Cake.findOne({ slug });
    if (!exists) return slug;
    i += 1;
    slug = `${base}-${i}`;
  }
};

const listCakes = async (req, res) => {
  const categoryQuery = String(req.query.category || '').trim();
  const sort = String(req.query.sort || '').trim();
  const limit = Math.min(Number(req.query.limit) || 60, 200);
  const page = Math.max(Number(req.query.page) || 1, 1);
  const paginate = req.query.page != null || String(req.query.paginate || '') === '1';

  const filter = {};
  if (categoryQuery && categoryQuery.toLowerCase() !== 'all') {
    const categorySlug = slugify(categoryQuery, { lower: true, strict: true });
    const safePattern = categoryQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { categorySlug },
      { categoryName: { $regex: safePattern, $options: 'i' } },
    ];
  }

  const sortBy = { createdAt: -1 };
  if (sort === 'mostLoved') sortBy.likes = -1;

  if (paginate) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      Cake.find(filter).sort(sortBy).skip(skip).limit(limit),
      Cake.countDocuments(filter),
    ]);
    const totalPages = Math.max(1, Math.ceil(total / limit));
    return res.json({ items, page, limit, total, totalPages });
  }

  const cakes = await Cake.find(filter)
    .sort(sortBy)
    .limit(limit);

  return res.json(cakes);
};

const uploadToCloudinary = (file, folder) => new Promise((resolve, reject) => {
  const stream = cloudinary.uploader.upload_stream(
    {
      folder,
      resource_type: 'image',
      transformation: [
        { width: 1600, height: 1600, crop: 'limit', quality: 'auto', fetch_format: 'auto' },
      ],
    },
    (err, result) => {
      if (err) return reject(err);
      return resolve({
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format,
      });
    }
  );
  stream.end(file.buffer);
});

const getCake = async (req, res) => {
  const cake = await Cake.findById(req.params.id);
  if (!cake) return res.status(404).json({ message: 'Cake not found' });
  res.json(cake);
};

const createCake = async (req, res) => {
  const name = String(req.body?.name || '').trim();
  const categoryId = String(req.body?.categoryId || '').trim();
  const description = String(req.body?.description || '').trim();
  const images = normalizeImages(req.body?.images);

  if (!name) return res.status(400).json({ message: 'Name required' });
  if (!categoryId) return res.status(400).json({ message: 'Category required' });

  const cat = await Category.findById(categoryId);
  if (!cat) return res.status(400).json({ message: 'Invalid category' });

  const base = slugify(name, { lower: true, strict: true });
  const slug = await uniqueSlug(base || 'cake');

  const cake = await Cake.create({
    name,
    slug,
    description,
    category: cat._id,
    categoryName: cat.name,
    categorySlug: cat.slug,
    imageUrl: getPrimaryImageUrl(images),
    images,
  });

  res.status(201).json(cake);
};

const updateCake = async (req, res) => {
  const cake = await Cake.findById(req.params.id);
  if (!cake) return res.status(404).json({ message: 'Cake not found' });

  const name = req.body?.name != null ? String(req.body.name).trim() : null;
  const categoryId = req.body?.categoryId != null ? String(req.body.categoryId).trim() : null;
  const description = req.body?.description != null ? String(req.body.description).trim() : null;
  const appendImages = Array.isArray(req.body?.appendImages) ? req.body.appendImages : null;

  if (name !== null && name.length) {
    cake.name = name;
    const base = slugify(name, { lower: true, strict: true });
    const newSlug = base ? await uniqueSlug(base) : cake.slug;
    cake.slug = newSlug;
  }

  if (description !== null) {
    cake.description = description;
  }

  if (categoryId) {
    const cat = await Category.findById(categoryId);
    if (!cat) return res.status(400).json({ message: 'Invalid category' });
    cake.category = cat._id;
    cake.categoryName = cat.name;
    cake.categorySlug = cat.slug;
  }

  if (appendImages) {
    const cleaned = normalizeImages(appendImages);
    cake.images.push(...cleaned);
  }

  if (!cake.imageUrl && cake.images.length) {
    cake.imageUrl = getPrimaryImageUrl(cake.images);
  }

  await cake.save();
  res.json(cake);
};

const deleteCake = async (req, res) => {
  const cake = await Cake.findById(req.params.id);
  if (!cake) return res.status(404).json({ message: 'Cake not found' });

  // Best-effort delete images in Cloudinary
  const images = Array.isArray(cake.images) ? cake.images : [];
  await Promise.all(
    images.map(im => im.publicId ? cloudinary.uploader.destroy(im.publicId).catch(() => null) : null)
  );

  await cake.deleteOne();
  res.json({ ok: true });
};

const likeCake = async (req, res) => {
  const cakeId = String(req.body?.cakeId || '').trim();
  if (!cakeId) return res.status(400).json({ message: 'cakeId required' });

  const cake = await Cake.findByIdAndUpdate(
    cakeId,
    { $inc: { likes: 1 } },
    { new: true }
  );
  if (!cake) return res.status(404).json({ message: 'Cake not found' });
  res.json({ likes: cake.likes });
};

const dislikeCake = async (req, res) => {
  const cakeId = String(req.body?.cakeId || '').trim();
  if (!cakeId) return res.status(400).json({ message: 'cakeId required' });

  const cake = await Cake.findByIdAndUpdate(
    cakeId,
    { $inc: { dislikes: 1 } },
    { new: true }
  );
  if (!cake) return res.status(404).json({ message: 'Cake not found' });
  res.json({ dislikes: cake.dislikes });
};

const uploadImages = async (req, res) => {
  const files = req.files || [];
  if (!files.length) {
    return res.status(400).json({ message: 'No images uploaded' });
  }

  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    return res.status(500).json({ message: 'Cloudinary not configured' });
  }

  let folder = process.env.CLOUDINARY_FOLDER || 'monginis/cakes';
  const categoryId = String(req.body?.categoryId || '').trim();
  const categorySlug = String(req.body?.categorySlug || '').trim();
  if (categorySlug) {
    folder = `cakes/${slugify(categorySlug, { lower: true, strict: true })}`;
  } else if (categoryId) {
    const cat = await Category.findById(categoryId);
    if (cat?.slug) folder = `cakes/${cat.slug}`;
  }

  const images = await Promise.all(files.map((file) => uploadToCloudinary(file, folder)));
  res.status(201).json({ images });
};

const bulkUploadCakes = async (req, res) => {
  const files = req.files || [];
  const categoryId = String(req.body?.categoryId || '').trim();
  if (!categoryId) return res.status(400).json({ message: 'Category required' });
  if (!files.length) return res.status(400).json({ message: 'No images uploaded' });

  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    return res.status(500).json({ message: 'Cloudinary not configured' });
  }

  const cat = await Category.findById(categoryId);
  if (!cat) return res.status(400).json({ message: 'Invalid category' });

  const folder = `cakes/${cat.slug}`;
  const startIndex = await Cake.countDocuments({ category: cat._id });

  const created = [];
  const failed = [];

  for (let i = 0; i < files.length; i += 1) {
    const file = files[i];
    try {
      const image = await uploadToCloudinary(file, folder);
      const displayIndex = startIndex + created.length + 1;
      const name = `${cat.name} Cake ${displayIndex}`;
      const base = slugify(name, { lower: true, strict: true });
      const slug = await uniqueSlug(base || 'cake');

      const cake = await Cake.create({
        name,
        slug,
        description: '',
        category: cat._id,
        categoryName: cat.name,
        categorySlug: cat.slug,
        imageUrl: image.url,
        images: [image],
      });
      created.push(cake);
    } catch (err) {
      failed.push({ name: file.originalname || 'image', message: err.message || 'Upload failed' });
    }
  }

  return res.status(201).json({ created, failed, counts: { created: created.length, failed: failed.length } });
};

const deleteImage = async (req, res) => {
  const cakeId = String(req.body?.cakeId || '').trim();
  const publicId = String(req.body?.publicId || '').trim();

  if (!cakeId || !publicId) {
    return res.status(400).json({ message: 'cakeId and publicId required' });
  }

  const cake = await Cake.findById(cakeId);
  if (!cake) return res.status(404).json({ message: 'Cake not found' });

  await cloudinary.uploader.destroy(publicId).catch(() => null);
  cake.images = (cake.images || []).filter(im => im.publicId !== publicId);
  cake.imageUrl = cake.images[0]?.url || '';
  await cake.save();

  res.json({ ok: true });
};

module.exports = {
  listCakes,
  getCake,
  createCake,
  updateCake,
  deleteCake,
  likeCake,
  dislikeCake,
  uploadImages,
  bulkUploadCakes,
  deleteImage,
};
