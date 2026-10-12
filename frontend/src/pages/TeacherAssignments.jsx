import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import {
  PlusCircle,
  Edit2,
  Trash2,
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  Search,
  Filter,
  Calendar,
  Award,
  ChevronRight,
  RefreshCw
} from 'lucide-react';

export default function TeacherAssignments() {
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCourse, setFilterCourse] = useState('ALL');

  // Delete modal state
  const [deletingAssignment, setDeletingAssignment] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/teacher/assignments');
      if (res && res.success) {
        setAssignments(res.data || []);
      } else {
        setAssignments([]);
      }
    } catch (err) {
      console.error('Error fetching teacher assignments:', err);
      setError('Unable to load assignments. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  const handleDeleteConfirm = async () => {
    if (!deletingAssignment) return;
    try {
      setIsDeleting(true);
      setDeleteError('');
      const res = await api.delete(`/teacher/assignments/${deletingAssignment.id}`);
      if (res && res.success) {
        setAssignments(prev => prev.filter(a => a.id !== deletingAssignment.id));
        setDeletingAssignment(null);
      } else {
        setDeleteError(res?.message || 'Failed to delete assignment.');
      }
    } catch (err) {
      console.error('Error deleting assignment:', err);
      setDeleteError(err?.message || 'Server error while deleting assignment.');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredAssignments = assignments.filter(a => {
    const matchesSearch =
      (a.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.subject || a.subjectName || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCourse = filterCourse === 'ALL' || a.course === filterCourse;
    return matchesSearch && matchesCourse;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-text-primary)]">
            My Posted Assignments
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            Manage your course assignments, track student submissions, and review uploaded PDFs.
          </p>
        </div>

        <Link
          to="/teacher/assignments/new"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-medium bg-[var(--color-primary)] text-white shadow-lg shadow-primary/20 hover:opacity-95 transition-all text-sm shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Post Assignment</span>
        </Link>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title or subject..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-[var(--color-text-tertiary)]" />
          <select
            value={filterCourse}
            onChange={(e) => setFilterCourse(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 text-sm rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          >
            <option value="ALL">All Courses</option>
            <option value="BCA">BCA</option>
            <option value="BBA">BBA</option>
            <option value="BTECH">BTECH</option>
            <option value="MBA">MBA</option>
            <option value="MCA">MCA</option>
          </select>

          <button
            onClick={fetchAssignments}
            title="Refresh assignments"
            className="p-2 rounded-xl border border-[var(--color-border)] hover:bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)] transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="p-5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] animate-pulse space-y-4"
            >
              <div className="h-5 bg-[var(--color-surface-subtle)] rounded w-3/4" />
              <div className="h-4 bg-[var(--color-surface-subtle)] rounded w-1/2" />
              <div className="h-20 bg-[var(--color-surface-subtle)] rounded-xl" />
              <div className="h-9 bg-[var(--color-surface-subtle)] rounded-xl" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="p-8 text-center rounded-2xl bg-[var(--color-surface)] border border-rose-500/20 space-y-3">
          <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto" />
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Failed to load assignments</h3>
          <p className="text-sm text-[var(--color-text-secondary)] max-w-md mx-auto">{error}</p>
          <button
            onClick={fetchAssignments}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-[var(--color-primary)] text-white hover:opacity-90 transition-opacity"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Try Again</span>
          </button>
        </div>
      ) : filteredAssignments.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-[var(--color-surface)] border border-dashed border-[var(--color-border)] space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center mx-auto">
            <FileText className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">No assignments found</h3>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1 max-w-sm mx-auto">
              {searchQuery || filterCourse !== 'ALL'
                ? 'Try adjusting your search query or filter.'
                : 'You have not posted any assignments yet. Get started by creating your first assignment.'}
            </p>
          </div>
          <Link
            to="/teacher/assignments/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-[var(--color-primary)] text-white hover:opacity-90 transition-opacity"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Assignment</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredAssignments.map((a) => {
            const isPastDeadline = a.deadline ? new Date(a.deadline) < new Date() : false;
            const submittedCount = a.submittedCount || 0;
            const lateCount = a.lateCount || 0;
            const onTimeCount = a.onTimeCount || Math.max(0, submittedCount - lateCount);
            const totalStudents = a.totalStudents || 0;
            const missingCount = a.missingCount !== undefined ? a.missingCount : Math.max(0, totalStudents - submittedCount);

            return (
              <div
                key={a.id}
                className="flex flex-col justify-between p-5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm hover:border-[var(--color-primary)]/40 transition-all group"
              >
                <div className="space-y-3">
                  {/* Badges row */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                      {a.subject || a.subjectName || 'General'}
                    </span>
                    <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)] border border-[var(--color-border)]">
                      {a.course} • Sem {a.semester} • Div {a.division}
                    </span>
                    {a.allowLate ? (
                      <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        Late Allowed
                      </span>
                    ) : (
                      <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400">
                        Strict Deadline
                      </span>
                    )}
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="text-lg font-bold text-[var(--color-text-primary)] group-hover:text-[var(--color-primary)] transition-colors line-clamp-1">
                      {a.title}
                    </h3>
                    {a.description && (
                      <p className="text-xs text-[var(--color-text-secondary)] mt-1 line-clamp-2">
                        {a.description}
                      </p>
                    )}
                  </div>

                  {/* Deadline & Max Points */}
                  <div className="pt-2 flex items-center justify-between text-xs text-[var(--color-text-secondary)] border-t border-[var(--color-border)]">
                    <div className="flex items-center gap-1.5">
                      <Clock className={`w-3.5 h-3.5 ${isPastDeadline ? 'text-rose-500' : 'text-[var(--color-primary)]'}`} />
                      <span className={isPastDeadline ? 'text-rose-500 font-medium' : ''}>
                        {a.deadline ? new Date(a.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'No deadline'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 font-semibold text-[var(--color-text-primary)]">
                      <Award className="w-3.5 h-3.5 text-amber-500" />
                      <span>{a.maxPoints || 50} pts</span>
                    </div>
                  </div>

                  {/* Submission Statistics Cards */}
                  <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)]">
                    <div className="text-center">
                      <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center justify-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Submitted</span>
                      </div>
                      <div className="text-base font-bold text-[var(--color-text-primary)] mt-0.5">
                        {submittedCount}
                      </div>
                    </div>

                    <div className="text-center border-x border-[var(--color-border)]">
                      <div className="text-xs text-amber-600 dark:text-amber-400 font-semibold flex items-center justify-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>Late</span>
                      </div>
                      <div className="text-base font-bold text-[var(--color-text-primary)] mt-0.5">
                        {lateCount}
                      </div>
                    </div>

                    <div className="text-center">
                      <div className="text-xs text-rose-500 font-semibold flex items-center justify-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Missing</span>
                      </div>
                      <div className="text-base font-bold text-[var(--color-text-primary)] mt-0.5">
                        {missingCount}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="pt-4 mt-4 border-t border-[var(--color-border)] flex items-center justify-between gap-2">
                  <Link
                    to={`/teacher/assignments/${a.id}/submissions`}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-[var(--color-primary)] text-white hover:opacity-90 transition-opacity"
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Submissions ({submittedCount})</span>
                  </Link>

                  <div className="flex items-center gap-1">
                    <Link
                      to={`/teacher/assignments/${a.id}/edit`}
                      title="Edit Assignment"
                      className="p-2 rounded-xl border border-[var(--color-border)] hover:bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Link>

                    <button
                      onClick={() => setDeletingAssignment(a)}
                      title="Delete Assignment"
                      className="p-2 rounded-xl border border-[var(--color-border)] hover:bg-rose-500/10 text-[var(--color-text-secondary)] hover:text-rose-500 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md p-6 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-500">
              <div className="p-2.5 rounded-xl bg-rose-500/10">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[var(--color-text-primary)]">Delete Assignment?</h3>
                <p className="text-xs text-[var(--color-text-secondary)]">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-sm text-[var(--color-text-secondary)]">
              Are you sure you want to permanently delete{' '}
              <strong className="text-[var(--color-text-primary)]">"{deletingAssignment.title}"</strong>?
              Students in class {deletingAssignment.course} (Sem {deletingAssignment.semester}, Div {deletingAssignment.division})
              will receive a deletion alert, and this will remove all associated submissions.
            </p>

            {deleteError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-500 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => {
                  setDeletingAssignment(null);
                  setDeleteError('');
                }}
                className="px-4 py-2 text-sm font-medium rounded-xl border border-[var(--color-border)] hover:bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)] transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteConfirm}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-rose-500 text-white hover:bg-rose-600 transition-colors disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Confirm Delete</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
