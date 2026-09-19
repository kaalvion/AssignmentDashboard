import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Clock, 
  AlertTriangle,
  Flame,
  Info
} from 'lucide-react';

export default function AcademicCalendar() {
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateAssignments, setSelectedDateAssignments] = useState([]);
  const [selectedDateStr, setSelectedDateStr] = useState('');
  const [loading, setLoading] = useState(true);

  const defaultAssignments = [
    {
      id: 101,
      subject_name: 'Computer Networks',
      subject_color: 'var(--primary)',
      title: 'TCP/IP Socket Programming Project',
      difficulty: 'MEDIUM',
      deadline: new Date(Date.now() + 86400000 * 2).toISOString(),
      priority_level: 'HIGH',
      risk_level: 'MEDIUM',
      progress: 40,
      estimated_hours: 4.5
    },
    {
      id: 102,
      subject_name: 'Database Management',
      subject_color: 'var(--accent-purple)',
      title: 'Relational Schema Optimization & Indexing',
      difficulty: 'HARD',
      deadline: new Date(Date.now() + 86400000 * 4).toISOString(),
      priority_level: 'HIGH',
      risk_level: 'LOW',
      progress: 20,
      estimated_hours: 3.0
    },
    {
      id: 103,
      subject_name: 'Web Technologies',
      subject_color: 'var(--accent-cyan)',
      title: 'React & REST API Assignment',
      difficulty: 'EASY',
      deadline: new Date(Date.now() + 86400000 * 7).toISOString(),
      priority_level: 'MEDIUM',
      risk_level: 'LOW',
      progress: 60,
      estimated_hours: 2.0
    }
  ];

  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        setLoading(true);
        let localAssignments = [];
        try {
          localAssignments = JSON.parse(localStorage.getItem('user_created_assignments') || '[]');
        } catch (e) {}

        const res = await api.get('/assignments').catch(() => null);
        let fetchedItems = [];
        if (res && res.success && Array.isArray(res.data)) {
          fetchedItems = res.data;
        }

        const combined = [...localAssignments, ...fetchedItems];
        if (combined.length > 0) {
          setAssignments(combined);
        } else {
          setAssignments(defaultAssignments);
        }
      } catch (err) {
        let localAssignments = [];
        try {
          localAssignments = JSON.parse(localStorage.getItem('user_created_assignments') || '[]');
        } catch (e) {}
        setAssignments(localAssignments.length > 0 ? localAssignments : defaultAssignments);
      } finally {
        setLoading(false);
      }
    };
    fetchAssignments();
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Safe Date parsing helper to handle all ISO & custom string formats
  const parseDateStr = (dateInput) => {
    if (!dateInput) return null;
    let d = new Date(dateInput);
    if (!isNaN(d.getTime())) {
      const yearStr = d.getFullYear();
      const monthStr = String(d.getMonth() + 1).padStart(2, '0');
      const dayStr = String(d.getDate()).padStart(2, '0');
      return `${yearStr}-${monthStr}-${dayStr}`;
    }
    const match = String(dateInput).match(/^(\d{2})[-/](\d{2})[-/](\d{4})/);
    if (match) {
      const [_, day, monthVal, yearVal] = match;
      return `${yearVal}-${monthVal}-${day}`;
    }
    return null;
  };

  // Group assignments by YYYY-MM-DD
  const assignmentsByDate = {};
  assignments.forEach(a => {
    const formattedDate = parseDateStr(a.deadline);
    if (formattedDate) {
      if (!assignmentsByDate[formattedDate]) assignmentsByDate[formattedDate] = [];
      assignmentsByDate[formattedDate].push(a);
    }
  });


  // Calculate Workload Intensity for Heatmap
  const getWorkloadIntensity = (dateStr) => {
    const items = assignmentsByDate[dateStr] || [];
    if (items.length === 0) return 0;

    let totalHours = 0;
    items.forEach(i => totalHours += i.estimated_hours);

    if (totalHours >= 6 || items.length >= 3) return 3; // Extreme
    if (totalHours >= 3 || items.length >= 2) return 2; // High
    return 1; // Light
  };

  const handleDateClick = (dayNum) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    setSelectedDateStr(dateStr);
    setSelectedDateAssignments(assignmentsByDate[dateStr] || []);
  };

  const renderDays = () => {
    const calendarDays = [];

    // Empty cells before first day
    for (let i = 0; i < firstDayIndex; i++) {
      calendarDays.push(
        <div key={`empty-${i}`} style={{ background: 'transparent', padding: '0.75rem', minHeight: '80px' }} />
      );
    }

    // Days of month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayAssignments = assignmentsByDate[dateStr] || [];
      const intensity = getWorkloadIntensity(dateStr);

      const todayStr = new Date().toISOString().split('T')[0];
      const isToday = dateStr === todayStr;
      const isSelected = dateStr === selectedDateStr;

      // Heatmap Background Color
      let bgStyle = 'var(--bg-card)';
      if (intensity === 3) bgStyle = 'rgba(239, 68, 68, 0.2)';
      else if (intensity === 2) bgStyle = 'rgba(245, 158, 11, 0.2)';
      else if (intensity === 1) bgStyle = 'rgba(99, 102, 241, 0.2)';

      calendarDays.push(
        <div
          key={day}
          onClick={() => handleDateClick(day)}
          style={{
            background: isSelected ? 'var(--primary-hover)' : bgStyle,
            border: isToday ? '2px solid var(--primary)' : '1px solid var(--border-color)',
            borderRadius: 'var(--radius-sm)',
            padding: '0.6rem',
            minHeight: '90px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: isToday ? 700 : 500, fontSize: '0.85rem', color: isToday ? 'var(--primary)' : 'var(--text-primary)' }}>
              {day}
            </span>
            {intensity > 0 && (
              <span style={{
                fontSize: '0.65rem',
                fontWeight: 700,
                padding: '0.1rem 0.4rem',
                borderRadius: '4px',
                background: intensity === 3 ? 'var(--overdue)' : intensity === 2 ? 'var(--approaching)' : 'var(--primary)',
                color: 'white'
              }}>
                {intensity === 3 ? 'Heavy' : intensity === 2 ? 'Med' : 'Light'}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', marginTop: '0.3rem' }}>
            {dayAssignments.slice(0, 2).map(a => (
              <div
                key={a.id}
                style={{
                  fontSize: '0.65rem',
                  padding: '0.15rem 0.35rem',
                  borderRadius: '3px',
                  background: 'rgba(0,0,0,0.3)',
                  color: a.subject_color || 'white',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  fontWeight: 600
                }}
              >
                {a.title}
              </div>
            ))}
            {dayAssignments.length > 2 && (
              <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>+{dayAssignments.length - 2} more</span>
            )}
          </div>
        </div>
      );
    }

    return calendarDays;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }} className="animate-fade-in">
      {/* Calendar Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700 }}>Academic Calendar & Workload Heatmap</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            Visualize deadline intensity and upcoming workload density
          </p>
        </div>

        {/* Heatmap Legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--bg-secondary)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontSize: '0.75rem' }}>
          <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Workload Intensity:</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'rgba(99, 102, 241, 0.4)' }} /> Light
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'rgba(245, 158, 11, 0.4)' }} /> Medium
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'rgba(239, 68, 68, 0.4)' }} /> Heavy
          </div>
        </div>
      </div>

      {/* Month Navigator Controls */}
      <div className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem' }}>
        <button onClick={handlePrevMonth} className="btn btn-secondary">
          <ChevronLeft size={18} /> Prev Month
        </button>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
          {monthNames[month]} {year}
        </h2>
        <button onClick={handleNextMonth} className="btn btn-secondary">
          Next Month <ChevronRight size={18} />
        </button>
      </div>

      {/* Grid Calendar Layout */}
      <div className="glass-card" style={{ padding: '1.25rem' }}>
        {/* Days Header */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem', textAlign: 'center', fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
          <div>SUN</div>
          <div>MON</div>
          <div>TUE</div>
          <div>WED</div>
          <div>THU</div>
          <div>FRI</div>
          <div>SAT</div>
        </div>

        {/* Days Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem' }}>
          {renderDays()}
        </div>
      </div>

      {/* Selected Date Assignment Details Drawer */}
      {selectedDateStr && (
        <div className="glass-card animate-fade-in" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>
            Assignments Due on {new Date(selectedDateStr).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </h3>

          {selectedDateAssignments.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No assignments due on this date.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {selectedDateAssignments.map(a => (
                <div
                  key={a.id}
                  onClick={() => navigate(`/assignments/${a.id}`)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.85rem 1rem',
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-color)',
                    cursor: 'pointer'
                  }}
                >
                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: a.subject_color || 'var(--primary)' }}>
                      {a.subject_name}
                    </span>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{a.title}</div>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Est: {a.estimated_hours} Hours • {a.progress}%
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
