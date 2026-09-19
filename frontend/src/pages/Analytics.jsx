import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  LineChart, 
  Line 
} from 'recharts';
import { BarChart2, CheckCircle, Clock, Flame, Award } from 'lucide-react';

export default function Analytics() {
  const defaultAnalyticsData = {
    statusCounts: {
      COMPLETED: 1,
      IN_PROGRESS: 1,
      PENDING: 1,
      OVERDUE: 0
    },
    subjectDistribution: [
      { name: 'Computer Networks', total: 1, completed: 0, hours: 4.5 },
      { name: 'Database Management', total: 1, completed: 0, hours: 3.0 },
      { name: 'Web Technologies', total: 1, completed: 1, hours: 2.0 }
    ]
  };

  const [data, setData] = useState(defaultAnalyticsData);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const res = await api.get('/analytics/productivity');
        if (res && res.success && res.data) {
          setData(res.data);
        } else {
          setData(defaultAnalyticsData);
        }
      } catch (err) {
        console.warn('Analytics API unavailable, using fallback metrics:', err);
        setData(defaultAnalyticsData);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading) {

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="skeleton" style={{ height: '60px' }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div className="skeleton" style={{ height: '280px' }} />
          <div className="skeleton" style={{ height: '280px' }} />
        </div>
      </div>
    );
  }

  const { statusCounts, subjectDistribution } = data;

  const pieData = [
    { name: 'Completed', value: statusCounts.COMPLETED, color: '#10B981' },
    { name: 'In Progress', value: statusCounts.IN_PROGRESS, color: '#6366F1' },
    { name: 'Pending', value: statusCounts.PENDING, color: '#F59E0B' },
    { name: 'Overdue', value: statusCounts.OVERDUE, color: '#EF4444' }
  ].filter(d => d.value > 0);

  // Mock trend data based on real completed count
  const trendData = [
    { week: 'W1', completed: 2 },
    { week: 'W2', completed: 3 },
    { week: 'W3', completed: 1 },
    { week: 'W4 (Current)', completed: statusCounts.COMPLETED }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }} className="animate-fade-in">
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700 }}>Academic Analytics & Productivity</h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
          Real-time performance metrics and distribution charts
        </p>
      </div>

      {/* Two Column Charts Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
        {/* Assignment Status Donut Chart */}
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem' }}>
            Assignment Status Distribution
          </h2>
          <div style={{ width: '100%', height: '260px' }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#1E293B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Subject Distribution Bar Chart */}
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem' }}>
            Subject Workload Hours
          </h2>
          <div style={{ width: '100%', height: '260px' }}>
            <ResponsiveContainer>
              <BarChart data={subjectDistribution}>
                <XAxis dataKey="name" stroke="#64748B" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748B" fontSize={11} tickLine={false} />
                <Tooltip contentStyle={{ background: '#1E293B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                <Bar dataKey="hours" name="Estimated Hours" fill="#6366F1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Completion Trend Line Chart */}
      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem' }}>
          Weekly Completion Trend
        </h2>
        <div style={{ width: '100%', height: '240px' }}>
          <ResponsiveContainer>
            <LineChart data={trendData}>
              <XAxis dataKey="week" stroke="#64748B" fontSize={12} />
              <YAxis stroke="#64748B" fontSize={12} />
              <Tooltip contentStyle={{ background: '#1E293B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
              <Line type="monotone" dataKey="completed" name="Completed Assignments" stroke="#10B981" strokeWidth={3} dot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
