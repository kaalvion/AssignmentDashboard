const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { exec, run, get } = require('./config/db');
const { calculateAssignmentMetrics } = require('./services/priorityService');
const { seedAchievementsIfEmpty } = require('./services/gamificationService');

async function seed() {
  console.log('🌱 Starting database seed script...');

  const schemaPath = path.join(__dirname, 'config/schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  await exec(schemaSql);
  console.log('✅ Schema tables created/verified.');

  await seedAchievementsIfEmpty();

  // Create primary student user
  const demoEmail = 'alex.student@college.edu';
  let demoUser = await get('SELECT id FROM users WHERE email = ?', [demoEmail]);

  if (!demoUser) {
    const hashedPassword = await bcrypt.hash('Password123!', 10);
    const userRes = await run(
      `INSERT INTO users (name, email, password, course, semester, division, points, streak) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ['Alex Johnson', demoEmail, hashedPassword, 'BCA', '4th', 'A', 285, 5]
    );
    demoUser = { id: userRes.id };
    console.log('✅ Demo user created: alex.student@college.edu / Password123!');
  }

  const userId = demoUser.id;

  // Subjects
  const subjectsData = [
    { name: 'Database Management System', code: 'DBMS', color: '#6366F1' },
    { name: 'Java Programming', code: 'JAVA', color: '#10B981' },
    { name: 'Web Development', code: 'WEB', color: '#F59E0B' },
    { name: 'Mathematics', code: 'MATH', color: '#EF4444' },
    { name: 'Software Engineering', code: 'SE', color: '#8B5CF6' }
  ];

  const subjectIdMap = {};
  for (const s of subjectsData) {
    let existingSub = await get('SELECT id FROM subjects WHERE user_id = ? AND name = ?', [userId, s.name]);
    if (!existingSub) {
      const res = await run(
        `INSERT INTO subjects (user_id, name, code, color) VALUES (?, ?, ?, ?)`,
        [userId, s.name, s.code, s.color]
      );
      subjectIdMap[s.name] = res.id;
    } else {
      subjectIdMap[s.name] = existingSub.id;
    }
  }

  // Clear existing assignments for fresh seed
  await run('DELETE FROM assignments WHERE user_id = ?', [userId]);

  const now = new Date();
  
  // Helpers for relative dates
  const hoursFromNow = (h) => new Date(now.getTime() + h * 60 * 60 * 1000).toISOString();

  const mockAssignments = [
    {
      title: 'DBMS ER-Diagram & Relational Schema',
      subjectName: 'Database Management System',
      description: 'Design complete ER diagrams and translate to normalized 3NF relational schemas for university portal.',
      deadline: hoursFromNow(30), // ~1.2 days
      difficulty: 'HARD',
      estimated_hours: 4.5,
      progress: 35,
      status: 'IN_PROGRESS',
      teacher: 'Dr. R. Sharma',
      submission_method: 'Online Portal',
      subtasks: [
        { title: 'Research ER Entity sets', mins: 45, is_completed: 1 },
        { title: 'Draw ER Diagram in Lucidchart', mins: 60, is_completed: 1 },
        { title: 'Write 3NF Normalization tables', mins: 90, is_completed: 0 },
        { title: 'Write SQL DDL creation script', mins: 60, is_completed: 0 }
      ]
    },
    {
      title: 'Java Multi-threading & GUI Application',
      subjectName: 'Java Programming',
      description: 'Implement Swing GUI application with synchronized producer-consumer queue.',
      deadline: hoursFromNow(18), // Urgent! 18 hours remaining
      difficulty: 'EXTREME',
      estimated_hours: 5.0,
      progress: 10,
      status: 'IN_PROGRESS',
      teacher: 'Prof. Ananya V.',
      submission_method: 'GitHub Repository link',
      subtasks: [
        { title: 'Setup JavaFX/Swing Window', mins: 30, is_completed: 1 },
        { title: 'Implement Thread Synchronized Queue', mins: 120, is_completed: 0 },
        { title: 'Test Race Conditions', mins: 60, is_completed: 0 }
      ]
    },
    {
      title: 'Web Dev Fullstack React & Node Mini Project',
      subjectName: 'Web Development',
      description: 'Build responsive mini dashboard using modern CSS glassmorphism styling.',
      deadline: hoursFromNow(120), // 5 days
      difficulty: 'MEDIUM',
      estimated_hours: 6.0,
      progress: 0,
      status: 'PENDING',
      teacher: 'Prof. K. Mehta',
      submission_method: 'Zip File upload'
    },
    {
      title: 'Discrete Mathematics Graph Theory Quiz',
      subjectName: 'Mathematics',
      description: 'Solve problem set on Eulerian paths, Dijkstra algorithm, and tree traversals.',
      deadline: hoursFromNow(-12), // Overdue by 12h
      difficulty: 'HARD',
      estimated_hours: 3.0,
      progress: 20,
      status: 'OVERDUE',
      teacher: 'Dr. Suresh P.',
      submission_method: 'Classroom Physical Submission'
    },
    {
      title: 'Software Engineering Requirements Doc (SRS)',
      subjectName: 'Software Engineering',
      description: 'Draft IEEE format Software Requirement Specification for E-learning platform.',
      deadline: hoursFromNow(-48), // Completed 2 days ago
      difficulty: 'EASY',
      estimated_hours: 2.0,
      progress: 100,
      status: 'COMPLETED',
      teacher: 'Prof. N. Kapoor',
      submission_method: 'PDF Email'
    }
  ];

  for (const item of mockAssignments) {
    const subjectId = subjectIdMap[item.subjectName];
    const metrics = calculateAssignmentMetrics({
      deadline: item.deadline,
      difficulty: item.difficulty,
      estimated_hours: item.estimated_hours,
      progress: item.progress,
      status: item.status
    });

    const assignRes = await run(
      `INSERT INTO assignments 
       (user_id, subject_id, title, description, deadline, difficulty, estimated_hours, progress, status, teacher, submission_method, priority_score, priority_level, risk_level) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        subjectId,
        item.title,
        item.description,
        item.deadline,
        item.difficulty,
        item.estimated_hours,
        item.progress,
        item.status,
        item.teacher,
        item.submission_method,
        metrics.priorityScore,
        metrics.priorityLevel,
        metrics.riskLevel
      ]
    );

    if (item.subtasks) {
      for (const st of item.subtasks) {
        await run(
          `INSERT INTO subtasks (assignment_id, title, estimated_minutes, is_completed) VALUES (?, ?, ?, ?)`,
          [assignRes.id, st.title, st.mins, st.is_completed]
        );
      }
    }
  }

  // Seed default group
  let existingGroup = await get('SELECT id FROM groups WHERE creator_id = ?', [userId]);
  if (!existingGroup) {
    const gRes = await run(
      `INSERT INTO groups (name, description, creator_id, code) VALUES (?, ?, ?, ?)`,
      ['BCA Final Year Project Group', 'Collaborative workspace for final semester project', userId, 'GRP-BCA2026']
    );
    await run(`INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, 'LEADER')`, [gRes.id, userId]);
    await run(
      `INSERT INTO group_tasks (group_id, title, status) VALUES (?, ?, ?)`,
      [gRes.id, 'Backend API Documentation', 'IN_PROGRESS']
    );
  }

  console.log('✅ Seed completed successfully!');
}

seed().catch(err => {
  console.error('❌ Seed Error:', err);
});
