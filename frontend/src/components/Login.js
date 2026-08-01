import React, { useState } from 'react';
import axios from 'axios';

function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await axios.post(`${process.env.REACT_APP_API_URL}/api/auth/login`, {
        email, password
      });

      if (res.data.success) {
        localStorage.setItem('kavach_token', res.data.token);
        onLogin(res.data.officer);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Check your credentials.');
    }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0f1e 0%, #1a2035 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        background: '#1a2035',
        border: '1px solid #2d3748',
        borderRadius: '16px',
        padding: '40px',
        width: '420px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '70px', height: '70px',
            background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            fontSize: '32px'
          }}>🛡️</div>
          <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#3b82f6' }}>KAVACH</h1>
          <p style={{ color: '#64748b', fontSize: '14px', marginTop: '4px' }}>
            National Law Enforcement Coordination Platform
          </p>
          <div style={{
            display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '8px'
          }}>
            <span style={{ background: '#FF9933', width: '30px', height: '4px', borderRadius: '2px', display: 'block' }}></span>
            <span style={{ background: '#FFFFFF', width: '30px', height: '4px', borderRadius: '2px', display: 'block' }}></span>
            <span style={{ background: '#138808', width: '30px', height: '4px', borderRadius: '2px', display: 'block' }}></span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', color: '#94a3b8', fontSize: '13px', marginBottom: '6px' }}>
              Officer Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="officer@kavach.gov.in"
              required
              style={{
                width: '100%', padding: '12px 16px',
                background: '#0a0f1e', border: '1px solid #2d3748',
                borderRadius: '8px', color: 'white', fontSize: '14px',
                outline: 'none'
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', color: '#94a3b8', fontSize: '13px', marginBottom: '6px' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{
                width: '100%', padding: '12px 16px',
                background: '#0a0f1e', border: '1px solid #2d3748',
                borderRadius: '8px', color: 'white', fontSize: '14px',
                outline: 'none'
              }}
            />
          </div>

          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444',
              borderRadius: '8px', padding: '12px', marginBottom: '16px',
              color: '#ef4444', fontSize: '13px'
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '14px',
              background: loading ? '#2d3748' : 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
              color: 'white', border: 'none', borderRadius: '8px',
              fontSize: '16px', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s'
            }}
          >
            {loading ? 'Verifying...' : '🔐 Secure Login'}
          </button>
        </form>

        <p style={{ textAlign: 'center', color: '#475569', fontSize: '12px', marginTop: '24px' }}>
          Authorized Personnel Only • Ministry of Home Affairs
        </p>
      </div>
    </div>
  );
}

export default Login;