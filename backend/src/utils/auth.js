const jwt = require('jsonwebtoken');

const TOKEN_EXPIRES_IN = '7d';

function getJwtSecret() {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not set. Add JWT_SECRET to backend/.env before using auth.');
  }
  return process.env.JWT_SECRET;
}

function userId(user) {
  return String(user._id || user.id);
}

function signToken(user) {
  return jwt.sign(
    {
      id: userId(user),
      email: user.email,
      name: user.name,
    },
    getJwtSecret(),
    { expiresIn: TOKEN_EXPIRES_IN }
  );
}

function sanitizeUser(user) {
  if (!user) return null;
  const doc = typeof user.toObject === 'function' ? user.toObject() : user;

  return {
    id: userId(doc),
    email: doc.email,
    name: doc.name,
    preferences: doc.preferences,
  };
}

module.exports = {
  TOKEN_EXPIRES_IN,
  getJwtSecret,
  signToken,
  sanitizeUser,
};
