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

async function checkUserPins() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/staffclock');
    console.log('Connected to MongoDB');

    // Get all users
    const users = await User.find({});
    console.log(`Found ${users.length} users:`);
    
    for (const user of users) {
      console.log(`\n${user.name} (${user.role})`);
      console.log(`  Email: ${user.email}`);
      console.log(`  PIN Hash: ${user.pin}`);
      
      console.log(`  PIN verification available for production users.`);
    }

  } catch (error) {
    console.error('Error checking user PINs:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

checkUserPins();