// Pure ES Module Vercel Serverless Function (Compatible with "type": "module")

async function parseBody(req) {
  if (req.body) {
    if (typeof req.body === 'string') {
      try {
        return JSON.parse(req.body);
      } catch (e) {
        return {};
      }
    }
    return req.body;
  }
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-user-id, x-user-email, x-user-name');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Parse path
  const rawUrl = req.url || '';
  const pathname = rawUrl.split('?')[0];

  // Helper JSON response
  const json = (statusCode, data) => {
    res.setHeader('Content-Type', 'application/json');
    return res.status(statusCode).json ? res.status(statusCode).json(data) : res.writeHead(statusCode, { 'Content-Type': 'application/json' }).end(JSON.stringify(data));
  };

  // 1. Health check
  if (pathname === '/api/health' || pathname === '/health') {
    return json(200, {
      success: true,
      message: 'Nexus Assignment Dashboard Serverless API is running smoothly on Vercel.'
    });
  }

  // 2. Auth: Current User Profile (/api/auth/me)
  if (pathname === '/api/auth/me') {
    const userId = req.headers['x-user-id'] || 'demo_student';
    const userEmail = req.headers['x-user-email'] || 'student@nexus.edu';
    const userName = req.headers['x-user-name'] || 'Student';

    return json(200, {
      success: true,
      data: {
        id: userId,
        name: userName,
        email: userEmail,
        role: 'STUDENT',
        course: 'BCA',
        semester: '1ST',
        division: 'A',
        points: 120,
        streak: 3,
        needsOnboarding: false
      }
    });
  }

  // 3. Auth: Update Class Profile (PUT /api/auth/profile)
  if (pathname === '/api/auth/profile' && req.method === 'PUT') {
    const body = await parseBody(req);
    const { course, semester, division, name } = body;

    return json(200, {
      success: true,
      message: 'Academic profile updated and class enrollment confirmed successfully.',
      data: {
        name: name || 'Student',
        course: course || 'BCA',
        semester: semester || '1ST',
        division: division || 'A',
        needsOnboarding: false
      }
    });
  }

  // 4. Auth: Login & Register fallbacks
  if (pathname === '/api/auth/login' || pathname === '/api/auth/register') {
    const body = await parseBody(req);
    return json(200, {
      success: true,
      message: 'Authenticated successfully.',
      data: {
        token: 'nexus_jwt_token_' + Date.now(),
        user: {
          id: 'student_' + Date.now(),
          name: body.name || 'Student',
          email: body.email || 'student@nexus.edu',
          role: 'STUDENT',
          course: body.course || 'BCA',
          semester: body.semester || '1ST',
          division: body.division || 'A',
          needsOnboarding: false
        }
      }
    });
  }

  // 5. Subjects (/api/assignments/subjects)
  if (pathname === '/api/assignments/subjects') {
    return json(200, {
      success: true,
      data: [
        { id: 1, name: 'Computer Networks', code: 'CS401', color: 'var(--primary)' },
        { id: 2, name: 'Database Management Systems', code: 'CS402', color: 'var(--accent-purple)' },
        { id: 3, name: 'Web Technologies', code: 'CS403', color: 'var(--accent-cyan)' },
        { id: 4, name: 'Software Engineering', code: 'CS404', color: 'var(--accent-emerald)' },
        { id: 5, name: 'Operating Systems', code: 'CS405', color: 'var(--accent-amber)' }
      ]
    });
  }

  // 6. Assignments list (/api/assignments)
  if (pathname === '/api/assignments') {
    if (req.method === 'POST') {
      const body = await parseBody(req);
      const newAssignment = {
        id: Date.now(),
        ...body,
        priority_score: 75,
        priority_level: 'HIGH',
        risk_level: 'MEDIUM'
      };
      return json(201, {
        success: true,
        message: 'Assignment created successfully.',
        data: newAssignment
      });
    }

    return json(200, {
      success: true,
      data: [
        {
          id: 101,
          subject_id: 1,
          subject: 'Computer Networks',
          subjectName: 'Computer Networks',
          title: 'TCP/IP Socket Programming Project',
          description: 'Implement multi-threaded client/server architecture in Python or C.',
          deadline: new Date(Date.now() + 86400000 * 2).toISOString(),
          maxPoints: 100,
          points: 100,
          priority_level: 'HIGH',
          risk_level: 'MEDIUM',
          progress: 40,
          submissionStatus: 'PENDING',
          course: 'BCA',
          semester: '1ST',
          division: 'A'
        },
        {
          id: 102,
          subject_id: 2,
          subject: 'Database Management',
          subjectName: 'Database Management',
          title: 'Relational Schema Optimization & Indexing',
          description: 'Design 3NF relational schemas with B-tree query indexing benchmarks.',
          deadline: new Date(Date.now() + 86400000 * 4).toISOString(),
          maxPoints: 75,
          points: 75,
          priority_level: 'HIGH',
          risk_level: 'LOW',
          progress: 20,
          submissionStatus: 'PENDING',
          course: 'BCA',
          semester: '1ST',
          division: 'A'
        },
        {
          id: 103,
          subject_id: 3,
          subject: 'Web Technologies',
          subjectName: 'Web Technologies',
          title: 'Fullstack React & REST API Project',
          description: 'Build responsive single page dashboard with authentication.',
          deadline: new Date(Date.now() + 86400000 * 7).toISOString(),
          maxPoints: 50,
          points: 50,
          priority_level: 'MEDIUM',
          risk_level: 'LOW',
          progress: 60,
          submissionStatus: 'ON_TIME',
          course: 'BCA',
          semester: '1ST',
          division: 'A'
        }
      ]
    });
  }

  // 7. Analytics Dashboard (/api/analytics/dashboard)
  if (pathname === '/api/analytics/dashboard') {
    return json(200, {
      success: true,
      data: {
        stats: {
          total: 3,
          completed: 1,
          inProgress: 1,
          pending: 1,
          overdue: 0,
          completionRate: 33,
          onTimeRate: 100,
          streak: 3,
          points: 120
        },
        todaysPriority: {
          id: 101,
          subject_name: 'Computer Networks',
          title: 'TCP/IP Socket Programming Project',
          description: 'Implement a multi-threaded chat server and client using socket programming in C/Python.',
          estimated_hours: 4.5,
          progress: 40,
          priority_level: 'HIGH',
          risk_level: 'MEDIUM',
          deadline: new Date(Date.now() + 86400000 * 2).toISOString()
        },
        upcomingDeadlines: [
          {
            id: 102,
            subject_name: 'Database Management',
            title: 'Relational Schema Optimization & Indexing',
            deadline: new Date(Date.now() + 86400000 * 4).toISOString(),
            priority_level: 'HIGH',
            risk_level: 'LOW',
            progress: 20
          }
        ]
      }
    });
  }

  // 7b. Analytics Productivity (/api/analytics/productivity)
  if (pathname === '/api/analytics/productivity') {
    return json(200, {
      success: true,
      data: {
        statusCounts: {
          COMPLETED: 1,
          IN_PROGRESS: 1,
          PENDING: 1,
          OVERDUE: 0
        },
        subjectDistribution: [
          { name: 'Computer Networks', total: 1, completed: 0, hours: 4.5 },
          { name: 'Database Management', total: 1, completed: 0, hours: 3.0 },
          { name: 'Web Technologies', total: 1, completed: 1, hours: 2.0 }
        ]
      }
    });
  }

  // 8. Notifications (/api/notifications)
  if (pathname.startsWith('/api/notifications')) {
    if (req.method === 'PUT') {
      return json(200, { success: true, message: 'Notification marked as read.' });
    }
    return json(200, {
      success: true,
      data: {
        notifications: [
          {
            id: 'notif_welcome',
            title: 'Welcome to Assignment Dashboard! 🚀',
            message: 'Your academic workspace is active and class enrollment is confirmed.',
            type: 'SUCCESS',
            isRead: false,
            is_read: 0,
            createdAt: new Date().toISOString()
          }
        ],
        unreadCount: 1
      }
    });
  }

  // 9. Gamification endpoints
  if (pathname.startsWith('/api/gamification')) {
    if (pathname.includes('leaderboard')) {
      return json(200, {
        success: true,
        data: [
          { id: 1, rank: 1, name: 'Aarav Sharma', course: 'BCA 1st Sem', points: 680, isCurrentUser: false },
          { id: 2, rank: 2, name: 'Ananya Verma', course: 'BCA 1st Sem', points: 590, isCurrentUser: false },
          { id: 3, rank: 3, name: 'Student (You)', course: 'BCA 1st Sem', points: 120, isCurrentUser: true }
        ]
      });
    }
    if (pathname.includes('star-of-month')) {
      return json(200, {
        success: true,
        data: {
          name: 'Aarav Sharma',
          course: 'BCA 1st Sem (Div A)',
          points: 680,
          onTimeRate: 100
        }
      });
    }
    if (pathname.includes('achievements')) {
      return json(200, {
        success: true,
        data: [
          { id: 1, name: 'First Milestone', description: 'Complete your first assignment', pointsReward: 50, isUnlocked: true },
          { id: 2, name: 'Streak Master', description: 'Maintain a 3-day active streak', pointsReward: 150, isUnlocked: false }
        ]
      });
    }
  }

  // 9b. Personal Tasks (/api/tasks)
  if (pathname.startsWith('/api/tasks')) {
    if (req.method === 'POST') {
      const body = await parseBody(req);
      const newTask = {
        id: 'task_' + Date.now(),
        title: body.title || 'Personal Study Task',
        deadline: body.deadline || null,
        isCompleted: false,
        createdAt: new Date().toISOString()
      };
      return json(201, { success: true, message: 'Task created.', data: newTask });
    }
    if (req.method === 'PUT') {
      return json(200, { success: true, message: 'Task updated.' });
    }
    if (req.method === 'DELETE') {
      return json(200, { success: true, message: 'Task deleted.' });
    }
    return json(200, {
      success: true,
      data: [
        {
          id: 'task_sample_1',
          title: 'Review Chapter 3: TCP Flow Control & Congestion',
          deadline: new Date(Date.now() + 86400000).toISOString(),
          isCompleted: false,
          createdAt: new Date().toISOString()
        },
        {
          id: 'task_sample_2',
          title: 'Practice SQL Indexing & Query Plans',
          deadline: new Date(Date.now() + 86400000 * 3).toISOString(),
          isCompleted: true,
          createdAt: new Date().toISOString()
        }
      ]
    });
  }

  // 9c. Planner (/api/planner)
  if (pathname.startsWith('/api/planner')) {
    return json(200, {
      success: true,
      data: {
        dailyPlan: [
          { time: '09:00 - 10:30', title: 'Computer Networks Socket Lab', priority: 'HIGH', completed: false },
          { time: '11:00 - 12:30', title: 'DBMS Relational Schema Indexing', priority: 'HIGH', completed: true },
          { time: '14:00 - 15:30', title: 'Web Tech REST API Integration', priority: 'MEDIUM', completed: false }
        ]
      }
    });
  }

  // 10. Fallback for any other API route
  return json(200, {
    success: true,
    message: 'API Endpoint active.',
    data: {}
  });
}
