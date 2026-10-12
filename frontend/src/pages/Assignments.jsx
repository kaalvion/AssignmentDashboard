import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import Countdown from '../components/Countdown';
import PdfUploadModal from '../components/PdfUploadModal';
import { 
  BookOpen, 
  UploadCloud, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Search, 
  Filter, 
  RefreshCw,
  UserCheck,
  Award,
  AlertTriangle
} from 'lucide-react';

export default function Assignments() {
  const [searchParams] = useSearchParams();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters state
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Upload modal state
  const [selectedAssignmentForUpload, setSelectedAssignmentForUpload] = useState(null);

  const fetchAssignments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (search) params.append('search', search);

      const res = await api.get(`/assignments?${params.toString()}`);
      if (res && res.success && Array.isArray(res.data)) {
        setAssignments(res.data);
      } else {
        throw new Error(res?.message || 'Failed to load assignments.');
      }
    } catch (err) {
      console.error('Error fetching assignments:', err);
      setError(err?.message || 'Failed to fetch assignments. Please check your connection.');
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  const handleUploadSuccess = () => {
    setSelectedAssignmentForUpload(null);
    fetchAssignments();
  };

  // Derive unique subject list for filter
  const subjects = Array.from(new Set(assignments.map(a => a.subject || a.subjectName || a.subject_name).filter(Boolean)));

  // Filtered assignments in memory
  const filteredAssignments = assignments.filter(a => {
    const subj = a.subject || a.subjectName || a.subject_name || '';
    if (selectedSubject && subj !== selectedSubject) return false;

    const subStatus = a.submissionStatus || 'NOT_SUBMITTED';
    const isPastDeadline = new Date(a.deadline) < new Date();

    if (selectedStatus === 'SUBMITTED' && subStatus !== 'ON_TIME' && subStatus !== 'LATE') return false;
    if (selectedStatus === 'PENDING' && (subStatus === 'ON_TIME' || subStatus === 'LATE' || isPastDeadline)) return false;
    if (selectedStatus === 'MISSED' && (subStatus === 'ON_TIME' || subStatus === 'LATE' || !isPastDeadline)) return false;

    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            Class Assignments
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '4px 0 0' }}>
            Coursework and laboratory assignments assigned by your faculty
          </p>
        </div>

        <button
          onClick={fetchAssignments}
          className="btn btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.55rem 1rem' }}
          title="Refresh assignment list"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '1rem',
        padding: '1.25rem',
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-color)'
      }}>
        <div style={{ flex: '1 1 240px', position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search by assignment title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field"
            style={{ paddingLeft: '36px', height: '40px', width: '100%', fontSize: '0.85rem' }}
          />
        </div>

        {subjects.length > 0 && (
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="input-field"
            style={{ height: '40px', minWidth: '180px', fontSize: '0.85rem' }}
          >
            <option value="">All Subjects</option>
            {subjects.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        )}

        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="input-field"
          style={{ height: '40px', minWidth: '180px', fontSize: '0.85rem' }}
        >
          <option value="">All Statuses</option>
          <option value="PENDING">Pending (Action Required)</option>
          <option value="SUBMITTED">Submitted (On-Time / Late)</option>
          <option value="MISSED">Missed Deadline</option>
        </select>
      </div>

      {/* Main Content States */}
      {loading ? (
        <div style={{
          textAlign: 'center',
          padding: '4rem 2rem',
          color: 'var(--text-secondary)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <RefreshCw size={36} className="animate-spin" style={{ color: 'var(--primary)' }} />
          <span>Loading class assignments...</span>
        </div>
      ) : error ? (
        <div style={{
          textAlign: 'center',
          padding: '3rem 2rem',
          background: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--text-primary)'
        }}>
          <AlertCircle size={40} style={{ color: '#ef4444', margin: '0 auto 1rem' }} />
          <h3 style={{ fontSize: '1.2rem', margin: 0, color: '#ef4444' }}>Unable to load assignments</h3>
          <p style={{ color: 'var(--text-secondary)', margin: '8px 0 1.5rem', fontSize: '0.9rem' }}>{error}</p>
          <button onClick={fetchAssignments} className="btn btn-primary" style={{ padding: '0.6rem 1.5rem' }}>
            Retry Connection
          </button>
        </div>
      ) : filteredAssignments.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '4rem 2rem',
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-color)',
          color: 'var(--text-secondary)'
        }}>
          <BookOpen size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 1rem' }} />
          <h3 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', margin: 0 }}>No Assignments Found</h3>
          <p style={{ maxWidth: '420px', margin: '8px auto 0', fontSize: '0.9rem' }}>
            {search || selectedSubject || selectedStatus
              ? 'No assignments match your current filter settings.'
              : 'There are currently no active assignments assigned to your enrolled class.'}
          </p>
        </div>
      ) : (
        /* Assignment Cards Grid */
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
          gap: '1.5rem'
        }}>
          {filteredAssignments.map((assignment) => {
            const isPastDeadline = new Date(assignment.deadline) < new Date();
            const subStatus = assignment.submissionStatus || 'NOT_SUBMITTED';
            const teacherName = assignment.teacherName || assignment.teacher_name || assignment.teacher || 'Faculty';
            const maxPoints = assignment.maxPoints || assignment.max_points || 50;

            let badgeConfig = {
              label: 'Pending',
              color: '#3b82f6',
              bg: 'rgba(59, 130, 246, 0.15)',
              pointsNote: `Max +${maxPoints} pts`
            };

            if (subStatus === 'ON_TIME') {
              badgeConfig = {
                label: 'Submitted (On-Time)',
                color: '#10b981',
                bg: 'rgba(16, 185, 129, 0.15)',
                pointsNote: `+${maxPoints} pts awarded`
              };
            } else if (subStatus === 'LATE') {
              badgeConfig = {
                label: 'Submitted (Late)',
                color: '#f59e0b',
                bg: 'rgba(245, 158, 11, 0.15)',
                pointsNote: `+${Math.round(maxPoints * 0.2)} pts awarded`
              };
            } else if (isPastDeadline) {
              badgeConfig = {
                label: 'Missed Deadline',
                color: '#ef4444',
                bg: 'rgba(239, 68, 68, 0.15)',
                pointsNote: `-${Math.round(maxPoints * 0.4)} pts penalty`
              };
            }

            const allowLate = assignment.allowLate !== undefined ? Boolean(assignment.allowLate) : Boolean(assignment.allow_late);
            const canUpload = (subStatus !== 'ON_TIME' && subStatus !== 'LATE' && (!isPastDeadline || allowLate)) ||
                              (!isPastDeadline && (subStatus === 'ON_TIME' || subStatus === 'LATE'));

            return (
              <div
                key={assignment.id}
                style={{
                  background: 'var(--bg-card)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-color)',
                  padding: '1.75rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: 'var(--shadow-card)',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                }}
              >
                <div>
                  {/* Top Subject & Status Badges */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      background: 'var(--bg-secondary)',
                      color: 'var(--primary)',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      border: '1px solid var(--border-color)'
                    }}>
                      {assignment.subject || assignment.subjectName || 'General'}
                    </span>

                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '20px',
                      background: badgeConfig.bg,
                      color: badgeConfig.color,
                      fontSize: '0.75rem',
                      fontWeight: 700
                    }}>
                      {badgeConfig.label}
                    </span>
                  </div>

                  {/* Title & Teacher */}
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 0.5rem', lineHeight: 1.3 }}>
                    {assignment.title}
                  </h3>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '1rem' }}>
                    <UserCheck size={14} />
                    <span>Faculty: <strong>{teacherName}</strong></span>
                  </div>

                  {assignment.description && (
                    <p style={{
                      fontSize: '0.85rem',
                      color: 'var(--text-secondary)',
                      margin: '0 0 1.25rem',
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      lineHeight: 1.5
                    }}>
                      {assignment.description}
                    </p>
                  )}

                  {/* Countdown Timer */}
                  <div style={{ marginBottom: '1.25rem' }}>
                    <Countdown deadline={assignment.deadline} />
                  </div>
                </div>

                {/* Footer Points & Action Buttons */}
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Points Evaluation:
                    </div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: badgeConfig.color }}>
                      {badgeConfig.pointsNote}
                    </div>
                  </div>

                  {canUpload ? (
                    <button
                      onClick={() => setSelectedAssignmentForUpload(assignment)}
                      className="btn btn-primary"
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        padding: '0.75rem',
                        fontWeight: 600,
                        fontSize: '0.9rem'
                      }}
                    >
                      <UploadCloud size={18} />
                      <span>
                        {subStatus === 'ON_TIME' || subStatus === 'LATE'
                          ? 'Resubmit PDF Document'
                          : (isPastDeadline && allowLate ? 'Submit Late PDF (+20% pts)' : 'Upload Submission PDF')}
                      </span>
                    </button>
                  ) : (
                    <div style={{
                      textAlign: 'center',
                      padding: '0.65rem',
                      background: 'rgba(255, 255, 255, 0.04)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.85rem',
                      color: 'var(--text-muted)',
                      fontWeight: 600
                    }}>
                      {isPastDeadline && !allowLate
                        ? 'Deadline Closed (Late Submissions Not Allowed)'
                        : 'Submission Completed'}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* PDF Upload Modal */}
      {selectedAssignmentForUpload && (
        <PdfUploadModal
          assignment={selectedAssignmentForUpload}
          isOpen={Boolean(selectedAssignmentForUpload)}
          onClose={() => setSelectedAssignmentForUpload(null)}
          onSuccess={handleUploadSuccess}
        />
      )}
    </div>
  );
}
