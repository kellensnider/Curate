require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { connectDB } = require('../config/db');
const { Show } = require('../models');

const DEFAULT_INPUT_PATH = path.resolve(__dirname, '../../../data/justwatch_shows.json');
const VALID_TYPES = new Set(['movie', 'series']);

function validateRecord(record, index, existingShow) {
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
  if (!record.posterUrl && !existingShow?.posterUrl) {
    return `record ${index} is missing posterUrl`;
  }
  return null;
}

function compactObject(value) {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined));
}

function normalizeYear(year) {
  if (year == null || year === '') return undefined;
  const parsed = Number(year);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function mapShow(record, existingShow) {
  return compactObject({
    externalId: record.externalId,
    source: record.source || 'justwatch',
    title: record.title,
    type: record.type,
    genre: Array.isArray(record.genre) ? record.genre : [],
    year: normalizeYear(record.year),
    services: Array.isArray(record.services) ? record.services : [],
    posterUrl: record.posterUrl || existingShow?.posterUrl,
    backdropUrl: record.backdropUrl || existingShow?.backdropUrl,
    overview: record.overview || existingShow?.overview,
    offers: Array.isArray(record.offers) ? record.offers : [],
    priorityWeight: Number.isFinite(Number(record.priorityWeight))
      ? Number(record.priorityWeight)
      : existingShow?.priorityWeight || 5,
    rawJustWatch: record.rawJustWatch || existingShow?.rawJustWatch || {},
  });
}

async function importJustWatchData() {
  const inputPath = process.argv[2]
    ? path.resolve(process.cwd(), process.argv[2])
    : DEFAULT_INPUT_PATH;

  if (!process.env.MONGO_URI) {
    console.error('Missing MONGO_URI. Add it to backend/.env before importing catalog data.');
    process.exit(1);
  }

  if (!fs.existsSync(inputPath)) {
    console.error(`Missing JustWatch JSON file: ${inputPath}`);
    console.error('Run npm run ingest:catalog first, then npm run import:catalog.');
    process.exit(1);
  }

  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));
  } catch (err) {
    console.error(`Could not parse JustWatch JSON at ${inputPath}: ${err.message}`);
    process.exit(1);
  }

  if (!Array.isArray(parsed)) {
    console.error(`Invalid JustWatch JSON: expected an array in ${inputPath}`);
    process.exit(1);
  }

  await connectDB();

  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  let skippedMissingPoster = 0;

  try {
    for (const [index, record] of parsed.entries()) {
      const existingShow = record?.externalId
        ? await Show.findOne({ externalId: record.externalId })
        : null;
      const validationError = validateRecord(record, index, existingShow);

      if (validationError) {
        skipped++;
        if (validationError.includes('posterUrl')) skippedMissingPoster++;
        console.warn(`Skipped: ${validationError}`);
        continue;
      }

      const mapped = mapShow(record, existingShow);
      await Show.updateOne(
        { externalId: mapped.externalId },
        { $set: mapped },
        { upsert: true, runValidators: true }
      );

      if (existingShow) {
        updated++;
      } else {
        inserted++;
      }
    }

    const totalShows = await Show.countDocuments();
    const usableShows = await Show.countDocuments({
      posterUrl: { $exists: true, $type: 'string', $ne: '' },
    });
    const importedUsableShows = await Show.countDocuments({
      source: 'justwatch',
      posterUrl: { $exists: true, $type: 'string', $ne: '' },
    });

    console.log('JustWatch import complete');
    console.log(`Inserted: ${inserted}`);
    console.log(`Updated: ${updated}`);
    console.log(`Skipped: ${skipped}`);
    console.log(`Skipped missing poster: ${skippedMissingPoster}`);
    console.log(`Total shows: ${totalShows}`);
    console.log(`Total usable with posterUrl: ${usableShows}`);
    console.log(`JustWatch usable with posterUrl: ${importedUsableShows}`);
    console.log(`Catalog target reached: ${usableShows >= 250 ? 'yes' : 'no'} (${usableShows}/250)`);
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
