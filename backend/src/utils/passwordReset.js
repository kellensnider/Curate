const crypto = require('crypto');

const PASSWORD_RESET_TTL_MS = 30 * 60 * 1000;

function createPasswordResetToken() {
  const token = crypto.randomBytes(32).toString('base64url');
  return {
    token,
    tokenHash: hashPasswordResetToken(token),
    expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
  };
}

function hashPasswordResetToken(token) {
  return crypto
    .createHash('sha256')
    .update(String(token || ''))
    .digest('hex');
}

module.exports = {
  createPasswordResetToken,
  hashPasswordResetToken,
  PASSWORD_RESET_TTL_MS,
};
