import rateLimit from 'express-rate-limit';

function sanitizeObject(obj) {
  if (typeof obj !== 'object' || obj === null) return obj;
  for (const key of Object.keys(obj)) {
    if (key.startsWith('$') || key.includes('.')) {
      delete obj[key];
    } else if (typeof obj[key] === 'object') {
      sanitizeObject(obj[key]);
    }
  }
  return obj;
}

/**
 * General API rate limiter — generous window to prevent blocking normal usage
 */
export function apiLimiter() {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5000,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests. Please try again later.' }
  });
}

/**
 * Auth rate limiter
 */
export function authLimiter() {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many login attempts. Please wait a few minutes.' }
  });
}

/**
 * NoSQL injection prevention (Express 5 compatible)
 */
export function sanitizeInput() {
  return (req, res, next) => {
    if (req.body) sanitizeObject(req.body);
    if (req.params) {
      for (const key of Object.keys(req.params)) {
        if (typeof req.params[key] === 'string' && req.params[key].includes('$')) {
          req.params[key] = req.params[key].replace(/\$/g, '');
        }
      }
    }
    next();
  };
}
