const express = require('express');
const { authMiddleware } = require('../middleware/authMiddleware');
const {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} = require('../controllers/categoryController');

const router = express.Router();

// /api/categories
router.get('/categories', listCategories);
router.post('/categories', authMiddleware, createCategory);
router.put('/categories/:id', authMiddleware, updateCategory);
router.delete('/categories/:id', authMiddleware, deleteCategory);

module.exports = router;
