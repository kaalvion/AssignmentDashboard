import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { COURSE_OPTIONS, SEMESTER_OPTIONS, DIVISION_OPTIONS } from '../constants/classOptions';
import { GraduationCap, AlertCircle, CheckCircle2, Lock } from 'lucide-react';

export default function StudentOnboardingModal() {
  const { user, updateUser, refreshUser } = useAuth();
  const [course, setCourse] = useState(user?.course || COURSE_OPTIONS[0]);
  const [semester, setSemester] = useState(user?.semester || SEMESTER_OPTIONS[0]);
  const [division, setDivision] = useState(user?.division || DIVISION_OPTIONS[0]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!course || !semester || !division) {
      setError('Please select course, semester, and division.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.put('/auth/profile', {
        course,
        semester,
        division
      });

      if (res && res.success) {
        updateUser({
          course,
          semester,
          division,
          needsOnboarding: false
        });
        await refreshUser();
      } else {
        setError(res?.message || 'Failed to save class details.');
      }
    } catch (err) {
      setError(err?.message || (typeof err === 'string' ? err : 'Error saving class details. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1.5rem'
    }}>
      <div style={{
        maxWidth: '520px',
        width: '100%',
        background: 'var(--bg-card, #1e293b)',
        border: '1px solid var(--border-color, #334155)',
        borderRadius: 'var(--radius-lg, 16px)',
        padding: '2.5rem',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        color: 'var(--text-primary, #f8fafc)'
      }}>
        {/* Header Icon */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, var(--primary, #6366f1) 0%, #8b5cf6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            boxShadow: '0 8px 16px rgba(99, 102, 241, 0.3)'
          }}>
            <GraduationCap size={28} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0 }}>
              Complete Academic Profile
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary, #94a3b8)', margin: '4px 0 0' }}>
              One-time student class enrollment
            </p>
          </div>
        </div>

        {/* Lock Notice Callout */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.75rem',
          padding: '1rem',
          borderRadius: 'var(--radius-sm, 8px)',
          background: 'rgba(245, 158, 11, 0.1)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          color: '#fbbf24',
          fontSize: '0.85rem',
          lineHeight: 1.5,
          marginBottom: '1.75rem'
        }}>
          <Lock size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong>Important Notice:</strong> Once confirmed, your Course, Semester, and Division will be locked. Subsequent changes can only be made by an administrator.
          </div>
        </div>

        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-sm, 8px)',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#f87171',
            fontSize: '0.85rem',
            marginBottom: '1.25rem'
          }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-secondary, #cbd5e1)' }}>
              Course / Program
            </label>
            <select
              value={course}
              onChange={(e) => setCourse(e.target.value)}
              className="input-field"
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-sm, 8px)',
                background: 'var(--bg-secondary, #0f172a)',
                color: 'var(--text-primary, #f8fafc)',
                border: '1px solid var(--border-color, #334155)',
                fontSize: '0.9rem'
              }}
            >
              {COURSE_OPTIONS.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-secondary, #cbd5e1)' }}>
                Semester
              </label>
              <select
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                className="input-field"
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-sm, 8px)',
                  background: 'var(--bg-secondary, #0f172a)',
                  color: 'var(--text-primary, #f8fafc)',
                  border: '1px solid var(--border-color, #334155)',
                  fontSize: '0.9rem'
                }}
              >
                {SEMESTER_OPTIONS.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-secondary, #cbd5e1)' }}>
                Division / Section
              </label>
              <select
                value={division}
                onChange={(e) => setDivision(e.target.value)}
                className="input-field"
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-sm, 8px)',
                  background: 'var(--bg-secondary, #0f172a)',
                  color: 'var(--text-primary, #f8fafc)',
                  border: '1px solid var(--border-color, #334155)',
                  fontSize: '0.9rem'
                }}
              >
                {DIVISION_OPTIONS.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary"
            style={{
              marginTop: '0.75rem',
              padding: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              fontWeight: 600,
              fontSize: '0.95rem'
            }}
          >
            {submitting ? (
              <span>Saving Academic Profile...</span>
            ) : (
              <>
                <CheckCircle2 size={18} />
                <span>Confirm & Lock Class Enrollment</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
