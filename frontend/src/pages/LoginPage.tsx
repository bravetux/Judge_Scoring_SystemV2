import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/api';
import '../styles/Auth.css';

export function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await apiService.login(username, password);
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('userId', response.data.userId);
      localStorage.setItem('role', response.data.role);

      if (response.data.role === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/judge/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <aside className="auth-stage">
        <div className="stage-ornament stage-ornament-tl" aria-hidden />
        <div className="stage-ornament stage-ornament-br" aria-hidden />

        <div className="stage-content">
          <div className="stage-eyebrow">
            <span className="live-dot" aria-hidden />
            <span>Anno MMXXVI</span>
            <span className="sep">·</span>
            <span>Competition Live</span>
          </div>

          <h1 className="stage-title">
            <span className="line">Dance</span>
            <span className="line"><em>Judge<span className="ornament">.</span></em></span>
          </h1>

          <p className="stage-verse">
            A live adjudication ledger<br />
            for dance competitions, performed<br />
            on paper and on&nbsp;stage.
          </p>

          <div className="stage-footer">
            <span>Administrator</span>
            <span className="divider" aria-hidden />
            <span>Judge</span>
            <span className="divider" aria-hidden />
            <span>Private Access</span>
          </div>
        </div>
      </aside>

      <section className="auth-panel">
        <div className="auth-card">
          <div className="auth-eyebrow">
            <span>Enter</span>
            <span className="auth-eyebrow-rule" aria-hidden />
            <span>Session</span>
          </div>

          <h2 className="auth-title">
            Sign&nbsp;In<span className="auth-title-ornament">.</span>
          </h2>
          <p className="auth-subtitle">
            Present your credentials to begin scoring
            or administering the programme.
          </p>

          {error && (
            <div className="error-message" role="alert">
              <span className="error-mark" aria-hidden>!</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form" noValidate>
            <div className="auth-field">
              <label htmlFor="auth-username">Username</label>
              <input
                id="auth-username"
                type="text"
                autoComplete="username"
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <div className="auth-field">
              <label htmlFor="auth-password">Password</label>
              <input
                id="auth-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <button type="submit" disabled={loading} className="auth-submit">
              <span className="submit-label">
                {loading ? 'Authenticating' : 'Continue'}
              </span>
              <span className="submit-icon" aria-hidden>
                {loading ? (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.4" opacity="0.3" />
                    <path d="M12 7a5 5 0 00-5-5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
                      <animateTransform attributeName="transform" type="rotate" from="0 7 7" to="360 7 7" dur="0.9s" repeatCount="indefinite" />
                    </path>
                  </svg>
                ) : (
                  '→'
                )}
              </span>
            </button>
          </form>

          <div className="auth-footer">
            <span>Dance Judge Scoring</span>
            <span className="dot" aria-hidden>·</span>
            <span>Vol. I</span>
          </div>
        </div>
      </section>
    </div>
  );
}
