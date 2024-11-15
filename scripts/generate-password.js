import bcrypt from 'bcryptjs';

const password = process.argv[2];

if (!password) {
  console.error('Please provide a password as an argument');
  console.log('Usage: node scripts/generate-password.js YOUR_PASSWORD');
  process.exit(1);
}

const salt = await bcrypt.genSalt(10);
const hash = await bcrypt.hash(password, salt);
console.log('Your password hash:');
console.log(hash);
console.log('\nAdd this to your .env file as ADMIN_PASSWORD_HASH');