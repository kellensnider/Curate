const mongoose = require('mongoose');

const SERVICE_KEYS = [
  'netflix',
  'hulu',
  'disney',
  'max',
  'peacock',
  'prime',
  'appletv',
  'paramount',
  'tubi',
];

const subscriptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  service: {
    type: String,
    required: true,
    enum: SERVICE_KEYS,
  },
  displayName: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['active', 'cancelled'],
    default: 'cancelled',
  },
  monthlyCost: {
    type: Number,
    required: true,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

subscriptionSchema.index({ userId: 1, service: 1 }, { unique: true });

module.exports = mongoose.model('Subscription', subscriptionSchema);
module.exports.SERVICE_KEYS = SERVICE_KEYS;
