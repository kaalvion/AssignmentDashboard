import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Users, Plus, CheckSquare, User, Key, ArrowRight, X } from 'lucide-react';

export default function Groups() {
  const defaultGroups = [
    {
      id: 1,
      name: 'BCA DBMS Team Project',
      code: 'GRP-DBMS2026',
      description: 'Collaborative study group for ER Diagrams & SQL queries.',
      member_count: 4,
      groupProgress: 65,
      members: [
        { id: 101, name: 'Student (You)', role: 'LEADER' },
        { id: 102, name: 'Aarav Sharma', role: 'MEMBER' },
        { id: 103, name: 'Ananya Verma', role: 'MEMBER' },
        { id: 104, name: 'Rohan Gupta', role: 'MEMBER' }
      ],
      tasks: [
        { id: 201, title: 'Design ER Diagram Schema', status: 'COMPLETED', assigned_user_name: 'Student (You)' },
        { id: 202, title: 'Write SQL DDL Tables', status: 'COMPLETED', assigned_user_name: 'Aarav Sharma' },
        { id: 203, title: 'Implement Index Optimization', status: 'PENDING', assigned_user_name: 'Ananya Verma' }
      ]
    },
    {
      id: 2,
      name: 'Web Tech Hackathon Squad',
      code: 'GRP-WEB2026',
      description: 'Building fullstack React & REST API dashboard.',
      member_count: 3,
      groupProgress: 40,
      members: [
        { id: 101, name: 'Student (You)', role: 'MEMBER' },
        { id: 105, name: 'Priya Patel', role: 'LEADER' },
        { id: 106, name: 'Vikram Singh', role: 'MEMBER' }
      ],
      tasks: [
        { id: 204, title: 'Setup Vite & React Router', status: 'COMPLETED', assigned_user_name: 'Priya Patel' },
        { id: 205, title: 'Integrate Clerk Authentication', status: 'PENDING', assigned_user_name: 'Student (You)' }
      ]
    }
  ];

  const [groups, setGroups] = useState(defaultGroups);
  const [selectedGroup, setSelectedGroup] = useState(defaultGroups[0]);
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
      const res = await api.get('/groups').catch(() => null);
      if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
        setGroups(res.data);
        fetchGroupDetail(res.data[0].id);
      } else {
        setGroups(defaultGroups);
        setSelectedGroup(defaultGroups[0]);
      }
    } catch (err) {
      setGroups(defaultGroups);
      setSelectedGroup(defaultGroups[0]);
    } finally {
      setLoading(false);
    }
  };

  const fetchGroupDetail = async (id) => {
    try {
      const res = await api.get(`/groups/${id}`).catch(() => null);
      if (res && res.success && res.data) {
        setSelectedGroup(res.data);
      } else {
        const found = groups.find(g => g.id === id) || defaultGroups[0];
        setSelectedGroup(found);
      }
    } catch (err) {
      const found = groups.find(g => g.id === id) || defaultGroups[0];
      setSelectedGroup(found);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!groupName.trim()) return;

    const newGrp = {
      id: Date.now(),
      name: groupName,
      code: `GRP-${groupName.slice(0, 4).toUpperCase()}${Math.floor(100 + Math.random() * 900)}`,
      description: groupDesc || 'Custom team study group.',
      member_count: 1,
      groupProgress: 0,
      members: [
        { id: 101, name: 'Student (You)', role: 'LEADER' }
      ],
      tasks: []
    };

    try {
      await api.post('/groups', { name: groupName, description: groupDesc }).catch(() => null);
    } catch (err) {}

    const updated = [newGrp, ...groups];
    setGroups(updated);
    setSelectedGroup(newGrp);
    setGroupName('');
    setGroupDesc('');
    setShowCreateModal(false);
  };

  const handleJoinGroup = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    try {
      await api.post('/groups/join', { code: joinCode }).catch(() => null);
    } catch (err) {}

    const joinedGrp = {
      id: Date.now(),
      name: `Joined Group (${joinCode.toUpperCase()})`,
      code: joinCode.toUpperCase(),
      description: 'Collaborative team coursework.',
      member_count: 2,
      groupProgress: 25,
      members: [
        { id: 101, name: 'Student (You)', role: 'MEMBER' },
        { id: 201, name: 'Group Admin', role: 'LEADER' }
      ],
      tasks: []
    };

    const updated = [joinedGrp, ...groups];
    setGroups(updated);
    setSelectedGroup(joinedGrp);
    setJoinCode('');
    setShowJoinModal(false);
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !selectedGroup) return;

    const newTaskObj = {
      id: Date.now(),
      title: newTaskTitle,
      status: 'PENDING',
      assigned_user_name: 'Student (You)'
    };

    try {
      await api.post(`/groups/${selectedGroup.id}/tasks`, { title: newTaskTitle }).catch(() => null);
    } catch (err) {}

    const updatedGroup = {
      ...selectedGroup,
      tasks: [...(selectedGroup.tasks || []), newTaskObj]
    };

    setSelectedGroup(updatedGroup);
    setGroups(prev => prev.map(g => g.id === selectedGroup.id ? updatedGroup : g));
    setNewTaskTitle('');
  };

  const handleToggleTaskStatus = async (taskId, currentStatus) => {
    const nextStatus = currentStatus === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
    try {
      await api.put(`/groups/tasks/${taskId}`, { status: nextStatus }).catch(() => null);
    } catch (err) {}

    const updatedTasks = (selectedGroup.tasks || []).map(t =>
      t.id === taskId ? { ...t, status: nextStatus } : t
    );

    const completedCount = updatedTasks.filter(t => t.status === 'COMPLETED').length;
    const groupProgress = updatedTasks.length > 0 ? Math.round((completedCount / updatedTasks.length) * 100) : 0;

    const updatedGroup = { ...selectedGroup, tasks: updatedTasks, groupProgress };
    setSelectedGroup(updatedGroup);
    setGroups(prev => prev.map(g => g.id === selectedGroup.id ? updatedGroup : g));
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
        <div className="glass-card" style={{ padding: '1.15rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
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
                  padding: '0.85rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  background: selectedGroup?.id === g.id ? 'var(--primary)' : 'var(--bg-secondary)',
                  color: selectedGroup?.id === g.id ? 'white' : 'var(--text-primary)',
                  border: selectedGroup?.id === g.id ? '1px solid var(--primary-hover)' : '1px solid var(--border-color)',
                  cursor: 'pointer',
                  fontWeight: selectedGroup?.id === g.id ? 600 : 400,
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>{g.name}</div>
                <div style={{ fontSize: '0.75rem', opacity: 0.85, marginTop: '0.2rem' }}>
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
                      background: 'var(--bg-secondary)',
                      padding: '0.5rem 0.85rem',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-color)'
                    }}
                  >
                    <User size={16} style={{ color: 'var(--primary)' }} />
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{m.name}</span>
                    <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem', background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: '4px', fontWeight: 700 }}>
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
                {(!selectedGroup.tasks || selectedGroup.tasks.length === 0) ? (
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No group tasks yet. Add one above!</div>
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
                        background: 'var(--bg-secondary)',
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
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1.5rem'
        }}>
          <div className="glass-card animate-fade-in" style={{
            width: '100%',
            maxWidth: '460px',
            padding: '1.75rem',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-highlight)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-md)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Create Study Group</h2>
              <button onClick={() => setShowCreateModal(false)} className="btn-secondary" style={{ padding: '0.4rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateGroup} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                  Group Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. BCA DBMS Project Squad"
                  required
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="input-field"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                  Description
                </label>
                <textarea
                  placeholder="Collaborative tasks and milestone goals..."
                  rows={3}
                  value={groupDesc}
                  onChange={(e) => setGroupDesc(e.target.value)}
                  className="input-field"
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Create Group</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Join Modal */}
      {showJoinModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1.5rem'
        }}>
          <div className="glass-card animate-fade-in" style={{
            width: '100%',
            maxWidth: '420px',
            padding: '1.75rem',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-highlight)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-md)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Join Study Group</h2>
              <button onClick={() => setShowJoinModal(false)} className="btn-secondary" style={{ padding: '0.4rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleJoinGroup} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                  Invite Code *
                </label>
                <input
                  type="text"
                  placeholder="Enter Code (e.g. GRP-DBMS2026)"
                  required
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  className="input-field"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowJoinModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Join Group</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

