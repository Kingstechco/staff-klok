const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// MongoDB connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/staffclock');
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// User Schema
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, sparse: true },
  pin: { type: String, required: true },
  role: { type: String, enum: ['admin', 'manager', 'staff'], default: 'staff' },
  department: String,
  position: String,
  hourlyRate: { type: Number, default: 0 },
  overtimeRate: { type: Number, default: 1.5 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

UserSchema.pre('save', async function(next) {
  if (!this.isModified('pin')) return next();
  const salt = await bcrypt.genSalt(10);
  this.pin = await bcrypt.hash(this.pin, salt);
  next();
});

const User = mongoose.model('User', UserSchema);

// Setup function
const setupDatabase = async () => {
  await connectDB();
  
  try {
    // Clear existing users (optional - comment out if you want to keep existing data)
    // await User.deleteMany({});
    
    console.log('ℹ️  Database setup completed - no demo users created.');
    console.log('ℹ️  Users should be created through the admin interface or API.');
    
    console.log('\n🎉 Database setup completed successfully!');
    console.log('\nYou can now:');
    console.log('1. Start the backend server: npm run dev');
    console.log('2. Use the admin credentials to log into the frontend');
    console.log('3. Create additional users through the admin interface');
    
    process.exit(0);
  } catch (error) {
    console.error('Setup error:', error);
    process.exit(1);
  }
};

setupDatabase();