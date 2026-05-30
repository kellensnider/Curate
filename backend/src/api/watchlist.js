const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const {
  Show,
  WatchlistItem,
  resolveDemoUserId,
  serializeShow,
} = require('../models');

async function findShow(showId) {
  if (mongoose.Types.ObjectId.isValid(showId)) {
    const byObjectId = await Show.findById(showId);
    if (byObjectId) return byObjectId;
  }

  return Show.findOne({ externalId: showId });
}

// GET /api/watchlist/:userId - get ranked watchlist with show details
router.get('/:userId', async (req, res) => {
  const userId = await resolveDemoUserId(req.params.userId);
  if (!userId) return res.json([]);

  const items = await WatchlistItem.find({ userId })
    .populate('showId')
    .sort({ rank: 1 });

  res.json(items.map((item) => ({
    _id: item._id,
    userId: item.userId,
    showId: item.showId?._id,
    show_id: item.showId?.externalId,
    rank: item.rank,
    createdAt: item.createdAt,
    show: serializeShow(item.showId),
  })).filter((item) => item.show));
});

// POST /api/watchlist/:userId - add show to watchlist
router.post('/:userId', async (req, res) => {
  const { show_id } = req.body;
  const userId = await resolveDemoUserId(req.params.userId);

  if (!show_id) return res.status(400).json({ error: 'show_id required' });
  if (!userId) return res.status(404).json({ error: 'User not found. Run npm run seed first.' });

  const show = await findShow(show_id);
  if (!show) return res.status(404).json({ error: 'Show not found' });

  const lastItem = await WatchlistItem.findOne({ userId }).sort({ rank: -1 });
  const newRank = (lastItem?.rank || 0) + 1;

  try {
    await WatchlistItem.create({ userId, showId: show._id, rank: newRank });
    res.json({ success: true, rank: newRank, show: serializeShow(show) });
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
