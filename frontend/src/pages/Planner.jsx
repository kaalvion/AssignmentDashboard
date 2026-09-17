import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { PriorityBadge } from '../components/Badges';
import { 
  BrainCircuit, 
  Calendar as CalendarIcon, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Sparkles,
  Sliders
} from 'lucide-react';

export default function SmartStudyPlanner() {
  const navigate = useNavigate();
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [daysCount, setDaysCount] = useState(7);
  const [maxDailyHours, setMaxDailyHours] = useState(4.0);

  const fetchPlan = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/planner?days=${daysCount}&max_daily_hours=${maxDailyHours}`);
      if (res.success) {
        setPlan(res.data);
      }
    } catch (err) {
      console.error('Failed to load study plan:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlan();
  }, [daysCount, maxDailyHours]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }} className="animate-fade-in">
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
            <Sparkles size={20} style={{ color: 'var(--primary)' }} />
            <h1 style={{ fontSize: '1.6rem', fontWeight: 700 }}>Smart Study Planner</h1>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Deterministic rule-based daily workload distribution algorithm
          </p>
        </div>

        {/* Planner Adjustments */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--bg-secondary)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Planning Horizon:</span>
            <select
              value={daysCount}
              onChange={(e) => setDaysCount(parseInt(e.target.value, 10))}
              className="input-field"
              style={{ width: '90px', height: '32px', padding: '0.2rem 0.5rem', fontSize: '0.8rem' }}
            >
              <option value={3}>3 Days</option>
              <option value={5}>5 Days</option>
              <option value={7}>7 Days</option>
              <option value={14}>14 Days</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Max Daily Study:</span>
            <select
              value={maxDailyHours}
              onChange={(e) => setMaxDailyHours(parseFloat(e.target.value))}
              className="input-field"
              style={{ width: '90px', height: '32px', padding: '0.2rem 0.5rem', fontSize: '0.8rem' }}
            >
              <option value={2.0}>2 Hours</option>
              <option value={3.0}>3 Hours</option>
              <option value={4.0}>4 Hours</option>
              <option value={6.0}>6 Hours</option>
            </select>
          </div>
        </div>
      </div>

      {/* Warning Alert Banner */}
      {plan?.warning && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#FCA5A5',
          padding: '1rem 1.25rem',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <AlertTriangle size={24} style={{ color: 'var(--overdue)', flexShrink: 0 }} />
          <div>
            <strong style={{ fontSize: '0.95rem' }}>Workload Overload Warning</strong>
            <p style={{ fontSize: '0.85rem', marginTop: '0.2rem', opacity: 0.9 }}>{plan.warning.message}</p>
          </div>
        </div>
      )}

      {/* Overall Summary Bar */}
      {plan && (
        <div className="glass-card" style={{ display: 'flex', justifyContent: 'space-around', padding: '1rem', textAlign: 'center' }}>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Remaining Work</span>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--primary)', marginTop: '0.2rem' }}>
              {plan.totalRequiredHours} Hours
            </div>
          </div>
          <div style={{ borderLeft: '1px solid var(--border-color)', height: '40px' }} />
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Available Capacity</span>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--accent-emerald)', marginTop: '0.2rem' }}>
              {(daysCount * maxDailyHours).toFixed(1)} Hours
            </div>
          </div>
        </div>
      )}

      {/* Day Timelines */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="skeleton" style={{ height: '100px' }} />
          <div className="skeleton" style={{ height: '100px' }} />
          <div className="skeleton" style={{ height: '100px' }} />
        </div>
      ) : !plan || plan.days.length === 0 ? (
        <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
          <CheckCircle size={40} style={{ color: 'var(--accent-emerald)', marginBottom: '0.75rem' }} />
          <h3>No Pending Tasks to Plan</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.3rem' }}>
            All your assignments are completed!
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {plan.days.map((day, idx) => (
            <div
              key={day.dateStr}
              className="glass-card"
              style={{
                borderLeft: day.tasks.length > 0 ? '4px solid var(--primary)' : '1px solid var(--border-color)',
                padding: '1.25rem 1.5rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    padding: '0.2rem 0.6rem',
                    borderRadius: '4px',
                    background: idx === 0 ? 'var(--primary)' : 'rgba(255,255,255,0.08)',
                    color: 'white'
                  }}>
                    {idx === 0 ? 'TODAY' : day.dayName.toUpperCase()}
                  </span>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>{day.formattedDate}</h3>
                </div>

                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: day.totalAllocatedHours > maxDailyHours ? 'var(--overdue)' : 'var(--text-secondary)' }}>
                  Planned: {day.totalAllocatedHours}h / {maxDailyHours}h limit
                </div>
              </div>

              {day.tasks.length === 0 ? (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '0.5rem 0' }}>
                  Rest day or light review. No heavy assignments allocated.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {day.tasks.map((task, tIdx) => (
                    <div
                      key={tIdx}
                      onClick={() => navigate(`/assignments/${task.assignmentId}`)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.75rem 1rem',
                        background: 'rgba(255,255,255,0.03)',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-color)',
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <Clock size={16} style={{ color: 'var(--primary)' }} />
                        <div>
                          <span style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 600 }}>{task.subjectName}</span>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{task.title}</div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <PriorityBadge level={task.priorityLevel} />
                        <span style={{
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          background: 'rgba(99, 102, 241, 0.15)',
                          color: 'var(--primary)',
                          padding: '0.25rem 0.65rem',
                          borderRadius: '6px'
                        }}>
                          {task.allocatedHours} Hours
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
