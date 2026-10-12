import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  BookOpen, 
  Calendar, 
  BrainCircuit, 
  BarChart2, 
  Trophy, 
  Award, 
  Users, 
  CheckSquare,
  PlusCircle,
  ShieldCheck,
  GraduationCap
} from 'lucide-react';

export default function Sidebar() {
  const { user } = useAuth();
  const role = user?.role || 'STUDENT';

  let navItems = [];

  if (role === 'ADMIN') {
    navItems = [
      { path: '/dashboard', label: 'Overview', icon: LayoutDashboard },
      { path: '/teacher/assignments/new', label: 'Post Assignment', icon: PlusCircle },
      { path: '/teacher/assignments', label: 'My Assignments', icon: BookOpen },
      { path: '/admin', label: 'Admin Console', icon: ShieldCheck }
    ];
  } else if (role === 'TEACHER') {
    navItems = [
      { path: '/dashboard', label: 'Overview', icon: LayoutDashboard },
      { path: '/teacher/assignments/new', label: 'Post Assignment', icon: PlusCircle },
      { path: '/teacher/assignments', label: 'My Assignments', icon: BookOpen }
    ];
  } else {
    // STUDENT
    navItems = [
      { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { path: '/assignments', label: 'Assignments', icon: BookOpen },
      { path: '/calendar', label: 'Calendar', icon: Calendar },
      { path: '/planner', label: 'Study Planner', icon: BrainCircuit },
      { path: '/analytics', label: 'Analytics', icon: BarChart2 },
      { path: '/leaderboard', label: 'Leaderboard', icon: Trophy },
      { path: '/achievements', label: 'Achievements', icon: Award },
      { path: '/groups', label: 'Study Groups', icon: Users },
      { path: '/tasks', label: 'My Tasks', icon: CheckSquare }
    ];
  }

  const roleBadgeColor = role === 'ADMIN' ? '#f43f5e' : (role === 'TEACHER' ? '#8b5cf6' : '#3b82f6');

  return (
    <aside style={{
      width: '260px',
      background: 'var(--bg-secondary)',
      borderRight: '1px solid var(--border-color)',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      position: 'sticky',
      top: 0,
      zIndex: 40
    }}>
      {/* Brand Header */}
      <div style={{
        padding: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        borderBottom: '1px solid var(--border-color)'
      }}>
        <div style={{
          width: '38px',
          height: '38px',
          borderRadius: '10px',
          background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent-purple) 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          boxShadow: 'var(--shadow-glow)'
        }}>
          <GraduationCap size={22} />
        </div>
        <div>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>Nexus Dashboard</h2>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Academic Platform
          </span>
        </div>
      </div>

      {/* Navigation List */}
      <nav style={{ padding: '1rem 0.75rem', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '0.85rem',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-sm)',
                fontWeight: isActive ? 600 : 500,
                fontSize: '0.9rem',
                color: isActive ? 'white' : 'var(--text-secondary)',
                background: isActive ? 'var(--primary)' : 'transparent',
                transition: 'all 0.2s ease',
                boxShadow: isActive ? '0 4px 12px rgba(99, 102, 241, 0.3)' : 'none'
              })}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* User Role Badge in Footer */}
      <div style={{
        padding: '1rem 1.25rem',
        borderTop: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '0.75rem',
        color: 'var(--text-muted)'
      }}>
        <span>Role:</span>
        <span style={{
          padding: '2px 8px',
          borderRadius: '12px',
          background: `${roleBadgeColor}20`,
          color: roleBadgeColor,
          fontWeight: 700,
          letterSpacing: '0.05em'
        }}>
          {role}
        </span>
      </div>
    </aside>
  );
}
