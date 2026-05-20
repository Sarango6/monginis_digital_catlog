const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('mongoose');

const authRoutes = require('./routes/authRoutes');
const cakeRoutes = require('./routes/cakeRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const shopRoutes = require('./routes/shopRoutes');

const { ensureInitialAdmin } = require('./controllers/authController');

const app = express();

// Fail fast if MongoDB isn't connected (avoid buffered/hanging queries)
mongoose.set('bufferCommands', false);

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

const hasRealMongoUri = Boolean(MONGO_URI) && !String(MONGO_URI).includes('<');

if (!hasRealMongoUri) {
  console.warn('MongoDB not configured (set a real MONGODB_URI in backend/.env). Starting without database.');
}

app.use(cors({
  origin: 'https://monginis-digital-catlog.vercel.app',
  credentials: true,
}));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'monginis-backend', time: new Date().toISOString() });
});

// All remaining /api endpoints require MongoDB.
// When Atlas IP whitelist blocks access (or URI is missing), return a clear 503 instead of hanging.
app.use('/api', (req, res, next) => {
  if (!hasRealMongoUri) {
    return res.status(503).json({
      message: 'Database not configured. Set a real MONGODB_URI in backend/.env and restart the server.',
    });
  }

  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      message:
        "Database not connected. If you use MongoDB Atlas, add your current IP in Atlas -> Security -> Network Access (or temporarily allow 0.0.0.0/0), then restart the backend.",
    });
  }

  return next();
});

app.use('/api/admin', authRoutes);
app.use('/api', cakeRoutes);
app.use('/api', categoryRoutes);
app.use('/api', shopRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.statusCode || 500).json({ message: err.message || 'Server error' });
});

(async () => {
  try {
    app.listen(PORT, () => {
    });

    if (hasRealMongoUri) {
      try {
        await mongoose.connect(MONGO_URI, {
          serverSelectionTimeoutMS: 8000,
        });
        await ensureInitialAdmin();
      } catch (e) {
        console.error('MongoDB connection failed (server still running):', e.message || e);
      }
    }
  } catch (e) {
    console.error('Failed to start server:', e);
    process.exit(1);
  }
})();

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
});
