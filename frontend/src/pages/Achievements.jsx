import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Trophy, Clock, Flame, CheckCircle, Star, Zap, CheckSquare, Award, Lock } from 'lucide-react';

export default function Achievements() {
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);

  const iconMap = {
    Trophy,
    Clock,
    Flame,
    CheckCircle,
    Star,
    Zap,
    CheckSquare,
    Award
  };

  useEffect(() => {
    const fetchAchievements = async () => {
      try {
        setLoading(true);
        const res = await api.get('/gamification/achievements');
        if (res.success) {
          setAchievements(res.data);
        }
      } catch (err) {
        console.error('Achievements error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAchievements();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }} className="animate-fade-in">
      <div>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700 }}>Achievements & Badges</h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
          Unlock badges and earn point rewards as you maintain your study habits
        </p>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
          <div className="skeleton" style={{ height: '140px' }} />
          <div className="skeleton" style={{ height: '140px' }} />
          <div className="skeleton" style={{ height: '140px' }} />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
          {achievements.map(ach => {
            const IconComponent = iconMap[ach.icon] || Award;

            return (
              <div
                key={ach.id}
                className="glass-card"
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '1.25rem',
                  padding: '1.25rem',
                  opacity: ach.isUnlocked ? 1 : 0.6,
                  border: ach.isUnlocked ? '1px solid var(--border-highlight)' : '1px solid var(--border-color)',
                  background: ach.isUnlocked ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(99, 102, 241, 0.1) 100%)' : 'var(--bg-card)'
                }}
              >
                <div style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '14px',
                  background: ach.isUnlocked ? 'linear-gradient(135deg, var(--primary), var(--accent-purple))' : 'rgba(255,255,255,0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: ach.isUnlocked ? 'white' : 'var(--text-muted)',
                  boxShadow: ach.isUnlocked ? 'var(--shadow-glow)' : 'none',
                  flexShrink: 0
                }}>
                  {ach.isUnlocked ? <IconComponent size={26} /> : <Lock size={22} />}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{ach.name}</h3>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-amber)' }}>+{ach.pointsReward} pts</span>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.3rem', lineHeight: 1.4 }}>
                    {ach.description}
                  </p>
                  <div style={{ marginTop: '0.65rem', fontSize: '0.7rem', color: ach.isUnlocked ? 'var(--accent-emerald)' : 'var(--text-muted)', fontWeight: 600 }}>
                    {ach.isUnlocked ? `Earned ${new Date(ach.earnedAt).toLocaleDateString()}` : 'Locked'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
