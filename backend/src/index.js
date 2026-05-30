require('dotenv').config();
const express = require('express');
const cors = require('cors');

const showsRouter = require('./api/shows');
const watchlistRouter = require('./api/watchlist');
const subscriptionsRouter = require('./api/subscriptions');
const { runAgentStream } = require('./agent/index');
const { connectDB } = require('./config/db');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/shows', showsRouter);
app.use('/api/watchlist', watchlistRouter);
app.use('/api/subscriptions', subscriptionsRouter);

// Agent chat streaming SSE endpoint
app.post('/api/agent/chat', async (req, res) => {
  const { message, history = [] } = req.body;
  if (!message) return res.status(400).json({ error: 'message required' });

  try {
    await runAgentStream(message, history, res);
  } catch (err) {
    console.error('Agent error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Agent failed', detail: err.message });
    }
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

async function startServer() {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`\nCurate backend running on http://localhost:${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/api/health`);
    console.log(`   Shows:  http://localhost:${PORT}/api/shows/popular`);
  });
}

startServer();
