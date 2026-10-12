if (process.env.NODE_ENV === 'production') {
  console.error('⛔ Refusing to run tests against production environment!');
  process.exit(1);
}

const express = require('express');
const authRoutes = require('../src/routes/authRoutes');
const { db } = require('../src/config/firebase');

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

async function runAuthTests() {
  console.log('🧪 Starting Auth & Profile Firestore Tests...');

  const server = app.listen(5099, async () => {
    try {
      const baseUrl = 'http://localhost:5099/api/auth';
      const timestamp = Date.now();
      const testEmail = `student_${timestamp}@example.com`;
      const testPassword = 'Password123!';

      // Test 1: Register
      console.log('1️⃣ Testing POST /api/auth/register...');
      const regRes = await fetch(`${baseUrl}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Jane Doe',
          email: testEmail,
          password: testPassword,
          course: 'BCA',
          semester: '4th',
          division: 'A'
        })
      });
      const regData = await regRes.json();
      if (!regData.success || !regData.data.token) {
        throw new Error('Registration failed: ' + JSON.stringify(regData));
      }
      const newUserId = regData.data.user.id;
      const token = regData.data.token;
      console.log('✅ Registration SUCCESS for user ID:', newUserId);

      // Verify default subjects auto-created in Firestore
      const subSnap = await db.collection('subjects').where('userId', '==', newUserId).get();
      console.log(`✅ Default subjects auto-created in Firestore: ${subSnap.size} subjects.`);
      if (subSnap.size !== 5) {
        throw new Error(`Expected 5 default subjects, found ${subSnap.size}`);
      }

      // Test 2: Login
      console.log('2️⃣ Testing POST /api/auth/login...');
      const loginRes = await fetch(`${baseUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword
        })
      });
      const loginData = await loginRes.json();
      if (!loginData.success || !loginData.data.token) {
        throw new Error('Login failed: ' + JSON.stringify(loginData));
      }
      console.log('✅ Login SUCCESS for:', loginData.data.user.email);

      // Test 3: Get Me with Bearer Token
      console.log('3️⃣ Testing GET /api/auth/me with Bearer token...');
      const meRes = await fetch(`${baseUrl}/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const meData = await meRes.json();
      if (!meData.success || meData.data.email !== testEmail) {
        throw new Error('GetMe failed: ' + JSON.stringify(meData));
      }
      console.log('✅ GET /me SUCCESS. Returned user:', meData.data.name);

      // Test 4: Update Profile (allowed fields like name and avatarUrl)
      console.log('4️⃣ Testing PUT /api/auth/profile...');
      const updateRes = await fetch(`${baseUrl}/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: 'Jane Smith',
          avatarUrl: 'https://example.com/avatar.png'
        })
      });
      const updateData = await updateRes.json();
      if (!updateData.success || updateData.data.name !== 'Jane Smith') {
        throw new Error('Profile update failed: ' + JSON.stringify(updateData));
      }
      console.log('✅ PUT /profile SUCCESS. Updated name to:', updateData.data.name);

      // Test 5: Auto-create user doc on first Clerk login
      console.log('5️⃣ Testing auto-creation for new Clerk user ID...');
      const clerkUserId = `user_clerk_test_${timestamp}`;
      const clerkMeRes = await fetch(`${baseUrl}/me`, {
        headers: { 'x-user-id': clerkUserId }
      });
      const clerkMeData = await clerkMeRes.json();
      if (!clerkMeData.success || clerkMeData.data.id !== clerkUserId) {
        throw new Error('Clerk auto-creation failed: ' + JSON.stringify(clerkMeData));
      }
      // Check subjects for Clerk user
      const clerkSubs = await db.collection('subjects').where('userId', '==', clerkUserId).get();
      console.log(`✅ Clerk auto-user created with ${clerkSubs.size} default subjects.`);

      // Clean up test users & test subjects from Firestore
      console.log('🧹 Cleaning up test users and test subjects...');
      const batch = db.batch();
      batch.delete(db.collection('users').doc(newUserId));
      batch.delete(db.collection('users').doc(clerkUserId));
      subSnap.forEach(d => batch.delete(d.ref));
      clerkSubs.forEach(d => batch.delete(d.ref));
      await batch.commit();

      console.log('🎉 All Auth & Profile tests PASSED with 100% success!');
      server.close(() => process.exit(0));
    } catch (err) {
      console.error('❌ Test Failure:', err);
      server.close(() => process.exit(1));
    }
  });
}

runAuthTests();
