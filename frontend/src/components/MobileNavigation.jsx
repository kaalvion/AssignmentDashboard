import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  BookOpen, 
  Calendar, 
  BrainCircuit, 
  PlusCircle, 
  ShieldCheck, 
  Trophy 
} from 'lucide-react';

export default function MobileNavigation() {
  const { user } = useAuth();
  const role = user?.role || 'STUDENT';

  let items = [];

  if (role === 'ADMIN') {
    items = [
      { path: '/dashboard', label: 'Overview', icon: LayoutDashboard },
      { path: '/teacher/assignments/new', label: 'Post', icon: PlusCircle },
      { path: '/teacher/assignments', label: 'My Assigns', icon: BookOpen },
      { path: '/admin', label: 'Admin', icon: ShieldCheck }
    ];
  } else if (role === 'TEACHER') {
    items = [
      { path: '/dashboard', label: 'Overview', icon: LayoutDashboard },
      { path: '/teacher/assignments/new', label: 'Post', icon: PlusCircle },
      { path: '/teacher/assignments', label: 'My Assigns', icon: BookOpen }
    ];
  } else {
    items = [
      { path: '/dashboard', label: 'Home', icon: LayoutDashboard },
      { path: '/assignments', label: 'Assignments', icon: BookOpen },
      { path: '/planner', label: 'Planner', icon: BrainCircuit },
      { path: '/calendar', label: 'Calendar', icon: Calendar },
      { path: '/leaderboard', label: 'Rank', icon: Trophy }
    ];
  }

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      height: '60px',
      background: 'var(--bg-secondary)',
      borderTop: '1px solid var(--border-color)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-around',
      zIndex: 50,
      padding: '0 0.5rem'
    }}>
      {items.map(item => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.path}
            to={item.path}
            style={({ isActive }) => ({
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.2rem',
              color: isActive ? 'var(--primary)' : 'var(--text-muted)',
              fontSize: '0.65rem',
              fontWeight: isActive ? 600 : 400
            })}
          >
            <Icon size={20} />
            <span>{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
