const mongoose = require('mongoose');

const SERVICE_KEYS = [
  'netflix',
  'hulu',
  'disney',
  'max',
  'peacock',
  'prime',
  'paramount',
  'tubi',
];

const subscriptionSchema = new mongoose.Schema(
  {
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
    infiniteMembership: {
      type: Boolean,
      default: false,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

subscriptionSchema.virtual('effectiveMonthlyCost').get(function effectiveMonthlyCost() {
  return this.infiniteMembership ? 0 : this.monthlyCost;
});

subscriptionSchema.index({ userId: 1, service: 1 }, { unique: true });

module.exports = mongoose.model('Subscription', subscriptionSchema);
module.exports.SERVICE_KEYS = SERVICE_KEYS;
