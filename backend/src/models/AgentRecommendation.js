const mongoose = require('mongoose');

const coverageSchema = new mongoose.Schema(
  {
    service: String,
    coveredShowIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Show',
      },
    ],
    coveredTitles: [String],
    weightedScore: Number,
  },
  { _id: false }
);

const baselineSubscriptionSchema = new mongoose.Schema(
  {
    service: String,
    displayName: String,
    monthlyCost: {
      type: Number,
      default: 0,
    },
    effectiveMonthlyCost: {
      type: Number,
      default: 0,
    },
    infiniteMembership: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const agentRecommendationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    recommendedServices: [String],
    servicesToCancel: [String],
    servicesToActivate: [String],
    baselineSubscriptions: {
      type: [baselineSubscriptionSchema],
      default: [],
    },
    baselineMonthlyCost: Number,
    currentMonthlyCost: Number,
    recommendedMonthlyCost: Number,
    estimatedSavings: Number,
    reasoning: String,
    coverage: [coverageSchema],
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'completed'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

agentRecommendationSchema.pre('validate', function normalizeBaseline(next) {
  if (typeof this.baselineMonthlyCost !== 'number' && typeof this.currentMonthlyCost === 'number') {
    this.baselineMonthlyCost = this.currentMonthlyCost;
  }
  if (typeof this.currentMonthlyCost !== 'number' && typeof this.baselineMonthlyCost === 'number') {
    this.currentMonthlyCost = this.baselineMonthlyCost;
  }
  next();
});

module.exports = mongoose.model('AgentRecommendation', agentRecommendationSchema);
