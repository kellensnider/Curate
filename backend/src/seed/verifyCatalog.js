require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB } = require('../config/db');
const { Show } = require('../models');

async function verifyCatalog() {
  if (!process.env.MONGO_URI) {
    console.error('Missing MONGO_URI. Add it to backend/.env before verifying catalog data.');
    process.exit(1);
  }

  await connectDB();

  try {
    const total = await Show.countDocuments();
    const withPoster = await Show.countDocuments({
      posterUrl: { $exists: true, $type: 'string', $ne: '' },
    });
    const withoutPoster = total - withPoster;

    const byType = await Show.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    const byService = await Show.aggregate([
      { $unwind: '$services' },
      { $group: { _id: '$services', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    const samples = await Show.find({
      posterUrl: { $exists: true, $type: 'string', $ne: '' },
    })
      .sort({ title: 1 })
      .limit(5)
      .select('title type year services posterUrl')
      .lean();

    console.log(`Total shows/movies: ${total}`);
    console.log(`Total with posterUrl: ${withPoster}`);
    console.log(`Total without posterUrl: ${withoutPoster}`);
    console.log('Count by type:');
    for (const item of byType) {
      console.log(`  ${item._id || 'unknown'}: ${item.count}`);
    }
    console.log('Count by service:');
    for (const item of byService) {
      console.log(`  ${item._id}: ${item.count}`);
    }
    console.log('First 5 sample records:');
    for (const show of samples) {
      console.log(
        `  - ${show.title} (${show.type}, ${show.year || 'n/a'}) [${(show.services || []).join(', ')}] ${show.posterUrl}`
      );
    }
    console.log(`Catalog target reached: ${withPoster >= 250 ? 'yes' : 'no'} (${withPoster}/250 poster-backed records)`);
  } finally {
    await mongoose.connection.close();
  }
}

if (require.main === module) {
  verifyCatalog().catch(async (err) => {
    console.error('Catalog verification failed:', err.message);
    await mongoose.connection.close().catch(() => {});
    process.exit(1);
  });
}

module.exports = { verifyCatalog };
