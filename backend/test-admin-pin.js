const bcrypt = require('bcryptjs');

// System Admin PIN hash from database
const adminPinHash = '$2a$10$8lzQDq/kUfb5R9Y1fzHydeLF5TH4YAt.QFS9VTMgedKNl/QIolXUS';

// Common admin PINs to test
const testPins = ['0000', '1234', '1111', '2222', '3333', '4444', '5555', '9999', '1010', 'admin'];

console.log('Testing common PINs for System Admin...');

for (const pin of testPins) {
  if (bcrypt.compareSync(pin, adminPinHash)) {
    console.log(`✅ Found admin PIN: ${pin}`);
    process.exit(0);
  }
}

console.log('❌ Admin PIN not found among common PINs');