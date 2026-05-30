const express = require('express');
const router = express.Router();
const shows = require('../../../data/shows.json');

// GET /api/shows?q=breaking+bad&genre=drama&service=netflix
router.get('/', (req, res) => {
  const { q, genre, service, limit = 20 } = req.query;
  let results = [...shows];

  if (q) {
    const query = q.toLowerCase();
    results = results.filter(s => s.title.toLowerCase().includes(query));
  }
  if (genre) {
    results = results.filter(s => s.genre.includes(genre));
  }
  if (service) {
    results = results.filter(s => s.services.includes(service));
  }

  results = results
    .sort((a, b) => b.priority_weight - a.priority_weight)
    .slice(0, parseInt(limit));

  res.json(results);
});

// GET /api/shows/popular - top shows for onboarding
router.get('/popular', (req, res) => {
  const popular = shows
    .sort((a, b) => b.priority_weight - a.priority_weight)
    .slice(0, 20);
  res.json(popular);
});

// GET /api/shows/:id
router.get('/:id', (req, res) => {
  const show = shows.find(s => s.id === req.params.id);
  if (!show) return res.status(404).json({ error: 'Show not found' });
  res.json(show);
});

module.exports = router;
