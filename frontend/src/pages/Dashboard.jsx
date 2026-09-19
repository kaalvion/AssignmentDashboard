import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Plus
} from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const computeDashboardFromAssignments = (assignmentsList) => {
    if (!assignmentsList || assignmentsList.length === 0) {
      return getFallbackData();
    }

    const total = assignmentsList.length;
    const completed = assignmentsList.filter(a => a.status === 'COMPLETED').length;
    const inProgress = assignmentsList.filter(a => a.status === 'IN_PROGRESS').length;
    const pending = assignmentsList.filter(a => a.status === 'PENDING' || !a.status).length;
    const overdue = assignmentsList.filter(a => a.status === 'OVERDUE').length;

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    const activeAssignments = assignmentsList.filter(a => a.status !== 'COMPLETED');
    
    // Sort active assignments by deadline ascending
    activeAssignments.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

    const todaysPriority = activeAssignments.length > 0 ? activeAssignments[0] : null;
    const upcomingDeadlines = [...activeAssignments].slice(0, 5);

    return {
      stats: {
        total,
        completed,
        inProgress,
        pending,
        overdue,
        completionRate,
        onTimeRate: 100,
        streak: user?.streak || 3,
        points: user?.points || 120
      },
      todaysPriority,
      upcomingDeadlines
    };
  };

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);

        let localAssignments = [];
        try {
          localAssignments = JSON.parse(localStorage.getItem('user_created_assignments') || '[]');
        } catch (e) {}

        const [dashRes, assignRes] = await Promise.all([
          api.get('/analytics/dashboard').catch(() => null),
          api.get('/assignments').catch(() => null)
        ]);

        let fetchedAssignments = [];
        if (assignRes && assignRes.success && Array.isArray(assignRes.data)) {
          fetchedAssignments = assignRes.data;
        }

        const allUserAssignments = [...localAssignments, ...fetchedAssignments];

        if (allUserAssignments.length > 0) {
          setData(computeDashboardFromAssignments(allUserAssignments));
        } else if (dashRes && dashRes.success && dashRes.data) {
          setData(dashRes.data);
        } else {
          setData(getFallbackData());
        }
      } catch (err) {
        let localAssignments = [];
        try {
          localAssignments = JSON.parse(localStorage.getItem('user_created_assignments') || '[]');
        } catch (e) {}
        if (localAssignments.length > 0) {
          setData(computeDashboardFromAssignments(localAssignments));
        } else {
          setData(getFallbackData());
        }
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, [user]);

  const getFallbackData = () => ({
    stats: {
      total: 3,
      completed: 1,
      inProgress: 1,
      pending: 1,
      overdue: 0,
      completionRate: 33,
      onTimeRate: 100,
      streak: user?.streak || 3,
      points: user?.points || 120
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
        subject_color: 'var(--primary)',
        title: 'Relational Schema Optimization & Indexing',
        deadline: new Date(Date.now() + 86400000 * 4).toISOString(),
        priority_level: 'HIGH',
        risk_level: 'LOW',
        progress: 20
      },
      {
        id: 103,
        subject_name: 'Web Technologies',
        subject_color: 'var(--accent-purple)',
        title: 'React & REST API Assignment',
        deadline: new Date(Date.now() + 86400000 * 7).toISOString(),
        priority_level: 'MEDIUM',
        risk_level: 'LOW',
        progress: 60
      }
    ]
  });


  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="skeleton" style={{ height: '80px', width: '100%' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
          <div className="skeleton" style={{ height: '110px' }} />
          <div className="skeleton" style={{ height: '110px' }} />
          <div className="skeleton" style={{ height: '110px' }} />
          <div className="skeleton" style={{ height: '110px' }} />
        </div>
        <div className="skeleton" style={{ height: '260px', width: '100%' }} />
      </div>
    );
  }

  const activeData = data || getFallbackData();
  const stats = activeData.stats || getFallbackData().stats;
  const todaysPriority = activeData.todaysPriority;
  const upcomingDeadlines = activeData.upcomingDeadlines || [];

  const attentionMessage = (stats.pending || 0) + (stats.inProgress || 0) > 0
    ? `You have ${(stats.pending || 0) + (stats.inProgress || 0)} assignments requiring your attention.`
    : 'All caught up! Excellent job staying ahead.';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }} className="animate-fade-in">
      {/* Welcome Banner */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'linear-gradient(135deg, var(--primary-light) 0%, var(--bg-card) 100%)',
        border: '1px solid var(--border-highlight)',
        borderRadius: 'var(--radius-md)',
        padding: '1.5rem 1.75rem'
      }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Welcome back, {user?.name || 'Student'}! 👋</h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            {attentionMessage}
          </p>
        </div>
        <button onClick={() => navigate('/assignments/new')} className="btn btn-primary">
          <Plus size={18} /> New Assignment
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
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>On-Time Submissions</span>
            <Clock size={18} style={{ color: 'var(--accent-amber)' }} />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, marginTop: '0.5rem', color: 'var(--accent-amber)' }}>
            {stats.onTimeRate}%
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            Streak: {stats.streak} days 🔥
          </div>
        </div>

        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Total Points</span>
            <Trophy size={18} style={{ color: 'var(--accent-purple)' }} />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, marginTop: '0.5rem', color: 'var(--accent-purple)' }}>
            {stats.points} pts
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            Level 3 Productivity Scholar
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
              <PriorityBadge level={todaysPriority.priority_level} />
              <RiskBadge level={todaysPriority.risk_level} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '2rem', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600 }}>{todaysPriority.subject_name}</span>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0.2rem 0 0.5rem 0' }}>{todaysPriority.title}</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', maxWidth: '600px' }}>
                {todaysPriority.description || 'No description provided.'}
              </p>

              <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Estimated Work Remaining</span>
                  <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>
                    {(todaysPriority.estimated_hours * (1 - todaysPriority.progress / 100)).toFixed(1)} Hours
                  </strong>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Progress</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }}>
                    <div className="progress-bar-container" style={{ width: '120px' }}>
                      <div className="progress-bar-fill" style={{ width: `${todaysPriority.progress}%` }} />
                    </div>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{todaysPriority.progress}%</span>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '1rem' }}>
              <Countdown deadline={todaysPriority.deadline} />
              <button
                onClick={() => navigate(`/assignments/${todaysPriority.id}`)}
                className="btn btn-primary"
                style={{ marginTop: '0.5rem' }}
              >
                Open Assignment <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="glass-card" style={{ padding: '2rem', textAlign: 'center' }}>
          <CheckCircle size={36} style={{ color: 'var(--accent-emerald)', marginBottom: '0.5rem' }} />
          <h3>No Urgent Priorities</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            You have no active assignments pending right now.
          </p>
        </div>
      )}

      {/* UPCOMING DEADLINES SECTION */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Upcoming Deadlines</h2>
          <button onClick={() => navigate('/assignments')} style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 600 }}>
            View All ({stats.total})
          </button>
        </div>

        {upcomingDeadlines.length === 0 ? (
          <div className="glass-card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No upcoming deadlines scheduled.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {upcomingDeadlines.map(item => (
              <div
                key={item.id}
                className="glass-card glass-card-interactive"
                onClick={() => navigate(`/assignments/${item.id}`)}
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
                  <span style={{ fontSize: '0.75rem', color: item.subject_color || 'var(--primary)', fontWeight: 600 }}>
                    {item.subject_name}
                  </span>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                    {item.title}
                  </div>
                </div>

                <div>
                  <Countdown deadline={item.deadline} compact={true} />
                </div>

                <div style={{ display: 'flex', gap: '0.35rem' }}>
                  <PriorityBadge level={item.priority_level} />
                  <RiskBadge level={item.risk_level} />
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Progress: {item.progress}%</div>
                  <div className="progress-bar-container" style={{ marginTop: '0.2rem', width: '100px' }}>
                    <div className="progress-bar-fill" style={{ width: `${item.progress}%` }} />
                  </div>
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
