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

module.exports = mongoose.model('AgentRecommendation', agentRecommendationSchema);
