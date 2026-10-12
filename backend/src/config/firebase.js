const admin = require('firebase-admin');
const path = require('path');

// Support loading .env from backend directory or project root
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
require('dotenv').config();

const storageBucketEnv = process.env.FIREBASE_STORAGE_BUCKET;

if (!admin.apps.length) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (privateKey) {
    // If wrapped in quotes by some env loaders, strip/parse them
    if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
      try {
        privateKey = JSON.parse(privateKey);
      } catch (e) {
        privateKey = privateKey.slice(1, -1);
      }
    }
    // Replace literal escaped newlines with actual newline characters
    privateKey = privateKey.replace(/\\n/g, '\n');
  }

  if (projectId && clientEmail && privateKey) {
    try {
      const defaultBucketName = storageBucketEnv || (projectId ? `${projectId}.firebasestorage.app` : undefined);
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
        storageBucket: defaultBucketName
      });
      console.log('✅ Firebase Admin initialized successfully.');
    } catch (err) {
      console.error('❌ Firebase Admin initialization error:', err.message);
    }
  } else {
    console.warn('⚠️ Missing one or more Firebase credentials (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY).');
  }
}

const db = admin.apps.length ? admin.firestore() : null;
const storage = admin.apps.length ? admin.storage() : null;
const bucket = storage
  ? (storageBucketEnv
      ? storage.bucket(storageBucketEnv)
      : (process.env.FIREBASE_PROJECT_ID ? storage.bucket(`${process.env.FIREBASE_PROJECT_ID}.firebasestorage.app`) : storage.bucket()))
  : null;

module.exports = {
  admin,
  db,
  storage,
  bucket
};
