require('dotenv').config();
const mongoose = require('mongoose');
const shows = require('../../../data/shows.json');
const { connectDB } = require('../config/db');
const {
  User,
  Show,
  WatchlistItem,
  Subscription,
  AgentRecommendation,
  AgentAction,
  SERVICE_PRICES,
} = require('../models');

const ACTIVE_DEMO_SERVICES = ['netflix', 'max', 'disney'];

function mapSeedShow(show) {
  return {
    externalId: show.id,
    title: show.title,
    type: show.type,
    genre: show.genre || [],
    year: show.year,
    services: show.services || [],
    priorityWeight: show.priority_weight ?? 5,
  };
}

async function seedDemoData() {
  await connectDB();

  try {
    await Promise.all([
      User.deleteMany({}),
      Show.deleteMany({}),
      WatchlistItem.deleteMany({}),
      Subscription.deleteMany({}),
      AgentRecommendation.deleteMany({}),
      AgentAction.deleteMany({}),
    ]);

    const demoUser = await User.create({});
    const insertedShows = await Show.insertMany(shows.map(mapSeedShow));

    const subscriptions = Object.entries(SERVICE_PRICES).map(([service, price]) => ({
      userId: demoUser._id,
      service,
      displayName: price.name,
      status: ACTIVE_DEMO_SERVICES.includes(service) ? 'active' : 'cancelled',
      monthlyCost: price.monthly,
    }));
    await Subscription.insertMany(subscriptions);

    const starterShows = insertedShows
      .sort((a, b) => b.priorityWeight - a.priorityWeight)
      .slice(0, 10);

    await WatchlistItem.insertMany(
      starterShows.map((show, index) => ({
        userId: demoUser._id,
        showId: show._id,
        rank: index + 1,
      }))
    );

    console.log('Seed complete');
    console.log(`Users inserted: 1`);
    console.log(`Shows inserted: ${insertedShows.length}`);
    console.log(`Watchlist items inserted: ${starterShows.length}`);
    console.log(`Subscriptions inserted: ${subscriptions.length}`);
    console.log(`Demo user ObjectId: ${demoUser._id}`);
  } finally {
    await mongoose.connection.close();
  }
}

seedDemoData().catch(async (err) => {
  console.error('Seed failed:', err.message);
  await mongoose.connection.close();
  process.exit(1);
});
