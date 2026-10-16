import React, { useState } from 'react';
import { ShieldCheck, X, AlertCircle } from 'lucide-react';
import { API_BASE } from '../config';

export default function AdminLoginModal({ isOpen, onClose, onAdminLoginSuccess }) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!username || !password) {
      setError('Please provide administrator username and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/admin-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Invalid administrator credentials.');
      }

      if (data.token) {
        localStorage.setItem('foodai_token', data.token);
        localStorage.setItem('foodai_role', 'admin');
      }

      if (onAdminLoginSuccess) {
        onAdminLoginSuccess(data.token);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 110,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(0, 0, 0, 0.7)',
      backdropFilter: 'blur(5px)',
      padding: '20px'
    }}>
      <div className="glass-card" style={{
        width: '100%',
        maxWidth: '420px',
        padding: '28px',
        borderRadius: '16px',
        background: '#0f172a',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        position: 'relative',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.8)'
      }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'transparent',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer'
          }}
        >
          <X size={18} />
        </button>

        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'rgba(56, 189, 248, 0.15)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '10px'
          }}>
            <ShieldCheck size={24} color="#38bdf8" />
          </div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc', margin: '0 0 4px 0' }}>
            Administrator Verification
          </h3>
          <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>
            Enter administrator credentials to access the Admin Panel.
          </p>
        </div>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#fca5a5',
            padding: '10px 12px',
            borderRadius: '8px',
            fontSize: '0.8rem',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertCircle size={15} color="#ef4444" style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>
              Admin Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              style={{
                width: '100%',
                background: '#1e293b',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '8px',
                color: '#f8fafc',
                padding: '10px 12px',
                fontSize: '0.88rem',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>
              Admin Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              required
              style={{
                width: '100%',
                background: '#1e293b',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '8px',
                color: '#f8fafc',
                padding: '10px 12px',
                fontSize: '0.88rem',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
            <span style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
              Default development password: <code>admin123</code>
            </span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{
              width: '100%',
              justifyContent: 'center',
              padding: '11px',
              fontWeight: 800,
              fontSize: '0.9rem',
              background: 'linear-gradient(135deg, #0284c7, #0369a1)',
              marginTop: '4px'
            }}
          >
            {loading ? 'Verifying...' : 'Verify & Enter Admin Panel'}
          </button>
        </form>
      </div>
    </div>
  );
}
