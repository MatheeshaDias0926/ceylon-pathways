import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'ceylon-pathways-dev-secret-change-in-production-2024';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

/**
 * Generate a JWT token for an authenticated admin user
 */
export function generateToken(user) {
  return jwt.sign(
    {
      id: user._id || user.id,
      username: user.username,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * Middleware: Verify JWT token from Authorization header
 * Sets req.user with decoded token payload
 */
export function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired. Please log in again.' });
    }
    return res.status(403).json({ error: 'Invalid token.' });
  }
}

/**
 * Middleware: Require a specific role (e.g., 'owner')
 * Must be used after verifyToken
 */
export function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    if (req.user.role !== role) {
      return res.status(403).json({ error: `Access denied. ${role} role required.` });
    }
    next();
  };
}
