const bcrypt = require('bcryptjs');
const { db } = require('./config/firebase');
const { calculateAssignmentMetrics } = require('./services/priorityService');

const INITIAL_ACHIEVEMENTS = [
  { code: 'TOP_PERFORMER', name: 'Top Performer', description: 'Reach top 3 position on the leaderboard', icon: 'Trophy', reward: 100 },
  { code: 'DEADLINE_MASTER', name: 'Deadline Master', description: 'Complete 5 assignments before deadline', icon: 'Clock', reward: 75 },
  { code: 'CONSISTENCY_CHAMPION', name: 'Consistency Champion', description: 'Maintain a 7-day study streak', icon: 'Flame', reward: 50 },
  { code: 'PERFECT_ON_TIME', name: '100% On-Time', description: 'Complete 10 assignments with 100% on-time record', icon: 'CheckCircle', reward: 100 },
  { code: 'STAR_OF_MONTH', name: 'Star of the Month', description: 'Achieve #1 productivity rank for the month', icon: 'Star', reward: 150 },
  { code: 'EARLY_BIRD', name: 'Early Bird', description: 'Submit an assignment at least 24h before deadline', icon: 'Zap', reward: 40 },
  { code: 'TASK_CRUSHER', name: 'Task Crusher', description: 'Complete 25 total subtasks', icon: 'CheckSquare', reward: 60 },
  { code: 'PERFECT_WEEK', name: 'Perfect Week', description: 'Complete all planned assignments for a full week', icon: 'Award', reward: 80 }
];

const DEFAULT_SUBJECTS = [
  { code: 'DBMS', name: 'Database Management System', color: '#6366F1' },
  { code: 'JAVA', name: 'Java Programming', color: '#10B981' },
  { code: 'WEB', name: 'Web Development', color: '#F59E0B' },
  { code: 'MATH', name: 'Mathematics', color: '#EF4444' },
  { code: 'SE', name: 'Software Engineering', color: '#8B5CF6' }
];

/**
 * Creates default subjects for any given user ID using fixed deterministic doc IDs
 * so that running it multiple times will not create duplicates.
 */
async function seedDefaultSubjectsForUser(userId) {
  if (!db || !userId) return;
  const batch = db.batch();

  for (const s of DEFAULT_SUBJECTS) {
    const subDocId = `${s.code.toLowerCase()}_${userId}`;
    const subRef = db.collection('subjects').doc(subDocId);
    batch.set(subRef, {
      id: subDocId,
      userId,
      name: s.name,
      code: s.code,
      color: s.color,
      createdAt: new Date().toISOString()
    }, { merge: true });
  }

  await batch.commit();
}

async function seed() {
  console.log('🌱 Starting Firestore database seed script...');

  if (!db) {
    throw new Error('Firestore is not initialized. Check your credentials in backend/.env.');
  }

  // 1. Seed static achievements master collection
  console.log('Seeding achievements master collection...');
  const achBatch = db.batch();
  for (const ach of INITIAL_ACHIEVEMENTS) {
    const docRef = db.collection('achievements').doc(ach.code);
    achBatch.set(docRef, {
      id: ach.code,
      code: ach.code,
      name: ach.name,
      description: ach.description,
      icon: ach.icon,
      pointsReward: ach.reward,
      points_reward: ach.reward
    }, { merge: true });
  }
  await achBatch.commit();
  console.log(`✅ Seeded ${INITIAL_ACHIEVEMENTS.length} static achievements.`);

  // 2. Seed primary demo student
  const demoUserId = 'demo_student_alex';
  const demoEmail = 'alex.student@college.edu';
  const hashedPassword = await bcrypt.hash('Password123!', 10);

  const userRef = db.collection('users').doc(demoUserId);
  await userRef.set({
    id: demoUserId,
    name: 'Alex Johnson',
    email: demoEmail,
    password: hashedPassword,
    course: 'BCA',
    semester: '4th',
    division: 'A',
    avatarUrl: null,
    avatar_url: null,
    points: 285,
    streak: 5,
    createdAt: new Date().toISOString()
  }, { merge: true });
  console.log(`✅ Demo user seeded: ${demoEmail} (${demoUserId})`);

  // 3. Seed subjects for demo user
  await seedDefaultSubjectsForUser(demoUserId);
  console.log('✅ Default subjects created for demo user.');

  // 4. Seed assignments for demo user
  const now = new Date();
  const hoursFromNow = (h) => new Date(now.getTime() + h * 60 * 60 * 1000).toISOString();

  const mockAssignments = [
    {
      id: `assign_dbms_${demoUserId}`,
      subjectCode: 'DBMS',
      subjectName: 'Database Management System',
      subjectColor: '#6366F1',
      title: 'DBMS ER-Diagram & Relational Schema',
      description: 'Design complete ER diagrams and translate to normalized 3NF relational schemas for university portal.',
      deadline: hoursFromNow(30),
      difficulty: 'HARD',
      estimated_hours: 4.5,
      progress: 35,
      status: 'IN_PROGRESS',
      teacher: 'Dr. R. Sharma',
      submission_method: 'Online Portal',
      subtasks: [
        { id: 'st_1', title: 'Research ER Entity sets', estimated_minutes: 45, is_completed: 1, isCompleted: true },
        { id: 'st_2', title: 'Draw ER Diagram in Lucidchart', estimated_minutes: 60, is_completed: 1, isCompleted: true },
        { id: 'st_3', title: 'Write 3NF Normalization tables', estimated_minutes: 90, is_completed: 0, isCompleted: false },
        { id: 'st_4', title: 'Write SQL DDL creation script', estimated_minutes: 60, is_completed: 0, isCompleted: false }
      ],
      resources: [
        { id: 'res_1', title: 'Normalization Guide PDF', type: 'URL', urlOrPath: 'https://example.com/guide.pdf', fileSize: 102400 }
      ]
    },
    {
      id: `assign_java_${demoUserId}`,
      subjectCode: 'JAVA',
      subjectName: 'Java Programming',
      subjectColor: '#10B981',
      title: 'Java Multi-threading & GUI Application',
      description: 'Implement Swing GUI application with synchronized producer-consumer queue.',
      deadline: hoursFromNow(18),
      difficulty: 'EXTREME',
      estimated_hours: 5.0,
      progress: 10,
      status: 'IN_PROGRESS',
      teacher: 'Prof. Ananya V.',
      submission_method: 'GitHub Repository link',
      subtasks: [
        { id: 'st_1', title: 'Setup JavaFX/Swing Window', estimated_minutes: 30, is_completed: 1, isCompleted: true },
        { id: 'st_2', title: 'Implement Thread Synchronized Queue', estimated_minutes: 120, is_completed: 0, isCompleted: false },
        { id: 'st_3', title: 'Test Race Conditions', estimated_minutes: 60, is_completed: 0, isCompleted: false }
      ]
    },
    {
      id: `assign_web_${demoUserId}`,
      subjectCode: 'WEB',
      subjectName: 'Web Development',
      subjectColor: '#F59E0B',
      title: 'Web Dev Fullstack React & Node Mini Project',
      description: 'Build responsive mini dashboard using modern CSS glassmorphism styling.',
      deadline: hoursFromNow(120),
      difficulty: 'MEDIUM',
      estimated_hours: 6.0,
      progress: 0,
      status: 'PENDING',
      teacher: 'Prof. K. Mehta',
      submission_method: 'Zip File upload',
      subtasks: []
    },
    {
      id: `assign_math_${demoUserId}`,
      subjectCode: 'MATH',
      subjectName: 'Mathematics',
      subjectColor: '#EF4444',
      title: 'Discrete Mathematics Graph Theory Quiz',
      description: 'Solve problem set on Eulerian paths, Dijkstra algorithm, and tree traversals.',
      deadline: hoursFromNow(-12),
      difficulty: 'HARD',
      estimated_hours: 3.0,
      progress: 20,
      status: 'OVERDUE',
      teacher: 'Dr. Suresh P.',
      submission_method: 'Classroom Physical Submission',
      subtasks: []
    },
    {
      id: `assign_se_${demoUserId}`,
      subjectCode: 'SE',
      subjectName: 'Software Engineering',
      subjectColor: '#8B5CF6',
      title: 'Software Engineering Requirements Doc (SRS)',
      description: 'Draft IEEE format Software Requirement Specification for E-learning platform.',
      deadline: hoursFromNow(-48),
      difficulty: 'EASY',
      estimated_hours: 2.0,
      progress: 100,
      status: 'COMPLETED',
      completed_at: hoursFromNow(-48),
      teacher: 'Prof. N. Kapoor',
      submission_method: 'PDF Email',
      subtasks: []
    }
  ];

  const assignBatch = db.batch();
  for (const item of mockAssignments) {
    const metrics = calculateAssignmentMetrics({
      deadline: item.deadline,
      difficulty: item.difficulty,
      estimated_hours: item.estimated_hours,
      progress: item.progress,
      status: item.status
    });

    const assignRef = db.collection('assignments').doc(item.id);
    assignBatch.set(assignRef, {
      id: item.id,
      userId: demoUserId,
      subjectId: `${item.subjectCode.toLowerCase()}_${demoUserId}`,
      subjectName: item.subjectName,
      subject_name: item.subjectName,
      subjectCode: item.subjectCode,
      subject_code: item.subjectCode,
      subjectColor: item.subjectColor,
      subject_color: item.subjectColor,
      title: item.title,
      description: item.description,
      deadline: item.deadline,
      difficulty: item.difficulty,
      estimatedHours: item.estimated_hours,
      estimated_hours: item.estimated_hours,
      progress: item.progress,
      status: item.status,
      teacher: item.teacher,
      submissionMethod: item.submission_method,
      submission_method: item.submission_method,
      subtasks: item.subtasks || [],
      resources: item.resources || [],
      priorityScore: metrics.priorityScore,
      priority_score: metrics.priorityScore,
      priorityLevel: metrics.priorityLevel,
      priority_level: metrics.priorityLevel,
      riskLevel: metrics.riskLevel,
      risk_level: metrics.riskLevel,
      completedAt: item.completed_at || null,
      completed_at: item.completed_at || null,
      createdAt: new Date().toISOString()
    }, { merge: true });
  }
  await assignBatch.commit();
  console.log(`✅ Seeded ${mockAssignments.length} assignments for demo user.`);

  // 5. Seed default group
  const groupId = 'grp_bca2026_demo';
  const groupRef = db.collection('groups').doc(groupId);
  await groupRef.set({
    id: groupId,
    name: 'BCA Final Year Project Group',
    description: 'Collaborative workspace for final semester project',
    creatorId: demoUserId,
    code: 'GRP-BCA2026',
    memberIds: [demoUserId],
    members: [
      {
        userId: demoUserId,
        name: 'Alex Johnson',
        email: demoEmail,
        avatarUrl: null,
        role: 'LEADER',
        joinedAt: new Date().toISOString()
      }
    ],
    createdAt: new Date().toISOString()
  }, { merge: true });

  const taskRef = db.collection('groups').doc(groupId).collection('tasks').doc('task_api_doc');
  await taskRef.set({
    id: 'task_api_doc',
    groupId,
    title: 'Backend API Documentation',
    assignedUserId: demoUserId,
    assignedUserName: 'Alex Johnson',
    status: 'IN_PROGRESS',
    createdAt: new Date().toISOString()
  }, { merge: true });
  console.log('✅ Seeded default study group and group task.');

  console.log('🎉 Firestore database seeding completed successfully!');
}

if (require.main === module) {
  seed().catch(err => {
    console.error('❌ Seed Error:', err);
    process.exit(1);
  });
}

module.exports = {
  seed,
  seedDefaultSubjectsForUser,
  INITIAL_ACHIEVEMENTS,
  DEFAULT_SUBJECTS
};
