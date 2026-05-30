const express = require('express');
const router = express.Router();
const { Show, serializeShow } = require('../models');

// GET /api/shows?q=breaking+bad&genre=drama&service=netflix
router.get('/', async (req, res) => {
  const { q, genre, service, limit = 20 } = req.query;
  // Only surface poster-backed catalog entries so the UI always shows real art.
  const filter = { posterUrl: { $exists: true, $type: 'string', $ne: '' } };

  if (q) {
    filter.title = { $regex: q, $options: 'i' };
  }
  if (genre) {
    filter.genre = genre;
  }
  if (service) {
    filter.services = service;
  }

  const results = await Show.find(filter)
    .sort({ priorityWeight: -1, title: 1 })
    .limit(Number.parseInt(limit, 10) || 20);

  res.json(results.map(serializeShow));
});

// GET /api/shows/popular - top shows for onboarding
router.get('/popular', async (req, res) => {
  const popular = await Show.find({ posterUrl: { $exists: true, $type: 'string', $ne: '' } })
    .sort({ priorityWeight: -1, title: 1 })
    .limit(20);
  res.json(popular.map(serializeShow));
});

// GET /api/shows/:id
router.get('/:id', async (req, res) => {
  const show = await Show.findOne({ externalId: req.params.id });
  if (!show) return res.status(404).json({ error: 'Show not found' });
  res.json(serializeShow(show));
});

module.exports = router;
