require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { connectDB } = require('../config/db');
const { User } = require('../models');
const { ensureDefaultSubscriptions } = require('../services/subscriptionService');

async function seedDemoUser() {
  await connectDB();

  try {
    const email = 'demo@example.com';
    const user = await User.findOneAndUpdate(
      { email },
      {
        $set: {
          name: 'Demo User',
          email,
          passwordHash: await bcrypt.hash('password123', 12),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await ensureDefaultSubscriptions(user._id);

    console.log('Demo user ready');
    console.log('Email: demo@example.com');
    console.log('Password: password123');
    console.log(`User ObjectId: ${user._id}`);
  } finally {
    await mongoose.connection.close();
  }
}

seedDemoUser().catch(async (err) => {
  console.error('Demo user seed failed:', err.message);
  await mongoose.connection.close();
  process.exit(1);
});
