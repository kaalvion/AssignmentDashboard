import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Countdown from '../components/Countdown';
import { PriorityBadge, RiskBadge } from '../components/Badges';
import { 
  BookOpen, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Flame, 
  Trophy, 
  ArrowRight,
  Sparkles,
  Plus,
  PlusCircle,
  Users,
  ShieldAlert,
  FileText,
  RefreshCw,
  ExternalLink
} from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [teacherAssignments, setTeacherAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isTeacherOrAdmin = user?.role === 'TEACHER' || user?.role === 'ADMIN';

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (isTeacherOrAdmin) {
        // Teacher Dashboard Flow
        const res = await api.get('/teacher/assignments');
        if (res && res.success) {
          setTeacherAssignments(res.data || []);
        } else {
          setTeacherAssignments([]);
        }
      } else {
        // Student Dashboard Flow
        const [dashRes, assignRes] = await Promise.all([
          api.get('/analytics/dashboard').catch(() => null),
          api.get('/assignments').catch(() => null)
        ]);

        const fetchedAssignments = (assignRes && assignRes.success && Array.isArray(assignRes.data))
          ? assignRes.data
          : [];

        if (dashRes && dashRes.success && dashRes.data) {
          setData({
            ...dashRes.data,
            assignments: fetchedAssignments
          });
        } else {
          // Compute summary from class assignments
          const total = fetchedAssignments.length;
          const completed = fetchedAssignments.filter(a => a.status === 'COMPLETED' || a.submissionStatus === 'ON_TIME' || a.submissionStatus === 'LATE').length;
          const active = fetchedAssignments.filter(a => a.status !== 'COMPLETED' && a.submissionStatus === 'NOT_SUBMITTED');
          active.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

          setData({
            stats: {
              total,
              completed,
              inProgress: active.length,
              pending: active.length,
              overdue: fetchedAssignments.filter(a => a.submissionStatus === 'OVERDUE').length,
              completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
              onTimeRate: 100,
              streak: user?.streak || 0,
              points: user?.points || 0
            },
            todaysPriority: active[0] || null,
            upcomingDeadlines: active.slice(0, 5),
            assignments: fetchedAssignments
          });
        }
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Unable to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user?.role]);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="skeleton" style={{ height: '80px', width: '100%' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div className="skeleton" style={{ height: '110px' }} />
          <div className="skeleton" style={{ height: '110px' }} />
          <div className="skeleton" style={{ height: '110px' }} />
          <div className="skeleton" style={{ height: '110px' }} />
        </div>
        <div className="skeleton" style={{ height: '260px', width: '100%' }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center rounded-2xl bg-[var(--color-surface)] border border-rose-500/20 space-y-3">
        <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto" />
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Dashboard Connection Error</h3>
        <p className="text-sm text-[var(--color-text-secondary)] max-w-md mx-auto">{error}</p>
        <button
          onClick={fetchDashboardData}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-[var(--color-primary)] text-white hover:opacity-90 transition-opacity"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Try Again</span>
        </button>
      </div>
    );
  }

  // ==========================================
  // TEACHER / ADMIN DASHBOARD VIEW
  // ==========================================
  if (isTeacherOrAdmin) {
    const totalAssignments = teacherAssignments.length;
    let totalSubmissions = 0;
    let totalLate = 0;
    let totalStudents = 0;

    teacherAssignments.forEach((a) => {
      totalSubmissions += a.submittedCount || 0;
      totalLate += a.lateCount || 0;
      totalStudents += a.totalStudents || 0;
    });

    const totalOnTime = Math.max(0, totalSubmissions - totalLate);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }} className="animate-fade-in">
        {/* Teacher Welcome Banner */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, var(--primary-light) 0%, var(--bg-card) 100%)',
            border: '1px solid var(--border-highlight)',
            borderRadius: 'var(--radius-md)',
            padding: '1.5rem 1.75rem',
            gap: '1rem',
            flexWrap: 'wrap'
          }}
        >
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-[var(--color-primary)]/15 text-[var(--color-primary)]">
                {user?.role === 'ADMIN' ? 'ADMINISTRATOR' : 'TEACHER'}
              </span>
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>
              Welcome back, {user?.name || 'Instructor'}! 🎓
            </h1>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              You have {totalAssignments} active assignments posted with {totalSubmissions} student submissions received.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {user?.role === 'ADMIN' && (
              <Link
                to="/admin"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-indigo-500/30 bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/20 transition-colors"
              >
                <ShieldAlert className="w-4 h-4" />
                <span>Admin Console</span>
              </Link>
            )}

            <Link
              to="/teacher/assignments/new"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-[var(--color-primary)] text-white shadow-lg shadow-primary/20 hover:opacity-95 transition-opacity"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Post Assignment</span>
            </Link>
          </div>
        </div>

        {/* Teacher Metric Cards */}
        <div className="dashboard-grid">
          <div className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Assignments Posted
              </span>
              <BookOpen size={18} style={{ color: 'var(--primary)' }} />
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, marginTop: '0.5rem' }}>
              {totalAssignments}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Across all assigned courses
            </div>
          </div>

          <div className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Total Submissions
              </span>
              <CheckCircle size={18} style={{ color: 'var(--accent-emerald)' }} />
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, marginTop: '0.5rem', color: 'var(--accent-emerald)' }}>
              {totalSubmissions}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              {totalOnTime} on-time submissions
            </div>
          </div>

          <div className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Late Submissions
              </span>
              <Clock size={18} style={{ color: 'var(--accent-amber)' }} />
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, marginTop: '0.5rem', color: 'var(--accent-amber)' }}>
              {totalLate}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Reduced points applied
            </div>
          </div>

          <div className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Class Reach
              </span>
              <Users size={18} style={{ color: 'var(--accent-purple)' }} />
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, marginTop: '0.5rem', color: 'var(--accent-purple)' }}>
              {totalStudents}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Enrolled students in target classes
            </div>
          </div>
        </div>

        {/* Recent Assignments Overview */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Recent Assignments & Submissions
            </h2>
            <Link
              to="/teacher/assignments"
              style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 600 }}
            >
              View All ({totalAssignments})
            </Link>
          </div>

          {teacherAssignments.length === 0 ? (
            <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
              <FileText className="w-12 h-12 text-[var(--color-primary)] mx-auto mb-3 opacity-60" />
              <h3 className="text-base font-bold text-[var(--color-text-primary)]">No Assignments Posted Yet</h3>
              <p className="text-xs text-[var(--color-text-secondary)] mt-1 max-w-sm mx-auto">
                Create your first assignment to assign homework, quizzes, or lab work to your students.
              </p>
              <Link
                to="/teacher/assignments/new"
                className="inline-flex items-center gap-1.5 px-4 py-2 mt-4 text-xs font-semibold rounded-xl bg-[var(--color-primary)] text-white hover:opacity-90"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Post Your First Assignment</span>
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {teacherAssignments.slice(0, 5).map((item) => (
                <div
                  key={item.id}
                  className="glass-card glass-card-interactive"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 1.2fr 1fr auto',
                    gap: '1rem',
                    alignItems: 'center',
                    padding: '1rem 1.25rem'
                  }}
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                        {item.subject || item.subjectName || 'General'}
                      </span>
                      <span className="text-[11px] font-medium text-[var(--color-text-secondary)]">
                        {item.course} - Sem {item.semester} - Div {item.division}
                      </span>
                    </div>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                      {item.title}
                    </div>
                  </div>

                  <div>
                    <Countdown deadline={item.deadline} compact={true} />
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-[var(--color-text-primary)]">
                      {item.submittedCount || 0} / {item.totalStudents || 0} Submissions
                    </div>
                    <div className="text-[11px] text-[var(--color-text-tertiary)] mt-0.5">
                      {item.lateCount ? `${item.lateCount} late` : 'All on time'}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      to={`/teacher/assignments/${item.id}/submissions`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-xl bg-[var(--color-primary)] text-white hover:opacity-90"
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>Review</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ==========================================
  // STUDENT DASHBOARD VIEW
  // ==========================================
  const stats = data?.stats || {
    total: 0,
    completed: 0,
    inProgress: 0,
    pending: 0,
    overdue: 0,
    completionRate: 0,
    onTimeRate: 100,
    streak: user?.streak || 0,
    points: user?.points || 0
  };
  const todaysPriority = data?.todaysPriority;
  const upcomingDeadlines = data?.upcomingDeadlines || [];

  const attentionCount = (stats.pending || 0) + (stats.inProgress || 0);
  const attentionMessage = attentionCount > 0
    ? `You have ${attentionCount} assignment${attentionCount === 1 ? '' : 's'} assigned to your class requiring your attention.`
    : 'All caught up! Excellent job staying ahead.';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }} className="animate-fade-in">
      {/* Student Welcome Banner */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'linear-gradient(135deg, var(--primary-light) 0%, var(--bg-card) 100%)',
        border: '1px solid var(--border-highlight)',
        borderRadius: 'var(--radius-md)',
        padding: '1.5rem 1.75rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-[var(--color-primary)]/15 text-[var(--color-primary)]">
              STUDENT • {user?.course || 'CLASS'} SEM {user?.semester || '1'} ({user?.division || 'A'})
            </span>
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Welcome back, {user?.name || 'Student'}! 👋</h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            {attentionMessage}
          </p>
        </div>

        <button onClick={() => navigate('/assignments')} className="btn btn-primary">
          <BookOpen size={18} /> View Assignments
        </button>
      </div>

      {/* Top Metric Cards */}
      <div className="dashboard-grid">
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Total Assignments</span>
            <BookOpen size={18} style={{ color: 'var(--primary)' }} />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, marginTop: '0.5rem' }}>{stats.total}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            {stats.completed} Completed • {stats.pending} Pending
          </div>
        </div>

        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Completion Rate</span>
            <CheckCircle size={18} style={{ color: 'var(--accent-emerald)' }} />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, marginTop: '0.5rem', color: 'var(--accent-emerald)' }}>
            {stats.completionRate}%
          </div>
          <div className="progress-bar-container" style={{ marginTop: '0.5rem' }}>
            <div className="progress-bar-fill" style={{ width: `${stats.completionRate}%` }} />
          </div>
        </div>

        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Active Streak</span>
            <Flame size={18} style={{ color: 'var(--accent-amber)' }} />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, marginTop: '0.5rem', color: 'var(--accent-amber)' }}>
            {user?.streak || stats.streak || 0} days
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            Keep submitting on time 🔥
          </div>
        </div>

        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Earned Points</span>
            <Trophy size={18} style={{ color: 'var(--accent-purple)' }} />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, marginTop: '0.5rem', color: 'var(--accent-purple)' }}>
            {user?.points !== undefined ? user.points : stats.points} pts
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            Rank #{user?.rank || 1} on Leaderboard
          </div>
        </div>
      </div>

      {/* TODAY'S PRIORITY SECTION */}
      {todaysPriority ? (
        <div className="glass-card" style={{
          borderLeft: '4px solid var(--primary)',
          background: 'linear-gradient(135deg, var(--bg-card) 0%, var(--primary-light) 100%)',
          padding: '1.75rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sparkles size={20} style={{ color: 'var(--primary)' }} />
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--text-primary)' }}>
                TODAY'S PRIORITY
              </h2>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <PriorityBadge level={todaysPriority.priority_level || 'HIGH'} />
              <RiskBadge level={todaysPriority.risk_level || 'MEDIUM'} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '2rem', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600 }}>
                {todaysPriority.subject || todaysPriority.subject_name || 'Class Assignment'}
              </span>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0.2rem 0 0.5rem 0' }}>{todaysPriority.title}</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', maxWidth: '600px' }}>
                {todaysPriority.description || 'No description provided.'}
              </p>

              <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Teacher</span>
                  <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                    {todaysPriority.teacherName || 'Instructor'}
                  </strong>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Max Points</span>
                  <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                    {todaysPriority.maxPoints || 50} pts
                  </strong>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '1rem' }}>
              <Countdown deadline={todaysPriority.deadline} />
              <button
                onClick={() => navigate('/assignments')}
                className="btn btn-primary"
                style={{ marginTop: '0.5rem' }}
              >
                Upload Submission <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="glass-card" style={{ padding: '2rem', textAlign: 'center' }}>
          <CheckCircle size={36} style={{ color: 'var(--accent-emerald)', marginBottom: '0.5rem' }} />
          <h3>No Urgent Priorities</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            {stats.total === 0
              ? 'No assignments have been posted for your class yet.'
              : 'You are all caught up with your class assignments!'}
          </p>
        </div>
      )}

      {/* UPCOMING DEADLINES SECTION */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Upcoming Class Deadlines</h2>
          <button onClick={() => navigate('/assignments')} style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 600 }}>
            View All ({stats.total})
          </button>
        </div>

        {upcomingDeadlines.length === 0 ? (
          <div className="glass-card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No upcoming deadlines scheduled for your class.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {upcomingDeadlines.map(item => (
              <div
                key={item.id}
                className="glass-card glass-card-interactive"
                onClick={() => navigate('/assignments')}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1fr 1fr 1fr auto',
                  gap: '1rem',
                  alignItems: 'center',
                  padding: '1rem 1.25rem',
                  cursor: 'pointer'
                }}
              >
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600 }}>
                    {item.subject || item.subject_name}
                  </span>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                    {item.title}
                  </div>
                </div>

                <div>
                  <Countdown deadline={item.deadline} compact={true} />
                </div>

                <div style={{ display: 'flex', gap: '0.35rem' }}>
                  <PriorityBadge level={item.priority_level || 'HIGH'} />
                  <RiskBadge level={item.risk_level || 'LOW'} />
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Max Points</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{item.maxPoints || 50} pts</div>
                </div>

                <ArrowRight size={18} style={{ color: 'var(--text-muted)' }} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
