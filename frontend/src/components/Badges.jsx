import React from 'react';
import { ShieldAlert, ShieldCheck, AlertTriangle } from 'lucide-react';

export function PriorityBadge({ level }) {
  const map = {
    CRITICAL: 'badge-critical',
    HIGH: 'badge-high',
    MEDIUM: 'badge-medium',
    LOW: 'badge-low'
  };
  return <span className={`badge ${map[level] || 'badge-medium'}`}>{level}</span>;
}

export function RiskBadge({ level }) {
  const map = {
    SAFE: { class: 'badge-safe', icon: ShieldCheck },
    APPROACHING: { class: 'badge-approaching', icon: AlertTriangle },
    URGENT: { class: 'badge-urgent', icon: ShieldAlert },
    OVERDUE: { class: 'badge-overdue', icon: ShieldAlert }
  };
  const config = map[level] || map.SAFE;
  const Icon = config.icon;

  return (
    <span className={`badge ${config.class}`}>
      <Icon size={12} /> {level}
    </span>
  );
}
