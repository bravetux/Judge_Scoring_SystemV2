import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/api';
import { DanceEntry } from '../types';
import '../styles/Judge.css';

type ScoreValues = {
  costumAndImpression: number;
  movementsAndRhythm: number;
  postureAndMudra: number;
};

export function JudgeDashboard() {
  const navigate = useNavigate();
  const [judgeName, setJudgeName] = useState<string>('');
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [entries, setEntries] = useState<DanceEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [scoringEntry, setScoringEntry] = useState<DanceEntry | null>(null);
  const [scores, setScores] = useState<ScoreValues>({
    costumAndImpression: 5,
    movementsAndRhythm: 5,
    postureAndMudra: 5,
  });
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    loadJudgeProfile();
    loadCategories();
  }, [navigate]);

  // Silent session check when the tab regains focus after being idle.
  // Catches expired tokens (→ the axios interceptor redirects to /login)
  // AND refreshes stale data so the judge doesn't submit into a broken session.
  useEffect(() => {
    const handleFocus = async () => {
      if (!localStorage.getItem('token')) return;
      try {
        await apiService.getJudgeProfile();
        // Session is valid — quietly refresh any data that may have changed.
        await loadCategories();
        if (selectedCategory) await loadEntries();
      } catch {
        // 401 is already handled by the axios response interceptor; other
        // errors are swallowed — user can still retry manually via Refresh.
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory]);

  const loadJudgeProfile = async () => {
    try {
      const response = await apiService.getJudgeProfile();
      setJudgeName(response.data.name);
    } catch (error) {
      console.error('Failed to load judge profile:', error);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await apiService.getJudgeCategories();
      console.log('Judge assigned categories:', response.data);
      setCategories(response.data);
      if (response.data.length > 0) {
        setSelectedCategory(response.data[0]);
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  useEffect(() => {
    if (selectedCategory) {
      loadEntries();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory]);

  const loadEntries = async () => {
    setLoading(true);
    try {
      const response = await apiService.getEntriesForJudge(selectedCategory);
      setEntries(response.data);
    } catch (error) {
      console.error('Failed to load entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitScore = async () => {
    if (!scoringEntry) return;

    try {
      await apiService.submitScore(
        scoringEntry.id,
        scores.costumAndImpression,
        scores.movementsAndRhythm,
        scores.postureAndMudra
      );
      setScoringEntry(null);
      loadEntries();
    } catch (error: any) {
      // Surface the real cause so "idle → can't submit" is diagnosable.
      let msg = 'Failed to submit score';
      if (error?.response) {
        const s = error.response.status;
        const serverMsg = error.response.data?.error;
        if (s === 401) {
          msg = 'Your session has expired — you will be taken to the login screen.';
        } else {
          msg = `Submit failed (HTTP ${s})${serverMsg ? ': ' + serverMsg : ''}`;
        }
      } else if (error?.code === 'ECONNABORTED') {
        msg = 'The server did not respond in time. Check your connection and try again.';
      } else if (error?.message?.toLowerCase?.().includes('network')) {
        msg = 'Network error — the backend may be unreachable. Try again shortly.';
      } else if (error?.message) {
        msg = `Submit failed — ${error.message}`;
      }
      console.error('Submit score error:', error);
      alert(msg);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('role');
    navigate('/login');
  };

  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await loadJudgeProfile();
      await loadCategories();
      if (selectedCategory) await loadEntries();
    } finally {
      setTimeout(() => setRefreshing(false), 600);
    }
  };

  const calculateStats = () => {
    const totalEntries = entries.length;
    const scoredEntries = entries.filter(entry => entry.score && entry.score.totalScore !== undefined).length;
    const percentage = totalEntries > 0 ? Math.round((scoredEntries / totalEntries) * 100) : 0;
    return { totalEntries, scoredEntries, percentage };
  };

  const stats = calculateStats();

  const computeHistogram = () => {
    const bins: { score: number; count: number; entries: DanceEntry[] }[] = [];
    for (let s = 3; s <= 30; s++) {
      const matching = entries.filter((e) => e.score?.totalScore === s);
      bins.push({ score: s, count: matching.length, entries: matching });
    }
    const maxCount = Math.max(1, ...bins.map((b) => b.count));
    const mean =
      stats.scoredEntries > 0
        ? bins.reduce((acc, b) => acc + b.score * b.count, 0) / stats.scoredEntries
        : 0;
    const scored = bins.filter((b) => b.count > 0);
    return {
      bins,
      maxCount,
      mean,
      min: scored.length > 0 ? Math.min(...scored.map((b) => b.score)) : null,
      max: scored.length > 0 ? Math.max(...scored.map((b) => b.score)) : null,
    };
  };

  const histogram = computeHistogram();

  return (
    <div className="judge-container">
      <header className="judge-header">
        <div className="judge-masthead">
          <div className="judge-eyebrow">
            <span className="live-dot" />
            <span>Live Session</span>
            <span className="sep">·</span>
            <span>{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
          </div>
          <h1 className="judge-title">
            The&nbsp;Adjudicator<span className="ornament">.</span>
          </h1>
          {judgeName && (
            <div className="judge-welcome">
              <span className="welcome-label">Seated</span>
              <strong>{judgeName}</strong>
            </div>
          )}
        </div>
        <div className="judge-header-actions">
          <button
            type="button"
            onClick={handleRefresh}
            className={`header-refresh-btn judge-theme${refreshing ? ' spinning' : ''}`}
            disabled={refreshing}
            title="Refresh data"
          >
            <span className="header-refresh-icon" aria-hidden>↻</span>
            <span>{refreshing ? 'Refreshing…' : 'Refresh'}</span>
          </button>
          <button onClick={handleLogout} className="logout-btn">Log Out</button>
        </div>
      </header>

      <main className="judge-content">
        <div className="category-panel">
          <div className="panel-eyebrow">
            <span>Now Adjudicating</span>
            <span className="panel-meta">
              {categories.length} {categories.length === 1 ? 'Category' : 'Categories'} Assigned
            </span>
          </div>
          <div className="category-selector">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        {selectedCategory && (
          <div className="progress-panel">
            <div className="progress-info">
              <div className="panel-eyebrow">
                <span>Scoring Progress</span>
                <span className="panel-meta">Category № {selectedCategory}</span>
              </div>
              <div className="progress-numbers">
                <span className="big">{stats.scoredEntries}</span>
                <span className="slash">/</span>
                <span className="total">{stats.totalEntries}</span>
                <span className="label">entries scored</span>
              </div>
              <div className="progress-bar-track">
                <div
                  className={`progress-bar-fill ${stats.percentage === 100 ? 'complete' : ''}`}
                  style={{ width: `${stats.percentage}%` }}
                />
              </div>
              <div className="progress-meta">
                <span>{stats.percentage}% complete</span>
                {stats.totalEntries - stats.scoredEntries > 0 && (
                  <>
                    <span className="sep">·</span>
                    <span>{stats.totalEntries - stats.scoredEntries} remaining</span>
                  </>
                )}
              </div>
            </div>
            <div
              className={`progress-ring ${stats.percentage === 100 ? 'complete' : ''}`}
              style={{
                background: `conic-gradient(var(--ring-color) ${stats.percentage * 3.6}deg, var(--stage-raise) ${stats.percentage * 3.6}deg)`,
              }}
            >
              <div className="progress-ring-inner">
                <div className="progress-ring-pct">{stats.percentage}<small>%</small></div>
                <div className="progress-ring-fraction">{stats.scoredEntries}/{stats.totalEntries}</div>
              </div>
            </div>
          </div>
        )}

        {selectedCategory && stats.scoredEntries > 0 && (
          <section className="score-histogram">
            <div className="histogram-header">
              <h3>Score Distribution</h3>
              <div className="histogram-stats">
                <span><b>{stats.scoredEntries}</b> scored</span>
                <span className="dot">·</span>
                <span>mean <b>{histogram.mean.toFixed(1)}</b></span>
                {histogram.min !== null && histogram.max !== null && (
                  <>
                    <span className="dot">·</span>
                    <span>range <b>{histogram.min}</b>–<b>{histogram.max}</b></span>
                  </>
                )}
              </div>
            </div>
            <p className="histogram-hint">
              How many entries fall on each total? Hover a bar to see which ones.
            </p>

            <div className="histogram-chart" role="img" aria-label="Score distribution histogram">
              {histogram.bins.map((bin) => {
                const heightPct = (bin.count / histogram.maxCount) * 100;
                const tooltip =
                  bin.count > 0
                    ? `Score ${bin.score} — ${bin.count} ${bin.count === 1 ? 'entry' : 'entries'}\n` +
                      bin.entries
                        .map((e) => `#${e.entryNumber} ${e.participant1Name}${e.participant2Name ? ' & ' + e.participant2Name : ''}`)
                        .join('\n')
                    : `Score ${bin.score} — 0 entries`;
                return (
                  <div
                    key={bin.score}
                    className={`histogram-col${bin.count > 0 ? ' has-value' : ' empty'}`}
                    title={tooltip}
                  >
                    <span className="histogram-count">{bin.count > 0 ? bin.count : ''}</span>
                    <div className="histogram-bar-track">
                      <div
                        className="histogram-bar"
                        style={{ height: bin.count > 0 ? `${Math.max(heightPct, 6)}%` : '2px' }}
                      />
                    </div>
                    <span className="histogram-label">{bin.score}</span>
                  </div>
                );
              })}
            </div>

            <div className="histogram-axis">
              <span>Total Score (3 – 30)</span>
              <span>Bar height = number of entries</span>
            </div>
          </section>
        )}

        {loading ? (
          <div>Loading entries...</div>
        ) : (
          <div className="entries-view">
            <div className="entries-section-header">
              <h2>Entries for {selectedCategory}</h2>
              <span className="entries-section-meta">
                {entries.length} {entries.length === 1 ? 'Entry' : 'Entries'}
              </span>
            </div>
            {entries.length > 0 ? (
              <div className="entries-grid">
                {entries.map((entry) => (
                  <div
                    key={entry.id}
                    className={`entry-card${entry.score ? ' scored' : ' unscored'}`}
                  >
                    <div className="entry-card-top">
                      <span className="entry-token">
                        {selectedCategory}{String(entry.entryNumber).padStart(2, '0')}
                      </span>
                      {entry.score && (
                        <span className="entry-status-badge">
                          <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M2 6.5l2.5 2.5L10 3.5" />
                          </svg>
                          Scored
                        </span>
                      )}
                    </div>
                    <h3 className="entry-number">{String(entry.entryNumber).padStart(2, '0')}</h3>
                    <div className="entry-participants">
                      <div className="entry-participant">
                        <span className="participant-label">Dancer</span>
                        <span className="participant-name">{entry.participant1Name}</span>
                      </div>
                      {entry.participant2Name && (
                        <div className="entry-participant">
                          <span className="participant-label">Partner</span>
                          <span className="participant-name">{entry.participant2Name}</span>
                        </div>
                      )}
                    </div>

                    {entry.score ? (
                      <button onClick={() => setScoringEntry(entry)} className="edit-btn">
                        Edit Score
                      </button>
                    ) : (
                      <button
                        onClick={() => setScoringEntry(entry)}
                        className="score-btn"
                      >
                        Begin Scoring →
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="entries-empty">
                <p>No entries assigned to this category yet</p>
                <span>Check back once entries have been uploaded</span>
              </div>
            )}
          </div>
        )}
      </main>

      {scoringEntry && (
        <ScoringModal
          entry={scoringEntry}
          scores={scores}
          onScoreChange={setScores}
          onSubmit={handleSubmitScore}
          onClose={() => setScoringEntry(null)}
        />
      )}
    </div>
  );
}

interface ScoringModalProps {
  entry: DanceEntry;
  scores: ScoreValues;
  onScoreChange: React.Dispatch<React.SetStateAction<ScoreValues>>;
  onSubmit: () => void;
  onClose: () => void;
}

function ScoringModal({
  entry,
  scores,
  onScoreChange,
  onSubmit,
  onClose,
}: ScoringModalProps) {
  const total = scores.costumAndImpression + scores.movementsAndRhythm + scores.postureAndMudra;
  const criteria = [
    { key: 'costumAndImpression' as const, label: 'Costume & Impression', hint: 'Attire, presentation and overall visual' },
    { key: 'movementsAndRhythm' as const, label: 'Movements & Rhythm', hint: 'Timing, footwork and musicality' },
    { key: 'postureAndMudra' as const, label: 'Posture & Mudra', hint: 'Stance, hand gestures and precision' },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header-bar">
          <div>
            <div className="modal-eyebrow">Scoring</div>
            <h2>Entry {String(entry.entryNumber).padStart(2, '0')}</h2>
            <div className="modal-participants">
              <span>{entry.participant1Name}</span>
              {entry.participant2Name && (
                <>
                  <span className="amp">&amp;</span>
                  <span>{entry.participant2Name}</span>
                </>
              )}
            </div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" />
            </svg>
          </button>
        </div>

        <div className="scoring-form">
          {criteria.map((c) => (
            <div key={c.key} className="score-field">
              <div className="score-field-header">
                <div>
                  <span className="score-field-label">{c.label}</span>
                  <span className="score-field-hint">{c.hint}</span>
                </div>
                <div className="score-field-value">
                  {scores[c.key]}<small>/10</small>
                </div>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={scores[c.key]}
                onChange={(e) =>
                  onScoreChange({
                    ...scores,
                    [c.key]: parseInt(e.target.value),
                  })
                }
              />
              <div className="score-field-ticks">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <span key={n} className={scores[c.key] === n ? 'active' : ''}>{n}</span>
                ))}
              </div>
            </div>
          ))}

          <div className="total-score">
            <span className="total-label">Composite Score</span>
            <span className="total-value">{total}<small>/30</small></span>
          </div>
        </div>

        <div className="modal-buttons">
          <button onClick={onClose} className="cancel-btn">Cancel</button>
          <button onClick={onSubmit} className="submit-btn">Submit Score</button>
        </div>
      </div>
    </div>
  );
}
