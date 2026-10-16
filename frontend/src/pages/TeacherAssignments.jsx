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
  RefreshCw,
  BookOpen,
  TrendingUp,
  BarChart2,
  Sparkles
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

  // Calculate executive overview metrics
  const totalAssignmentsCount = assignments.length;
  const totalSubmissionsCount = assignments.reduce((acc, a) => acc + (a.submittedCount || 0), 0);
  const totalLateCount = assignments.reduce((acc, a) => acc + (a.lateCount || 0), 0);
  const totalStudentsTargeted = assignments.reduce((acc, a) => acc + (a.totalStudents || 0), 0);
  const overallRate = totalStudentsTargeted > 0
    ? Math.min(100, Math.round((totalSubmissionsCount / totalStudentsTargeted) * 100))
    : 0;

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
            background: 'linear-gradient(135deg, var(--primary, #8b5cf6) 0%, var(--accent-purple, #d0bcff) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            boxShadow: '0 8px 24px rgba(139, 92, 246, 0.35)',
            flexShrink: 0
          }}>
            <BookOpen size={28} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
                My Posted Assignments
              </h1>
              <span style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '0.2rem 0.65rem',
                borderRadius: '9999px',
                background: 'var(--primary-light, rgba(139, 92, 246, 0.2))',
                color: 'var(--primary, #8b5cf6)',
                border: '1px solid var(--border-highlight, rgba(139, 92, 246, 0.45))'
              }}>
                FACULTY PORTAL
              </span>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '6px 0 0', lineHeight: 1.4 }}>
              Manage curriculum coursework, monitor real-time submissions, and evaluate student PDF deliverables.
            </p>
          </div>
        </div>

        <Link
          to="/teacher/assignments/new"
          className="btn btn-primary"
          style={{
            padding: '0.85rem 1.6rem',
            fontSize: '0.95rem',
            borderRadius: 'var(--radius-md, 14px)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.6rem',
            boxShadow: 'var(--shadow-glow, 0 0 25px rgba(139, 92, 246, 0.3))'
          }}
        >
          <PlusCircle size={19} />
          <span>Post New Assignment</span>
        </Link>
      </div>

      {/* Summary KPI Cards Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '1.25rem'
      }}>
        {/* KPI 1 */}
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
            <FileText size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Active Tasks
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
              {totalAssignmentsCount}
            </div>
          </div>
        </div>

        {/* KPI 2 */}
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
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Total Turn-ins
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
              {totalSubmissionsCount}
            </div>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.35rem 1.5rem' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            background: 'rgba(245, 158, 11, 0.15)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent-amber, #f59e0b)'
          }}>
            <Clock size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Late Turn-ins
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
              {totalLateCount}
            </div>
          </div>
        </div>

        {/* KPI 4 */}
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
            <TrendingUp size={22} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Class Turn-in Rate
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
              {overallRate}%
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
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
            placeholder="Search by assignment title or subject..."
            className="input-field"
            style={{
              paddingLeft: '2.6rem',
              height: '42px',
              fontSize: '0.9rem',
              borderRadius: 'var(--radius-sm, 8px)'
            }}
          />
        </div>

        {/* Dropdown Filters & Refresh */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={16} style={{ color: 'var(--text-muted)' }} />
            <select
              value={filterCourse}
              onChange={(e) => setFilterCourse(e.target.value)}
              className="input-field"
              style={{
                width: 'auto',
                minWidth: '150px',
                height: '42px',
                fontSize: '0.875rem',
                borderRadius: 'var(--radius-sm, 8px)',
                cursor: 'pointer'
              }}
            >
              <option value="ALL">All Programs (All)</option>
              <option value="BCA">BCA</option>
              <option value="BBA">BBA</option>
              <option value="BTECH">BTECH</option>
              <option value="MBA">MBA</option>
              <option value="MCA">MCA</option>
            </select>
          </div>

          <button
            onClick={fetchAssignments}
            title="Refresh assignments"
            className="btn btn-secondary"
            style={{
              height: '42px',
              padding: '0 0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.875rem',
              borderRadius: 'var(--radius-sm, 8px)'
            }}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
          gap: '1.5rem'
        }}>
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="glass-card skeleton" style={{ height: '280px', borderRadius: 'var(--radius-md, 14px)' }} />
          ))}
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
            Failed to Load Assignments
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '480px', margin: 0 }}>
            {error}
          </p>
          <button
            onClick={fetchAssignments}
            className="btn btn-primary"
            style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <RefreshCw size={16} />
            <span>Try Again</span>
          </button>
        </div>
      ) : filteredAssignments.length === 0 ? (
        <div className="glass-card" style={{
          padding: '4rem 2rem',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1.25rem'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '20px',
            background: 'var(--primary-light, rgba(139, 92, 246, 0.15))',
            color: 'var(--primary, #8b5cf6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <FileText size={32} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              No assignments found
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '420px', margin: '8px auto 0' }}>
              {searchQuery || filterCourse !== 'ALL'
                ? 'No assignments matched your search filter. Try clearing or expanding your search parameters.'
                : 'You have not created any coursework yet. Click below to publish your first assignment for your class.'}
            </p>
          </div>
          <Link
            to="/teacher/assignments/new"
            className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}
          >
            <PlusCircle size={18} />
            <span>Create New Assignment</span>
          </Link>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
          gap: '1.5rem'
        }}>
          {filteredAssignments.map((a) => {
            const isPastDeadline = a.deadline ? new Date(a.deadline) < new Date() : false;
            const submittedCount = a.submittedCount || 0;
            const lateCount = a.lateCount || 0;
            const onTimeCount = a.onTimeCount || Math.max(0, submittedCount - lateCount);
            const totalStudents = a.totalStudents || 0;
            const missingCount = a.missingCount !== undefined ? a.missingCount : Math.max(0, totalStudents - submittedCount);
            const submissionRate = totalStudents > 0 ? Math.min(100, Math.round((submittedCount / totalStudents) * 100)) : 0;

            return (
              <div
                key={a.id}
                className="glass-card glass-card-interactive"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '1.5rem',
                  borderRadius: 'var(--radius-lg, 20px)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {/* Decorative subtle top accent glow line */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '3px',
                  background: 'linear-gradient(90deg, var(--primary, #8b5cf6) 0%, var(--accent-cyan, #06b6d4) 100%)'
                }} />

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {/* Badges Row */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        padding: '0.25rem 0.65rem',
                        borderRadius: '9999px',
                        background: 'var(--primary-light, rgba(139, 92, 246, 0.2))',
                        color: 'var(--primary, #8b5cf6)',
                        border: '1px solid var(--border-highlight, rgba(139, 92, 246, 0.45))'
                      }}>
                        {a.subject || a.subjectName || 'General'}
                      </span>
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        padding: '0.25rem 0.6rem',
                        borderRadius: '9999px',
                        background: 'var(--bg-secondary)',
                        color: 'var(--text-secondary)',
                        border: '1px solid var(--border-color)'
                      }}>
                        {a.course} • Sem {a.semester} • Div {a.division}
                      </span>
                    </div>

                    {a.allowLate ? (
                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '0.2rem 0.55rem',
                        borderRadius: '9999px',
                        background: 'rgba(16, 185, 129, 0.15)',
                        color: 'var(--accent-emerald, #10b981)',
                        border: '1px solid rgba(16, 185, 129, 0.3)'
                      }}>
                        Late Allowed
                      </span>
                    ) : (
                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '0.2rem 0.55rem',
                        borderRadius: '9999px',
                        background: 'rgba(245, 158, 11, 0.15)',
                        color: 'var(--accent-amber, #f59e0b)',
                        border: '1px solid rgba(245, 158, 11, 0.3)'
                      }}>
                        Strict Deadline
                      </span>
                    )}
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 style={{
                      fontSize: '1.25rem',
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      margin: 0,
                      lineHeight: 1.35
                    }}>
                      {a.title}
                    </h3>
                    {a.description && (
                      <p style={{
                        fontSize: '0.85rem',
                        color: 'var(--text-secondary)',
                        margin: '6px 0 0',
                        lineHeight: 1.5,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}>
                        {a.description}
                      </p>
                    )}
                  </div>

                  {/* Deadline & Points Row */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-sm, 8px)',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                      <Clock size={16} style={{ color: isPastDeadline ? 'var(--accent-rose, #f43f5e)' : 'var(--primary, #8b5cf6)' }} />
                      <span style={{
                        fontWeight: 600,
                        color: isPastDeadline ? 'var(--accent-rose, #f43f5e)' : 'var(--text-secondary)'
                      }}>
                        {a.deadline
                          ? new Date(a.deadline).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          : 'No deadline'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      <Award size={16} style={{ color: 'var(--accent-amber, #f59e0b)' }} />
                      <span>{a.maxPoints || 50} pts</span>
                    </div>
                  </div>

                  {/* Clean 3-Column Submission Statistics Panel */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '0.5rem',
                    padding: '0.85rem',
                    borderRadius: 'var(--radius-md, 14px)',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    textAlign: 'center'
                  }}>
                    {/* Submitted */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        color: 'var(--accent-emerald, #10b981)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em'
                      }}>
                        <CheckCircle2 size={13} />
                        <span>Submitted</span>
                      </div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                        {submittedCount}
                      </div>
                    </div>

                    {/* Late */}
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '2px',
                      borderLeft: '1px solid var(--border-color)',
                      borderRight: '1px solid var(--border-color)'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        color: 'var(--accent-amber, #f59e0b)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em'
                      }}>
                        <Clock size={13} />
                        <span>Late</span>
                      </div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                        {lateCount}
                      </div>
                    </div>

                    {/* Missing */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        color: 'var(--accent-rose, #f43f5e)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em'
                      }}>
                        <AlertTriangle size={13} />
                        <span>Missing</span>
                      </div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                        {missingCount}
                      </div>
                    </div>
                  </div>

                  {/* Submission Rate Mini Progress Bar */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      <span>Class Turn-in Progress</span>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                        {submittedCount}/{totalStudents} ({submissionRate}%)
                      </span>
                    </div>
                    <div className="progress-bar-container" style={{ height: '6px' }}>
                      <div
                        className="progress-bar-fill"
                        style={{
                          width: `${submissionRate}%`,
                          background: submissionRate >= 80
                            ? 'linear-gradient(90deg, #10b981 0%, #06b6d4 100%)'
                            : 'linear-gradient(90deg, var(--primary) 0%, var(--accent-purple) 100%)'
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Card Action Footer */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  marginTop: '1.25rem',
                  paddingTop: '1rem',
                  borderTop: '1px solid var(--border-color)'
                }}>
                  <Link
                    to={`/teacher/assignments/${a.id}/submissions`}
                    className="btn btn-primary"
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      padding: '0.65rem 1rem',
                      fontSize: '0.85rem',
                      borderRadius: 'var(--radius-sm, 8px)'
                    }}
                  >
                    <Users size={16} />
                    <span>View Submissions ({submittedCount})</span>
                  </Link>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Link
                      to={`/teacher/assignments/${a.id}/edit`}
                      title="Edit Assignment"
                      className="btn btn-secondary"
                      style={{
                        padding: '0.65rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: 'var(--radius-sm, 8px)'
                      }}
                    >
                      <Edit2 size={16} />
                    </Link>

                    <button
                      onClick={() => setDeletingAssignment(a)}
                      title="Delete Assignment"
                      className="btn btn-danger"
                      style={{
                        padding: '0.65rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: 'var(--radius-sm, 8px)'
                      }}
                    >
                      <Trash2 size={16} />
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
            maxWidth: '480px',
            width: '100%',
            padding: '2rem',
            borderRadius: 'var(--radius-lg, 20px)',
            boxShadow: 'var(--shadow-md)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{
                width: '46px',
                height: '46px',
                borderRadius: '12px',
                background: 'rgba(244, 63, 94, 0.15)',
                border: '1px solid rgba(244, 63, 94, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-rose, #f43f5e)',
                flexShrink: 0
              }}>
                <Trash2 size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  Delete Assignment?
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                  This action cannot be undone.
                </p>
              </div>
            </div>

            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
              Are you sure you want to permanently delete{' '}
              <strong style={{ color: 'var(--text-primary)' }}>"{deletingAssignment.title}"</strong>?
              Enrolled students in {deletingAssignment.course} (Sem {deletingAssignment.semester}, Div {deletingAssignment.division})
              will receive a cancellation notification, and all recorded submissions will be removed.
            </p>

            {deleteError && (
              <div style={{
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-sm, 8px)',
                background: 'rgba(244, 63, 94, 0.15)',
                border: '1px solid rgba(244, 63, 94, 0.3)',
                color: '#f87171',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <AlertTriangle size={16} />
                <span>{deleteError}</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => {
                  setDeletingAssignment(null);
                  setDeleteError('');
                }}
                className="btn btn-secondary"
                style={{ padding: '0.65rem 1.25rem', fontSize: '0.9rem' }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteConfirm}
                className="btn btn-danger"
                style={{
                  padding: '0.65rem 1.4rem',
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                {isDeleting ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
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
