import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Bell, Moon, Sun, ShieldCheck } from 'lucide-react';

export default function Settings() {
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [inAppReminders, setInAppReminders] = useState(true);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const handleThemeChange = (selectedTheme) => {
    setTheme(selectedTheme);
  };

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.75rem' }} className="animate-fade-in">
      <div>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700 }}>Application Settings</h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
          Customize your preferences, notification schedules, and system themes
        </p>
      </div>

      {/* Visual Theme Selection (Sahara & Obsidian Kinetic) */}
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1.75rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Sun size={20} style={{ color: 'var(--primary)' }} /> Visual Design Themes
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
          {/* Obsidian Kinetic (Dark) */}
          <div
            onClick={() => handleThemeChange('dark')}
            style={{
              padding: '1.25rem',
              borderRadius: 'var(--radius-md)',
              border: theme === 'dark' ? '2px solid var(--primary)' : '1px solid var(--border-color)',
              background: '#0F131C',
              color: '#DFE2EF',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
              transition: 'all 0.2s ease',
              boxShadow: theme === 'dark' ? 'var(--shadow-glow)' : 'none'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
                <Moon size={18} style={{ color: '#8B5CF6' }} /> Obsidian Kinetic
              </div>
              {theme === 'dark' && <span style={{ fontSize: '0.7rem', background: '#8B5CF6', color: 'white', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 700 }}>ACTIVE</span>}
            </div>
            <p style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
              Deep Glassmorphic dark ecosystem designed for high contrast and zero ocular fatigue.
            </p>
          </div>

          {/* Sahara (Light) */}
          <div
            onClick={() => handleThemeChange('light')}
            style={{
              padding: '1.25rem',
              borderRadius: 'var(--radius-md)',
              border: theme === 'light' ? '2px solid var(--primary)' : '1px solid rgba(217, 119, 6, 0.2)',
              background: '#FAF6F0',
              color: '#291E14',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
              transition: 'all 0.2s ease',
              boxShadow: theme === 'light' ? 'var(--shadow-glow)' : 'none'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
                <Sun size={18} style={{ color: '#D97706' }} /> Sahara Desert Sand
              </div>
              {theme === 'light' && <span style={{ fontSize: '0.7rem', background: '#D97706', color: 'white', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 700 }}>ACTIVE</span>}
            </div>
            <p style={{ fontSize: '0.75rem', color: '#6B5542' }}>
              Warm desert sand light palette with rich amber & ochre accents.
            </p>
          </div>
        </div>
      </div>

      {/* Notifications Preferences */}
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1.75rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Bell size={20} style={{ color: 'var(--primary)' }} /> Notification Preferences
        </h3>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>In-App Deadline Reminders</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Get 7d, 3d, 1d, and deadline day alerts</div>
          </div>
          <input
            type="checkbox"
            checked={inAppReminders}
            onChange={(e) => setInAppReminders(e.target.checked)}
            style={{ width: '20px', height: '20px', cursor: 'pointer' }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Email Notifications</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Receive email summaries for urgent deadlines</div>
          </div>
          <input
            type="checkbox"
            checked={emailNotifications}
            onChange={(e) => setEmailNotifications(e.target.checked)}
            style={{ width: '20px', height: '20px', cursor: 'pointer' }}
          />
        </div>
      </div>
    </div>
  );
}
