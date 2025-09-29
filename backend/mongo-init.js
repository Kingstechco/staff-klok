// MongoDB initialization script
// This script runs when the MongoDB container starts for the first time

db = db.getSiblingDB('oklok');

// Create the main user for the application
db.createUser({
  user: 'oklok_user',
  pwd: 'oklok_password',
  roles: [
    {
      role: 'readWrite',
      db: 'oklok'
    }
  ]
});

// Create indexes for better performance
db.users.createIndex({ email: 1 }, { unique: true, sparse: true });
db.users.createIndex({ pin: 1 });
db.users.createIndex({ role: 1 });
db.users.createIndex({ department: 1 });

db.timeentries.createIndex({ userId: 1, clockIn: -1 });
db.timeentries.createIndex({ userId: 1, status: 1 });
db.timeentries.createIndex({ clockIn: -1 });
db.timeentries.createIndex({ isApproved: 1 });

// No default admin user created - production ready
// Admin users should be created through the application interface

print('Database initialization completed successfully');