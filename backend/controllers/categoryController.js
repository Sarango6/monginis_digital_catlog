const slugify = require('slugify');

const Category = require('../models/Category');
const Cake = require('../models/Cake');

const uniqueSlug = async (base) => {
  let slug = base;
  let i = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    // eslint-disable-next-line no-await-in-loop
    const exists = await Category.findOne({ slug });
    if (!exists) return slug;
    i += 1;
    slug = `${base}-${i}`;
  }
};

const listCategories = async (req, res) => {
  const cats = await Category.find().sort({ createdAt: -1 });
  res.json(cats);
};

const createCategory = async (req, res) => {
  const name = String(req.body?.name || '').trim();
  if (!name) return res.status(400).json({ message: 'Name required' });

  const base = slugify(name, { lower: true, strict: true });
  const slug = await uniqueSlug(base || 'category');
  const cat = await Category.create({ name, slug });
  res.status(201).json(cat);
};

const updateCategory = async (req, res) => {
  const id = req.params.id;
  const name = String(req.body?.name || '').trim();
  if (!name) return res.status(400).json({ message: 'Name required' });

  const cat = await Category.findById(id);
  if (!cat) return res.status(404).json({ message: 'Category not found' });

  const base = slugify(name, { lower: true, strict: true });
  let slug = base || cat.slug;

  if (slug !== cat.slug) {
    slug = await uniqueSlug(slug);
  }

  cat.name = name;
  cat.slug = slug;
  await cat.save();

  // Update denormalized category fields in cakes
  await Cake.updateMany(
    { category: cat._id },
    { $set: { categoryName: cat.name, categorySlug: cat.slug } }
  );

  res.json(cat);
};

const deleteCategory = async (req, res) => {
  const id = req.params.id;
  const cat = await Category.findById(id);
  if (!cat) return res.status(404).json({ message: 'Category not found' });

  const cakeCount = await Cake.countDocuments({ category: cat._id });
  if (cakeCount > 0) {
    return res.status(400).json({ message: 'Cannot delete category with cakes. Delete or move cakes first.' });
  }

  await cat.deleteOne();
  res.json({ ok: true });
};

module.exports = { listCategories, createCategory, updateCategory, deleteCategory };
