const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Database Connections
const { connectDB } = require('./db');

// Connect first, then listen
connectDB().then(async () => { // Make async
  // Seed Default User
  const User = require('./models/User');
  const bcrypt = require('bcryptjs');

  try {
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log("No users found. Creating default admin...");
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await User.create({
        username: 'admin',
        password: hashedPassword,
        role: 'admin'
      });
      console.log("Default user created: admin / admin123");
    }
  } catch (seedErr) {
    console.error("Seeding error:", seedErr);
  }

  // Routes
  // Routes
  app.use('/api', apiRoutes);

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
