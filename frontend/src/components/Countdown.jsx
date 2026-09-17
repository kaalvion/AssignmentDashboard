import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

export default function Countdown({ deadline, compact = false }) {
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft(deadline));

  function calculateTimeLeft(targetDate) {
    const diff = new Date(targetDate).getTime() - new Date().getTime();
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, isPassed: true };

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / 1000 / 60) % 60);
    const seconds = Math.floor((diff / 1000) % 60);

    return { days, hours, minutes, seconds, isPassed: false };
  }

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft(deadline));
    }, 1000);
    return () => clearInterval(timer);
  }, [deadline]);

  if (timeLeft.isPassed) {
    return (
      <div style={{ color: 'var(--overdue)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
        <Clock size={14} /> Deadline Passed
      </div>
    );
  }

  if (compact) {
    if (timeLeft.days > 0) return <span>{timeLeft.days}d {timeLeft.hours}h remaining</span>;
    if (timeLeft.hours > 0) return <span>{timeLeft.hours}h {timeLeft.minutes}m remaining</span>;
    return <span>{timeLeft.minutes}m {timeLeft.seconds}s remaining</span>;
  }

  return (
    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
      {timeLeft.days > 0 && (
        <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.05)', padding: '0.35rem 0.65rem', borderRadius: '6px' }}>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary)' }}>{timeLeft.days}</div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>DAYS</div>
        </div>
      )}
      <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.05)', padding: '0.35rem 0.65rem', borderRadius: '6px' }}>
        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary)' }}>{timeLeft.hours}</div>
        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>HOURS</div>
      </div>
      <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.05)', padding: '0.35rem 0.65rem', borderRadius: '6px' }}>
        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary)' }}>{timeLeft.minutes}</div>
        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>MINS</div>
      </div>
      <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.05)', padding: '0.35rem 0.65rem', borderRadius: '6px' }}>
        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary)' }}>{timeLeft.seconds}</div>
        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>SECS</div>
      </div>
    </div>
  );
}
