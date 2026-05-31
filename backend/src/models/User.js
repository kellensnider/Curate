const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      default: 'Demo User',
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    passwordResetTokenHash: {
      type: String,
      select: false,
    },
    passwordResetExpiresAt: {
      type: Date,
      select: false,
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
