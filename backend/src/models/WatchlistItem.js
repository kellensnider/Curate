const mongoose = require('mongoose');

const watchlistItemSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  showId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Show',
    required: true,
    index: true,
  },
  rank: {
    type: Number,
    required: true,
    min: 1,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

watchlistItemSchema.index({ userId: 1, showId: 1 }, { unique: true });
watchlistItemSchema.index({ userId: 1, rank: 1 });

module.exports = mongoose.model('WatchlistItem', watchlistItemSchema);
