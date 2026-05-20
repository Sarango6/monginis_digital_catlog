const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Missing token' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = { id: payload.sub, email: payload.email };
    return next();
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

module.exports = { authMiddleware };
