import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import Countdown from '../components/Countdown';
import { PriorityBadge, RiskBadge } from '../components/Badges';
import { 
  Plus, 
  Search, 
  Filter, 
  ArrowUpDown, 
  BookOpen, 
  ArrowRight,
  SlidersHorizontal
} from 'lucide-react';

export default function Assignments() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [assignments, setAssignments] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters state
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [subjectId, setSubjectId] = useState('');
  const [status, setStatus] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [sort, setSort] = useState('priority');

  const defaultSubjects = [
    { id: 1, name: 'Computer Networks', code: 'CS401' },
    { id: 2, name: 'Database Management Systems', code: 'CS402' },
    { id: 3, name: 'Web Technologies', code: 'CS403' },
    { id: 4, name: 'Software Engineering', code: 'CS404' },
    { id: 5, name: 'Operating Systems', code: 'CS405' }
  ];

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (subjectId) params.append('subject_id', subjectId);
      if (status) params.append('status', status);
      if (difficulty) params.append('difficulty', difficulty);
      if (sort) params.append('sort', sort);

      const [assignRes, subRes] = await Promise.all([
        api.get(`/assignments?${params.toString()}`).catch(() => null),
        api.get('/assignments/subjects').catch(() => null)
      ]);

      if (assignRes && assignRes.success && Array.isArray(assignRes.data)) {
        setAssignments(assignRes.data);
      }
      if (subRes && subRes.success && Array.isArray(subRes.data) && subRes.data.length > 0) {
        setSubjects(subRes.data);
      } else {
        setSubjects(defaultSubjects);
      }
    } catch (err) {
      console.error('Failed to fetch assignments:', err);
      setSubjects(defaultSubjects);
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    fetchAssignments();
  }, [search, subjectId, status, difficulty, sort]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }} className="animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700 }}>Assignment Management</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            Track, prioritize, and manage all your academic coursework
          </p>
        </div>
        <button onClick={() => navigate('/assignments/new')} className="btn btn-primary">
          <Plus size={18} /> Add Assignment
        </button>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search Box */}
          <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search by title or subject..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field"
              style={{ paddingLeft: '36px', height: '38px', fontSize: '0.85rem' }}
            />
          </div>

          {/* Subject Filter */}
          <select
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            className="input-field"
            style={{ width: '170px', height: '38px', fontSize: '0.85rem' }}
          >
            <option value="">All Subjects</option>
            {subjects.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="input-field"
            style={{ width: '150px', height: '38px', fontSize: '0.85rem' }}
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="OVERDUE">Overdue</option>
          </select>

          {/* Difficulty Filter */}
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className="input-field"
            style={{ width: '140px', height: '38px', fontSize: '0.85rem' }}
          >
            <option value="">All Difficulty</option>
            <option value="EASY">Easy</option>
            <option value="MEDIUM">Medium</option>
            <option value="HARD">Hard</option>
            <option value="EXTREME">Extreme</option>
          </select>

          {/* Sort By */}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="input-field"
            style={{ width: '160px', height: '38px', fontSize: '0.85rem' }}
          >
            <option value="priority">Sort: Highest Priority</option>
            <option value="deadline">Sort: Nearest Deadline</option>
            <option value="difficulty">Sort: Difficulty</option>
            <option value="progress">Sort: Progress</option>
          </select>
        </div>
      </div>

      {/* Assignments List */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div className="skeleton" style={{ height: '80px' }} />
          <div className="skeleton" style={{ height: '80px' }} />
          <div className="skeleton" style={{ height: '80px' }} />
        </div>
      ) : assignments.length === 0 ? (
        <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
          <BookOpen size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
          <h3>No assignments found</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', fontSize: '0.9rem' }}>
            Create your first assignment or adjust your search filters.
          </p>
          <button onClick={() => navigate('/assignments/new')} className="btn btn-primary" style={{ marginTop: '1.25rem' }}>
            <Plus size={16} /> Create Assignment
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {assignments.map(item => (
            <div
              key={item.id}
              className="glass-card glass-card-interactive"
              onClick={() => navigate(`/assignments/${item.id}`)}
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr 1fr 1fr auto',
                gap: '1rem',
                alignItems: 'center',
                padding: '1.15rem 1.35rem',
                cursor: 'pointer'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: item.subject_color || 'var(--primary)' }}>
                    {item.subject_name}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>• {item.difficulty}</span>
                </div>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>
                  {item.title}
                </div>
              </div>

              <div>
                <Countdown deadline={item.deadline} compact={true} />
              </div>

              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                <PriorityBadge level={item.priority_level} />
                <RiskBadge level={item.risk_level} />
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Progress: {item.progress}%</div>
                <div className="progress-bar-container" style={{ marginTop: '0.2rem', width: '100px' }}>
                  <div className="progress-bar-fill" style={{ width: `${item.progress}%` }} />
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  Est: {item.estimated_hours}h
                </div>
              </div>

              <ArrowRight size={18} style={{ color: 'var(--text-muted)' }} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
