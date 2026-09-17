import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Trophy, Medal, Flame, Star, CheckCircle } from 'lucide-react';

export default function Leaderboard() {
  const [students, setStudents] = useState([]);
  const [starOfMonth, setStarOfMonth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLoading(true);
        const [leadRes, starRes] = await Promise.all([
          api.get('/gamification/leaderboard'),
          api.get('/gamification/star-of-month')
        ]);
        if (leadRes.success) setStudents(leadRes.data);
        if (starRes.success) setStarOfMonth(starRes.data);
      } catch (err) {
        console.error('Leaderboard error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }} className="animate-fade-in">
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700 }}>Academic Leaderboard & Rankings</h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
          Rankings are calculated from completion rate, on-time submissions, and total points earned
        </p>
      </div>

      {/* STAR OF THE MONTH BANNER */}
      {starOfMonth && (
        <div className="glass-card" style={{
          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%)',
          border: '1px solid rgba(245, 158, 11, 0.4)',
          padding: '1.75rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1.5rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #F59E0B, #D97706)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              boxShadow: '0 0 20px rgba(245, 158, 11, 0.5)'
            }}>
              <Star size={36} />
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#FCD34D', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                🌟 STAR OF THE MONTH RECOGNITION
              </span>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '0.2rem' }}>{starOfMonth.name}</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{starOfMonth.course}</p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '2rem' }}>
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>On-Time Submissions</span>
              <strong style={{ fontSize: '1.3rem', color: 'var(--accent-emerald)' }}>{starOfMonth.onTimeRate}%</strong>
            </div>
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Completed Tasks</span>
              <strong style={{ fontSize: '1.3rem', color: 'var(--primary)' }}>{starOfMonth.completedAssignments}</strong>
            </div>
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Total Points</span>
              <strong style={{ fontSize: '1.3rem', color: 'var(--accent-amber)' }}>{starOfMonth.points} pts</strong>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard Table */}
      <div className="glass-card" style={{ padding: '1rem' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div className="skeleton" style={{ height: '50px' }} />
            <div className="skeleton" style={{ height: '50px' }} />
            <div className="skeleton" style={{ height: '50px' }} />
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '0.75rem 1rem' }}>Rank</th>
                <th style={{ padding: '0.75rem 1rem' }}>Student</th>
                <th style={{ padding: '0.75rem 1rem' }}>Course / Sem</th>
                <th style={{ padding: '0.75rem 1rem' }}>Completed</th>
                <th style={{ padding: '0.75rem 1rem' }}>Completion %</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Points</th>
              </tr>
            </thead>
            <tbody>
              {students.map(s => {
                let rankIcon = null;
                if (s.rank === 1) rankIcon = <Medal size={20} style={{ color: '#F59E0B' }} />;
                else if (s.rank === 2) rankIcon = <Medal size={20} style={{ color: '#94A3B8' }} />;
                else if (s.rank === 3) rankIcon = <Medal size={20} style={{ color: '#B45309' }} />;

                return (
                  <tr
                    key={s.id}
                    style={{
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                      background: s.isCurrentUser ? 'rgba(99, 102, 241, 0.12)' : 'transparent',
                      fontWeight: s.isCurrentUser ? 700 : 400
                    }}
                  >
                    <td style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {rankIcon || <span style={{ width: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>#{s.rank}</span>}
                    </td>
                    <td style={{ padding: '1rem', color: s.isCurrentUser ? 'var(--primary)' : 'var(--text-primary)' }}>
                      {s.name} {s.isCurrentUser && '(You)'}
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {s.course}
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.9rem' }}>
                      {s.completedCount} Assignments
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-emerald)' }}>{s.completionRate}%</span>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 700, color: 'var(--accent-purple)' }}>
                      {s.points} pts
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
