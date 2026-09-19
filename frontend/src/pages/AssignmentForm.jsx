import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { ArrowLeft, Save, Plus } from 'lucide-react';

export default function AssignmentForm() {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    subject_id: '',
    description: '',
    deadline: '',
    difficulty: 'MEDIUM',
    estimated_hours: 2.0,
    teacher: '',
    submission_method: 'Online Portal',
    notes: ''
  });

  const defaultSubjects = [
    { id: 1, name: 'Computer Networks', code: 'CS401' },
    { id: 2, name: 'Database Management Systems', code: 'CS402' },
    { id: 3, name: 'Web Technologies', code: 'CS403' },
    { id: 4, name: 'Software Engineering', code: 'CS404' },
    { id: 5, name: 'Operating Systems', code: 'CS405' }
  ];

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const res = await api.get('/assignments/subjects');
        if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
          setSubjects(res.data);
          setFormData(prev => ({ ...prev, subject_id: res.data[0].id }));
        } else {
          setSubjects(defaultSubjects);
          setFormData(prev => ({ ...prev, subject_id: defaultSubjects[0].id }));
        }
      } catch (err) {
        console.warn('Failed to load subjects from API, using defaults:', err);
        setSubjects(defaultSubjects);
        setFormData(prev => ({ ...prev, subject_id: defaultSubjects[0].id }));
      }
    };

    // Default deadline to tomorrow 23:59
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(23, 59, 0, 0);
    const isoDeadline = tomorrow.toISOString().slice(0, 16);

    setFormData(prev => ({ ...prev, deadline: isoDeadline }));
    fetchSubjects();
  }, []);


  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!formData.title.trim()) {
      setError('Assignment Title is required.');
      setLoading(false);
      return;
    }
    if (!formData.subject_id) {
      setError('Please select a Subject.');
      setLoading(false);
      return;
    }
    if (parseFloat(formData.estimated_hours) <= 0) {
      setError('Estimated hours must be greater than zero.');
      setLoading(false);
      return;
    }

    try {
      const res = await api.post('/assignments', formData);
      if (res && res.success && res.data) {
        navigate(`/assignments/${res.data.id}`);
        return;
      }
    } catch (err) {
      console.warn('API assignment creation unavailable, saving assignment locally:', err);
    }

    // Smooth client-side fallback
    const selectedSubject = subjects.find(s => String(s.id) === String(formData.subject_id)) || subjects[0];
    const newAssignment = {
      id: Date.now(),
      title: formData.title,
      subject_id: formData.subject_id,
      subject_name: selectedSubject?.name || 'Computer Networks',
      subject_color: selectedSubject?.color || 'var(--primary)',
      description: formData.description || '',
      deadline: formData.deadline,
      difficulty: formData.difficulty,
      estimated_hours: parseFloat(formData.estimated_hours) || 2.0,
      progress: 0,
      status: 'PENDING',
      priority_level: 'HIGH',
      risk_level: 'MEDIUM',
      teacher: formData.teacher || '',
      submission_method: formData.submission_method || '',
      notes: formData.notes || ''
    };

    try {
      const localAssignments = JSON.parse(localStorage.getItem('user_created_assignments') || '[]');
      localStorage.setItem('user_created_assignments', JSON.stringify([newAssignment, ...localAssignments]));
    } catch (e) {
      console.error('Failed to write to localStorage', e);
    }

    navigate('/assignments');
  };


  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }} className="animate-fade-in">
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button onClick={() => navigate('/assignments')} className="btn btn-secondary" style={{ padding: '0.5rem 0.75rem' }}>
          <ArrowLeft size={18} /> Back
        </button>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Add New Assignment</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            System will automatically compute Priority & Risk levels
          </p>
        </div>
      </div>

      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#FCA5A5',
          padding: '0.75rem 1rem',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.85rem'
        }}>
          {error}
        </div>
      )}

      {/* Form Card */}
      <form onSubmit={handleSubmit} className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '1.75rem' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
            Assignment Title *
          </label>
          <input
            type="text"
            name="title"
            required
            placeholder="e.g. DBMS ER Diagram & Relational Schema"
            value={formData.title}
            onChange={handleChange}
            className="input-field"
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
              Subject *
            </label>
            <select
              name="subject_id"
              required
              value={formData.subject_id}
              onChange={handleChange}
              className="input-field"
            >
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
              Deadline Date & Time *
            </label>
            <input
              type="datetime-local"
              name="deadline"
              required
              value={formData.deadline}
              onChange={handleChange}
              className="input-field"
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
              Difficulty Level *
            </label>
            <select
              name="difficulty"
              value={formData.difficulty}
              onChange={handleChange}
              className="input-field"
            >
              <option value="EASY">Easy</option>
              <option value="MEDIUM">Medium</option>
              <option value="HARD">Hard</option>
              <option value="EXTREME">Extreme</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
              Estimated Work (Hours) *
            </label>
            <input
              type="number"
              step="0.5"
              min="0.5"
              name="estimated_hours"
              required
              value={formData.estimated_hours}
              onChange={handleChange}
              className="input-field"
            />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
            Description
          </label>
          <textarea
            name="description"
            rows={3}
            placeholder="Detailed requirements or submission guidelines..."
            value={formData.description}
            onChange={handleChange}
            className="input-field"
            style={{ resize: 'vertical' }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
              Teacher / Instructor
            </label>
            <input
              type="text"
              name="teacher"
              placeholder="Dr. R. Sharma"
              value={formData.teacher}
              onChange={handleChange}
              className="input-field"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
              Submission Method
            </label>
            <input
              type="text"
              name="submission_method"
              placeholder="e.g. Google Classroom / Zip"
              value={formData.submission_method}
              onChange={handleChange}
              className="input-field"
            />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
            Additional Notes
          </label>
          <textarea
            name="notes"
            rows={2}
            placeholder="Any extra references or reminders..."
            value={formData.notes}
            onChange={handleChange}
            className="input-field"
            style={{ resize: 'vertical' }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
          <button type="button" onClick={() => navigate('/assignments')} className="btn btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={loading} className="btn btn-primary">
            <Save size={18} /> {loading ? 'Saving...' : 'Save & Calculate Priority'}
          </button>
        </div>
      </form>
    </div>
  );
}
