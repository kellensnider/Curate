const mongoose = require('mongoose');

const agentActionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    recommendationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AgentRecommendation',
    },
    actionType: {
      type: String,
      enum: ['activate', 'cancel'],
      required: true,
    },
    service: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['success', 'failed', 'pending'],
      default: 'pending',
    },
    message: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model('AgentAction', agentActionSchema);
