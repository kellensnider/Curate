require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const authRoutes = require('./api/auth');
const showsRouter = require('./api/shows');
const watchlistRouter = require('./api/watchlist');
const subscriptionsRouter = require('./api/subscriptions');
const automationRouter = require('./api/automation');
const { runAgentStream } = require('./agent/index');
const { connectDB } = require('./config/db');
const { requireAuth } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

const allowedOrigin = process.env.ALLOWED_ORIGIN || FRONTEND_URL;
app.use(cors({
  origin: allowedOrigin.split(',').map((origin) => origin.trim()),
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/shows', showsRouter);
app.use('/api/watchlist', watchlistRouter);
app.use('/api/subscriptions', subscriptionsRouter);
app.use('/api/automation', automationRouter);

// Debug screenshots from automation runs (testing only).
app.use('/screenshots', express.static(path.join(__dirname, '../screenshots')));

// Agent chat streaming SSE endpoint
app.post('/api/agent/chat', requireAuth, async (req, res) => {
  const { message, history = [] } = req.body;
  if (!message) return res.status(400).json({ error: 'message required' });

  try {
    await runAgentStream(message, history, res, req.user.id);
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

app.use((err, req, res, next) => {
  console.error('Request error:', err.message);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: 'Server error' });
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
