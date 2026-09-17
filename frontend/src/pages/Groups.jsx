import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Users, Plus, CheckSquare, User, Key, ArrowRight } from 'lucide-react';

export default function Groups() {
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modal / Form state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [joinCode, setJoinCode] = useState('');

  // Task form
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const res = await api.get('/groups');
      if (res.success && res.data.length > 0) {
        setGroups(res.data);
        fetchGroupDetail(res.data[0].id);
      }
    } catch (err) {
      console.error('Group fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchGroupDetail = async (id) => {
    try {
      const res = await api.get(`/groups/${id}`);
      if (res.success) {
        setSelectedGroup(res.data);
      }
    } catch (err) {
      console.error('Group detail error:', err);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!groupName.trim()) return;
    try {
      const res = await api.post('/groups', { name: groupName, description: groupDesc });
      if (res.success) {
        setGroupName('');
        setGroupDesc('');
        setShowCreateModal(false);
        fetchGroups();
      }
    } catch (err) {
      console.error('Error creating group:', err);
    }
  };

  const handleJoinGroup = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    try {
      const res = await api.post('/groups/join', { code: joinCode });
      if (res.success) {
        setJoinCode('');
        setShowJoinModal(false);
        fetchGroups();
      }
    } catch (err) {
      alert(err.message || 'Failed to join group.');
    }
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !selectedGroup) return;
    try {
      const res = await api.post(`/groups/${selectedGroup.id}/tasks`, { title: newTaskTitle });
      if (res.success) {
        setNewTaskTitle('');
        fetchGroupDetail(selectedGroup.id);
      }
    } catch (err) {
      console.error('Error adding task:', err);
    }
  };

  const handleToggleTaskStatus = async (taskId, currentStatus) => {
    const nextStatus = currentStatus === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
    try {
      await api.put(`/groups/tasks/${taskId}`, { status: nextStatus });
      fetchGroupDetail(selectedGroup.id);
    } catch (err) {
      console.error('Error updating task:', err);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }} className="animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700 }}>Study Groups & Team Assignments</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            Collaborate with peers, assign tasks, and track member progress
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={() => setShowJoinModal(true)} className="btn btn-secondary">
            <Key size={18} /> Join with Code
          </button>
          <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
            <Plus size={18} /> Create Group
          </button>
        </div>
      </div>

      {/* Main Two Column Area */}
      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '1.5rem' }}>
        {/* Left Groups List Sidebar */}
        <div className="glass-card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            Your Groups ({groups.length})
          </h3>

          {groups.length === 0 ? (
            <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              No groups joined. Create or join one to collaborate.
            </div>
          ) : (
            groups.map(g => (
              <div
                key={g.id}
                onClick={() => fetchGroupDetail(g.id)}
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  background: selectedGroup?.id === g.id ? 'var(--primary)' : 'rgba(255,255,255,0.03)',
                  color: selectedGroup?.id === g.id ? 'white' : 'var(--text-primary)',
                  cursor: 'pointer',
                  fontWeight: selectedGroup?.id === g.id ? 600 : 400
                }}
              >
                <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>{g.name}</div>
                <div style={{ fontSize: '0.7rem', opacity: 0.8, marginTop: '0.1rem' }}>
                  {g.member_count} Members • Code: {g.code}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Right Selected Group Workarea */}
        {selectedGroup ? (
          <div className="glass-card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600 }}>Invite Code: {selectedGroup.code}</span>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginTop: '0.1rem' }}>{selectedGroup.name}</h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{selectedGroup.description || 'No description'}</p>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Overall Group Progress</span>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--accent-emerald)' }}>{selectedGroup.groupProgress}%</div>
              </div>
            </div>

            {/* Members Row */}
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem' }}>Group Members</h3>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                {selectedGroup.members.map(m => (
                  <div
                    key={m.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.65rem',
                      background: 'rgba(255,255,255,0.04)',
                      padding: '0.5rem 0.85rem',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-color)'
                    }}
                  >
                    <User size={16} style={{ color: 'var(--primary)' }} />
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{m.name}</span>
                    <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem', background: 'rgba(99, 102, 241, 0.2)', color: 'var(--primary)', borderRadius: '4px' }}>
                      {m.role}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Group Tasks */}
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem' }}>Group Tasks Checklist</h3>
              
              <form onSubmit={handleAddTask} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <input
                  type="text"
                  placeholder="Assign task to group..."
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="input-field"
                  style={{ height: '38px', fontSize: '0.85rem' }}
                />
                <button type="submit" className="btn btn-primary" style={{ height: '38px', padding: '0 1rem' }}>
                  Add Task
                </button>
              </form>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {selectedGroup.tasks.length === 0 ? (
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No group tasks yet.</div>
                ) : (
                  selectedGroup.tasks.map(t => (
                    <div
                      key={t.id}
                      onClick={() => handleToggleTaskStatus(t.id, t.status)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.75rem 1rem',
                        background: 'rgba(255,255,255,0.03)',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-color)',
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <CheckSquare size={18} style={{ color: t.status === 'COMPLETED' ? 'var(--accent-emerald)' : 'var(--text-muted)' }} />
                        <span style={{ fontSize: '0.9rem', textDecoration: t.status === 'COMPLETED' ? 'line-through' : 'none' }}>
                          {t.title}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {t.assigned_user_name ? `Assigned: ${t.assigned_user_name}` : 'Unassigned'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="glass-card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Select a group from the left to view details and shared tasks.
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="glass-card" style={{ width: '400px', padding: '2rem' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem' }}>Create Study Group</h2>
            <form onSubmit={handleCreateGroup} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <input
                type="text"
                placeholder="Group Name (e.g. BCA DBMS Project)"
                required
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="input-field"
              />
              <textarea
                placeholder="Description..."
                rows={3}
                value={groupDesc}
                onChange={(e) => setGroupDesc(e.target.value)}
                className="input-field"
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Join Modal */}
      {showJoinModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="glass-card" style={{ width: '360px', padding: '2rem' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem' }}>Join Study Group</h2>
            <form onSubmit={handleJoinGroup} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <input
                type="text"
                placeholder="Enter Invite Code (e.g. GRP-BCA2026)"
                required
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                className="input-field"
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowJoinModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Join</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
