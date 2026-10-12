import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import { COURSE_OPTIONS, SEMESTER_OPTIONS, DIVISION_OPTIONS } from '../constants/classOptions';
import { PlusCircle, Save, ArrowLeft, AlertCircle, CheckCircle2, Clock, Calendar } from 'lucide-react';

export default function TeacherPostAssignment() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState('');
  const [deadline, setDeadline] = useState('');
  const [maxPoints, setMaxPoints] = useState(50);
  const [allowLate, setAllowLate] = useState(true);
  const [course, setCourse] = useState(COURSE_OPTIONS[0]);
  const [semester, setSemester] = useState(SEMESTER_OPTIONS[0]);
  const [division, setDivision] = useState(DIVISION_OPTIONS[0]);

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Minimum deadline is current local time
  const minDateTime = new Date().toISOString().slice(0, 16);

  useEffect(() => {
    if (isEditing) {
      const fetchAssignment = async () => {
        try {
          setLoading(true);
          const res = await api.get(`/assignments/${id}`);
          if (res && res.success && res.data) {
            const a = res.data;
            setTitle(a.title || '');
            setDescription(a.description || '');
            setSubject(a.subject || a.subjectName || '');
            if (a.deadline) {
              setDeadline(new Date(a.deadline).toISOString().slice(0, 16));
            }
            setMaxPoints(a.maxPoints || a.max_points || 50);
            setAllowLate(a.allowLate !== undefined ? a.allowLate : true);
            if (a.course) setCourse(a.course);
            if (a.semester) setSemester(a.semester);
            if (a.division) setDivision(a.division);
          }
        } catch (err) {
          setErrorMessage('Failed to load assignment details.');
        } finally {
          setLoading(false);
        }
      };
      fetchAssignment();
    }
  }, [id, isEditing]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!title.trim()) {
      setErrorMessage('Assignment title is required.');
      return;
    }

    if (!deadline) {
      setErrorMessage('Deadline date and time is required.');
      return;
    }

    const deadDate = new Date(deadline);
    if (isNaN(deadDate.getTime()) || (!isEditing && deadDate.getTime() <= Date.now())) {
      setErrorMessage('Deadline must be set to a future date and time.');
      return;
    }

    if (!maxPoints || Number(maxPoints) <= 0) {
      setErrorMessage('Maximum points must be a positive number.');
      return;
    }

    const payload = {
      title: title.trim(),
      description: description.trim(),
      subject: subject.trim() || 'General',
      deadline: deadDate.toISOString(),
      maxPoints: Number(maxPoints),
      allowLate: Boolean(allowLate),
      course,
      semester,
      division
    };

    try {
      setSaving(true);
      if (isEditing) {
        const res = await api.put(`/teacher/assignments/${id}`, payload);
        if (res && res.success) {
          setSuccessMessage('Assignment updated successfully!');
          setTimeout(() => navigate('/teacher/assignments'), 1000);
        } else {
          setErrorMessage(res?.message || 'Failed to update assignment.');
        }
      } else {
        const res = await api.post('/teacher/assignments', payload);
        if (res && res.success) {
          setSuccessMessage(`Assignment published successfully! Enrolled class students notified.`);
          setTimeout(() => navigate('/teacher/assignments'), 1200);
        } else {
          setErrorMessage(res?.message || 'Failed to post assignment.');
        }
      }
    } catch (err) {
      console.error('Save assignment error:', err);
      setErrorMessage(err?.message || 'Error communicating with server.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
        Loading assignment details...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button
          onClick={() => navigate('/teacher/assignments')}
          className="btn btn-secondary"
          style={{ padding: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          title="Back to assignments"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            {isEditing ? 'Edit Assignment' : 'Post New Assignment'}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '4px 0 0' }}>
            Publish coursework with target class allocation and automated student notifications
          </p>
        </div>
      </div>

      {errorMessage && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.85rem 1.25rem',
          borderRadius: 'var(--radius-md)',
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#f87171',
          fontSize: '0.9rem'
        }}>
          <AlertCircle size={18} />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.85rem 1.25rem',
          borderRadius: 'var(--radius-md)',
          background: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          color: '#10b981',
          fontSize: '0.9rem'
        }}>
          <CheckCircle2 size={18} />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Form Container */}
      <form
        onSubmit={handleSubmit}
        style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-color)',
          padding: '2rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
          boxShadow: 'var(--shadow-card)'
        }}
      >
        {/* Title */}
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
            Assignment Title *
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Distributed Consensus Lab 2"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input-field"
            style={{ width: '100%', height: '42px', fontSize: '0.95rem' }}
          />
        </div>

        {/* Subject & Max Points */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
              Subject Name / Code
            </label>
            <input
              type="text"
              placeholder="e.g. Computer Networks (CS401)"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="input-field"
              style={{ width: '100%', height: '42px', fontSize: '0.95rem' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
              Max Points *
            </label>
            <input
              type="number"
              min="5"
              max="500"
              required
              value={maxPoints}
              onChange={(e) => setMaxPoints(e.target.value)}
              className="input-field"
              style={{ width: '100%', height: '42px', fontSize: '0.95rem' }}
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
            Description & Instructions
          </label>
          <textarea
            rows={4}
            placeholder="Provide task instructions, PDF upload guidelines, and grading criteria..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input-field"
            style={{ width: '100%', padding: '0.75rem', fontSize: '0.9rem', resize: 'vertical' }}
          />
        </div>

        {/* Target Class Allocation Section */}
        <div style={{
          padding: '1.25rem',
          background: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-color)'
        }}>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 1rem', color: 'var(--text-primary)' }}>
            Target Class Allocation
          </h4>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                Course
              </label>
              <select
                value={course}
                onChange={(e) => setCourse(e.target.value)}
                className="input-field"
                style={{ width: '100%', height: '38px', fontSize: '0.85rem' }}
              >
                {COURSE_OPTIONS.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                Semester
              </label>
              <select
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                className="input-field"
                style={{ width: '100%', height: '38px', fontSize: '0.85rem' }}
              >
                {SEMESTER_OPTIONS.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                Division
              </label>
              <select
                value={division}
                onChange={(e) => setDivision(e.target.value)}
                className="input-field"
                style={{ width: '100%', height: '38px', fontSize: '0.85rem' }}
              >
                {DIVISION_OPTIONS.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Deadline & Allow Late */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', alignItems: 'center' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
              Submission Deadline *
            </label>
            <input
              type="datetime-local"
              required
              min={!isEditing ? minDateTime : undefined}
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="input-field"
              style={{ width: '100%', height: '42px', fontSize: '0.9rem' }}
            />
          </div>

          <div style={{ paddingTop: '1.25rem' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: 600,
              color: 'var(--text-primary)'
            }}>
              <input
                type="checkbox"
                checked={allowLate}
                onChange={(e) => setAllowLate(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
              />
              <span>Allow Late Submissions</span>
            </label>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>
              Late submissions earn reduced 20% points
            </span>
          </div>
        </div>

        {/* Submit Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
          <button
            type="button"
            onClick={() => navigate('/teacher/assignments')}
            className="btn btn-secondary"
            style={{ padding: '0.75rem 1.5rem' }}
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={saving}
            className="btn btn-primary"
            style={{
              padding: '0.75rem 2rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontWeight: 600,
              fontSize: '0.95rem'
            }}
          >
            {saving ? (
              <span>Saving...</span>
            ) : (
              <>
                {isEditing ? <Save size={18} /> : <PlusCircle size={18} />}
                <span>{isEditing ? 'Save Changes' : 'Publish Assignment'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
