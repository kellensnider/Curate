const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema(
  {
    service: String,
    displayName: String,
    monetizationType: String,
    presentationType: String,
    url: String,
  },
  { _id: false }
);

const showSchema = new mongoose.Schema(
  {
    externalId: {
      type: String,
      required: true,
    },
    source: {
      type: String,
      enum: ['seed', 'justwatch'],
      default: 'seed',
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['movie', 'series'],
      required: true,
    },
    genre: [String],
    year: Number,
    services: [String],
    offers: [offerSchema],
    priorityWeight: {
      type: Number,
      default: 5,
    },
    rawJustWatch: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
);

showSchema.index({ title: 'text' });
showSchema.index({ services: 1 });
showSchema.index({ externalId: 1 }, { unique: true });

module.exports = mongoose.model('Show', showSchema);
