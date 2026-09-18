import { ClerkProvider } from '@clerk/react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const rootElement = document.getElementById('root');

if (!PUBLISHABLE_KEY) {
  createRoot(rootElement).render(
    <StrictMode>
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#0f172a',
        color: '#f8fafc',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        textAlign: 'center'
      }}>
        <div style={{
          maxWidth: '520px',
          padding: '2.5rem',
          backgroundColor: '#1e293b',
          borderRadius: '16px',
          border: '1px solid #334155',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
        }}>
          <h2 style={{ color: '#f43f5e', marginTop: 0, marginBottom: '1rem' }}>Configuration Required</h2>
          <p style={{ color: '#94a3b8', lineHeight: 1.6, marginBottom: '1.5rem' }}>
            Missing Clerk Publishable Key (<code>VITE_CLERK_PUBLISHABLE_KEY</code>).
          </p>
          <p style={{ color: '#cbd5e1', fontSize: '0.95rem', lineHeight: 1.5, margin: 0 }}>
            Please set <strong>VITE_CLERK_PUBLISHABLE_KEY</strong> in your Vercel Environment Variables and redeploy.
          </p>
        </div>
      </div>
    </StrictMode>
  );
} else {
  createRoot(rootElement).render(
    <StrictMode>
      <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/">
        <App />
      </ClerkProvider>
    </StrictMode>,
  );
}