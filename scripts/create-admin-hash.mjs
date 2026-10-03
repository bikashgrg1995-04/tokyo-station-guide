import crypto from 'node:crypto';

const password = process.argv[2];

if (!password) {
  console.error('Usage: node scripts/create-admin-hash.mjs "YourPassword"');
  process.exit(1);
}

const iterations = 100_000;
const keyLength = 32;
const saltLength = 16;

const salt = crypto.randomBytes(saltLength);

const derivedKey = crypto.pbkdf2Sync(
  password,
  salt,
  iterations,
  keyLength,
  'sha256',
);

const saltBase64 = salt.toString('base64');
const hashBase64 = derivedKey.toString('base64');

const storedHash = [
  'pbkdf2',
  'sha256',
  iterations,
  saltBase64,
  hashBase64,
].join('$');

console.log('\nPassword hash:\n');
console.log(storedHash);
console.log();