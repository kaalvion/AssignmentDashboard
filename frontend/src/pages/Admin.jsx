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
  Lock
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
        setUsers(res.data || []);
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
        setActionSuccess(`Successfully updated ${userName}'s role to ${newRole}.`);
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

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-500 mb-2">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Administrator Console</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-text-primary)]">
            User Management & Access Control
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            Promote or demote teachers and students, manage student class assignments, and monitor directory accounts.
          </p>
        </div>

        <button
          onClick={fetchUsers}
          className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)] self-start sm:self-auto transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Users</span>
        </button>
      </div>

      {/* Action alerts */}
      {actionSuccess && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess('')} className="text-xs hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {actionError && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-500 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError('')} className="text-xs hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search user by name or email..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-[var(--color-text-tertiary)]" />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 text-sm rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          >
            <option value="ALL">All Roles</option>
            <option value="STUDENT">Students Only</option>
            <option value="TEACHER">Teachers Only</option>
            <option value="ADMIN">Admins Only</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      {loading ? (
        <div className="p-8 text-center rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)]">
          <RefreshCw className="w-8 h-8 text-[var(--color-primary)] animate-spin mx-auto" />
          <p className="text-sm text-[var(--color-text-secondary)] mt-3">Loading user directory...</p>
        </div>
      ) : error ? (
        <div className="p-8 text-center rounded-2xl bg-[var(--color-surface)] border border-rose-500/20 space-y-3">
          <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto" />
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Error loading directory</h3>
          <p className="text-sm text-[var(--color-text-secondary)] max-w-md mx-auto">{error}</p>
          <button
            onClick={fetchUsers}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-[var(--color-primary)] text-white hover:opacity-90"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Try Again</span>
          </button>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-[var(--color-surface)] border border-dashed border-[var(--color-border)] space-y-2">
          <Users className="w-10 h-10 text-[var(--color-text-tertiary)] mx-auto" />
          <h3 className="text-base font-semibold text-[var(--color-text-primary)]">No users found</h3>
          <p className="text-xs text-[var(--color-text-secondary)]">
            Try adjusting your search query or filter.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-subtle)] text-[11px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Class Details</th>
                  <th className="py-3 px-4">Gamification</th>
                  <th className="py-3 px-4 text-right">Role Actions</th>
                  <th className="py-3 px-4 text-right">Class Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)] text-sm">
                {filteredUsers.map((u) => {
                  const isSelf = currentUser && (currentUser.id === u.id || currentUser.userId === u.id);
                  const isUpdating = updatingUserId === u.id;
                  const isUserAdmin = u.role === 'ADMIN';

                  return (
                    <tr
                      key={u.id}
                      className="hover:bg-[var(--color-surface-subtle)]/50 transition-colors"
                    >
                      {/* Name & Email */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-[var(--color-text-primary)] flex items-center gap-1.5">
                          <span>{u.name || 'User'}</span>
                          {isSelf && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)] font-normal">
                              You
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-[var(--color-text-tertiary)]">
                          {u.email || 'No email registered'}
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="py-3 px-4">
                        {u.role === 'ADMIN' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                            <ShieldAlert className="w-3 h-3" />
                            <span>ADMIN</span>
                          </span>
                        ) : u.role === 'TEACHER' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <Briefcase className="w-3 h-3" />
                            <span>TEACHER</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                            <GraduationCap className="w-3 h-3" />
                            <span>STUDENT</span>
                          </span>
                        )}
                      </td>

                      {/* Class Details */}
                      <td className="py-3 px-4">
                        {u.course && u.semester && u.division ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-[var(--color-text-primary)]">
                            {u.course} - Sem {u.semester} - Div {u.division}
                          </span>
                        ) : (
                          <span className="text-xs text-[var(--color-text-tertiary)] italic">
                            Unassigned
                          </span>
                        )}
                      </td>

                      {/* Gamification */}
                      <td className="py-3 px-4 text-xs text-[var(--color-text-secondary)]">
                        <div>{u.points || 0} pts</div>
                        <div className="text-[11px] text-[var(--color-text-tertiary)]">{u.streak || 0}d streak</div>
                      </td>

                      {/* Role Actions */}
                      <td className="py-3 px-4 text-right">
                        {isUserAdmin ? (
                          <span className="inline-flex items-center gap-1 text-xs text-[var(--color-text-tertiary)] font-medium">
                            <Lock className="w-3 h-3" />
                            <span>Protected</span>
                          </span>
                        ) : isSelf ? (
                          <span className="text-xs text-[var(--color-text-tertiary)] italic">Cannot change self</span>
                        ) : (
                          <div className="flex items-center justify-end gap-1.5">
                            {u.role === 'STUDENT' ? (
                              <button
                                type="button"
                                disabled={isUpdating}
                                onClick={() => handleRoleChange(u.id, 'TEACHER', u.name)}
                                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 transition-colors disabled:opacity-50"
                              >
                                {isUpdating ? 'Updating...' : 'Make Teacher'}
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={isUpdating}
                                onClick={() => handleRoleChange(u.id, 'STUDENT', u.name)}
                                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 transition-colors disabled:opacity-50"
                              >
                                {isUpdating ? 'Updating...' : 'Make Student'}
                              </button>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Class Edit Action */}
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => openClassEditModal(u)}
                          title="Edit Class Details"
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Edit Class</span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md p-6 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-[var(--color-text-primary)]">
                  Edit Class Assignment
                </h3>
                <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                  Updating class for: <span className="font-semibold text-[var(--color-text-primary)]">{editingStudent.name || editingStudent.email}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingStudent(null)}
                className="p-1 rounded-lg hover:bg-[var(--color-surface-subtle)] text-[var(--color-text-tertiary)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveClass} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1 uppercase tracking-wider">
                  Course
                </label>
                <select
                  value={editCourse}
                  onChange={(e) => setEditCourse(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                >
                  {COURSE_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1 uppercase tracking-wider">
                  Semester
                </label>
                <select
                  value={editSemester}
                  onChange={(e) => setEditSemester(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                >
                  {SEMESTER_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      Semester {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1 uppercase tracking-wider">
                  Division
                </label>
                <select
                  value={editDivision}
                  onChange={(e) => setEditDivision(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                >
                  {DIVISION_OPTIONS.map((d) => (
                    <option key={d} value={d}>
                      Division {d}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--color-border)]">
                <button
                  type="button"
                  disabled={savingClass}
                  onClick={() => setEditingStudent(null)}
                  className="px-4 py-2 text-xs font-medium rounded-xl border border-[var(--color-border)] hover:bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)] disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingClass}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-[var(--color-primary)] text-white hover:opacity-90 disabled:opacity-50"
                >
                  {savingClass ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
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
