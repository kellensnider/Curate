const express = require('express');
const router = express.Router();
const { db } = require('../db/schema');
const shows = require('../../../data/shows.json');

const showsMap = Object.fromEntries(shows.map(s => [s.id, s]));

// GET /api/watchlist/:userId - get ranked watchlist with show details
router.get('/:userId', (req, res) => {
  const items = db.prepare(`
    SELECT * FROM watchlist WHERE user_id = ? ORDER BY rank ASC
  `).all(req.params.userId);

  const enriched = items.map(item => ({
    ...item,
    show: showsMap[item.show_id] || null,
  })).filter(item => item.show !== null);

  res.json(enriched);
});

// POST /api/watchlist/:userId - add show to watchlist
router.post('/:userId', (req, res) => {
  const { show_id } = req.body;
  const userId = req.params.userId;

  if (!show_id) return res.status(400).json({ error: 'show_id required' });
  if (!showsMap[show_id]) return res.status(404).json({ error: 'Show not found' });

  // Get current max rank
  const maxRank = db.prepare(
    'SELECT MAX(rank) as maxRank FROM watchlist WHERE user_id = ?'
  ).get(userId);
  const newRank = (maxRank?.maxRank || 0) + 1;

  try {
    db.prepare(`
      INSERT INTO watchlist (user_id, show_id, rank)
      VALUES (?, ?, ?)
    `).run(userId, show_id, newRank);
    res.json({ success: true, rank: newRank, show: showsMap[show_id] });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Already in watchlist' });
    }
    throw err;
  }
});

// PUT /api/watchlist/:userId/rank - reorder watchlist
// Body: [{ show_id: "tt...", rank: 1 }, ...]
router.put('/:userId/rank', (req, res) => {
  const { items } = req.body;
  if (!Array.isArray(items)) return res.status(400).json({ error: 'items array required' });

  const update = db.prepare(`
    UPDATE watchlist SET rank = ? WHERE user_id = ? AND show_id = ?
  `);

  const updateMany = db.transaction((items) => {
    for (const item of items) {
      update.run(item.rank, req.params.userId, item.show_id);
    }
  });

  updateMany(items);
  res.json({ success: true });
});

// DELETE /api/watchlist/:userId/:showId - remove from watchlist
router.delete('/:userId/:showId', (req, res) => {
  db.prepare(`
    DELETE FROM watchlist WHERE user_id = ? AND show_id = ?
  `).run(req.params.userId, req.params.showId);
  res.json({ success: true });
});

module.exports = router;
