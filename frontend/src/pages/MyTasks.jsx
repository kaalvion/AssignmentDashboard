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
  RefreshCw
} from 'lucide-react';

export default function MyTasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDeadline, setNewTaskDeadline] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/tasks');
      if (res && res.success) {
        setTasks(res.data || []);
      } else {
        setTasks([]);
      }
    } catch (err) {
      console.error('Error fetching personal tasks:', err);
      setError('Unable to load personal tasks.');
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

    try {
      setCreating(true);
      const payload = {
        title: newTaskTitle.trim(),
        deadline: newTaskDeadline ? new Date(newTaskDeadline).toISOString() : null
      };
      const res = await api.post('/tasks', payload);
      if (res && res.success && res.data) {
        setTasks(prev => [...prev, res.data]);
        setNewTaskTitle('');
        setNewTaskDeadline('');
      }
    } catch (err) {
      console.error('Error creating personal task:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleToggleTask = async (taskId, currentCompleted) => {
    try {
      const updatedComp = !currentCompleted;
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, isCompleted: updatedComp, is_completed: updatedComp ? 1 : 0 } : t));
      await api.put(`/tasks/${taskId}`, { isCompleted: updatedComp });
    } catch (err) {
      console.error('Error updating task status:', err);
      fetchTasks();
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      setTasks(prev => prev.filter(t => t.id !== taskId));
      await api.delete(`/tasks/${taskId}`);
    } catch (err) {
      console.error('Error deleting task:', err);
      fetchTasks();
    }
  };

  const completedCount = tasks.filter(t => t.isCompleted).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-text-primary)]">
          My Personal Tasks
        </h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
          Private checklist for your personal daily study planning.
        </p>
      </div>

      {/* Info notice about zero points */}
      <div className="p-3.5 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-xs text-[var(--color-text-secondary)] flex items-center gap-2.5">
        <Info className="w-4 h-4 text-[var(--color-primary)] shrink-0" />
        <span>
          Personal tasks are private to you for self-study and time management. No gamification points are awarded for completing personal tasks.
        </span>
      </div>

      {/* Add Task Form */}
      <form onSubmit={handleCreateTask} className="p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="Add a new personal task or study item..."
            className="flex-1 px-3.5 py-2 text-sm rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          />
          <input
            type="date"
            value={newTaskDeadline}
            onChange={(e) => setNewTaskDeadline(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          />
          <button
            type="submit"
            disabled={creating || !newTaskTitle.trim()}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-[var(--color-primary)] text-white hover:opacity-90 disabled:opacity-50 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Task</span>
          </button>
        </div>
      </form>

      {/* Task List */}
      {loading ? (
        <div className="p-8 text-center rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)]">
          <RefreshCw className="w-6 h-6 animate-spin text-[var(--color-primary)] mx-auto" />
          <p className="text-xs text-[var(--color-text-secondary)] mt-2">Loading tasks...</p>
        </div>
      ) : tasks.length === 0 ? (
        <div className="p-10 text-center rounded-2xl bg-[var(--color-surface)] border border-dashed border-[var(--color-border)] space-y-2">
          <CheckSquare className="w-8 h-8 text-[var(--color-text-tertiary)] mx-auto" />
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">No personal tasks yet</h3>
          <p className="text-xs text-[var(--color-text-secondary)]">
            Create tasks above to keep track of reading, revision, or personal projects.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] divide-y divide-[var(--color-border)] overflow-hidden shadow-sm">
          <div className="px-4 py-2.5 bg-[var(--color-surface-subtle)] text-xs font-medium text-[var(--color-text-secondary)] flex items-center justify-between">
            <span>Tasks ({tasks.length})</span>
            <span>{completedCount} of {tasks.length} completed</span>
          </div>

          {tasks.map(task => (
            <div
              key={task.id}
              className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-[var(--color-surface-subtle)]/50 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <button
                  type="button"
                  onClick={() => handleToggleTask(task.id, task.isCompleted)}
                  className="text-[var(--color-primary)] focus:outline-none shrink-0"
                >
                  {task.isCompleted ? (
                    <CheckSquare className="w-5 h-5 text-emerald-500" />
                  ) : (
                    <Square className="w-5 h-5 text-[var(--color-text-tertiary)] hover:text-[var(--color-primary)]" />
                  )}
                </button>

                <div className="min-w-0 flex-1">
                  <span className={`text-sm ${task.isCompleted ? 'line-through text-[var(--color-text-tertiary)]' : 'text-[var(--color-text-primary)] font-medium'}`}>
                    {task.title}
                  </span>
                  {task.deadline && (
                    <div className="flex items-center gap-1 text-[11px] text-[var(--color-text-tertiary)] mt-0.5">
                      <Clock className="w-3 h-3" />
                      <span>Due {new Date(task.deadline).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleDeleteTask(task.id)}
                title="Delete task"
                className="p-1.5 rounded-lg text-[var(--color-text-tertiary)] hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
