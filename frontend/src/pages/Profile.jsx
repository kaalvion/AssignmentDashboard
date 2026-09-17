import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { User, Mail, GraduationCap, Award, Trophy, Save } from 'lucide-react';

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [formData, setFormData] = useState({
    name: user?.name || '',
    course: user?.course || '',
    semester: user?.semester || '',
    division: user?.division || ''
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const res = await api.put('/auth/profile', formData);
      if (res.success) {
        updateUser(res.data);
        setMessage('Profile updated successfully!');
      }
    } catch (err) {
      setMessage('Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.75rem' }} className="animate-fade-in">
      <div>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700 }}>Student Profile</h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
          Manage your academic details and view your overall stats
        </p>
      </div>

      {/* Profile Summary Card */}
      <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', padding: '1.75rem' }}>
        <div style={{
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--primary), var(--accent-purple))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: 800,
          fontSize: '1.8rem',
          boxShadow: 'var(--shadow-glow)'
        }}>
          {user?.name ? user.name.charAt(0).toUpperCase() : 'S'}
        </div>

        <div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 700 }}>{user?.name}</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
            {user?.email} • {user?.course} (Sem {user?.semester}, Div {user?.division})
          </p>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.65rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-purple)' }}>
              🏆 {user?.points || 0} Points
            </span>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-amber)' }}>
              🔥 {user?.streak || 0} Day Streak
            </span>
          </div>
        </div>
      </div>

      {message && (
        <div style={{
          background: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          color: '#6EE7B7',
          padding: '0.75rem 1rem',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.85rem'
        }}>
          {message}
        </div>
      )}

      {/* Edit Profile Form */}
      <form onSubmit={handleSubmit} className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '1.75rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Academic Information</h3>

        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
            Full Name
          </label>
          <input
            type="text"
            name="name"
            required
            value={formData.name}
            onChange={handleChange}
            className="input-field"
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
              Course
            </label>
            <input
              type="text"
              name="course"
              required
              value={formData.course}
              onChange={handleChange}
              className="input-field"
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
              Semester
            </label>
            <input
              type="text"
              name="semester"
              required
              value={formData.semester}
              onChange={handleChange}
              className="input-field"
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
              Division
            </label>
            <input
              type="text"
              name="division"
              required
              value={formData.division}
              onChange={handleChange}
              className="input-field"
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
          <button type="submit" disabled={saving} className="btn btn-primary">
            <Save size={18} /> {saving ? 'Saving...' : 'Save Profile Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
