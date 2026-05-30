require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { connectDB } = require('../config/db');
const { Show } = require('../models');

const DEFAULT_INPUT_PATH = path.resolve(__dirname, '../../../data/justwatch_shows.json');
const VALID_TYPES = new Set(['movie', 'series']);

function validateRecord(record, index) {
  if (!record || typeof record !== 'object') {
    return `record ${index} is not an object`;
  }
  if (!record.externalId || typeof record.externalId !== 'string') {
    return `record ${index} is missing externalId`;
  }
  if (!record.title || typeof record.title !== 'string') {
    return `record ${index} is missing title`;
  }
  if (!VALID_TYPES.has(record.type)) {
    return `record ${index} has invalid type: ${record.type}`;
  }
  return null;
}

function mapShow(record) {
  return {
    externalId: record.externalId,
    source: 'justwatch',
    title: record.title,
    type: record.type,
    genre: Array.isArray(record.genre) ? record.genre : [],
    year: record.year == null || record.year === ''
      ? undefined
      : Number.isFinite(Number(record.year))
        ? Number(record.year)
        : undefined,
    services: Array.isArray(record.services) ? record.services : [],
    offers: Array.isArray(record.offers) ? record.offers : [],
    priorityWeight: Number.isFinite(Number(record.priorityWeight))
      ? Number(record.priorityWeight)
      : 5,
    rawJustWatch: record.rawJustWatch || {},
  };
}

async function importJustWatchData() {
  const inputPath = process.argv[2]
    ? path.resolve(process.cwd(), process.argv[2])
    : DEFAULT_INPUT_PATH;

  if (!fs.existsSync(inputPath)) {
    console.error(`Missing JustWatch JSON file: ${inputPath}`);
    console.error('Run npm run ingest:justwatch first, then npm run import:justwatch.');
    process.exit(1);
  }

  const parsed = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));
  if (!Array.isArray(parsed)) {
    console.error(`Invalid JustWatch JSON: expected an array in ${inputPath}`);
    process.exit(1);
  }

  await connectDB();

  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  try {
    for (const [index, record] of parsed.entries()) {
      const validationError = validateRecord(record, index);
      if (validationError) {
        skipped++;
        console.warn(`Skipped: ${validationError}`);
        continue;
      }

      const mapped = mapShow(record);
      const existing = await Show.findOne({ externalId: mapped.externalId }).select('_id');
      await Show.updateOne(
        { externalId: mapped.externalId },
        { $set: mapped },
        { upsert: true, runValidators: true }
      );

      if (existing) {
        updated++;
      } else {
        inserted++;
      }
    }

    const totalShows = await Show.countDocuments();
    console.log(`JustWatch import complete`);
    console.log(`Inserted: ${inserted}`);
    console.log(`Updated: ${updated}`);
    console.log(`Skipped: ${skipped}`);
    console.log(`Total shows: ${totalShows}`);
  } finally {
    await mongoose.connection.close();
  }
}

if (require.main === module) {
  importJustWatchData().catch(async (err) => {
    console.error('JustWatch import failed:', err.message);
    await mongoose.connection.close().catch(() => {});
    process.exit(1);
  });
}

module.exports = { importJustWatchData };
