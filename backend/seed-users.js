const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/staffclock');

// Define User schema (simplified version)
const UserSchema = new mongoose.Schema({
  name: String,
  email: String,
  pin: String,
  role: String,
  department: String,
  position: String,
  hourlyRate: Number,
  overtimeRate: Number,
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
});

// Hash PIN before saving
UserSchema.pre('save', async function(next) {
  if (!this.isModified('pin')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.pin = await bcrypt.hash(this.pin, salt);
    next();
  } catch (error) {
    next(error);
  }
});

const User = mongoose.model('User', UserSchema);

async function seedUsers() {
  try {
    console.log('No seed users configured. App is ready for production use.');
    console.log('Users should be created through the admin interface.');
    process.exit(0);
  } catch (error) {
    console.error('Error in seed process:', error);
    process.exit(1);
  }
}

seedUsers();