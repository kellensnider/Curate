const express = require('express');
const bcrypt = require('bcryptjs');
const { User } = require('../models');
const { requireAuth } = require('../middleware/auth');
const { signToken, sanitizeUser } = require('../utils/auth');
const { ensureDefaultSubscriptions } = require('../services/subscriptionService');
const { sendPasswordResetEmail } = require('../services/emailService');
const {
  createPasswordResetToken,
  hashPasswordResetToken,
} = require('../utils/passwordReset');

const router = express.Router();
const SALT_ROUNDS = 12;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function setTokenCookie(res, token) {
  res.cookie('token', token, cookieOptions);
}

function getFrontendUrl() {
  return process.env.FRONTEND_URL || 'http://localhost:3000';
}

// Strong enough to also satisfy streaming-service sign-up rules, since Curate
// reuses this password to create accounts on those services.
function passwordPolicyError(password) {
  const pw = String(password || '');
  if (pw.length < 8) return 'Password must be at least 8 characters';
  if (!/[A-Z]/.test(pw)) return 'Password must include an uppercase letter';
  if (!/[a-z]/.test(pw)) return 'Password must include a lowercase letter';
  if (!/[0-9]/.test(pw)) return 'Password must include a number';
  return null;
}

function validateCredentials({ name, email, password }, requireName = false) {
  if (requireName && !String(name || '').trim()) {
    return 'Name is required';
  }
  if (!EMAIL_RE.test(normalizeEmail(email))) {
    return 'Invalid email';
  }
  // Enforce the full policy on sign-up; for login just require a non-empty
  // password (existing accounts may predate the policy).
  if (requireName) {
    const pwError = passwordPolicyError(password);
    if (pwError) return pwError;
  } else if (!password || String(password).length < 1) {
    return 'Password is required';
  }
  return null;
}

router.post('/signup', async (req, res, next) => {
  try {
    const { name, password } = req.body;
    const email = normalizeEmail(req.body.email);
    const validationError = validateCredentials({ name, email, password }, true);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const existing = await User.findOne({ email }).select('_id');
    if (existing) {
      return res.status(409).json({ error: 'An account with that email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await User.create({
      name: String(name).trim(),
      email,
      passwordHash,
    });

    await ensureDefaultSubscriptions(user._id);

    const token = signToken(user);
    setTokenCookie(res, token);
    res.status(201).json({ user: sanitizeUser(user), token });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'An account with that email already exists' });
    }
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email);
    const { password } = req.body;
    const validationError = validateCredentials({ email, password });
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const user = await User.findOne({ email }).select('+passwordHash');
    const passwordOk = user ? await bcrypt.compare(password, user.passwordHash) : false;
    if (!passwordOk) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    await ensureDefaultSubscriptions(user._id);

    const token = signToken(user);
    setTokenCookie(res, token);
    res.json({ user: sanitizeUser(user), token });
  } catch (err) {
    next(err);
  }
});

router.post('/forgot-password', async (req, res, next) => {
  const genericMessage = 'If an account exists for that email, a reset link has been sent.';

  try {
    const email = normalizeEmail(req.body.email);
    if (!EMAIL_RE.test(email)) {
      return res.json({ success: true, message: genericMessage });
    }

    const user = await User.findOne({ email }).select('email name');
    if (user) {
      const { token, tokenHash, expiresAt } = createPasswordResetToken();
      await User.updateOne(
        { _id: user._id },
        {
          $set: {
            passwordResetTokenHash: tokenHash,
            passwordResetExpiresAt: expiresAt,
          },
        },
      );

      const resetUrl = `${getFrontendUrl().replace(/\/$/, '')}/reset-password?token=${encodeURIComponent(token)}`;

      try {
        await sendPasswordResetEmail({
          to: user.email,
          name: user.name,
          resetUrl,
        });
      } catch (err) {
        console.error('Password reset email failed:', err.message);
        return res.status(500).json({
          error: 'Could not send password reset email. Please try again later.',
        });
      }
    }

    res.json({ success: true, message: genericMessage });
  } catch (err) {
    next(err);
  }
});

router.post('/reset-password', async (req, res, next) => {
  try {
    const token = String(req.body.token || '').trim();
    const password = String(req.body.password || '');

    if (!token) {
      return res.status(400).json({ error: 'Reset link is invalid or expired.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const passwordResetTokenHash = hashPasswordResetToken(token);
    const user = await User.findOne({
      passwordResetTokenHash,
      passwordResetExpiresAt: { $gt: new Date() },
    }).select('+passwordHash +passwordResetTokenHash +passwordResetExpiresAt');

    if (!user) {
      return res.status(400).json({ error: 'Reset link is invalid or expired.' });
    }

    user.passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    user.passwordResetTokenHash = undefined;
    user.passwordResetExpiresAt = undefined;
    await user.save();

    res.json({ success: true, message: 'Password has been reset. You can now log in.' });
  } catch (err) {
    next(err);
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('token', { ...cookieOptions, maxAge: undefined });
  res.json({ success: true });
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('+paymentCard');
    if (!user) return res.status(401).json({ error: 'Invalid token' });
    res.json({ user: sanitizeUser(user) });
  } catch (err) {
    next(err);
  }
});

// Guess the card brand from the leading digits so the UI can label it.
function detectCardBrand(digits) {
  if (/^4/.test(digits)) return 'Visa';
  if (/^(5[1-5]|2[2-7])/.test(digits)) return 'Mastercard';
  if (/^3[47]/.test(digits)) return 'Amex';
  if (/^6(011|5)/.test(digits)) return 'Discover';
  return 'Card';
}

// HACKATHON NOTE: stores the raw card on the user doc (plaintext, no PCI vault).
// Deliberately simple for the demo — see the model comment.
router.put('/payment-card', requireAuth, async (req, res, next) => {
  try {
    const { cardholderName, number, expiry, cvc } = req.body || {};
    const digits = String(number || '').replace(/\D/g, '');

    if (digits.length < 13 || digits.length > 19) {
      return res.status(400).json({ error: 'Enter a valid card number' });
    }
    if (!/^\d{2}\/\d{2}$/.test(String(expiry || '').trim())) {
      return res.status(400).json({ error: 'Expiry must be in MM/YY format' });
    }
    if (!/^\d{3,4}$/.test(String(cvc || '').trim())) {
      return res.status(400).json({ error: 'Enter a valid CVC' });
    }

    const user = await User.findById(req.user.id).select('+paymentCard');
    if (!user) return res.status(401).json({ error: 'Invalid token' });

    user.paymentCard = {
      cardholderName: String(cardholderName || '').trim(),
      number: digits,
      expiry: String(expiry).trim(),
      cvc: String(cvc).trim(),
      brand: detectCardBrand(digits),
    };
    await user.save();

    res.json({ user: sanitizeUser(user) });
  } catch (err) {
    next(err);
  }
});

router.delete('/payment-card', requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('+paymentCard');
    if (!user) return res.status(401).json({ error: 'Invalid token' });

    user.paymentCard = undefined;
    await user.save();

    res.json({ user: sanitizeUser(user) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
