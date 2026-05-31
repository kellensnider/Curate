const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const {
  Show,
  WatchlistItem,
  resolveDemoUserId,
  serializeShow,
} = require('../models');
const { requireAuth } = require('../middleware/auth');

async function findShow(showId) {
  if (mongoose.Types.ObjectId.isValid(showId)) {
    const byObjectId = await Show.findById(showId);
    if (byObjectId) return byObjectId;
  }

  return Show.findOne({ externalId: showId });
}

function serializeWatchlistItem(item) {
  return {
    _id: item._id,
    userId: item.userId,
    showId: item.showId?._id,
    show_id: item.showId?.externalId,
    rank: item.rank,
    createdAt: item.createdAt,
    show: serializeShow(item.showId),
  };
}

async function getWatchlistForUser(userId) {
  const items = await WatchlistItem.find({ userId })
    .populate('showId')
    .sort({ rank: 1 });

  return items.map(serializeWatchlistItem).filter((item) => item.show);
}

async function addShowForUser(userId, showId) {
  if (!showId) {
    const err = new Error('show_id required');
    err.status = 400;
    throw err;
  }

  const show = await findShow(showId);
  if (!show) {
    const err = new Error('Show not found');
    err.status = 404;
    throw err;
  }

  const lastItem = await WatchlistItem.findOne({ userId }).sort({ rank: -1 });
  const newRank = (lastItem?.rank || 0) + 1;

  await WatchlistItem.create({ userId, showId: show._id, rank: newRank });
  return { rank: newRank, show };
}

// GET /api/watchlist - authenticated user's ranked watchlist
router.get('/', requireAuth, async (req, res) => {
  res.json(await getWatchlistForUser(req.user.id));
});

// POST /api/watchlist - add show to authenticated user's watchlist
router.post('/', requireAuth, async (req, res) => {
  try {
    const { rank, show } = await addShowForUser(req.user.id, req.body.show_id || req.body.showId);
    res.json({ success: true, rank, show: serializeShow(show) });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'Already in watchlist' });
    return res.status(err.status || 500).json({ error: err.message || 'Failed to add show' });
  }
});

// PUT /api/watchlist/rank - reorder authenticated user's watchlist
router.put('/rank', requireAuth, async (req, res) => {
  const { items } = req.body;
  if (!Array.isArray(items)) return res.status(400).json({ error: 'items array required' });

  for (const item of items) {
    const show = await findShow(item.show_id || item.showId);
    if (!show) continue;
    await WatchlistItem.updateOne(
      { userId: req.user.id, showId: show._id },
      { $set: { rank: item.rank } }
    );
  }

  res.json({ success: true });
});

// DELETE /api/watchlist/:showId - remove from authenticated user's watchlist
router.delete('/:showId', requireAuth, async (req, res, next) => {
  try {
    const show = await findShow(req.params.showId);
    if (show) {
      await WatchlistItem.deleteOne({ userId: req.user.id, showId: show._id });
    }
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// GET /api/watchlist/:userId - get ranked watchlist with show details
router.get('/:userId', async (req, res) => {
  const userId = await resolveDemoUserId(req.params.userId);
  if (!userId) return res.json([]);

  res.json(await getWatchlistForUser(userId));
});

// POST /api/watchlist/:userId - add show to watchlist
router.post('/:userId', async (req, res) => {
  const { show_id } = req.body;
  const userId = await resolveDemoUserId(req.params.userId);

  if (!show_id) return res.status(400).json({ error: 'show_id required' });
  if (!userId) return res.status(404).json({ error: 'User not found. Run npm run seed first.' });

  try {
    const { rank, show } = await addShowForUser(userId, show_id);
    res.json({ success: true, rank, show: serializeShow(show) });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Already in watchlist' });
    }
    throw err;
  }
});

// PUT /api/watchlist/:userId/rank - reorder watchlist
// Body: [{ show_id: "tt...", rank: 1 }, ...]
router.put('/:userId/rank', async (req, res) => {
  const { items } = req.body;
  const userId = await resolveDemoUserId(req.params.userId);

  if (!Array.isArray(items)) return res.status(400).json({ error: 'items array required' });
  if (!userId) return res.status(404).json({ error: 'User not found. Run npm run seed first.' });

  for (const item of items) {
    const show = await findShow(item.show_id || item.showId);
    if (!show) continue;
    await WatchlistItem.updateOne(
      { userId, showId: show._id },
      { $set: { rank: item.rank } }
    );
  }

  res.json({ success: true });
});

// DELETE /api/watchlist/:userId/:showId - remove from watchlist
router.delete('/:userId/:showId', async (req, res) => {
  const userId = await resolveDemoUserId(req.params.userId);
  const show = await findShow(req.params.showId);

  if (userId && show) {
    await WatchlistItem.deleteOne({ userId, showId: show._id });
  }

  res.json({ success: true });
});

module.exports = router;
