import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { Bell, Search, LogOut, Sun, Moon } from 'lucide-react';

export default function Topbar() {
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
  const navigate = useNavigate();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/assignments?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header style={{
      height: '65px',
      background: 'var(--bg-secondary)',
      borderBottom: '1px solid var(--border-color)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 1.75rem',
      position: 'sticky',
      top: 0,
      zIndex: 30
    }}>
      {/* Search Input */}
      <form onSubmit={handleSearchSubmit} style={{ position: 'relative', width: '320px' }}>
        <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input
          type="text"
          placeholder="Search assignments or subjects..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input-field"
          style={{ paddingLeft: '36px', height: '38px', fontSize: '0.85rem' }}
        />
      </form>

      {/* Right User Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
          {currentDate}
        </div>

        {/* Theme Switcher Toggle (Sahara Light / Obsidian Kinetic Dark) */}
        <button
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'Sahara Light' : 'Obsidian Kinetic Dark'} Theme`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.4rem 0.75rem',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-primary)',
            fontSize: '0.8rem',
            fontWeight: 600,
            transition: 'all 0.2s ease'
          }}
        >
          {theme === 'dark' ? <Sun size={16} style={{ color: '#F59E0B' }} /> : <Moon size={16} style={{ color: '#8B5CF6' }} />}
          <span>{theme === 'dark' ? 'Sahara Light' : 'Obsidian Dark'}</span>
        </button>

        {/* Notifications Dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            style={{
              position: 'relative',
              width: '38px',
              height: '38px',
              borderRadius: '8px',
              background: 'var(--bg-card)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)'
            }}
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                background: 'var(--badge-critical-bg)',
                color: 'var(--badge-critical-text)',
                border: '1px solid var(--badge-critical-border)',
                fontSize: '0.65rem',
                fontWeight: 700,
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div style={{
              position: 'absolute',
              right: 0,
              top: '48px',
              width: '340px',
              maxHeight: '420px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-md)',
              zIndex: 50,
              display: 'flex',
              flexDirection: 'column'
            }}>
              <div style={{ padding: '0.85rem 1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Notifications ({unreadCount})</span>
                {unreadCount > 0 && (
                  <button onClick={markAllAsRead} style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 500 }}>
                    Mark all read
                  </button>
                )}
              </div>

              <div style={{ overflowY: 'auto', flex: 1, padding: '0.5rem 0' }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    No notifications yet.
                  </div>
                ) : (
                  notifications.map(n => (
                    <div
                      key={n.id}
                      onClick={() => {
                        markAsRead(n.id);
                        if (n.link) navigate(n.link);
                        setShowNotifications(false);
                      }}
                      style={{
                        padding: '0.75rem 1rem',
                        borderBottom: '1px solid var(--border-color)',
                        background: n.is_read ? 'transparent' : 'var(--primary-light)',
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
                        {n.title}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {n.message}
                      </div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                        {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--primary), var(--accent-purple))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 700,
            fontSize: '0.9rem'
          }}>
            {user?.name ? user.name.charAt(0).toUpperCase() : 'S'}
          </div>
          <div style={{ display: 'none', mdDisplay: 'block' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{user?.name || 'Student'}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{user?.course} • Sem {user?.semester}</div>
          </div>
          <button
            onClick={logout}
            title="Logout"
            style={{ color: 'var(--text-muted)', padding: '0.4rem', borderRadius: '6px', transition: 'color 0.2s' }}
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}
