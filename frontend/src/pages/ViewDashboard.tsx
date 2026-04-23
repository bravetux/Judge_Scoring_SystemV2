import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/api';
import {
  ResultsView,
  TopRankHoldersView,
  CriterionStarsView,
} from './AdminDashboard';
import '../styles/Admin.css';

/**
 * Read-only observer dashboard for the "view" role.
 * Presents the same three Results sub-tabs as the admin, but:
 *   - no other tabs (Entries, Judges, Participants, Users, Settings)
 *   - Export buttons disabled (via readOnly prop)
 */
export function ViewDashboard() {
  const navigate = useNavigate();
  const [resultsTab, setResultsTab] = useState<
    'participants' | 'toprank' | 'criterion'
  >('participants');
  const [categoryCode, setCategoryCode] = useState<string>('SA');
  const [refreshToken, setRefreshToken] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const categories = [
    'SA', 'SB', 'SC', 'SD', 'SE', 'SKG',
    'DA', 'DB', 'DC', 'DD', 'DE', 'DKG',
  ];

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
    }
  }, [navigate]);

  // Silent session probe when the tab regains focus. Any 401 is caught by
  // the axios response interceptor and routed back to /login; otherwise
  // we quietly increment refreshToken so data-loading children re-fetch.
  useEffect(() => {
    const handleFocus = async () => {
      if (!localStorage.getItem('token')) return;
      try {
        await apiService.getScoresByCategory(categoryCode);
        setRefreshToken((t) => t + 1);
      } catch {
        /* 401 handled by interceptor; swallow other errors */
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [categoryCode]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('role');
    navigate('/login');
  };

  const handleRefresh = () => {
    if (refreshing) return;
    setRefreshing(true);
    setRefreshToken((t) => t + 1);
    setTimeout(() => setRefreshing(false), 600);
  };

  return (
    <div className="admin-container">
      <header className="admin-header">
        <div className="masthead">
          <div className="masthead-eyebrow">
            <span className="dot" />
            <span>Observer Desk</span>
            <span>·</span>
            <span>Read-only Session</span>
          </div>
          <h1 className="masthead-title">
            The&nbsp;Ledger<span className="ornament">.</span>
          </h1>
          <div className="masthead-sub">
            <span>Participants</span>
            <span className="sep">◆</span>
            <span>Rank Holders</span>
            <span className="sep">◆</span>
            <span>Criterion Stars</span>
          </div>
        </div>
        <div className="masthead-aside">
          <div className="masthead-meta">
            <b>{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</b>
            <br />
            View Access · Export Disabled
          </div>
          <div className="masthead-actions">
            <button
              type="button"
              onClick={handleRefresh}
              className={`header-refresh-btn${refreshing ? ' spinning' : ''}`}
              disabled={refreshing}
              title="Refresh data"
            >
              <span className="header-refresh-icon" aria-hidden>↻</span>
              <span>{refreshing ? 'Refreshing…' : 'Refresh'}</span>
            </button>
            <button onClick={handleLogout} className="logout-btn">Log Out</button>
          </div>
        </div>
      </header>

      <main className="admin-content">
        <div className="results-section">
          <h2>Results</h2>
          <p>Participant scores, rank holders across categories, and criterion stars</p>

          <div className="results-subtabs">
            <button
              type="button"
              className={resultsTab === 'participants' ? 'active' : ''}
              onClick={() => setResultsTab('participants')}
            >
              Participants &amp; Scores
            </button>
            <button
              type="button"
              className={resultsTab === 'toprank' ? 'active' : ''}
              onClick={() => setResultsTab('toprank')}
            >
              Top Rank Holders
            </button>
            <button
              type="button"
              className={resultsTab === 'criterion' ? 'active' : ''}
              onClick={() => setResultsTab('criterion')}
            >
              Criterion Stars
            </button>
          </div>

          {resultsTab === 'participants' && (
            <>
              <div className="form-group">
                <label>Filter by Dance Token Category</label>
                <select
                  value={categoryCode}
                  onChange={(e) => setCategoryCode(e.target.value)}
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <ResultsView categoryCode={categoryCode} readOnly refreshToken={refreshToken} />
            </>
          )}

          {resultsTab === 'toprank' && (
            <TopRankHoldersView categories={categories} refreshToken={refreshToken} />
          )}

          {resultsTab === 'criterion' && (
            <CriterionStarsView categories={categories} refreshToken={refreshToken} />
          )}
        </div>
      </main>
    </div>
  );
}
