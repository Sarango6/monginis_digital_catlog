const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const Admin = require('../models/Admin');

const ensureInitialAdmin = async () => {
  const adminEmail = (process.env.ADMIN_EMAIL || 'owner@monginis.com').toLowerCase().trim();
  const adminPasswordHashFromEnv = process.env.ADMIN_PASSWORD_HASH;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const forceReset = ['1', 'true', 'yes', 'on'].includes(String(process.env.ADMIN_FORCE_RESET || '').toLowerCase());

  const existing = await Admin.findOne({ email: adminEmail });

  if (!process.env.ADMIN_EMAIL) {
    console.warn('ADMIN_EMAIL not set. Using default. Change this in backend/.env for security.');
  }

  let passwordHash = null;
  if (adminPasswordHashFromEnv && String(adminPasswordHashFromEnv).trim()) {
    passwordHash = String(adminPasswordHashFromEnv).trim();
  } else if (adminPassword && String(adminPassword).trim()) {
    passwordHash = await bcrypt.hash(String(adminPassword), 10);
  } else {
    console.warn('ADMIN_PASSWORD_HASH or ADMIN_PASSWORD not set. Using default password. Change this in backend/.env for security.');
    passwordHash = await bcrypt.hash('ChangeMe123!', 10);
  }

  if (existing) {
    if (!forceReset) return;
    existing.passwordHash = passwordHash;
    await existing.save();
    console.log('Admin password reset from env for:', adminEmail);
    return;
  }

  await Admin.create({ email: adminEmail, passwordHash });
  console.log('Initial admin created:', adminEmail);
};

const login = async (req, res) => {
  const { email, password } = req.body || {};
  const normalizedEmail = String(email || '').toLowerCase().trim();
  const pw = String(password || '');

  if (!normalizedEmail || !pw) {
    return res.status(400).json({ message: 'Email and password required' });
  }

  const admin = await Admin.findOne({ email: normalizedEmail });
  if (!admin) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const ok = await bcrypt.compare(pw, admin.passwordHash);
  if (!ok) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return res.status(500).json({ message: 'Server misconfigured (missing JWT_SECRET)' });
  }

  const token = jwt.sign(
    { email: admin.email },
    secret,
    {
      subject: String(admin._id),
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    }
  );

  return res.json({ token });
};

module.exports = { login, ensureInitialAdmin };
