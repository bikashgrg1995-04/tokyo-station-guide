const ITERATIONS = 100_000;
const KEY_LENGTH = 32;
const SALT_LENGTH = 16;

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);

  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function generateSalt(): Uint8Array {
  const salt = new Uint8Array(SALT_LENGTH);

  crypto.getRandomValues(salt);

  return salt;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);

  new Uint8Array(buffer).set(bytes);

  return buffer;
}

async function deriveKey(
  password: string,
  salt: Uint8Array,
  iterations: number,
): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();

  const passwordKey = await crypto.subtle.importKey(
    'raw',
    toArrayBuffer(encoder.encode(password)),
    'PBKDF2',
    false,
    ['deriveBits'],
  );

  return crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: toArrayBuffer(salt),
      iterations,
      hash: 'SHA-256',
    },
    passwordKey,
    KEY_LENGTH * 8,
  );
}

export async function hashPassword(
  password: string,
): Promise<string> {
  const salt = generateSalt();

  const derivedKey = await deriveKey(
    password,
    salt,
    ITERATIONS,
  );

  return [
    'pbkdf2',
    'sha256',
    ITERATIONS,
    bytesToBase64(salt),
    bytesToBase64(new Uint8Array(derivedKey)),
  ].join('$');
}

export async function verifyPassword(
  password: string,
  storedHash: string,
): Promise<boolean> {
  const parts = storedHash.split('$');

  if (parts.length !== 5) {
    return false;
  }

  const [
    algorithm,
    hashAlgorithm,
    iterationsString,
    saltBase64,
    expectedHashBase64,
  ] = parts;

  if (
    algorithm !== 'pbkdf2' ||
    hashAlgorithm !== 'sha256'
  ) {
    return false;
  }

  const iterations = Number(iterationsString);

  if (!Number.isInteger(iterations) || iterations <= 0) {
    return false;
  }

  const salt = base64ToBytes(saltBase64);

  const derivedKey = await deriveKey(
    password,
    salt,
    iterations,
  );

  const actualHash = new Uint8Array(derivedKey);
  const expectedHash = base64ToBytes(
    expectedHashBase64,
  );

  if (actualHash.length !== expectedHash.length) {
    return false;
  }

  let difference = 0;

  for (let index = 0; index < actualHash.length; index++) {
    difference |= actualHash[index] ^ expectedHash[index];
  }

  return difference === 0;
}