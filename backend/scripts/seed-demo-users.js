const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// User schema (matching the model)
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  pin: { type: String, required: true },
  role: { type: String, enum: ['admin', 'manager', 'staff'], default: 'staff' },
  department: { type: String, default: 'General' },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

async function seedDemoUsers() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/staffclock');
    console.log('Connected to MongoDB');

    // Clear existing users (for testing)
    await User.deleteMany({});
    console.log('Cleared existing users');

    // No demo users - ready for production
    const demoUsers = [];

    if (demoUsers.length === 0) {
      console.log('No demo users to seed. App is ready for production use.');
      return;
    }

    // Insert demo users
    const createdUsers = await User.insertMany(demoUsers);
    console.log(`Created ${createdUsers.length} users:`);
    createdUsers.forEach(user => {
      console.log(`- ${user.name} (${user.role}) - Email: ${user.email}`);
    });

    console.log('Users seeded successfully!');
  } catch (error) {
    console.error('Error seeding demo users:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

seedDemoUsers();