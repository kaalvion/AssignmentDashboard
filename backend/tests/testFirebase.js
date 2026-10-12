if (process.env.NODE_ENV === 'production') {
  console.error('⛔ Refusing to run tests against production environment!');
  process.exit(1);
}

const { db } = require('../src/config/firebase');

async function testConnection() {
  console.log('🔄 Testing Firebase Firestore connection...');
  
  if (!db) {
    console.error('❌ Firestore instance is null. Check your Firebase credentials in backend/.env.');
    process.exit(1);
  }

  try {
    const testDocRef = db.collection('_connection_test').doc('ping');
    const timestamp = new Date().toISOString();

    // 1. Write document
    console.log('Writing test document to _connection_test/ping...');
    await testDocRef.set({
      status: 'connected',
      message: 'Assignment Dashboard Backend Firebase Connection Successful',
      testedAt: timestamp
    });
    console.log('✅ Document written successfully.');

    // 2. Read document
    console.log('Reading test document back...');
    const snapshot = await testDocRef.get();
    if (!snapshot.exists) {
      throw new Error('Test document could not be retrieved.');
    }
    const data = snapshot.data();
    console.log('✅ Document read successfully:', {
      id: snapshot.id,
      status: data.status,
      testedAt: data.testedAt
    });

    // 3. Clean up
    await testDocRef.delete();
    console.log('🧹 Cleaned up test document.');

    console.log('🎉 Firestore connection test PASSED successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Firestore test failed:', error.message);
    if (error.code) console.error('Error Code:', error.code);
    process.exit(1);
  }
}

testConnection();
