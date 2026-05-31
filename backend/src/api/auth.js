const express = require('express');
const bcrypt = require('bcryptjs');
const { User } = require('../models');
const { requireAuth } = require('../middleware/auth');
const { signToken, sanitizeUser } = require('../utils/auth');
const { ensureDefaultSubscriptions } = require('../services/subscriptionService');

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

function validateCredentials({ name, email, password }, requireName = false) {
  if (requireName && !String(name || '').trim()) {
    return 'Name is required';
  }
  if (!EMAIL_RE.test(normalizeEmail(email))) {
    return 'Invalid email';
  }
  if (!password || String(password).length < 8) {
    return 'Password must be at least 8 characters';
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

router.post('/logout', (req, res) => {
  res.clearCookie('token', { ...cookieOptions, maxAge: undefined });
  res.json({ success: true });
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(401).json({ error: 'Invalid token' });
    res.json({ user: sanitizeUser(user) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
