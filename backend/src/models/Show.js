const mongoose = require('mongoose');

const showSchema = new mongoose.Schema(
  {
    externalId: {
      type: String,
      required: true,
      unique: true,
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
    priorityWeight: {
      type: Number,
      default: 5,
    },
  },
  { timestamps: true }
);

showSchema.index({ title: 'text' });
showSchema.index({ services: 1 });

module.exports = mongoose.model('Show', showSchema);
