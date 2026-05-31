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

// Never ship the full PAN/CVC to the client — only enough to recognize the
// saved card (brand, last 4, expiry, name). The full number lives in Mongo.
function maskCard(card) {
  if (!card || !card.number) return null;
  const digits = String(card.number).replace(/\D/g, '');
  return {
    brand: card.brand || null,
    last4: digits.slice(-4),
    expiry: card.expiry || null,
    cardholderName: card.cardholderName || null,
  };
}

function sanitizeUser(user) {
  if (!user) return null;
  const doc = typeof user.toObject === 'function' ? user.toObject() : user;

  return {
    id: userId(doc),
    email: doc.email,
    name: doc.name,
    preferences: doc.preferences,
    paymentCard: maskCard(doc.paymentCard),
  };
}

module.exports = {
  TOKEN_EXPIRES_IN,
  getJwtSecret,
  signToken,
  sanitizeUser,
  maskCard,
};
