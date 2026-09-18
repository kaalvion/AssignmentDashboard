import React from 'react';
import { SignUp, useAuth } from '@clerk/react';
import { Navigate } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';

export default function Register() {
  const { isSignedIn, isLoaded } = useAuth();

  if (isLoaded && isSignedIn) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
      background: 'radial-gradient(circle at top left, rgba(139, 92, 246, 0.15), transparent 40%), var(--bg-primary)'
    }}>
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <div style={{
          width: '54px',
          height: '54px',
          borderRadius: '14px',
          background: 'linear-gradient(135deg, var(--accent-purple) 0%, var(--primary) 100%)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          marginBottom: '0.75rem',
          boxShadow: 'var(--shadow-glow)'
        }}>
          <GraduationCap size={30} />
        </div>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-primary)' }}>Student Registration</h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
          Create your account to start managing academic deadlines
        </p>
      </div>

      <SignUp path="/register" routing="path" signInUrl="/login" fallbackRedirectUrl="/dashboard" />
    </div>
  );
}


