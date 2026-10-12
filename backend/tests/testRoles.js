if (process.env.NODE_ENV === 'production') {
  console.error('⛔ Refusing to run tests against production environment!');
  process.exit(1);
}

const express = require('express');
const authRoutes = require('../src/routes/authRoutes');
const adminRoutes = require('../src/routes/adminRoutes');
const { db } = require('../src/config/firebase');

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);

async function runTests() {
  console.log('🧪 Starting Hardened Roles, Permissions & Class Lock Tests...');

  const server = app.listen(5044, async () => {
    try {
      const baseUrl = 'http://localhost:5044/api';
      const timestamp = Date.now();
      
      const studentId = `test_student_role_${timestamp}`;
      const studentEmail = `student_${timestamp}@nexus.edu`;
      const studentHeaders = {
        'Content-Type': 'application/json',
        'x-user-id': studentId,
        'x-user-email': studentEmail
      };

      const adminId = `test_admin_${timestamp}`;
      const adminEmail = `admin@nexus.edu`; // Configured in ADMIN_EMAILS
      const adminHeaders = {
        'Content-Type': 'application/json',
        'x-user-id': adminId,
        'x-user-email': adminEmail
      };

      const peerAdminId = `test_peer_admin_${timestamp}`;
      const peerAdminEmail = `alex.admin@college.edu`; // Also configured in ADMIN_EMAILS

      // 1. Student setup
      console.log('1️⃣ Creating test student...');
      const studentUserRef = db.collection('users').doc(studentId);
      await studentUserRef.set({
        id: studentId,
        name: 'Regular Student',
        email: studentEmail,
        role: 'STUDENT',
        course: '',
        semester: '',
        division: '',
        points: 50,
        streak: 1
      });

      // 2. Student attempts to access Admin endpoints (Expect 403 Forbidden)
      console.log('2️⃣ Testing: Student cannot access admin endpoints (403 expected)...');
      const studentAdminReq = await fetch(`${baseUrl}/admin/users`, { headers: studentHeaders });
      if (studentAdminReq.status !== 403) {
        throw new Error(`Expected 403 Forbidden for student accessing /admin/users, got: ${studentAdminReq.status}`);
      }
      console.log('✅ Student access to /admin/users denied with 403 Forbidden.');

      // 3. Student attempts to self-promote via PUT /api/auth/profile
      console.log('3️⃣ Testing: Student cannot self-promote by passing role in body...');
      const tamperRes = await fetch(`${baseUrl}/auth/profile`, {
        method: 'PUT',
        headers: studentHeaders,
        body: JSON.stringify({
          name: 'Hacker Student',
          role: 'ADMIN'
        })
      });
      const tamperData = await tamperRes.json();
      if (!tamperData.success || tamperData.data.role === 'ADMIN') {
        throw new Error('Security flaw: Student was able to change their role to ADMIN!');
      }

      const verifyStudentDoc = await studentUserRef.get();
      if (verifyStudentDoc.data().role !== 'STUDENT') {
        throw new Error('Security flaw: Role was modified in database!');
      }
      console.log('✅ Privilege escalation blocked: Student role remains "STUDENT".');

      // 4. Onboarding check and locking course/semester/division
      console.log('4️⃣ Testing: Student onboarding and class locking...');
      // Complete initial onboarding
      const updateOnboardRes = await fetch(`${baseUrl}/auth/profile`, {
        method: 'PUT',
        headers: studentHeaders,
        body: JSON.stringify({
          course: 'BCA',
          semester: '4th',
          division: 'A'
        })
      });
      const onboardData = await updateOnboardRes.json();
      if (!onboardData.success || onboardData.data.needsOnboarding) {
        throw new Error('Expected needsOnboarding to be false after completing academic fields');
      }
      console.log('✅ Student onboarding completed (BCA 4th Sem Div A).');

      // Student attempts to modify class details after onboarding -> MUST FAIL with 403
      console.log('Testing: Student attempting to alter class after onboarding (403 expected)...');
      const tamperClassRes = await fetch(`${baseUrl}/auth/profile`, {
        method: 'PUT',
        headers: studentHeaders,
        body: JSON.stringify({
          division: 'B' // Attempt to switch division
        })
      });
      if (tamperClassRes.status !== 403) {
        throw new Error(`Expected 403 Forbidden when student alters locked class, got: ${tamperClassRes.status}`);
      }
      console.log('✅ Class locking verified: Student change rejected with 403 Forbidden.');

      // 5. Admin can update student class via PUT /api/admin/users/:id/class
      console.log('5️⃣ Testing: Admin updating student class via /api/admin/users/:id/class...');
      const adminUserRef = db.collection('users').doc(adminId);
      await adminUserRef.set({
        id: adminId,
        name: 'Nexus Admin',
        email: adminEmail,
        role: 'ADMIN'
      });

      const adminUpdateClassRes = await fetch(`${baseUrl}/admin/users/${studentId}/class`, {
        method: 'PUT',
        headers: adminHeaders,
        body: JSON.stringify({
          course: 'BCA',
          semester: '5th',
          division: 'B'
        })
      });
      const adminUpdateClassData = await adminUpdateClassRes.json();
      if (!adminUpdateClassData.success || adminUpdateClassData.data.semester.toUpperCase() !== '5TH') {
        throw new Error('Admin class update failed: ' + JSON.stringify(adminUpdateClassData));
      }
      console.log('✅ Admin successfully updated student class to BCA 5th Sem Div B.');

      // 6. Admin API Role Hardening: Reject ADMIN role assignment
      console.log('6️⃣ Testing: Admin cannot assign ADMIN role via API (400 expected)...');
      const assignAdminRoleRes = await fetch(`${baseUrl}/admin/users/${studentId}/role`, {
        method: 'PUT',
        headers: adminHeaders,
        body: JSON.stringify({ role: 'ADMIN' })
      });
      if (assignAdminRoleRes.status !== 400) {
        throw new Error(`Expected 400 Bad Request when attempting to assign ADMIN role, got: ${assignAdminRoleRes.status}`);
      }
      console.log('✅ Assigning ADMIN role rejected with 400 Bad Request.');

      // 7. Admin cannot change their own role (403 expected)
      console.log('7️⃣ Testing: Admin cannot change their own role (403 expected)...');
      const selfDemoteRes = await fetch(`${baseUrl}/admin/users/${adminId}/role`, {
        method: 'PUT',
        headers: adminHeaders,
        body: JSON.stringify({ role: 'STUDENT' })
      });
      if (selfDemoteRes.status !== 403) {
        throw new Error(`Expected 403 Forbidden for admin self-role-change, got: ${selfDemoteRes.status}`);
      }
      console.log('✅ Admin self-role-change blocked with 403 Forbidden.');

      // 8. Admin cannot change role of another user listed in ADMIN_EMAILS (403 expected)
      console.log('8️⃣ Testing: Admin cannot modify role of user in ADMIN_EMAILS (403 expected)...');
      const peerAdminRef = db.collection('users').doc(peerAdminId);
      await peerAdminRef.set({
        id: peerAdminId,
        name: 'Peer Admin',
        email: peerAdminEmail,
        role: 'ADMIN'
      });

      const peerDemoteRes = await fetch(`${baseUrl}/admin/users/${peerAdminId}/role`, {
        method: 'PUT',
        headers: adminHeaders,
        body: JSON.stringify({ role: 'STUDENT' })
      });
      if (peerDemoteRes.status !== 403) {
        throw new Error(`Expected 403 Forbidden for peer admin role modification, got: ${peerDemoteRes.status}`);
      }
      console.log('✅ Peer admin role modification blocked with 403 Forbidden.');

      // 9. Admin promotes student to TEACHER
      console.log('9️⃣ Testing: Admin promotes student to TEACHER...');
      const promoteRes = await fetch(`${baseUrl}/admin/users/${studentId}/role`, {
        method: 'PUT',
        headers: adminHeaders,
        body: JSON.stringify({ role: 'TEACHER' })
      });
      const promoteData = await promoteRes.json();
      if (!promoteData.success || promoteData.data.role !== 'TEACHER') {
        throw new Error('Admin failed to promote student to TEACHER: ' + JSON.stringify(promoteData));
      }
      console.log('✅ Student promoted to TEACHER successfully.');

      // 10. Admin lists teachers
      console.log('🔟 Testing: Admin lists teachers (promoted user must appear)...');
      const teachersRes = await fetch(`${baseUrl}/admin/teachers`, { headers: adminHeaders });
      const teachersData = await teachersRes.json();
      if (!teachersData.success || !teachersData.data.some(t => t.id === studentId)) {
        throw new Error('Promoted user not found in teachers list!');
      }
      console.log(`✅ Promoted teacher confirmed in teacher list.`);

      // 11. Admin demotes user back to STUDENT
      console.log('1️⃣1️⃣ Testing: Admin demotes user back to STUDENT...');
      const demoteRes = await fetch(`${baseUrl}/admin/users/${studentId}/role`, {
        method: 'PUT',
        headers: adminHeaders,
        body: JSON.stringify({ role: 'STUDENT' })
      });
      const demoteData = await demoteRes.json();
      if (!demoteData.success || demoteData.data.role !== 'STUDENT') {
        throw new Error('Admin failed to demote user to STUDENT: ' + JSON.stringify(demoteData));
      }
      console.log('✅ User successfully demoted back to STUDENT.');

      // Cleanup
      console.log('🧹 Cleaning up test users...');
      await studentUserRef.delete();
      await adminUserRef.delete();
      await peerAdminRef.delete();

      console.log('🎉 All Hardened Roles, Permissions & Class Lock tests PASSED with 100% success!');
      server.close(() => process.exit(0));
    } catch (err) {
      console.error('❌ Test Failure:', err);
      server.close(() => process.exit(1));
    }
  });
}

runTests();
