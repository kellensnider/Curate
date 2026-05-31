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
    // HACKATHON NOTE: this stores the card in plaintext on the user document so
    // the automation agent can reuse it when signing up for paid services. This
    // is a deliberately simple, NOT-production-safe approach (no tokenization /
    // PCI vault). `select: false` keeps it out of queries unless explicitly asked.
    paymentCard: {
      type: {
        cardholderName: { type: String, trim: true },
        number: { type: String, trim: true },
        expiry: { type: String, trim: true }, // MM/YY
        cvc: { type: String, trim: true },
        brand: { type: String, trim: true },
      },
      select: false,
      default: undefined,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
