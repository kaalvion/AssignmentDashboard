import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { COURSE_OPTIONS, SEMESTER_OPTIONS, DIVISION_OPTIONS } from '../constants/classOptions';
import {
  ShieldAlert,
  Users,
  Search,
  Filter,
  UserCheck,
  GraduationCap,
  Briefcase,
  Edit3,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  X,
  Save,
  Lock,
  Mail,
  Award,
  Flame,
  ShieldCheck,
  UserCog
} from 'lucide-react';

export default function Admin() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  // Updating role states
  const [updatingUserId, setUpdatingUserId] = useState(null);
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');

  // Edit Class Modal state
  const [editingStudent, setEditingStudent] = useState(null);
  const [editCourse, setEditCourse] = useState(COURSE_OPTIONS[0]);
  const [editSemester, setEditSemester] = useState(SEMESTER_OPTIONS[0]);
  const [editDivision, setEditDivision] = useState(DIVISION_OPTIONS[0]);
  const [savingClass, setSavingClass] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const url = roleFilter === 'ALL' ? '/admin/users' : `/admin/users?role=${roleFilter}`;
      const res = await api.get(url);
      if (res && res.success) {
        // Sanitize any test artifact tokens
        const sanitized = (res.data || []).filter(u => !u.id?.startsWith('eyJ') && !u.email?.startsWith('eyJ'));
        setUsers(sanitized);
      } else {
        setError(res?.message || 'Failed to load users.');
      }
    } catch (err) {
      console.error('Admin fetchUsers error:', err);
      setError('Unable to fetch users list. Only administrators can view this page.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [roleFilter]);

  const handleRoleChange = async (userId, newRole, userName) => {
    try {
      setUpdatingUserId(userId);
      setActionSuccess('');
      setActionError('');

      const res = await api.put(`/admin/users/${userId}/role`, { role: newRole });
      if (res && res.success) {
        setActionSuccess(`Successfully updated ${userName || 'user'}'s role to ${newRole}.`);
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      } else {
        setActionError(res?.message || 'Failed to update role.');
      }
    } catch (err) {
      console.error('Role update error:', err);
      setActionError(err?.message || 'Error occurred while updating role.');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const openClassEditModal = (student) => {
    setEditingStudent(student);
    setEditCourse(student.course || COURSE_OPTIONS[0]);
    setEditSemester(student.semester || SEMESTER_OPTIONS[0]);
    setEditDivision(student.division || DIVISION_OPTIONS[0]);
    setActionError('');
  };

  const handleSaveClass = async (e) => {
    e.preventDefault();
    if (!editingStudent) return;
    try {
      setSavingClass(true);
      setActionError('');
      const res = await api.put(`/admin/users/${editingStudent.id}/class`, {
        course: editCourse,
        semester: editSemester,
        division: editDivision
      });
      if (res && res.success) {
        setActionSuccess(`Updated ${editingStudent.name || 'student'}'s class to ${editCourse} - Sem ${editSemester} - Div ${editDivision}.`);
        setUsers(prev => prev.map(u => u.id === editingStudent.id ? {
          ...u,
          course: editCourse,
          semester: editSemester,
          division: editDivision
        } : u));
        setEditingStudent(null);
      } else {
        setActionError(res?.message || 'Failed to update student class.');
      }
    } catch (err) {
      console.error('Class update error:', err);
      setActionError(err?.message || 'Error saving student class.');
    } finally {
      setSavingClass(false);
    }
  };

  const filteredUsers = users.filter(u => {
    const q = searchQuery.toLowerCase();
    const nameMatch = (u.name || '').toLowerCase().includes(q);
    const emailMatch = (u.email || '').toLowerCase().includes(q);
    return nameMatch || emailMatch;
  });

  // Calculate high-level directory metrics
  const totalUsersCount = users.length;
  const studentCount = users.filter(u => u.role === 'STUDENT').length;
  const teacherCount = users.filter(u => u.role === 'TEACHER').length;
  const adminCount = users.filter(u => u.role === 'ADMIN').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
      {/* Top Header Banner */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1.25rem',
        padding: '1.75rem 2rem',
        borderRadius: 'var(--radius-lg, 20px)',
        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.12) 0%, rgba(6, 182, 212, 0.08) 100%)',
        border: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
        backdropFilter: 'blur(16px)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{
            width: '54px',
            height: '54px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            boxShadow: '0 8px 24px rgba(99, 102, 241, 0.35)',
            flexShrink: 0
          }}>
            <ShieldAlert size={28} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
                Admin Console
              </h1>
              <span style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '0.2rem 0.65rem',
                borderRadius: '9999px',
                background: 'rgba(99, 102, 241, 0.2)',
                color: '#818cf8',
                border: '1px solid rgba(99, 102, 241, 0.45)'
              }}>
                ACCESS CONTROL
              </span>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '6px 0 0', lineHeight: 1.4 }}>
              Manage directory accounts, promote or demote teachers and students, and assign locked academic classes.
            </p>
          </div>
        </div>

        <button
          onClick={fetchUsers}
          className="btn btn-secondary"
          style={{
            padding: '0.75rem 1.4rem',
            fontSize: '0.9rem',
            borderRadius: 'var(--radius-md, 14px)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          <span>Refresh Directory</span>
        </button>
      </div>

      {/* Directory Metrics KPI Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '1.25rem'
      }}>
        {/* Total Accounts */}
        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.35rem 1.5rem' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            background: 'rgba(139, 92, 246, 0.15)',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--primary, #8b5cf6)'
          }}>
            <Users size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Total Users
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
              {totalUsersCount}
            </div>
          </div>
        </div>

        {/* Students */}
        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.35rem 1.5rem' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            background: 'rgba(6, 182, 212, 0.15)',
            border: '1px solid rgba(6, 182, 212, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent-cyan, #06b6d4)'
          }}>
            <GraduationCap size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Students
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
              {studentCount}
            </div>
          </div>
        </div>

        {/* Teachers */}
        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.35rem 1.5rem' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent-emerald, #10b981)'
          }}>
            <Briefcase size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Faculty / Teachers
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
              {teacherCount}
            </div>
          </div>
        </div>

        {/* Administrators */}
        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.35rem 1.5rem' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            background: 'rgba(99, 102, 241, 0.15)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#818cf8'
          }}>
            <ShieldCheck size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              System Admins
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
              {adminCount}
            </div>
          </div>
        </div>
      </div>

      {/* Action Alerts */}
      {actionSuccess && (
        <div style={{
          padding: '0.85rem 1.25rem',
          borderRadius: 'var(--radius-md, 14px)',
          background: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          color: 'var(--accent-emerald, #10b981)',
          fontSize: '0.875rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <CheckCircle2 size={18} />
            <span>{actionSuccess}</span>
          </div>
          <button
            onClick={() => setActionSuccess('')}
            style={{ fontSize: '0.8rem', fontWeight: 700, textDecoration: 'underline', color: 'inherit' }}
          >
            Dismiss
          </button>
        </div>
      )}

      {actionError && (
        <div style={{
          padding: '0.85rem 1.25rem',
          borderRadius: 'var(--radius-md, 14px)',
          background: 'rgba(244, 63, 94, 0.15)',
          border: '1px solid rgba(244, 63, 94, 0.3)',
          color: '#f87171',
          fontSize: '0.875rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <AlertTriangle size={18} />
            <span>{actionError}</span>
          </div>
          <button
            onClick={() => setActionError('')}
            style={{ fontSize: '0.8rem', fontWeight: 700, textDecoration: 'underline', color: 'inherit' }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="glass-card" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        padding: '1rem 1.25rem'
      }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 280px', maxWidth: '420px' }}>
          <Search
            size={18}
            style={{
              position: 'absolute',
              left: '14px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
              pointerEvents: 'none'
            }}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search directory by name or email..."
            className="input-field"
            style={{
              paddingLeft: '2.6rem',
              height: '42px',
              fontSize: '0.9rem',
              borderRadius: 'var(--radius-sm, 8px)'
            }}
          />
        </div>

        {/* Role Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Filter size={16} style={{ color: 'var(--text-muted)' }} />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="input-field"
            style={{
              width: 'auto',
              minWidth: '170px',
              height: '42px',
              fontSize: '0.875rem',
              borderRadius: 'var(--radius-sm, 8px)',
              cursor: 'pointer'
            }}
          >
            <option value="ALL">All Roles ({users.length})</option>
            <option value="STUDENT">Students Only ({studentCount})</option>
            <option value="TEACHER">Faculty Only ({teacherCount})</option>
            <option value="ADMIN">Admins Only ({adminCount})</option>
          </select>
        </div>
      </div>

      {/* Main Content: Users Directory Table */}
      {loading ? (
        <div className="glass-card" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
          <RefreshCw size={36} className="animate-spin" style={{ color: 'var(--primary, #8b5cf6)', margin: '0 auto' }} />
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '1rem' }}>
            Loading user directory...
          </p>
        </div>
      ) : error ? (
        <div className="glass-card" style={{
          padding: '3rem 2rem',
          textAlign: 'center',
          borderColor: 'rgba(244, 63, 94, 0.4)',
          background: 'rgba(244, 63, 94, 0.05)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <AlertTriangle size={42} style={{ color: 'var(--accent-rose, #f43f5e)' }} />
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Unable to Load Directory
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '480px', margin: 0 }}>
            {error}
          </p>
          <button
            onClick={fetchUsers}
            className="btn btn-primary"
            style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <RefreshCw size={16} />
            <span>Try Again</span>
          </button>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="glass-card" style={{
          padding: '4rem 2rem',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <Users size={36} style={{ color: 'var(--text-muted)' }} />
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            No Matching Users Found
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '380px', margin: 0 }}>
            No user accounts match your search query or role filter.
          </p>
        </div>
      ) : (
        <div className="glass-card" style={{ padding: '0', overflow: 'hidden', borderRadius: 'var(--radius-lg, 20px)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{
                  background: 'var(--bg-secondary)',
                  borderBottom: '1px solid var(--border-color)',
                  color: 'var(--text-secondary)',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  <th style={{ padding: '1.1rem 1.25rem' }}>User Profile</th>
                  <th style={{ padding: '1.1rem 1.25rem' }}>System Role</th>
                  <th style={{ padding: '1.1rem 1.25rem' }}>Class Allocation</th>
                  <th style={{ padding: '1.1rem 1.25rem' }}>Activity & Stats</th>
                  <th style={{ padding: '1.1rem 1.25rem', textAlign: 'center' }}>Role Management</th>
                  <th style={{ padding: '1.1rem 1.25rem', textAlign: 'right' }}>Academic Class</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => {
                  const isSelf = currentUser && (currentUser.id === u.id || currentUser.userId === u.id);
                  const isUpdating = updatingUserId === u.id;
                  const isUserAdmin = u.role === 'ADMIN';

                  // Generate nice avatar fallback initials
                  const displayName = u.name && u.name !== 'Student' && !u.name.startsWith('eyJ')
                    ? u.name
                    : (u.email ? u.email.split('@')[0] : 'User');
                  
                  const initials = displayName
                    .split(/[\s._]+/)
                    .filter(Boolean)
                    .map(part => part[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2) || 'U';

                  return (
                    <tr
                      key={u.id}
                      style={{
                        borderBottom: '1px solid var(--border-color)',
                        transition: 'background 0.2s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      {/* Name & Email Profile */}
                      <td style={{ padding: '1.1rem 1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                          <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            background: u.role === 'ADMIN'
                              ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
                              : u.role === 'TEACHER'
                              ? 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)'
                              : 'linear-gradient(135deg, var(--primary, #8b5cf6) 0%, var(--accent-purple, #d0bcff) 100%)',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            flexShrink: 0,
                            boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                          }}>
                            {initials}
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                                {displayName}
                              </span>
                              {isSelf && (
                                <span style={{
                                  fontSize: '0.7rem',
                                  fontWeight: 700,
                                  padding: '0.1rem 0.45rem',
                                  borderRadius: '9999px',
                                  background: 'var(--primary-light, rgba(139, 92, 246, 0.2))',
                                  color: 'var(--primary, #8b5cf6)',
                                  border: '1px solid var(--border-highlight, rgba(139, 92, 246, 0.4))'
                                }}>
                                  You
                                </span>
                              )}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                              <Mail size={12} />
                              <span>{u.email || 'No email registered'}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* System Role Badge */}
                      <td style={{ padding: '1.1rem 1.25rem' }}>
                        {u.role === 'ADMIN' ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            padding: '0.25rem 0.75rem',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            background: 'rgba(99, 102, 241, 0.15)',
                            color: '#818cf8',
                            border: '1px solid rgba(99, 102, 241, 0.35)'
                          }}>
                            <ShieldAlert size={13} />
                            <span>ADMIN</span>
                          </span>
                        ) : u.role === 'TEACHER' ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            padding: '0.25rem 0.75rem',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            background: 'rgba(16, 185, 129, 0.15)',
                            color: 'var(--accent-emerald, #10b981)',
                            border: '1px solid rgba(16, 185, 129, 0.35)'
                          }}>
                            <Briefcase size={13} />
                            <span>FACULTY</span>
                          </span>
                        ) : (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            padding: '0.25rem 0.75rem',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            background: 'rgba(6, 182, 212, 0.15)',
                            color: 'var(--accent-cyan, #06b6d4)',
                            border: '1px solid rgba(6, 182, 212, 0.35)'
                          }}>
                            <GraduationCap size={13} />
                            <span>STUDENT</span>
                          </span>
                        )}
                      </td>

                      {/* Class Details */}
                      <td style={{ padding: '1.1rem 1.25rem' }}>
                        {u.course && u.semester && u.division ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '0.3rem 0.75rem',
                            borderRadius: 'var(--radius-sm, 8px)',
                            fontSize: '0.82rem',
                            fontWeight: 600,
                            background: 'var(--bg-secondary)',
                            color: 'var(--text-primary)',
                            border: '1px solid var(--border-color)'
                          }}>
                            {u.course} • Sem {u.semester} • Div {u.division}
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                            Unassigned
                          </span>
                        )}
                      </td>

                      {/* Gamification Stats */}
                      <td style={{ padding: '1.1rem 1.25rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                            <Award size={14} style={{ color: 'var(--accent-amber, #f59e0b)' }} />
                            <span>{u.points || 0} pts</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            <Flame size={13} style={{ color: 'var(--accent-rose, #f43f5e)' }} />
                            <span>{u.streak || 0}d streak</span>
                          </div>
                        </div>
                      </td>

                      {/* Role Actions */}
                      <td style={{ padding: '1.1rem 1.25rem', textAlign: 'center' }}>
                        {isUserAdmin ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            fontSize: '0.75rem',
                            color: 'var(--text-muted)',
                            fontWeight: 600
                          }}>
                            <Lock size={13} />
                            <span>Protected</span>
                          </span>
                        ) : isSelf ? (
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                            Current User
                          </span>
                        ) : (
                          <div>
                            {u.role === 'STUDENT' ? (
                              <button
                                type="button"
                                disabled={isUpdating}
                                onClick={() => handleRoleChange(u.id, 'TEACHER', displayName)}
                                className="btn"
                                style={{
                                  padding: '0.35rem 0.85rem',
                                  fontSize: '0.78rem',
                                  fontWeight: 700,
                                  borderRadius: 'var(--radius-sm, 8px)',
                                  background: 'rgba(16, 185, 129, 0.15)',
                                  color: 'var(--accent-emerald, #10b981)',
                                  border: '1px solid rgba(16, 185, 129, 0.35)',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s ease'
                                }}
                              >
                                {isUpdating ? 'Updating...' : 'Promote to Teacher'}
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={isUpdating}
                                onClick={() => handleRoleChange(u.id, 'STUDENT', displayName)}
                                className="btn"
                                style={{
                                  padding: '0.35rem 0.85rem',
                                  fontSize: '0.78rem',
                                  fontWeight: 700,
                                  borderRadius: 'var(--radius-sm, 8px)',
                                  background: 'rgba(6, 182, 212, 0.15)',
                                  color: 'var(--accent-cyan, #06b6d4)',
                                  border: '1px solid rgba(6, 182, 212, 0.35)',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s ease'
                                }}
                              >
                                {isUpdating ? 'Updating...' : 'Demote to Student'}
                              </button>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Class Edit Action */}
                      <td style={{ padding: '1.1rem 1.25rem', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => openClassEditModal(u)}
                          title="Edit Class Details"
                          className="btn btn-secondary"
                          style={{
                            padding: '0.45rem 0.85rem',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            borderRadius: 'var(--radius-sm, 8px)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.4rem'
                          }}
                        >
                          <Edit3 size={14} />
                          <span>Assign Class</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Student Class Modal */}
      {editingStudent && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 19, 28, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1.5rem'
        }}>
          <div className="glass-card" style={{
            maxWidth: '500px',
            width: '100%',
            padding: '2rem',
            borderRadius: 'var(--radius-lg, 20px)',
            boxShadow: 'var(--shadow-md)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: 'var(--primary-light, rgba(139, 92, 246, 0.2))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--primary, #8b5cf6)'
                }}>
                  <UserCog size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                    Override Class Assignment
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '3px 0 0' }}>
                    Student: <strong style={{ color: 'var(--text-primary)' }}>{editingStudent.name || editingStudent.email}</strong>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setEditingStudent(null)}
                style={{
                  color: 'var(--text-muted)',
                  padding: '4px',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveClass} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                  Course / Program
                </label>
                <select
                  value={editCourse}
                  onChange={(e) => setEditCourse(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', height: '42px', fontSize: '0.9rem', borderRadius: 'var(--radius-sm, 8px)' }}
                >
                  {COURSE_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                    Semester
                  </label>
                  <select
                    value={editSemester}
                    onChange={(e) => setEditSemester(e.target.value)}
                    className="input-field"
                    style={{ width: '100%', height: '42px', fontSize: '0.9rem', borderRadius: 'var(--radius-sm, 8px)' }}
                  >
                    {SEMESTER_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                    Division / Section
                  </label>
                  <select
                    value={editDivision}
                    onChange={(e) => setEditDivision(e.target.value)}
                    className="input-field"
                    style={{ width: '100%', height: '42px', fontSize: '0.9rem', borderRadius: 'var(--radius-sm, 8px)' }}
                  >
                    {DIVISION_OPTIONS.map((d) => (
                      <option key={d} value={d}>
                        Division {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.75rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                <button
                  type="button"
                  disabled={savingClass}
                  onClick={() => setEditingStudent(null)}
                  className="btn btn-secondary"
                  style={{ padding: '0.65rem 1.25rem', fontSize: '0.875rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingClass}
                  className="btn btn-primary"
                  style={{
                    padding: '0.65rem 1.4rem',
                    fontSize: '0.875rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  {savingClass ? (
                    <>
                      <RefreshCw size={15} className="animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save size={15} />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
