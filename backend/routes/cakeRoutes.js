const express = require('express');
const multer = require('multer');

const { authMiddleware } = require('../middleware/authMiddleware');
const {
  listCakes,
  getCake,
  createCake,
  updateCake,
  deleteCake,
  likeCake,
  dislikeCake,
  uploadImages,
  deleteImage,
} = require('../controllers/cakeController');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 8 * 1024 * 1024,
    files: 12,
  },
});

// /api/cakes
router.get('/cakes', listCakes);
router.get('/cakes/:id', getCake);
router.post('/cakes', authMiddleware, createCake);
router.patch('/cakes/:id', authMiddleware, updateCake);
router.delete('/cakes/:id', authMiddleware, deleteCake);

// /api/upload
router.post('/upload', authMiddleware, upload.array('images', 12), uploadImages);

// /api/delete
router.post('/delete', authMiddleware, deleteImage);

// /api/like
router.post('/like', likeCake);

// /api/dislike
router.post('/dislike', dislikeCake);

module.exports = router;
