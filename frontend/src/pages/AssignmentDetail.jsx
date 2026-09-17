import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import Countdown from '../components/Countdown';
import { PriorityBadge, RiskBadge } from '../components/Badges';
import { 
  ArrowLeft, 
  CheckCircle, 
  Clock, 
  Trash2, 
  Plus, 
  CheckSquare, 
  Square, 
  Link as LinkIcon, 
  FileText, 
  AlertTriangle,
  UserCheck,
  Send
} from 'lucide-react';

export default function AssignmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Subtask Form
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [newSubtaskMins, setNewSubtaskMins] = useState(30);

  // Resource Form
  const [resourceTitle, setResourceTitle] = useState('');
  const [resourceType, setResourceType] = useState('URL');
  const [resourceUrl, setResourceUrl] = useState('');

  const fetchDetail = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/assignments/${id}`);
      if (res.success) {
        setAssignment(res.data);
      }
    } catch (err) {
      setError('Failed to fetch assignment details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const handleStatusChange = async (newStatus) => {
    try {
      const res = await api.put(`/assignments/${id}`, { status: newStatus });
      if (res.success) {
        fetchDetail();
      }
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const handleAddSubtask = async (e) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim()) return;
    try {
      const res = await api.post(`/assignments/${id}/subtasks`, {
        title: newSubtaskTitle.trim(),
        estimated_minutes: newSubtaskMins
      });
      if (res.success) {
        setNewSubtaskTitle('');
        fetchDetail();
      }
    } catch (err) {
      console.error('Error adding subtask:', err);
    }
  };

  const handleToggleSubtask = async (subtaskId, currentCompleted) => {
    try {
      const res = await api.put(`/assignments/subtasks/${subtaskId}`, {
        is_completed: currentCompleted ? 0 : 1
      });
      if (res.success) {
        fetchDetail();
      }
    } catch (err) {
      console.error('Error toggling subtask:', err);
    }
  };

  const handleDeleteSubtask = async (subtaskId) => {
    try {
      const res = await api.delete(`/assignments/subtasks/${subtaskId}`);
      if (res.success) {
        fetchDetail();
      }
    } catch (err) {
      console.error('Error deleting subtask:', err);
    }
  };

  const handleAddResource = async (e) => {
    e.preventDefault();
    if (!resourceTitle.trim() || !resourceUrl.trim()) return;
    try {
      const res = await api.post(`/assignments/${id}/resources`, {
        title: resourceTitle.trim(),
        type: resourceType,
        url_or_path: resourceUrl.trim()
      });
      if (res.success) {
        setResourceTitle('');
        setResourceUrl('');
        fetchDetail();
      }
    } catch (err) {
      console.error('Error adding resource:', err);
    }
  };

  const handleDeleteResource = async (resourceId) => {
    try {
      const res = await api.delete(`/assignments/resources/${resourceId}`);
      if (res.success) {
        fetchDetail();
      }
    } catch (err) {
      console.error('Error deleting resource:', err);
    }
  };

  const handleDeleteAssignment = async () => {
    if (window.confirm('Are you sure you want to delete this assignment?')) {
      try {
        const res = await api.delete(`/assignments/${id}`);
        if (res.success) {
          navigate('/assignments');
        }
      } catch (err) {
        console.error('Error deleting assignment:', err);
      }
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="skeleton" style={{ height: '50px', width: '200px' }} />
        <div className="skeleton" style={{ height: '240px', width: '100%' }} />
      </div>
    );
  }

  if (error || !assignment) {
    return (
      <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
        <AlertTriangle size={40} style={{ color: 'var(--overdue)', marginBottom: '1rem' }} />
        <h3>{error || 'Assignment not found'}</h3>
        <button onClick={() => navigate('/assignments')} className="btn btn-primary" style={{ marginTop: '1rem' }}>
          Back to Assignments
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }} className="animate-fade-in">
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <button onClick={() => navigate('/assignments')} className="btn btn-secondary" style={{ padding: '0.5rem 0.75rem' }}>
          <ArrowLeft size={18} /> Back
        </button>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {assignment.status !== 'COMPLETED' ? (
            <button onClick={() => handleStatusChange('COMPLETED')} className="btn btn-primary">
              <CheckCircle size={18} /> Mark Complete (+50 pts)
            </button>
          ) : (
            <button onClick={() => handleStatusChange('IN_PROGRESS')} className="btn btn-secondary">
              Reopen Assignment
            </button>
          )}
          <button onClick={handleDeleteAssignment} className="btn btn-danger">
            <Trash2 size={18} /> Delete
          </button>
        </div>
      </div>

      {/* Main Assignment Banner */}
      <div className="glass-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: assignment.subject_color || 'var(--primary)' }}>
                {assignment.subject_name} ({assignment.subject_code})
              </span>
              <PriorityBadge level={assignment.priority_level} />
              <RiskBadge level={assignment.risk_level} />
            </div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>{assignment.title}</h1>
          </div>

          <Countdown deadline={assignment.deadline} />
        </div>

        {assignment.description && (
          <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.6, background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: 'var(--radius-sm)' }}>
            {assignment.description}
          </p>
        )}

        {/* Info Matrix */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.25rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)' }}>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Difficulty</span>
            <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{assignment.difficulty}</div>
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Est. Completion Time</span>
            <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{assignment.estimated_hours} Hours</div>
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Teacher / Instructor</span>
            <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{assignment.teacher || 'Not specified'}</div>
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Submission Method</span>
            <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{assignment.submission_method || 'Not specified'}</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Overall Progress</span>
            <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--primary)' }}>{assignment.progress}%</span>
          </div>
          <div className="progress-bar-container" style={{ height: '10px' }}>
            <div className="progress-bar-fill" style={{ width: `${assignment.progress}%` }} />
          </div>
        </div>
      </div>

      {/* Two Column Section: Subtasks & Resources */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
        {/* Subtask Checklist */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckSquare size={20} style={{ color: 'var(--primary)' }} /> Subtasks Checklist
            </h2>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {assignment.subtasks ? assignment.subtasks.filter(s => s.is_completed).length : 0} / {assignment.subtasks ? assignment.subtasks.length : 0} completed
            </span>
          </div>

          <form onSubmit={handleAddSubtask} style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              placeholder="Add subtask title..."
              value={newSubtaskTitle}
              onChange={(e) => setNewSubtaskTitle(e.target.value)}
              className="input-field"
              style={{ height: '38px', fontSize: '0.85rem' }}
            />
            <input
              type="number"
              min="5"
              step="5"
              value={newSubtaskMins}
              onChange={(e) => setNewSubtaskMins(parseInt(e.target.value, 10))}
              className="input-field"
              style={{ width: '80px', height: '38px', fontSize: '0.85rem' }}
              title="Estimated minutes"
            />
            <button type="submit" className="btn btn-primary" style={{ padding: '0 0.75rem', height: '38px' }}>
              <Plus size={18} />
            </button>
          </form>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {!assignment.subtasks || assignment.subtasks.length === 0 ? (
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>
                No subtasks added yet. Add subtasks to break down your assignment.
              </div>
            ) : (
              assignment.subtasks.map(st => (
                <div
                  key={st.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.65rem 0.85rem',
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-color)'
                  }}
                >
                  <div
                    onClick={() => handleToggleSubtask(st.id, st.is_completed)}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', flex: 1 }}
                  >
                    {st.is_completed ? (
                      <CheckSquare size={18} style={{ color: 'var(--accent-emerald)' }} />
                    ) : (
                      <Square size={18} style={{ color: 'var(--text-muted)' }} />
                    )}
                    <span style={{
                      fontSize: '0.9rem',
                      textDecoration: st.is_completed ? 'line-through' : 'none',
                      color: st.is_completed ? 'var(--text-muted)' : 'var(--text-primary)'
                    }}>
                      {st.title}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>({st.estimated_minutes}m)</span>
                  </div>

                  <button onClick={() => handleDeleteSubtask(st.id)} style={{ color: 'var(--text-muted)', opacity: 0.7 }}>
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Resources & Links */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <LinkIcon size={20} style={{ color: 'var(--accent-cyan)' }} /> Attached Resources
          </h2>

          <form onSubmit={handleAddResource} style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                placeholder="Resource title (e.g. Lecture PDF)..."
                value={resourceTitle}
                onChange={(e) => setResourceTitle(e.target.value)}
                className="input-field"
                style={{ height: '38px', fontSize: '0.85rem' }}
              />
              <select
                value={resourceType}
                onChange={(e) => setResourceType(e.target.value)}
                className="input-field"
                style={{ width: '100px', height: '38px', fontSize: '0.85rem' }}
              >
                <option value="URL">URL</option>
                <option value="FILE">FILE</option>
                <option value="NOTE">NOTE</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                placeholder="URL or file path..."
                value={resourceUrl}
                onChange={(e) => setResourceUrl(e.target.value)}
                className="input-field"
                style={{ height: '38px', fontSize: '0.85rem' }}
              />
              <button type="submit" className="btn btn-primary" style={{ padding: '0 0.75rem', height: '38px' }}>
                <Plus size={18} />
              </button>
            </div>
          </form>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {!assignment.resources || assignment.resources.length === 0 ? (
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>
                No resources attached yet.
              </div>
            ) : (
              assignment.resources.map(res => (
                <div
                  key={res.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.65rem 0.85rem',
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-color)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <FileText size={16} style={{ color: 'var(--accent-cyan)' }} />
                    <div>
                      <a
                        href={res.url_or_path}
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-cyan)', textDecoration: 'underline' }}
                      >
                        {res.title}
                      </a>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{res.type} • {res.url_or_path}</div>
                    </div>
                  </div>

                  <button onClick={() => handleDeleteResource(res.id)} style={{ color: 'var(--text-muted)', opacity: 0.7 }}>
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
