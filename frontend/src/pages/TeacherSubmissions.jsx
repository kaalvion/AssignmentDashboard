import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import {
  ArrowLeft,
  FileText,
  ExternalLink,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Search,
  Filter,
  Download,
  Users,
  RefreshCw,
  Award,
  BookOpen
} from 'lucide-react';

export default function TeacherSubmissions() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Tracking which student's download is currently generating
  const [downloadingStudentId, setDownloadingStudentId] = useState(null);
  const [downloadError, setDownloadError] = useState('');

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get(`/teacher/assignments/${id}/submissions`);
      if (res && res.success) {
        setData(res.data);
      } else {
        setError(res?.message || 'Failed to load assignment submissions.');
      }
    } catch (err) {
      console.error('Error fetching submissions:', err);
      setError('Unable to fetch submissions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchSubmissions();
    }
  }, [id]);

  const handleViewPdf = async (studentId, studentName) => {
    try {
      setDownloadingStudentId(studentId);
      setDownloadError('');
      const res = await api.get(`/teacher/assignments/${id}/submissions/${studentId}/download-url`);
      if (res && res.success && res.data?.downloadUrl) {
        window.open(res.data.downloadUrl, '_blank', 'noopener,noreferrer');
      } else {
        setDownloadError(`Could not generate download link for ${studentName}: ${res?.message || 'Storage error'}`);
      }
    } catch (err) {
      console.error('Error fetching download URL:', err);
      setDownloadError(`Failed to download submission for ${studentName}. Ensure Firebase Storage is properly configured.`);
    } finally {
      setDownloadingStudentId(null);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'ON_TIME':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.25rem 0.65rem',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 700,
            background: 'rgba(16, 185, 129, 0.15)',
            color: 'var(--accent-emerald, #10b981)',
            border: '1px solid rgba(16, 185, 129, 0.3)'
          }}>
            <CheckCircle2 size={13} />
            <span>On Time</span>
          </span>
        );
      case 'LATE':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.25rem 0.65rem',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 700,
            background: 'rgba(245, 158, 11, 0.15)',
            color: 'var(--accent-amber, #f59e0b)',
            border: '1px solid rgba(245, 158, 11, 0.3)'
          }}>
            <Clock size={13} />
            <span>Late</span>
          </span>
        );
      case 'OVERDUE':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.25rem 0.65rem',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 700,
            background: 'rgba(244, 63, 94, 0.15)',
            color: 'var(--accent-rose, #f43f5e)',
            border: '1px solid rgba(244, 63, 94, 0.3)'
          }}>
            <AlertTriangle size={13} />
            <span>Overdue (Missed)</span>
          </span>
        );
      default:
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.25rem 0.65rem',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 700,
            background: 'var(--bg-secondary)',
            color: 'var(--text-muted)',
            border: '1px solid var(--border-color)'
          }}>
            <Clock size={13} />
            <span>Pending</span>
          </span>
        );
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(2)} MB`;
  };

  const submissions = data?.submissions || [];
  const filteredSubmissions = submissions.filter((sub) => {
    const matchesSearch =
      (sub.studentName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (sub.studentEmail || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (sub.fileName || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'ALL'
        ? true
        : statusFilter === 'SUBMITTED'
        ? sub.status === 'ON_TIME' || sub.status === 'LATE'
        : sub.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
      {/* Header Banner */}
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <Link
            to="/teacher/assignments"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.85rem',
              fontWeight: 600,
              color: 'var(--primary, #8b5cf6)',
              marginBottom: '4px'
            }}
          >
            <ArrowLeft size={16} />
            <span>Back to My Assignments</span>
          </Link>

          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
            {data?.title || 'Assignment Submissions'}
          </h1>

          {data?.targetClass && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <span style={{
                padding: '0.2rem 0.6rem',
                borderRadius: '9999px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                fontWeight: 600,
                color: 'var(--text-primary)'
              }}>
                {data.targetClass.course} • Sem {data.targetClass.semester} • Div {data.targetClass.division}
              </span>
              <span>•</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600, color: 'var(--accent-emerald, #10b981)' }}>
                <Users size={15} />
                {data.submittedCount || 0} of {data.totalStudents || 0} Submitted
              </span>
            </div>
          )}
        </div>

        <button
          onClick={fetchSubmissions}
          title="Refresh submissions"
          className="btn btn-secondary"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.65rem 1.1rem',
            fontSize: '0.875rem',
            borderRadius: 'var(--radius-sm, 8px)'
          }}
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          <span>Refresh Data</span>
        </button>
      </div>

      {downloadError && (
        <div style={{
          padding: '0.85rem 1.25rem',
          borderRadius: 'var(--radius-md, 14px)',
          background: 'rgba(244, 63, 94, 0.15)',
          border: '1px solid rgba(244, 63, 94, 0.3)',
          color: '#f87171',
          fontSize: '0.85rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={18} />
            <span>{downloadError}</span>
          </div>
          <button
            onClick={() => setDownloadError('')}
            style={{ fontSize: '0.8rem', color: '#f87171', fontWeight: 700, textDecoration: 'underline' }}
          >
            Dismiss
          </button>
        </div>
      )}

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
            placeholder="Search student name, email, or file name..."
            className="input-field"
            style={{
              paddingLeft: '2.6rem',
              height: '42px',
              fontSize: '0.9rem',
              borderRadius: 'var(--radius-sm, 8px)'
            }}
          />
        </div>

        {/* Dropdown Status Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Filter size={16} style={{ color: 'var(--text-muted)' }} />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field"
            style={{
              width: 'auto',
              minWidth: '180px',
              height: '42px',
              fontSize: '0.875rem',
              borderRadius: 'var(--radius-sm, 8px)',
              cursor: 'pointer'
            }}
          >
            <option value="ALL">All Students ({submissions.length})</option>
            <option value="SUBMITTED">All Submitted</option>
            <option value="ON_TIME">On Time Only</option>
            <option value="LATE">Late Only</option>
            <option value="OVERDUE">Overdue / Missing</option>
            <option value="NOT_SUBMITTED">Pending</option>
          </select>
        </div>
      </div>

      {/* Submissions List */}
      {loading ? (
        <div className="glass-card" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
          <RefreshCw size={36} className="animate-spin" style={{ color: 'var(--primary, #8b5cf6)', margin: '0 auto' }} />
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '1rem' }}>
            Fetching student submissions...
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
            Unable to Load Submissions
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '480px', margin: 0 }}>
            {error}
          </p>
          <button
            onClick={fetchSubmissions}
            className="btn btn-primary"
            style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <RefreshCw size={16} />
            <span>Try Again</span>
          </button>
        </div>
      ) : filteredSubmissions.length === 0 ? (
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
            No Matching Submissions
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '380px', margin: 0 }}>
            No enrolled students match your search or status filter. Try clearing your search parameters.
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
                  <th style={{ padding: '1rem 1.25rem' }}>Student</th>
                  <th style={{ padding: '1rem 1.25rem' }}>Status</th>
                  <th style={{ padding: '1rem 1.25rem' }}>Submitted At</th>
                  <th style={{ padding: '1rem 1.25rem' }}>Deliverable File</th>
                  <th style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubmissions.map((sub, idx) => {
                  const hasFile = Boolean(sub.fileName && (sub.status === 'ON_TIME' || sub.status === 'LATE'));
                  const isDownloading = downloadingStudentId === sub.studentId;
                  const initials = (sub.studentName || 'S')
                    .split(' ')
                    .map(n => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2);

                  return (
                    <tr
                      key={sub.studentId || idx}
                      style={{
                        borderBottom: '1px solid var(--border-color)',
                        transition: 'background 0.2s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      {/* Student info */}
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, var(--primary, #8b5cf6) 0%, var(--accent-purple, #d0bcff) 100%)',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '0.8rem',
                            flexShrink: 0
                          }}>
                            {initials}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.92rem' }}>
                              {sub.studentName}
                            </div>
                            {sub.studentEmail && (
                              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                {sub.studentEmail}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Status badge */}
                      <td style={{ padding: '1rem 1.25rem' }}>
                        {getStatusBadge(sub.status)}
                      </td>

                      {/* Submitted At */}
                      <td style={{ padding: '1rem 1.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        {sub.submittedAt ? (
                          new Date(sub.submittedAt).toLocaleString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>

                      {/* File Name */}
                      <td style={{ padding: '1rem 1.25rem' }}>
                        {hasFile ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <FileText size={16} style={{ color: 'var(--primary, #8b5cf6)', flexShrink: 0 }} />
                            <div style={{
                              maxWidth: '220px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              fontSize: '0.85rem',
                              fontWeight: 600,
                              color: 'var(--text-primary)'
                            }}>
                              {sub.fileName}
                            </div>
                            {sub.size && (
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                ({formatFileSize(sub.size)})
                              </span>
                            )}
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>No submission</span>
                        )}
                      </td>

                      {/* Action */}
                      <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                        {hasFile ? (
                          <button
                            type="button"
                            disabled={isDownloading}
                            onClick={() => handleViewPdf(sub.studentId, sub.studentName)}
                            className="btn btn-primary"
                            style={{
                              padding: '0.45rem 0.9rem',
                              fontSize: '0.8rem',
                              borderRadius: 'var(--radius-sm, 8px)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.4rem'
                            }}
                          >
                            {isDownloading ? (
                              <>
                                <RefreshCw size={13} className="animate-spin" />
                                <span>Loading...</span>
                              </>
                            ) : (
                              <>
                                <ExternalLink size={13} />
                                <span>View PDF</span>
                              </>
                            )}
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
