import React, { useState } from 'react';
import { Settings as SettingsIcon, Bell, Moon, Lock, ShieldCheck } from 'lucide-react';

export default function Settings() {
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [inAppReminders, setInAppReminders] = useState(true);
  const [darkMode, setDarkMode] = useState(true);

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.75rem' }} className="animate-fade-in">
      <div>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700 }}>Application Settings</h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
          Customize your preferences, notification schedules, and system themes
        </p>
      </div>

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

      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1.75rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Moon size={20} style={{ color: 'var(--accent-purple)' }} /> Visual Theme
        </h3>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Dark SaaS Theme</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Glassmorphism styling with high contrast readability</div>
          </div>
          <input
            type="checkbox"
            checked={darkMode}
            onChange={(e) => setDarkMode(e.target.checked)}
            style={{ width: '20px', height: '20px', cursor: 'pointer' }}
          />
        </div>
      </div>
    </div>
  );
}
