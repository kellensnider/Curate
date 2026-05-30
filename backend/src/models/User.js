const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      default: 'Demo User',
    },
    preferences: {
      maxMonthlyBudget: {
        type: Number,
        default: 40,
      },
      maxActiveServices: {
        type: Number,
        default: 2,
      },
      allowAutoSubscribe: {
        type: Boolean,
        default: false,
      },
      allowAutoCancel: {
        type: Boolean,
        default: false,
      },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
