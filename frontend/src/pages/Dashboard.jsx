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
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        const res = await api.get('/analytics/dashboard');
        if (res.success) {
          setData(res.data);
        }
      } catch (err) {
        setError('Failed to load dashboard data.');
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

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

  if (error) {
    return (
      <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
        <AlertTriangle size={40} style={{ color: 'var(--overdue)', marginBottom: '1rem' }} />
        <h3>Error Loading Dashboard</h3>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>{error}</p>
        <button onClick={() => window.location.reload()} className="btn btn-primary" style={{ marginTop: '1.25rem' }}>
          Retry
        </button>
      </div>
    );
  }

  const { stats, todaysPriority, upcomingDeadlines } = data;

  const attentionMessage = stats.pending + stats.inProgress > 0
    ? `You have ${stats.pending + stats.inProgress} assignments requiring your attention.`
    : 'All caught up! Excellent job staying ahead.';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }} className="animate-fade-in">
      {/* Welcome Banner */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(139, 92, 246, 0.1) 100%)',
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
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(99, 102, 241, 0.08) 100%)',
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
