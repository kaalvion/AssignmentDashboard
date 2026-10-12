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
  RefreshCw
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
        // Open the signed download URL in a new browser tab
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
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>On Time</span>
          </span>
        );
      case 'LATE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Clock className="w-3.5 h-3.5" />
            <span>Late</span>
          </span>
        );
      case 'OVERDUE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-500 border border-rose-500/20">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Overdue (Missed)</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[var(--color-surface-subtle)] text-[var(--color-text-tertiary)] border border-[var(--color-border)]">
            <Clock className="w-3.5 h-3.5" />
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
    <div className="space-y-6">
      {/* Back button & Assignment summary */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <Link
            to="/teacher/assignments"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to My Assignments</span>
          </Link>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-text-primary)]">
            {data?.title || 'Assignment Submissions'}
          </h1>

          {data?.targetClass && (
            <div className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)] mt-1">
              <span className="px-2 py-0.5 rounded-full bg-[var(--color-surface-subtle)] border border-[var(--color-border)] font-medium">
                {data.targetClass.course} • Sem {data.targetClass.semester} • Div {data.targetClass.division}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                {data.submittedCount || 0} of {data.totalStudents || 0} Submitted
              </span>
            </div>
          )}
        </div>

        <button
          onClick={fetchSubmissions}
          title="Refresh submissions"
          className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)] self-start sm:self-auto transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {downloadError && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-500 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{downloadError}</span>
          </div>
          <button
            onClick={() => setDownloadError('')}
            className="text-xs hover:underline font-medium"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search student name, email, or file..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-[var(--color-text-tertiary)]" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 text-sm rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
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

      {/* Submissions Table / Cards */}
      {loading ? (
        <div className="p-8 text-center rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)]">
          <RefreshCw className="w-8 h-8 text-[var(--color-primary)] animate-spin mx-auto" />
          <p className="text-sm text-[var(--color-text-secondary)] mt-3">Loading student submissions...</p>
        </div>
      ) : error ? (
        <div className="p-8 text-center rounded-2xl bg-[var(--color-surface)] border border-rose-500/20 space-y-3">
          <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto" />
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Unable to load submissions</h3>
          <p className="text-sm text-[var(--color-text-secondary)] max-w-md mx-auto">{error}</p>
          <button
            onClick={fetchSubmissions}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-[var(--color-primary)] text-white hover:opacity-90"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Try Again</span>
          </button>
        </div>
      ) : filteredSubmissions.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-[var(--color-surface)] border border-dashed border-[var(--color-border)] space-y-2">
          <Users className="w-10 h-10 text-[var(--color-text-tertiary)] mx-auto" />
          <h3 className="text-base font-semibold text-[var(--color-text-primary)]">No matching student submissions</h3>
          <p className="text-xs text-[var(--color-text-secondary)]">
            Try adjusting your search query or status filter.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-subtle)] text-[11px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Submitted At</th>
                  <th className="py-3 px-4">File Name</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)] text-sm">
                {filteredSubmissions.map((sub) => {
                  const hasFile = Boolean(sub.fileName && (sub.status === 'ON_TIME' || sub.status === 'LATE'));
                  const isDownloading = downloadingStudentId === sub.studentId;

                  return (
                    <tr
                      key={sub.studentId}
                      className="hover:bg-[var(--color-surface-subtle)]/50 transition-colors"
                    >
                      {/* Student info */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-[var(--color-text-primary)]">
                          {sub.studentName}
                        </div>
                        {sub.studentEmail && (
                          <div className="text-xs text-[var(--color-text-tertiary)]">
                            {sub.studentEmail}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        {getStatusBadge(sub.status)}
                      </td>

                      {/* Submitted At */}
                      <td className="py-3 px-4 text-xs text-[var(--color-text-secondary)]">
                        {sub.submittedAt ? (
                          new Date(sub.submittedAt).toLocaleString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        ) : (
                          <span className="text-[var(--color-text-tertiary)]">—</span>
                        )}
                      </td>

                      {/* File Name */}
                      <td className="py-3 px-4">
                        {hasFile ? (
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-[var(--color-primary)] shrink-0" />
                            <div className="max-w-[200px] truncate text-xs font-medium text-[var(--color-text-primary)]">
                              {sub.fileName}
                            </div>
                            {sub.size && (
                              <span className="text-[11px] text-[var(--color-text-tertiary)]">
                                ({formatFileSize(sub.size)})
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-[var(--color-text-tertiary)]">—</span>
                        )}
                      </td>

                      {/* Action: View PDF */}
                      <td className="py-3 px-4 text-right">
                        {hasFile ? (
                          <button
                            type="button"
                            disabled={isDownloading}
                            onClick={() => handleViewPdf(sub.studentId, sub.studentName)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[var(--color-primary)] text-white hover:opacity-90 transition-opacity disabled:opacity-50 shadow-sm"
                          >
                            {isDownloading ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                <span>Loading...</span>
                              </>
                            ) : (
                              <>
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span>View PDF</span>
                              </>
                            )}
                          </button>
                        ) : (
                          <span className="text-xs text-[var(--color-text-tertiary)]">No PDF</span>
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
