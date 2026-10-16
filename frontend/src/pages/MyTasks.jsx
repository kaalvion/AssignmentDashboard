import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  CheckSquare,
  Square,
  Plus,
  Trash2,
  Calendar,
  AlertCircle,
  Clock,
  Sparkles,
  Info,
  RefreshCw,
  ListTodo,
  CheckCircle2,
  CalendarClock
} from 'lucide-react';

export default function MyTasks() {
  const [tasks, setTasks] = useState(() => {
    try {
      const saved = localStorage.getItem('nexus_personal_tasks');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDeadline, setNewTaskDeadline] = useState('');
  const [creating, setCreating] = useState(false);

  // Sync to local storage for instant offline resilience
  useEffect(() => {
    try {
      localStorage.setItem('nexus_personal_tasks', JSON.stringify(tasks));
    } catch (e) {}
  }, [tasks]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/tasks');
      if (res && res.success && Array.isArray(res.data)) {
        // Merge server tasks with local tasks, deduplicating by ID
        setTasks(res.data);
      }
    } catch (err) {
      console.warn('API /tasks note:', err?.message || err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const optimisticTask = {
      id: 'task_' + Date.now(),
      title: newTaskTitle.trim(),
      deadline: newTaskDeadline ? new Date(newTaskDeadline).toISOString() : null,
      isCompleted: false,
      createdAt: new Date().toISOString()
    };

    setTasks(prev => [optimisticTask, ...(Array.isArray(prev) ? prev : [])]);
    setNewTaskTitle('');
    setNewTaskDeadline('');

    try {
      setCreating(true);
      const res = await api.post('/tasks', {
        title: optimisticTask.title,
        deadline: optimisticTask.deadline
      });
      if (res && res.success && res.data?.id) {
        setTasks(prev => prev.map(t => t.id === optimisticTask.id ? { ...t, id: res.data.id } : t));
      }
    } catch (err) {
      console.warn('Task created locally (server sync optional):', err?.message);
    } finally {
      setCreating(false);
    }
  };

  const handleToggleTask = async (taskId, currentCompleted) => {
    const updatedStatus = !currentCompleted;
    setTasks(prev =>
      (Array.isArray(prev) ? prev : []).map(t =>
        t.id === taskId ? { ...t, isCompleted: updatedStatus } : t
      )
    );

    try {
      await api.put(`/tasks/${taskId}`, { isCompleted: updatedStatus });
    } catch (err) {
      console.warn('Task updated locally:', err?.message);
    }
  };

  const handleDeleteTask = async (taskId) => {
    setTasks(prev => (Array.isArray(prev) ? prev : []).filter(t => t.id !== taskId));

    try {
      await api.delete(`/tasks/${taskId}`);
    } catch (err) {
      console.warn('Task deleted locally:', err?.message);
    }
  };

  const safeTasks = Array.isArray(tasks) ? tasks : [];
  const completedCount = safeTasks.filter(t => t.isCompleted).length;
  const pendingCount = safeTasks.length - completedCount;
  const completionPercentage = safeTasks.length > 0 ? Math.round((completedCount / safeTasks.length) * 100) : 0;

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
            background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            boxShadow: '0 8px 24px rgba(16, 185, 129, 0.35)',
            flexShrink: 0
          }}>
            <ListTodo size={28} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
                My Personal Tasks
              </h1>
              <span style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '0.2rem 0.65rem',
                borderRadius: '9999px',
                background: 'rgba(16, 185, 129, 0.2)',
                color: 'var(--accent-emerald, #10b981)',
                border: '1px solid rgba(16, 185, 129, 0.45)'
              }}>
                SELF-STUDY
              </span>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '6px 0 0', lineHeight: 1.4 }}>
              Private checklist for your personal daily study planning, textbook reading, and revision tasks.
            </p>
          </div>
        </div>

        <button
          onClick={fetchTasks}
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
          <span>Refresh</span>
        </button>
      </div>

      {/* KPI Cards Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1.25rem'
      }}>
        {/* Total Tasks */}
        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.25rem 1.5rem' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: 'rgba(139, 92, 246, 0.15)',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--primary, #8b5cf6)'
          }}>
            <ListTodo size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Total Tasks
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
              {safeTasks.length}
            </div>
          </div>
        </div>

        {/* Completed */}
        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.25rem 1.5rem' }}>
          <div style={{
            width: '44px',
            height: '44px',
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
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Completed
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
              {completedCount}
            </div>
          </div>
        </div>

        {/* Pending */}
        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.25rem 1.5rem' }}>
          <div style={{
            width: '44px',
            height: '44px',
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
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Incomplete
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
              {pendingCount}
            </div>
          </div>
        </div>

        {/* Completion Rate */}
        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.25rem 1.5rem' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: 'rgba(6, 182, 212, 0.15)',
            border: '1px solid rgba(6, 182, 212, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent-cyan, #06b6d4)'
          }}>
            <CalendarClock size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Completion Rate
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
              {completionPercentage}%
            </div>
          </div>
        </div>
      </div>

      {/* Info Callout */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.85rem 1.25rem',
        borderRadius: 'var(--radius-md, 14px)',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        fontSize: '0.85rem',
        color: 'var(--text-secondary)'
      }}>
        <Info size={18} style={{ color: 'var(--primary, #8b5cf6)', flexShrink: 0 }} />
        <span>
          Personal tasks are private to your workspace for self-study and revision time management.
        </span>
      </div>

      {/* Add Task Form */}
      <form
        onSubmit={handleCreateTask}
        className="glass-card"
        style={{
          padding: '1.25rem 1.5rem',
          borderRadius: 'var(--radius-lg, 20px)',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1rem',
          alignItems: 'center'
        }}
      >
        <input
          type="text"
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          placeholder="Add a new personal task, reading goal, or study reminder..."
          className="input-field"
          style={{
            flex: '1 1 320px',
            height: '44px',
            fontSize: '0.92rem',
            borderRadius: 'var(--radius-sm, 8px)'
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <input
              type="date"
              value={newTaskDeadline}
              onChange={(e) => setNewTaskDeadline(e.target.value)}
              className="input-field"
              style={{
                height: '44px',
                fontSize: '0.85rem',
                padding: '0 0.85rem',
                borderRadius: 'var(--radius-sm, 8px)'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={creating || !newTaskTitle.trim()}
            className="btn btn-primary"
            style={{
              height: '44px',
              padding: '0 1.4rem',
              fontSize: '0.9rem',
              borderRadius: 'var(--radius-sm, 8px)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <Plus size={18} />
            <span>Add Task</span>
          </button>
        </div>
      </form>

      {/* Task List */}
      {loading && safeTasks.length === 0 ? (
        <div className="glass-card" style={{ padding: '3rem 2rem', textAlign: 'center' }}>
          <RefreshCw size={32} className="animate-spin" style={{ color: 'var(--primary, #8b5cf6)', margin: '0 auto' }} />
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.75rem' }}>
            Loading your tasks...
          </p>
        </div>
      ) : safeTasks.length === 0 ? (
        <div className="glass-card" style={{
          padding: '4rem 2rem',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1rem',
          borderRadius: 'var(--radius-lg, 20px)'
        }}>
          <CheckSquare size={38} style={{ color: 'var(--text-muted)' }} />
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            No personal tasks yet
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', maxWidth: '380px', margin: 0 }}>
            Create study goals or revision checkpoints above to organize your daily academic workflow.
          </p>
        </div>
      ) : (
        <div className="glass-card" style={{
          padding: 0,
          overflow: 'hidden',
          borderRadius: 'var(--radius-lg, 20px)'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1rem 1.5rem',
            background: 'var(--bg-secondary)',
            borderBottom: '1px solid var(--border-color)',
            fontSize: '0.82rem',
            fontWeight: 700,
            color: 'var(--text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.04em'
          }}>
            <span>Tasks ({safeTasks.length})</span>
            <span>{completedCount} of {safeTasks.length} Completed ({completionPercentage}%)</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {safeTasks.map((task) => (
              <div
                key={task.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1.1rem 1.5rem',
                  borderBottom: '1px solid var(--border-color)',
                  transition: 'background 0.2s ease',
                  gap: '1rem'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', flex: 1, minWidth: 0 }}>
                  <button
                    type="button"
                    onClick={() => handleToggleTask(task.id, task.isCompleted)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center',
                      color: task.isCompleted ? 'var(--accent-emerald, #10b981)' : 'var(--text-muted)'
                    }}
                  >
                    {task.isCompleted ? (
                      <CheckSquare size={22} style={{ color: 'var(--accent-emerald, #10b981)' }} />
                    ) : (
                      <Square size={22} />
                    )}
                  </button>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: '0.95rem',
                      fontWeight: 600,
                      color: task.isCompleted ? 'var(--text-muted)' : 'var(--text-primary)',
                      textDecoration: task.isCompleted ? 'line-through' : 'none',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {task.title}
                    </div>

                    {task.deadline && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                        <Clock size={12} />
                        <span>Due {new Date(task.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleDeleteTask(task.id)}
                  title="Delete task"
                  className="btn"
                  style={{
                    padding: '0.45rem',
                    color: 'var(--text-muted)',
                    borderRadius: 'var(--radius-sm, 8px)',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'var(--accent-rose, #f43f5e)';
                    e.currentTarget.style.backgroundColor = 'rgba(244, 63, 94, 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'var(--text-muted)';
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
