import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/api';
import { Judge } from '../types';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import '../styles/Admin.css';

interface BulkEntry {
  categoryCode: string;
  entryNumber: string;
  danceToken: string;
  participant1Name: string;
  participant2Name?: string;
}

export function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'entries' | 'judges' | 'participants' | 'users' | 'results' | 'settings'>('entries');
  const [judges, setJudges] = useState<Judge[]>([]);
  const [loading, setLoading] = useState(false);
  const [categoryCode, setCategoryCode] = useState('SA');
  const [entries, setEntries] = useState<Array<{ participant1Name: string; participant2Name?: string }>>([]);
  const [newEntry1, setNewEntry1] = useState('');
  const [newEntry2, setNewEntry2] = useState('');
  const [bulkEntries, setBulkEntries] = useState<BulkEntry[]>([]);
  const [uploadMode, setUploadMode] = useState<'manual' | 'csv'>('manual');
  const [loadingFile, setLoadingFile] = useState(false);
  const [showAddJudgeForm, setShowAddJudgeForm] = useState(false);
  const [newJudge, setNewJudge] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
  });
  const [editingJudge, setEditingJudge] = useState<Judge | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [resultsTab, setResultsTab] = useState<'participants' | 'toprank' | 'criterion'>('participants');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories = [
    'SA', 'SB', 'SC', 'SD', 'SE', 'SKG',
    'DA', 'DB', 'DC', 'DD', 'DE', 'DKG'
  ];

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    loadJudges();
  }, [navigate]);

  const loadJudges = async () => {
    try {
      const response = await apiService.getJudges();
      console.log('Loaded judges:', response.data);
      const sorted = [...response.data].sort((a: Judge, b: Judge) =>
        a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
      );
      setJudges(sorted);
    } catch (error) {
      console.error('Failed to load judges:', error);
    }
  };

  const handleAddEntry = () => {
    if (!newEntry1.trim()) return;

    const isDuet = categoryCode.startsWith('D');
    if (isDuet && !newEntry2.trim()) return;

    const newEntries = [
      ...entries,
      {
        participant1Name: newEntry1,
        participant2Name: isDuet ? newEntry2 : undefined,
      },
    ];
    setEntries(newEntries);
    setNewEntry1('');
    setNewEntry2('');
  };

  const handleUploadEntries = async () => {
    if (entries.length === 0) return;
    setLoading(true);

    try {
      await apiService.uploadEntries(categoryCode, entries);
      alert('Entries uploaded successfully');
      setEntries([]);
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to upload entries');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoadingFile(true);
    setBulkEntries([]); // Clear previous entries
    const fileExtension = file.name.split('.').pop()?.toLowerCase();

    if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      // Handle Excel file
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

          const parsed: BulkEntry[] = [];
          // Skip header row
          for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (row.length >= 3 && row[0] && row[2]) {
              const catCode = String(row[0]).toUpperCase().trim();
              const sNo = String(row[1] || i).padStart(2, '0');
              parsed.push({
                categoryCode: catCode,
                entryNumber: sNo,
                danceToken: `${catCode}${sNo}`,
                participant1Name: String(row[2]).trim(),
                participant2Name: row[3] ? String(row[3]).trim() : undefined,
              });
            }
          }
          
          if (parsed.length === 0) {
            alert('No valid entries found in Excel file. Please check the format.');
            setLoadingFile(false);
            return;
          }
          
          setBulkEntries(parsed);
          setLoadingFile(false);
          console.log(`Successfully loaded ${parsed.length} entries from Excel file`, parsed);
        } catch (error) {
          console.error('Excel parsing error:', error);
          alert('Failed to parse Excel file. Please check the format.');
          setLoadingFile(false);
        }
      };
      reader.onerror = () => {
        alert('Failed to read Excel file');
        setLoadingFile(false);
      };
      reader.readAsArrayBuffer(file);
    } else {
      // Handle CSV file
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const lines = text.split('\n').filter(line => line.trim());
          
          if (lines.length === 0) {
            alert('CSV file is empty');
            setLoadingFile(false);
            return;
          }
          
          // Skip header row if present
          const startIndex = lines[0]?.toLowerCase().includes('category') ? 1 : 0;
          
          const parsed: BulkEntry[] = [];
          for (let i = startIndex; i < lines.length; i++) {
            const cols = lines[i].split(',').map(col => col.trim());
            // Format: Category, S.No, Participant1, Participant2
            if (cols.length >= 3 && cols[0] && cols[2]) {
              const catCode = cols[0].toUpperCase();
              const sNo = cols[1] || String(i - startIndex + 1).padStart(2, '0');
              parsed.push({
                categoryCode: catCode,
                entryNumber: sNo,
                danceToken: `${catCode}${sNo}`,
                participant1Name: cols[2],
                participant2Name: cols[3] || undefined,
              });
            }
          }
          
          if (parsed.length === 0) {
            alert('No valid entries found in CSV file. Please check the format.');
            setLoadingFile(false);
            return;
          }
          
          setBulkEntries(parsed);
          setLoadingFile(false);
          console.log(`Successfully loaded ${parsed.length} entries from CSV file`, parsed);
        } catch (error) {
          console.error('CSV parsing error:', error);
          alert('Failed to parse CSV file. Please check the format.');
          setLoadingFile(false);
        }
      };
      reader.onerror = () => {
        alert('Failed to read CSV file');
        setLoadingFile(false);
      };
      reader.readAsText(file);
    }
  };

  const handleUploadBulkEntries = async () => {
    if (bulkEntries.length === 0) return;
    setLoading(true);

    try {
      // Group entries by category
      const grouped: Record<string, Array<{ participant1Name: string; participant2Name?: string }>> = {};
      bulkEntries.forEach(entry => {
        if (!grouped[entry.categoryCode]) {
          grouped[entry.categoryCode] = [];
        }
        grouped[entry.categoryCode].push({
          participant1Name: entry.participant1Name,
          participant2Name: entry.participant2Name,
        });
      });

      // Upload each category
      for (const [catCode, catEntries] of Object.entries(grouped)) {
        await apiService.uploadEntries(catCode, catEntries);
      }

      alert(`Successfully uploaded ${bulkEntries.length} entries across ${Object.keys(grouped).length} categories`);
      setBulkEntries([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to upload entries');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCategoryAssignment = (judge: Judge) => {
    console.log('Opening category assignment for judge:', judge);
    console.log('Current assigned categories:', judge.assignedCategories);
    setEditingJudge(judge);
    setSelectedCategories([...judge.assignedCategories]);
  };

  const handleCloseCategoryAssignment = () => {
    setEditingJudge(null);
    setSelectedCategories([]);
  };

  const handleToggleCategory = (category: string) => {
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const handleSaveCategoryAssignments = async () => {
    if (!editingJudge) return;

    console.log('=== SAVING CATEGORY ASSIGNMENTS ===');
    console.log('Judge ID:', editingJudge.id);
    console.log('Judge Name:', editingJudge.name);
    console.log('Selected Categories:', selectedCategories);
    console.log('Categories as array:', JSON.stringify(selectedCategories));

    try {
      console.log('Calling API updateJudgeAssignments...');
      const response = await apiService.updateJudgeAssignments(
        editingJudge.id,
        selectedCategories
      );
      console.log('API Response:', response.data);
      handleCloseCategoryAssignment();
      alert('Category assignments updated successfully');
      // Reload judges after closing modal
      console.log('Reloading judges...');
      await loadJudges();
      console.log('Judges reloaded');
    } catch (error: any) {
      console.error('Failed to update assignments:', error);
      console.error('Error details:', error.response?.data);
      alert(error.response?.data?.error || 'Failed to update assignments');
    }
  };

  const handleRenameJudge = async (judge: Judge) => {
    const newName = prompt('Enter new name for judge:', judge.name);

    if (!newName || newName.trim() === '') return;
    if (newName === judge.name) return;

    try {
      await apiService.updateJudgeName(judge.id, newName.trim());
      loadJudges();
      alert('Judge name updated successfully');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to update judge name');
    }
  };

  const handleUpdateUsername = async (judge: Judge) => {
    const newUsername = prompt('Enter new login username for judge:', judge.username);

    if (!newUsername || newUsername.trim() === '') return;
    if (newUsername === judge.username) return;

    try {
      await apiService.updateJudgeUsername(judge.id, newUsername.trim());
      loadJudges();
      alert('Judge login username updated successfully');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to update judge username');
    }
  };

  const handleDeleteJudge = async (judge: Judge) => {
    const confirm = window.confirm(
      `Are you sure you want to delete judge "${judge.name}"? This action cannot be undone.`
    );

    if (!confirm) return;

    try {
      await apiService.deleteJudge(judge.id);
      loadJudges();
      alert('Judge deleted successfully');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to delete judge');
    }
  };

  const handleAddJudge = async () => {
    if (!newJudge.name || !newJudge.username || !newJudge.email || !newJudge.password) {
      alert('Please fill in all fields');
      return;
    }

    try {
      setLoading(true);
      await apiService.addJudge(
        newJudge.username,
        newJudge.password,
        newJudge.name,
        newJudge.email,
        [] // Start with no assigned categories
      );
      alert('Judge added successfully');
      setNewJudge({ name: '', username: '', email: '', password: '' });
      setShowAddJudgeForm(false);
      loadJudges();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to add judge');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('role');
    navigate('/login');
  };

  return (
    <div className="admin-container">
      <header className="admin-header">
        <div className="masthead">
          <div className="masthead-eyebrow">
            <span className="dot" />
            <span>The&nbsp;Programme</span>
            <span>·</span>
            <span>Vol. I</span>
          </div>
          <h1 className="masthead-title">
            Dance&nbsp;Judge<span className="ornament">.</span>
          </h1>
          <div className="masthead-sub">
            <span>Administrator</span>
            <span className="sep">◆</span>
            <span>Competition Management</span>
          </div>
        </div>
        <div className="masthead-aside">
          <div className="masthead-meta">
            <b>{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</b>
            <br />
            {judges.length} Judge{judges.length === 1 ? '' : 's'} · 12 Categories
          </div>
          <button onClick={handleLogout} className="logout-btn">Log Out</button>
        </div>
      </header>

      <nav className="tabs">
        <button
          className={activeTab === 'entries' ? 'active' : ''}
          onClick={() => setActiveTab('entries')}
        >
          Entries
        </button>
        <button
          className={activeTab === 'judges' ? 'active' : ''}
          onClick={() => setActiveTab('judges')}
        >
          Judges
        </button>
        <button
          className={activeTab === 'participants' ? 'active' : ''}
          onClick={() => setActiveTab('participants')}
        >
          Participants
        </button>
        <button
          className={activeTab === 'users' ? 'active' : ''}
          onClick={() => setActiveTab('users')}
        >
          Users
        </button>
        <button
          className={activeTab === 'results' ? 'active' : ''}
          onClick={() => setActiveTab('results')}
        >
          Results
        </button>
        <button
          className={activeTab === 'settings' ? 'active' : ''}
          onClick={() => setActiveTab('settings')}
        >
          Settings
        </button>
      </nav>

      <main className="admin-content">
        {activeTab === 'entries' && (
          <div className="entries-section">
            <h2>Manage Dance Entries</h2>
            
            <div className="upload-mode-toggle">
              <button 
                className={uploadMode === 'manual' ? 'active' : ''}
                onClick={() => setUploadMode('manual')}
              >
                Manual Entry
              </button>
              <button 
                className={uploadMode === 'csv' ? 'active' : ''}
                onClick={() => setUploadMode('csv')}
              >
                CSV Upload
              </button>
            </div>

            {uploadMode === 'manual' ? (
              <>
                <div className="form-group">
                  <label>Select Category</label>
                  <select
                    value={categoryCode}
                    onChange={(e) => setCategoryCode(e.target.value)}
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="entry-form">
                  <input
                    type="text"
                    placeholder="Participant 1 Name"
                    value={newEntry1}
                    onChange={(e) => setNewEntry1(e.target.value)}
                  />
                  {categoryCode.startsWith('D') && (
                    <input
                      type="text"
                      placeholder="Participant 2 Name (Duet)"
                      value={newEntry2}
                      onChange={(e) => setNewEntry2(e.target.value)}
                    />
                  )}
                  <button onClick={handleAddEntry}>Add Entry</button>
                </div>

                <div className="entries-list">
                  <h3>Entries to Upload</h3>
                  {entries.length > 0 ? (
                    <ul>
                      {entries.map((entry, idx) => (
                        <li key={idx}>
                          {entry.participant1Name}
                          {entry.participant2Name && ` & ${entry.participant2Name}`}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>No entries added yet</p>
                  )}
                  {entries.length > 0 && (
                    <button
                      onClick={handleUploadEntries}
                      disabled={loading}
                      className="upload-btn"
                    >
                      {loading ? 'Uploading...' : 'Upload Entries'}
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div className="csv-upload-section">
                <div className="csv-instructions">
                  <h3>File Upload Format</h3>
                  <p>Upload a CSV or Excel (XLSX) file with columns:</p>
                  <code>Category, S.No, Participant 1, Participant 2</code>
                  <p><small>Category + S.No = Dance Token (e.g., SA + 01 = <strong>SA01</strong>)</small></p>
                  <p><small>Participant 2 is optional for Solo categories (SA-SKG)</small></p>
                  <div className="csv-example">
                    <strong>Example:</strong>
                    <pre>
Category,S.No,Participant1,Participant2
SA,01,John Doe,           → SA01
SA,02,Jane Smith,         → SA02
DA,01,Mike Brown,Sarah Lee → DA01
DB,02,Tom Wilson,Amy Chen  → DB02
                    </pre>
                  </div>
                </div>

                <div className="file-upload">
                  <label className="file-upload-label">
                    <input
                      type="file"
                      accept=".csv,.xlsx,.xls,.txt"
                      onChange={handleFileUpload}
                      ref={fileInputRef}
                      style={{ display: 'none' }}
                      disabled={loadingFile}
                    />
                    <span className="file-upload-button">{loadingFile ? 'Reading file...' : 'Choose File (CSV or Excel)'}</span>
                  </label>
                  <p className="file-help">Supports CSV and Excel (XLSX) files</p>
                </div>

                {loadingFile && (
                  <div className="loading-indicator">
                    <div className="spinner"></div>
                    <p>Parsing file, please wait...</p>
                  </div>
                )}

                {!loadingFile && bulkEntries.length > 0 && (
                  <div className="bulk-entries-preview">
                    <h3>Preview ({bulkEntries.length} entries)</h3>
                    <table className="preview-table">
                      <thead>
                        <tr>
                          <th>Dance Token</th>
                          <th>Participant 1</th>
                          <th>Participant 2</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bulkEntries.map((entry, idx) => (
                          <tr key={idx}>
                            <td><strong>{entry.danceToken}</strong></td>
                            <td>{entry.participant1Name}</td>
                            <td>{entry.participant2Name || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <button
                      onClick={handleUploadBulkEntries}
                      disabled={loading}
                      className="upload-btn"
                    >
                      {loading ? 'Uploading...' : `Upload ${bulkEntries.length} Entries`}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'judges' && (
          <div className="judges-section">
            <h2>Manage Judges</h2>
            
            <div className="section-controls">
              <button
                className="add-judge-btn"
                onClick={() => setShowAddJudgeForm(!showAddJudgeForm)}
              >
                {showAddJudgeForm ? 'Cancel' : 'Add New Judge'}
              </button>

              <button
                className="refresh-btn"
                onClick={loadJudges}
                title="Refresh judge assignments from database"
              >
                Refresh Data
              </button>
            </div>

            {showAddJudgeForm && (
              <div className="add-judge-form">
                <h3>Add New Judge</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Judge Name</label>
                    <input
                      type="text"
                      value={newJudge.name}
                      onChange={(e) => setNewJudge({ ...newJudge, name: e.target.value })}
                      placeholder="e.g., Judge Smith"
                    />
                  </div>
                  <div className="form-group">
                    <label>Username</label>
                    <input
                      type="text"
                      value={newJudge.username}
                      onChange={(e) => setNewJudge({ ...newJudge, username: e.target.value })}
                      placeholder="e.g., judge4"
                    />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      value={newJudge.email}
                      onChange={(e) => setNewJudge({ ...newJudge, email: e.target.value })}
                      placeholder="judge@example.com"
                    />
                  </div>
                  <div className="form-group">
                    <label>Password</label>
                    <input
                      type="password"
                      value={newJudge.password}
                      onChange={(e) => setNewJudge({ ...newJudge, password: e.target.value })}
                      placeholder="Enter password"
                    />
                  </div>
                </div>
                <button onClick={handleAddJudge} disabled={loading} className="submit-judge-btn">
                  {loading ? 'Adding...' : 'Add Judge'}
                </button>
              </div>
            )}

            <div className="judges-list">
              {judges.length > 0 ? (
                judges.map((judge) => (
                  <div key={judge.id} className="judge-card">
                    <div className="judge-card-header">
                      <h3>{judge.name}</h3>
                      <div className="judge-actions">
                        <button 
                          className="action-btn rename-btn" 
                          onClick={() => handleRenameJudge(judge)}
                          title="Rename Judge"
                        >
                          ✏️ Name
                        </button>
                        <button 
                          className="action-btn rename-btn" 
                          onClick={() => handleUpdateUsername(judge)}
                          title="Update Login Username"
                        >
                          👤 Login
                        </button>
                        <button 
                          className="action-btn delete-btn" 
                          onClick={() => handleDeleteJudge(judge)}
                          title="Delete Judge"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                    <p><strong>Login Username:</strong> {judge.username}</p>
                    <p><strong>Assigned Categories:</strong> {judge.assignedCategories.join(', ') || 'None'}</p>
                    <button onClick={() => handleOpenCategoryAssignment(judge)}>
                      Update Assignments
                    </button>
                  </div>
                ))
              ) : (
                <p>No judges found</p>
              )}
            </div>

            {/* Category View Section */}
            <div className="category-view-section">
              <h2>Categories Overview</h2>
              <p>View judges assigned to each category · Maximum 3 judges recommended per category</p>

              <div className="category-overview-grid">
                {categories.map((category) => {
                  const assignedJudges = judges.filter(judge =>
                    judge.assignedCategories.includes(category)
                  );
                  const isOverLimit = assignedJudges.length > 3;
                  const countClass = isOverLimit
                    ? 'over'
                    : assignedJudges.length === 0
                      ? 'empty'
                      : 'ok';

                  return (
                    <div
                      key={category}
                      className={`category-slot${isOverLimit ? ' over-limit' : ''}`}
                    >
                      <div className="category-slot-header">
                        <h3>{category}</h3>
                        <span className={`judge-count ${countClass}`}>
                          {assignedJudges.length} {assignedJudges.length === 1 ? 'Judge' : 'Judges'}
                        </span>
                      </div>

                      {isOverLimit && (
                        <div className="warning-bar">
                          Exceeds recommended panel of three
                        </div>
                      )}

                      {assignedJudges.length > 0 ? (
                        <ul className="assigned-judges-list">
                          {assignedJudges.map((judge, index) => (
                            <li
                              key={judge.id}
                              className={index >= 3 ? 'overflow' : ''}
                            >
                              <strong>{judge.name}</strong>
                              <em>{judge.username}</em>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="no-judges">No judges assigned</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Category Assignment Modal */}
            {editingJudge && (
              <div className="modal-overlay" onClick={handleCloseCategoryAssignment}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                  <div className="modal-header">
                    <h3>Assign Categories to {editingJudge.name}</h3>
                    <button className="close-btn" onClick={handleCloseCategoryAssignment}>×</button>
                  </div>
                  <div className="modal-body">
                    <p className="modal-description">Select the categories this judge will evaluate:</p>
                    <div className="category-checkboxes">
                      {categories.map((category) => (
                        <label key={category} className="checkbox-label">
                          <input
                            type="checkbox"
                            checked={selectedCategories.includes(category)}
                            onChange={() => handleToggleCategory(category)}
                          />
                          <span>{category}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button className="cancel-btn" onClick={handleCloseCategoryAssignment}>
                      Cancel
                    </button>
                    <button className="save-btn" onClick={handleSaveCategoryAssignments}>
                      Save Assignments
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'participants' && (
          <div className="participants-section">
            <h2>Manage Participants</h2>
            <ManageParticipantsView categories={categories} />
          </div>
        )}

        {activeTab === 'users' && (
          <div className="users-section">
            <h2>Manage User Credentials</h2>
            <ManageUsersView />
          </div>
        )}

        {activeTab === 'results' && (
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
                  <select value={categoryCode} onChange={(e) => setCategoryCode(e.target.value)}>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <ResultsView categoryCode={categoryCode} />
              </>
            )}

            {resultsTab === 'toprank' && <TopRankHoldersView categories={categories} />}

            {resultsTab === 'criterion' && <CriterionStarsView categories={categories} />}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="settings-section">
            <h2>Settings</h2>
            <p>Export the entire database as a JSON snapshot, or restore a previously exported snapshot.</p>
            <SettingsView />
          </div>
        )}
      </main>
    </div>
  );
}

function ResultsView({ categoryCode }: { categoryCode: string }) {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [showOnlyEmpty, setShowOnlyEmpty] = useState(false);
  const [sortColumn, setSortColumn] = useState<string>('rank');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    loadResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryCode]);

  const loadResults = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiService.getScoresByCategory(categoryCode);
      console.log('Loaded results for', categoryCode, ':', response.data);
      setResults(response.data);
    } catch (error: any) {
      console.error('Failed to load results:', error);
      const errorMsg = error.response?.data?.error || error.message || 'Failed to load results';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getSortValue = (result: any, column: string) => {
    switch (column) {
      case 'rank':
        return result.rank || 999999;
      case 'token':
        return result.categoryCode + String(result.entryNumber).padStart(2, '0');
      case 'participant':
        return result.participant1Name.toLowerCase();
      case 'judge1':
        return result.judge1Score?.totalScore || 0;
      case 'judge2':
        return result.judge2Score?.totalScore || 0;
      case 'judge3':
        return result.judge3Score?.totalScore || 0;
      case 'total':
        return result.totalScore || 0;
      default:
        return 0;
    }
  };

  const sortedResults = [...results].sort((a, b) => {
    const aValue = getSortValue(a, sortColumn);
    const bValue = getSortValue(b, sortColumn);
    
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === 'asc' 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }
    
    return sortDirection === 'asc' 
      ? (aValue as number) - (bValue as number)
      : (bValue as number) - (aValue as number);
  });

  if (loading) return <div>Loading results...</div>;
  
  if (error) {
    return (
      <div className="error-message" style={{ color: 'red', padding: '20px' }}>
        <strong>Error loading participants:</strong> {error}
        <br />
        <button onClick={loadResults} style={{ marginTop: '10px' }}>Retry</button>
      </div>
    );
  }

  const completedEntries = sortedResults.filter((r) => r.totalScore);
  const emptyEntries = sortedResults.filter((r) => !r.totalScore);
  const displayEntries = showOnlyEmpty ? emptyEntries : sortedResults;

  const SortIcon = ({ column }: { column: string }) => {
    if (sortColumn !== column) return <span style={{ opacity: 0.3 }}>⇅</span>;
    return <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>;
  };

  const exportToPDF = () => {
    if (results.length === 0) {
      alert('No data to export');
      return;
    }

    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(16);
    doc.text(`Participants & Scores - ${categoryCode}`, 14, 15);
    
    // Prepare data - only scored entries with rank
    const exportData = sortedResults
      .filter(r => r.totalScore && r.rank)
      .map(r => ([
        r.rank || '-',
        `${r.categoryCode}${String(r.entryNumber).padStart(2, '0')}`,
        r.participant2Name 
          ? `${r.participant1Name} & ${r.participant2Name}`
          : r.participant1Name,
        r.totalScore ? r.totalScore.toFixed(2) : '-',
        '' // Remarks column
      ]));

    // Add table
    autoTable(doc, {
      head: [['Rank', 'Dance Token', 'Participant', 'Total Score', 'Remarks']],
      body: exportData,
      startY: 25,
      theme: 'grid',
      styles: { fontSize: 10 },
      headStyles: { fillColor: [66, 139, 202] },
    });

    doc.save(`${categoryCode}_Results_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const exportToCSV = () => {
    if (results.length === 0) {
      alert('No data to export');
      return;
    }

    // Prepare data - only scored entries with rank
    const exportData = sortedResults
      .filter(r => r.totalScore && r.rank)
      .map(r => ({
        'Rank': r.rank || '-',
        'Dance Token': `${r.categoryCode}${String(r.entryNumber).padStart(2, '0')}`,
        'Participant': r.participant2Name 
          ? `${r.participant1Name} & ${r.participant2Name}`
          : r.participant1Name,
        'Total Score': r.totalScore ? r.totalScore.toFixed(2) : '-',
        'Remarks': ''
      }));

    // Convert to CSV
    const headers = ['Rank', 'Dance Token', 'Participant', 'Total Score', 'Remarks'];
    const csvContent = [
      headers.join(','),
      ...exportData.map(row => 
        headers.map(header => {
          const value = String(row[header as keyof typeof row]);
          // Escape commas and quotes in values
          return value.includes(',') || value.includes('"') 
            ? `"${value.replace(/"/g, '""')}"`
            : value;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `${categoryCode}_Results_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const exportToXLSX = () => {
    if (results.length === 0) {
      alert('No data to export');
      return;
    }

    // Prepare data - only scored entries with rank
    const exportData = sortedResults
      .filter(r => r.totalScore && r.rank)
      .map(r => ({
        'Rank': r.rank || '-',
        'Dance Token': `${r.categoryCode}${String(r.entryNumber).padStart(2, '0')}`,
        'Participant': r.participant2Name 
          ? `${r.participant1Name} & ${r.participant2Name}`
          : r.participant1Name,
        'Total Score': r.totalScore ? r.totalScore.toFixed(2) : '-',
        'Remarks': ''
      }));

    // Create worksheet and workbook
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, categoryCode);

    // Export file
    XLSX.writeFile(wb, `${categoryCode}_Results_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="results-view">
      {results.length > 0 && (
        <>
          <div className="export-actions" style={{ marginBottom: '15px', display: 'flex', gap: '10px' }}>
            <button onClick={exportToPDF} className="btn-export" disabled={completedEntries.length === 0}>
              📄 Export to PDF
            </button>
            <button onClick={exportToCSV} className="btn-export" disabled={completedEntries.length === 0}>
              📊 Export to CSV
            </button>
            <button onClick={exportToXLSX} className="btn-export" disabled={completedEntries.length === 0}>
              📗 Export to XLSX
            </button>
          </div>
          
          <div className="results-summary">
            <p><strong>Total Entries:</strong> {results.length}</p>
            <p><strong>Completed Scores:</strong> {completedEntries.length}</p>
            <p><strong>Pending:</strong> {emptyEntries.length}</p>
          </div>

          <div className="filter-toggle">
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={showOnlyEmpty}
                onChange={(e) => setShowOnlyEmpty(e.target.checked)}
              />
              <span>Show Only Empty Entries (Without Scores)</span>
            </label>
          </div>

          {displayEntries.length > 0 ? (
            <table className="results-table">
              <thead>
                <tr>
                  <th 
                    onClick={() => handleSort('rank')} 
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    title="Click to sort"
                  >
                    Rank <SortIcon column="rank" />
                  </th>
                  <th 
                    onClick={() => handleSort('token')} 
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    title="Click to sort"
                  >
                    Dance Token <SortIcon column="token" />
                  </th>
                  <th 
                    onClick={() => handleSort('participant')} 
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    title="Click to sort"
                  >
                    Participant(s) <SortIcon column="participant" />
                  </th>
                  <th 
                    onClick={() => handleSort('judge1')} 
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    title="Click to sort"
                  >
                    Judge 1 <SortIcon column="judge1" />
                  </th>
                  <th 
                    onClick={() => handleSort('judge2')} 
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    title="Click to sort"
                  >
                    Judge 2 <SortIcon column="judge2" />
                  </th>
                  <th 
                    onClick={() => handleSort('judge3')} 
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    title="Click to sort"
                  >
                    Judge 3 <SortIcon column="judge3" />
                  </th>
                  <th 
                    onClick={() => handleSort('total')} 
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    title="Click to sort"
                  >
                    Total Score <SortIcon column="total" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayEntries.map((result) => (
                  <tr key={result.entryId} className={!result.totalScore ? 'empty-entry' : ''}>
                    <td className="rank">{result.rank ? `#${result.rank}` : '-'}</td>
                    <td className="dance-token"><strong>{result.categoryCode}{String(result.entryNumber).padStart(2, '0')}</strong></td>
                    <td>
                      {result.participant1Name}
                      {result.participant2Name && <><br /><span className="participant2">{result.participant2Name}</span></>}
                    </td>
                    <td>{result.judge1Score?.totalScore || '-'}</td>
                    <td>{result.judge2Score?.totalScore || '-'}</td>
                    <td>{result.judge3Score?.totalScore || '-'}</td>
                    <td className="average-score"><strong>{result.totalScore ? result.totalScore.toFixed(2) : '-'}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="no-scores">
              <p>{showOnlyEmpty ? 'All entries have been scored!' : 'No entries to display'}</p>
            </div>
          )}
        </>
      )}

      {results.length === 0 && (
        <p>No entries found for this category</p>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Settings — backup & restore entire database as JSON
   ═══════════════════════════════════════════════════════════ */
function SettingsView() {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [previewCounts, setPreviewCounts] = useState<{
    users: number;
    judges: number;
    danceCategories: number;
    danceEntries: number;
    scores: number;
  } | null>(null);
  const [exportedAt, setExportedAt] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  // ─── XAMPP Remote Backup settings (persisted in localStorage) ───
  const [xamppEnabled, setXamppEnabled] = useState<boolean>(
    () => localStorage.getItem('dj-xampp-enabled') === 'true'
  );
  const [dbHost, setDbHost] = useState<string>(
    () => localStorage.getItem('dj-xampp-host') || 'localhost'
  );
  const [dbPort, setDbPort] = useState<string>(
    () => localStorage.getItem('dj-xampp-port') || '3306'
  );
  const [dbName, setDbName] = useState<string>(
    () => localStorage.getItem('dj-xampp-dbname') || 'dancejudge'
  );
  const [dbUser, setDbUser] = useState<string>(
    () => localStorage.getItem('dj-xampp-user') || 'root'
  );
  const [proxyUrl, setProxyUrl] = useState<string>(
    () => localStorage.getItem('dj-xampp-proxy-url') || 'http://localhost/dancejudge-proxy'
  );
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(
    () => localStorage.getItem('dj-xampp-last-sync')
  );

  const [connStatus, setConnStatus] = useState<'idle' | 'busy' | 'ok' | 'error'>('idle');
  const [connMessage, setConnMessage] = useState<string>('');
  const [xamppSyncStatus, setXamppSyncStatus] = useState<'idle' | 'busy' | 'ok' | 'error'>('idle');
  const [xamppSyncMessage, setXamppSyncMessage] = useState<string>('');
  const [xamppRestoreStatus, setXamppRestoreStatus] = useState<'idle' | 'busy' | 'ok' | 'error'>('idle');
  const [xamppRestoreMessage, setXamppRestoreMessage] = useState<string>('');
  const [phpCopied, setPhpCopied] = useState<boolean>(false);

  // Persist XAMPP settings to localStorage whenever they change
  useEffect(() => { localStorage.setItem('dj-xampp-enabled', String(xamppEnabled)); }, [xamppEnabled]);
  useEffect(() => { localStorage.setItem('dj-xampp-host', dbHost); }, [dbHost]);
  useEffect(() => { localStorage.setItem('dj-xampp-port', dbPort); }, [dbPort]);
  useEffect(() => { localStorage.setItem('dj-xampp-dbname', dbName); }, [dbName]);
  useEffect(() => { localStorage.setItem('dj-xampp-user', dbUser); }, [dbUser]);
  useEffect(() => { localStorage.setItem('dj-xampp-proxy-url', proxyUrl); }, [proxyUrl]);

  const phpProxyFullUrl = `${proxyUrl.replace(/\/$/, '')}/proxy.php`;

  const formatTimestamp = (): string => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const DD = pad(d.getDate());
    const MM = pad(d.getMonth() + 1);
    const YY = pad(d.getFullYear() % 100);
    const HH = pad(d.getHours());
    const MI = pad(d.getMinutes());
    const SS = pad(d.getSeconds());
    return `${DD}${MM}${YY}_${HH}${MI}${SS}`;
  };

  const handleExport = async () => {
    setExporting(true);
    setMessage(null);
    try {
      const response = await apiService.exportDatabase();
      const blob = new Blob([JSON.stringify(response.data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const filename = `dance-judge-backup_${formatTimestamp()}.json`;
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setMessage({
        type: 'success',
        text: `Downloaded ${filename}`,
      });
    } catch (err: any) {
      // Surface as much diagnostic info as we can — helps identify
      // 404 (route not registered / backend not restarted) vs 500 vs network error
      let text = 'Export failed';
      if (err.response) {
        const status = err.response.status;
        const body = err.response.data;
        const serverMsg =
          typeof body === 'string' ? body : body?.error || body?.message;
        text = `Export failed — HTTP ${status}${serverMsg ? ': ' + serverMsg : ''}`;
        if (status === 404) {
          text += ' (is the backend restarted with the new /api/admin route?)';
        }
      } else if (err.request) {
        text = 'Export failed — no response from server (is the backend running?)';
      } else if (err.message) {
        text = `Export failed — ${err.message}`;
      }
      console.error('Export error:', err);
      setMessage({ type: 'error', text });
    } finally {
      setExporting(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setImportFile(file);
    setPreviewCounts(null);
    setExportedAt(null);
    setMessage(null);

    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (parsed?.data) {
        setPreviewCounts({
          users: parsed.data.users?.length || 0,
          judges: parsed.data.judges?.length || 0,
          danceCategories: parsed.data.danceCategories?.length || 0,
          danceEntries: parsed.data.danceEntries?.length || 0,
          scores: parsed.data.scores?.length || 0,
        });
        setExportedAt(parsed.exportedAt || null);
      }
    } catch {
      setMessage({ type: 'error', text: 'Selected file is not valid JSON' });
    }
  };

  const handleImport = async () => {
    if (!importFile) return;

    const confirmed = window.confirm(
      'WARNING\n\nImporting will REPLACE ALL existing data — users, judges, categories, entries and scores. This cannot be undone.\n\nContinue?'
    );
    if (!confirmed) return;

    setImporting(true);
    setMessage(null);
    try {
      const text = await importFile.text();
      const payload = JSON.parse(text);
      const response = await apiService.importDatabase(payload);
      const c = response.data.counts;
      setMessage({
        type: 'success',
        text: `Database restored · ${c.users} users, ${c.judges} judges, ${c.danceEntries} entries, ${c.scores} scores.`,
      });
      setImportFile(null);
      setPreviewCounts(null);
      setExportedAt(null);
      if (importInputRef.current) importInputRef.current.value = '';
    } catch (err: any) {
      if (err instanceof SyntaxError) {
        setMessage({ type: 'error', text: 'Invalid JSON file' });
      } else {
        let text = 'Import failed';
        if (err.response) {
          const status = err.response.status;
          const body = err.response.data;
          const serverMsg =
            typeof body === 'string' ? body : body?.error || body?.message;
          text = `Import failed — HTTP ${status}${serverMsg ? ': ' + serverMsg : ''}`;
          if (status === 404) {
            text += ' (is the backend restarted with the new /api/admin route?)';
          }
        } else if (err.request) {
          text = 'Import failed — no response from server';
        } else if (err.message) {
          text = `Import failed — ${err.message}`;
        }
        console.error('Import error:', err);
        setMessage({ type: 'error', text });
      }
    } finally {
      setImporting(false);
    }
  };

  // ─── XAMPP: test proxy reachability ──────────────────────────
  const handleTestConnection = async () => {
    setConnStatus('busy');
    setConnMessage('');
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(`${phpProxyFullUrl}?action=health`, { signal: controller.signal });
      clearTimeout(timeout);
      if (res.ok) {
        const json = await res.json();
        setConnStatus('ok');
        setConnMessage(json.message || 'Connected successfully.');
      } else {
        const err = await res.text();
        setConnStatus('error');
        setConnMessage(`Proxy responded ${res.status}: ${err.slice(0, 200)}`);
      }
    } catch (err: any) {
      setConnStatus('error');
      setConnMessage(
        `Could not reach ${phpProxyFullUrl} — make sure XAMPP (Apache + MySQL) is running and proxy.php exists at that path.`
      );
    }
  };

  // ─── XAMPP: push current SQLite data → MySQL via PHP proxy ───
  const handleSyncToXampp = async () => {
    setXamppSyncStatus('busy');
    setXamppSyncMessage('');
    try {
      // Step 1: fetch a fresh snapshot from our Node backend
      const exportResp = await apiService.exportDatabase();

      // Step 2: POST the payload to the PHP proxy
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);
      const res = await fetch(`${phpProxyFullUrl}?action=sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(exportResp.data),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.ok) {
        const json = await res.json();
        const now = new Date().toISOString();
        localStorage.setItem('dj-xampp-last-sync', now);
        setLastSyncAt(now);
        setXamppSyncStatus('ok');
        const c = json.counts || {};
        setXamppSyncMessage(
          `Synced to MySQL · ${c.users || 0} users, ${c.judges || 0} judges, ${c.entries || 0} entries, ${c.scores || 0} scores.`
        );
      } else {
        const err = await res.text();
        setXamppSyncStatus('error');
        setXamppSyncMessage(`Proxy sync failed (${res.status}): ${err.slice(0, 200)}`);
      }
    } catch (err: any) {
      setXamppSyncStatus('error');
      if (err?.response) {
        setXamppSyncMessage(
          `Backend export failed: HTTP ${err.response.status}. Make sure the Node backend is running.`
        );
      } else {
        setXamppSyncMessage(
          `Sync failed: ${err?.message || 'network error'}. Is XAMPP's Apache running?`
        );
      }
    } finally {
      // Leave status alone so the banner persists
    }
  };

  // ─── XAMPP: pull snapshot from MySQL → restore into SQLite ────
  const handleRestoreFromXampp = async () => {
    const confirmed = window.confirm(
      'WARNING\n\nRestoring from XAMPP will REPLACE ALL existing SQLite data — users, judges, categories, entries and scores — with the snapshot stored in MySQL. This cannot be undone.\n\nContinue?'
    );
    if (!confirmed) return;

    setXamppRestoreStatus('busy');
    setXamppRestoreMessage('');
    try {
      // Step 1: pull the stored snapshot from the PHP proxy
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);
      const res = await fetch(`${phpProxyFullUrl}?action=load`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) {
        const errText = await res.text();
        setXamppRestoreStatus('error');
        setXamppRestoreMessage(
          `Proxy load failed (${res.status}): ${errText.slice(0, 200)}`
        );
        return;
      }

      const payload = await res.json();
      if (!payload || !payload.data) {
        setXamppRestoreStatus('error');
        setXamppRestoreMessage(
          'Snapshot from MySQL is missing the "data" field. Sync may have never run.'
        );
        return;
      }

      // Step 2: hand it to our existing backend import endpoint
      const importResp = await apiService.importDatabase(payload);
      const c = importResp.data.counts || {};
      setXamppRestoreStatus('ok');
      setXamppRestoreMessage(
        `Restored from MySQL · ${c.users || 0} users, ${c.judges || 0} judges, ${c.danceEntries || 0} entries, ${c.scores || 0} scores. SQLite is now in sync with the MySQL mirror.`
      );
    } catch (err: any) {
      setXamppRestoreStatus('error');
      if (err?.response) {
        setXamppRestoreMessage(
          `SQLite import failed: HTTP ${err.response.status} — ${
            err.response.data?.error || 'unknown error'
          }`
        );
      } else if (err?.name === 'AbortError') {
        setXamppRestoreMessage('Request timed out after 30s.');
      } else {
        setXamppRestoreMessage(
          `Restore failed: ${err?.message || 'network error'}. Is XAMPP running?`
        );
      }
    }
  };

  // ─── PHP proxy script (live-generated with current config) ───
  const phpScript = `<?php
// Dance Judge Scoring — XAMPP Remote Backup Proxy
// Place at: C:\\xampp\\htdocs\\dancejudge-proxy\\proxy.php

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit(0); }

$host     = '${dbHost}';
$port     = ${dbPort || 3306};
$dbname   = '${dbName}';
$user     = '${dbUser}';
$password = '';   // XAMPP default is empty — set if you changed MySQL root pw

$action = $_GET['action'] ?? '';

try {
    $pdo = new PDO(
        "mysql:host=$host;port=$port;dbname=$dbname;charset=utf8mb4",
        $user, $password,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );

    // Schema (idempotent — safe to run every request)
    $pdo->exec("CREATE TABLE IF NOT EXISTS dj_users (
        id VARCHAR(64) PRIMARY KEY,
        username VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        password VARCHAR(255) NOT NULL,
        role VARCHAR(32) NOT NULL,
        createdAt VARCHAR(64) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    $pdo->exec("CREATE TABLE IF NOT EXISTS dj_judges (
        id VARCHAR(64) PRIMARY KEY,
        userId VARCHAR(64) NOT NULL,
        name VARCHAR(255) NOT NULL,
        assignedCategories TEXT NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    $pdo->exec("CREATE TABLE IF NOT EXISTS dj_categories (
        id VARCHAR(64) PRIMARY KEY,
        code VARCHAR(32) NOT NULL,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(32) NOT NULL,
        createdAt VARCHAR(64) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    $pdo->exec("CREATE TABLE IF NOT EXISTS dj_entries (
        id VARCHAR(64) PRIMARY KEY,
        categoryId VARCHAR(64) NOT NULL,
        categoryCode VARCHAR(32) NOT NULL,
        entryNumber INT NOT NULL,
        participant1Name VARCHAR(255) NOT NULL,
        participant2Name VARCHAR(255),
        createdAt VARCHAR(64) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    $pdo->exec("CREATE TABLE IF NOT EXISTS dj_scores (
        id VARCHAR(64) PRIMARY KEY,
        entryId VARCHAR(64) NOT NULL,
        judgeId VARCHAR(64) NOT NULL,
        costumAndImpression INT NOT NULL,
        movementsAndRhythm INT NOT NULL,
        postureAndMudra INT NOT NULL,
        totalScore INT NOT NULL,
        submittedAt VARCHAR(64) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    $pdo->exec("CREATE TABLE IF NOT EXISTS dj_snapshot_meta (
        id INT PRIMARY KEY DEFAULT 1,
        exported_at VARCHAR(64),
        synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        raw_json LONGTEXT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    if ($action === 'health') {
        echo json_encode(['message' => "Connected to MySQL at $host:$port/$dbname"]);

    } elseif ($action === 'sync') {
        $body = file_get_contents('php://input');
        if (!$body) { http_response_code(400); echo json_encode(['error' => 'No data received']); exit; }

        $payload = json_decode($body, true);
        if (!$payload || !isset($payload['data'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid payload: missing "data"']);
            exit;
        }

        $data = $payload['data'];

        $pdo->beginTransaction();
        try {
            $pdo->exec("DELETE FROM dj_scores");
            $pdo->exec("DELETE FROM dj_entries");
            $pdo->exec("DELETE FROM dj_judges");
            $pdo->exec("DELETE FROM dj_categories");
            $pdo->exec("DELETE FROM dj_users");

            $ins = $pdo->prepare("INSERT INTO dj_users (id, username, email, password, role, createdAt) VALUES (?, ?, ?, ?, ?, ?)");
            foreach (($data['users'] ?? []) as $u) {
                $ins->execute([$u['id'], $u['username'], $u['email'] ?? null, $u['password'], $u['role'], $u['createdAt']]);
            }

            $ins = $pdo->prepare("INSERT INTO dj_categories (id, code, name, type, createdAt) VALUES (?, ?, ?, ?, ?)");
            foreach (($data['danceCategories'] ?? []) as $c) {
                $ins->execute([$c['id'], $c['code'], $c['name'], $c['type'], $c['createdAt']]);
            }

            $ins = $pdo->prepare("INSERT INTO dj_judges (id, userId, name, assignedCategories) VALUES (?, ?, ?, ?)");
            foreach (($data['judges'] ?? []) as $j) {
                $assigned = is_array($j['assignedCategories'])
                    ? json_encode($j['assignedCategories'])
                    : ($j['assignedCategories'] ?? '[]');
                $ins->execute([$j['id'], $j['userId'], $j['name'], $assigned]);
            }

            $ins = $pdo->prepare("INSERT INTO dj_entries (id, categoryId, categoryCode, entryNumber, participant1Name, participant2Name, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)");
            foreach (($data['danceEntries'] ?? []) as $e) {
                $ins->execute([$e['id'], $e['categoryId'], $e['categoryCode'], $e['entryNumber'], $e['participant1Name'], $e['participant2Name'] ?? null, $e['createdAt']]);
            }

            $ins = $pdo->prepare("INSERT INTO dj_scores (id, entryId, judgeId, costumAndImpression, movementsAndRhythm, postureAndMudra, totalScore, submittedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
            foreach (($data['scores'] ?? []) as $s) {
                $ins->execute([$s['id'], $s['entryId'], $s['judgeId'], $s['costumAndImpression'], $s['movementsAndRhythm'], $s['postureAndMudra'], $s['totalScore'], $s['submittedAt']]);
            }

            $meta = $pdo->prepare("INSERT INTO dj_snapshot_meta (id, exported_at, raw_json) VALUES (1, ?, ?) ON DUPLICATE KEY UPDATE exported_at = ?, raw_json = ?");
            $exportedAt = $payload['exportedAt'] ?? null;
            $meta->execute([$exportedAt, $body, $exportedAt, $body]);

            $pdo->commit();

            echo json_encode([
                'ok' => true,
                'counts' => [
                    'users'      => count($data['users']          ?? []),
                    'judges'     => count($data['judges']         ?? []),
                    'categories' => count($data['danceCategories']?? []),
                    'entries'    => count($data['danceEntries']   ?? []),
                    'scores'     => count($data['scores']         ?? []),
                ]
            ]);
        } catch (Exception $e) {
            $pdo->rollBack();
            throw $e;
        }

    } elseif ($action === 'load') {
        $stmt = $pdo->query("SELECT raw_json, exported_at FROM dj_snapshot_meta WHERE id = 1");
        $row  = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row || !$row['raw_json']) {
            http_response_code(404);
            echo json_encode(['error' => 'No snapshot found in MySQL. Run Sync first.']);
            exit;
        }
        // raw_json is the exact payload that was synced — pass through verbatim
        echo $row['raw_json'];

    } else {
        http_response_code(400);
        echo json_encode(['error' => 'Unknown action. Use ?action=health|sync|load']);
    }

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>`;

  const handleCopyPhp = async () => {
    try {
      await navigator.clipboard.writeText(phpScript);
      setPhpCopied(true);
      setTimeout(() => setPhpCopied(false), 1800);
    } catch {
      /* noop */
    }
  };

  return (
    <div className="settings-view">
      {message && (
        <div className={`settings-message ${message.type}`}>
          <span className="settings-message-mark">{message.type === 'success' ? '✓' : '!'}</span>
          <span>{message.text}</span>
        </div>
      )}

      <div className="settings-grid">
        {/* Export card */}
        <article className="settings-card">
          <div className="settings-card-head">
            <span className="settings-card-eyebrow">Backup</span>
            <h3>Export Database</h3>
          </div>
          <p className="settings-card-body">
            Download a full snapshot of the application — every user, judge,
            category, entry and score — as a single JSON file.
          </p>
          <dl className="settings-card-facts">
            <div>
              <dt>Filename pattern</dt>
              <dd><code>dance-judge-backup_DDMMYY_HHMMSS.json</code></dd>
            </div>
            <div>
              <dt>Scope</dt>
              <dd>Users · Judges · Categories · Entries · Scores</dd>
            </div>
          </dl>
          <button
            type="button"
            className="settings-action"
            onClick={handleExport}
            disabled={exporting}
          >
            <span className="settings-action-label">
              {exporting ? 'Preparing snapshot…' : 'Download JSON Snapshot'}
            </span>
            <span className="settings-action-arrow" aria-hidden>↓</span>
          </button>
        </article>

        {/* Import card */}
        <article className="settings-card settings-card-danger">
          <div className="settings-card-head">
            <span className="settings-card-eyebrow">Restore</span>
            <h3>Import Database</h3>
          </div>
          <p className="settings-card-body">
            Restore from a previously-exported JSON snapshot. <strong>This
            replaces every existing record</strong> and cannot be undone.
          </p>

          <label className="settings-filepicker">
            <input
              ref={importInputRef}
              type="file"
              accept="application/json,.json"
              onChange={handleFileSelect}
              disabled={importing}
            />
            <span className="settings-filepicker-label">
              {importFile ? importFile.name : 'Choose JSON file…'}
            </span>
            <span className="settings-filepicker-cta">
              {importFile ? 'Change' : 'Browse'}
            </span>
          </label>

          {previewCounts && (
            <dl className="settings-card-facts">
              {exportedAt && (
                <div>
                  <dt>Exported at</dt>
                  <dd>{new Date(exportedAt).toLocaleString()}</dd>
                </div>
              )}
              <div>
                <dt>Users</dt>
                <dd>{previewCounts.users}</dd>
              </div>
              <div>
                <dt>Judges</dt>
                <dd>{previewCounts.judges}</dd>
              </div>
              <div>
                <dt>Categories</dt>
                <dd>{previewCounts.danceCategories}</dd>
              </div>
              <div>
                <dt>Entries</dt>
                <dd>{previewCounts.danceEntries}</dd>
              </div>
              <div>
                <dt>Scores</dt>
                <dd>{previewCounts.scores}</dd>
              </div>
            </dl>
          )}

          <button
            type="button"
            className="settings-action settings-action-danger"
            onClick={handleImport}
            disabled={!importFile || importing || !previewCounts}
          >
            <span className="settings-action-label">
              {importing ? 'Restoring…' : 'Restore from Snapshot'}
            </span>
            <span className="settings-action-arrow" aria-hidden>↻</span>
          </button>
        </article>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          XAMPP Remote Backup (one-way: SQLite → MySQL)
          ═══════════════════════════════════════════════════════════ */}
      <div className="settings-divider">
        <span className="settings-divider-line" />
        <span className="settings-divider-label">Remote Backup</span>
        <span className="settings-divider-line" />
      </div>

      <article
        className={`settings-card settings-card-wide ${xamppEnabled ? 'xampp-on' : 'xampp-off'}`}
      >
        <div className="settings-card-head xampp-head">
          <div>
            <span className="settings-card-eyebrow">Mirror</span>
            <h3>Sync to XAMPP (MySQL)</h3>
          </div>
          <button
            type="button"
            className={`xampp-toggle ${xamppEnabled ? 'on' : 'off'}`}
            onClick={() => setXamppEnabled((v) => !v)}
            aria-pressed={xamppEnabled}
            aria-label="Toggle XAMPP sync"
          >
            <span className="xampp-toggle-track">
              <span className="xampp-toggle-thumb" />
            </span>
            <span className="xampp-toggle-label">
              {xamppEnabled ? 'Enabled' : 'Disabled'}
            </span>
          </button>
        </div>

        <p className="settings-card-body">
          <strong>SQLite remains the primary store.</strong> When enabled, the full
          database can be pushed to a local MySQL instance (via XAMPP) as a backup
          mirror. No data is read back from MySQL — restore goes through the
          JSON Import panel above.
          {lastSyncAt && (
            <>
              <br />
              <span className="xampp-last-sync">
                Last synced: <b>{new Date(lastSyncAt).toLocaleString()}</b>
              </span>
            </>
          )}
        </p>

        {xamppEnabled && (
          <>
            <div className="xampp-config">
              <div className="xampp-field">
                <label htmlFor="dj-xampp-host">Host</label>
                <input
                  id="dj-xampp-host"
                  type="text"
                  value={dbHost}
                  onChange={(e) => setDbHost(e.target.value)}
                  placeholder="localhost"
                />
              </div>
              <div className="xampp-field">
                <label htmlFor="dj-xampp-port">MySQL Port</label>
                <input
                  id="dj-xampp-port"
                  type="text"
                  value={dbPort}
                  onChange={(e) => setDbPort(e.target.value)}
                  placeholder="3306"
                />
              </div>
              <div className="xampp-field">
                <label htmlFor="dj-xampp-dbname">Database Name</label>
                <input
                  id="dj-xampp-dbname"
                  type="text"
                  value={dbName}
                  onChange={(e) => setDbName(e.target.value)}
                  placeholder="dancejudge"
                />
              </div>
              <div className="xampp-field">
                <label htmlFor="dj-xampp-user">MySQL User</label>
                <input
                  id="dj-xampp-user"
                  type="text"
                  value={dbUser}
                  onChange={(e) => setDbUser(e.target.value)}
                  placeholder="root"
                />
              </div>
              <div className="xampp-field xampp-field-wide">
                <label htmlFor="dj-xampp-proxy">Proxy URL</label>
                <input
                  id="dj-xampp-proxy"
                  type="text"
                  value={proxyUrl}
                  onChange={(e) => setProxyUrl(e.target.value)}
                  placeholder="http://localhost/dancejudge-proxy"
                />
                <small>
                  Folder in <code>C:\xampp\htdocs\</code> that holds <code>proxy.php</code>
                </small>
              </div>
            </div>

            <div className="xampp-actions">
              <button
                type="button"
                className="settings-action settings-action-ghost"
                onClick={handleTestConnection}
                disabled={connStatus === 'busy'}
              >
                <span className="settings-action-label">
                  {connStatus === 'busy' ? 'Testing…' : 'Test Connection'}
                </span>
                <span className="settings-action-arrow" aria-hidden>◈</span>
              </button>
              <button
                type="button"
                className="settings-action"
                onClick={handleSyncToXampp}
                disabled={xamppSyncStatus === 'busy'}
              >
                <span className="settings-action-label">
                  {xamppSyncStatus === 'busy' ? 'Syncing…' : 'Sync Now'}
                </span>
                <span className="settings-action-arrow" aria-hidden>↗</span>
              </button>
            </div>

            {connStatus === 'ok' && (
              <div className="xampp-status ok">
                <span>✓</span>
                <span>{connMessage}</span>
              </div>
            )}
            {connStatus === 'error' && (
              <div className="xampp-status err">
                <span>!</span>
                <span>{connMessage}</span>
              </div>
            )}
            {xamppSyncStatus === 'ok' && (
              <div className="xampp-status ok">
                <span>✓</span>
                <span>{xamppSyncMessage}</span>
              </div>
            )}
            {xamppSyncStatus === 'error' && (
              <div className="xampp-status err">
                <span>!</span>
                <span>{xamppSyncMessage}</span>
              </div>
            )}

            {/* Reverse flow: pull MySQL snapshot → restore into SQLite */}
            <div className="xampp-restore-row">
              <div className="xampp-restore-copy">
                <span className="xampp-restore-eyebrow">Restore</span>
                <span className="xampp-restore-text">
                  Pull the MySQL snapshot back into SQLite.{' '}
                  <strong>Replaces all local data.</strong>
                </span>
              </div>
              <button
                type="button"
                className="settings-action settings-action-danger"
                onClick={handleRestoreFromXampp}
                disabled={xamppRestoreStatus === 'busy'}
              >
                <span className="settings-action-label">
                  {xamppRestoreStatus === 'busy' ? 'Restoring…' : 'Restore from XAMPP'}
                </span>
                <span className="settings-action-arrow" aria-hidden>↙</span>
              </button>
            </div>

            {xamppRestoreStatus === 'ok' && (
              <div className="xampp-status ok">
                <span>✓</span>
                <span>{xamppRestoreMessage}</span>
              </div>
            )}
            {xamppRestoreStatus === 'error' && (
              <div className="xampp-status err">
                <span>!</span>
                <span>{xamppRestoreMessage}</span>
              </div>
            )}

            {/* PHP setup instructions */}
            <details className="xampp-setup">
              <summary>
                <span>XAMPP Setup Guide · How to deploy (one-time setup)</span>
                <span className="xampp-setup-toggle">▾</span>
              </summary>

              <ol className="xampp-steps">
                <li>
                  <strong>Start XAMPP</strong> — open the XAMPP Control Panel and click <em>Start</em> next to both <em>Apache</em> and <em>MySQL</em>.
                </li>
                <li>
                  <strong>Create the database</strong> — open{' '}
                  <a href="http://localhost/phpmyadmin" target="_blank" rel="noreferrer">phpMyAdmin</a>
                  {' '}and create the <code>{dbName}</code> database, or just run this SQL:
                  <pre className="xampp-sql">{`CREATE DATABASE IF NOT EXISTS \`${dbName}\`
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`}</pre>
                </li>
                <li>
                  <strong>Create the proxy folder</strong> —{' '}
                  <code>C:\xampp\htdocs\{proxyUrl.replace(/^https?:\/\/[^/]+\//, '').replace(/\/$/, '') || 'dancejudge-proxy'}\</code>
                </li>
                <li>
                  <strong>Paste the PHP script</strong> into <code>proxy.php</code> inside that folder:
                  <div className="xampp-php-wrap">
                    <button
                      type="button"
                      className="xampp-copy-btn"
                      onClick={handleCopyPhp}
                    >
                      {phpCopied ? '✓ Copied' : 'Copy PHP'}
                    </button>
                    <pre className="xampp-php">{phpScript}</pre>
                  </div>
                </li>
                <li>
                  <strong>Toggle Remote Backup ON</strong> in this Settings panel (the switch at the top of this card) if not already enabled.
                </li>
                <li>
                  <strong>Click Test Connection</strong> — a green banner confirms you're wired up. You can also verify directly by visiting{' '}
                  <code>{phpProxyFullUrl}?action=health</code> in a browser tab.
                </li>
                <li>
                  <strong>Click Sync Now</strong> — data flows from SQLite → MySQL. Use <em>Restore from XAMPP</em> for the reverse direction.
                </li>
              </ol>

              <div className="xampp-setup-note">
                <span className="xampp-setup-note-eyebrow">Once deployed</span>
                <p>
                  One click = fresh mirror. <a href="http://localhost/phpmyadmin" target="_blank" rel="noreferrer">phpMyAdmin</a> lets you query,
                  inspect and export the MySQL copy at any time. SQLite keeps handling live
                  reads and writes for the app — nothing about the day-to-day flow changes.
                </p>
              </div>
            </details>
          </>
        )}
      </article>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Top Rank Holders — overall ranking across every category
   ═══════════════════════════════════════════════════════════ */
function TopRankHoldersView({ categories }: { categories: string[] }) {
  const [topN, setTopN] = useState<number>(3);
  const [dataByCategory, setDataByCategory] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadAll = async () => {
    setLoading(true);
    setError('');
    try {
      const result: Record<string, any[]> = {};
      for (const cat of categories) {
        const res = await apiService.getScoresByCategory(cat);
        result[cat] = res.data;
      }
      setDataByCategory(result);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load category data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-indicator">
        <div className="spinner" />
        <p>Loading every category…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-message">
        <strong>Error:</strong> {error}
        <br />
        <button onClick={loadAll}>Retry</button>
      </div>
    );
  }

  return (
    <div className="toprank-view">
      <div className="toprank-controls">
        <label>Show Top</label>
        <select value={topN} onChange={(e) => setTopN(Number(e.target.value))}>
          {[3, 4, 5, 6, 7, 8].map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
        <span className="toprank-helper">per category</span>
      </div>

      <div className="toprank-grid">
        {categories.map((cat) => {
          const completed = (dataByCategory[cat] || [])
            .filter((e: any) => e.rank)
            .sort((a: any, b: any) => (a.rank || 99) - (b.rank || 99))
            .slice(0, topN);

          return (
            <section key={cat} className="toprank-category">
              <header className="toprank-cat-header">
                <h3>{cat}</h3>
                <span className="toprank-cat-meta">
                  {completed.length} of top {topN}
                </span>
              </header>

              {completed.length > 0 ? (
                <ol className="toprank-list">
                  {completed.map((entry: any) => (
                    <li key={entry.entryId} className={`toprank-row rank-${entry.rank}`}>
                      <span className="toprank-rank">
                        {entry.rank === 1 ? 'I' : entry.rank === 2 ? 'II' : entry.rank === 3 ? 'III' : `#${entry.rank}`}
                      </span>
                      <span className="toprank-token">
                        {cat}{String(entry.entryNumber).padStart(2, '0')}
                      </span>
                      <span className="toprank-name">
                        {entry.participant1Name}
                        {entry.participant2Name && (
                          <em> &amp; {entry.participant2Name}</em>
                        )}
                      </span>
                      <span className="toprank-score">
                        {entry.totalScore != null ? entry.totalScore.toFixed(2) : '—'}
                      </span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="toprank-empty">No fully-judged entries yet</p>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Criterion Stars — top 3 per criterion per category
   (Costume · Movements · Posture)
   ═══════════════════════════════════════════════════════════ */
function CriterionStarsView({ categories }: { categories: string[] }) {
  const [dataByCategory, setDataByCategory] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadAll = async () => {
    setLoading(true);
    setError('');
    try {
      const result: Record<string, any[]> = {};
      for (const cat of categories) {
        const res = await apiService.getScoresByCategory(cat);
        result[cat] = res.data;
      }
      setDataByCategory(result);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load category data');
    } finally {
      setLoading(false);
    }
  };

  const criteria = [
    { key: 'costumAndImpression', label: 'Costume' },
    { key: 'movementsAndRhythm', label: 'Movements' },
    { key: 'postureAndMudra', label: 'Posture' },
  ] as const;

  const totalForCriterion = (entry: any, key: string): number | null => {
    const j1 = entry.judge1Score?.[key];
    const j2 = entry.judge2Score?.[key];
    const j3 = entry.judge3Score?.[key];
    if (j1 == null || j2 == null || j3 == null) return null;
    return j1 + j2 + j3;
  };

  if (loading) {
    return (
      <div className="loading-indicator">
        <div className="spinner" />
        <p>Loading every category…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-message">
        <strong>Error:</strong> {error}
        <br />
        <button onClick={loadAll}>Retry</button>
      </div>
    );
  }

  return (
    <div className="criterion-view">
      <div className="criterion-legend">
        <span>Top 3 entries per criterion, per category</span>
        <span className="criterion-legend-rule" />
        <span>Scores summed across all three judges · max 30</span>
      </div>

      {categories.map((cat) => {
        const entries = dataByCategory[cat] || [];
        const anyScored = entries.some((e) =>
          criteria.some((c) => totalForCriterion(e, c.key) !== null)
        );

        return (
          <section key={cat} className="criterion-category">
            <header className="criterion-cat-header">
              <h3>{cat}</h3>
              <span className="criterion-cat-meta">
                {entries.length} {entries.length === 1 ? 'Entry' : 'Entries'}
              </span>
            </header>

            {!anyScored ? (
              <p className="criterion-empty">No fully-judged entries yet</p>
            ) : (
              <div className="criterion-columns">
                {criteria.map((crit) => {
                  const ranked = entries
                    .map((e: any) => ({
                      entry: e,
                      total: totalForCriterion(e, crit.key),
                    }))
                    .filter((x) => x.total !== null)
                    .sort((a, b) => (b.total || 0) - (a.total || 0))
                    .slice(0, 3);

                  return (
                    <div key={crit.key} className="criterion-col">
                      <h4>{crit.label}</h4>
                      {ranked.length > 0 ? (
                        <ol>
                          {ranked.map((x, i) => (
                            <li key={x.entry.entryId} className={`pos-${i + 1}`}>
                              <span className="pos">{i + 1}</span>
                              <span className="meta">
                                <span className="token">
                                  {cat}{String(x.entry.entryNumber).padStart(2, '0')}
                                </span>
                                <span className="name">
                                  {x.entry.participant1Name}
                                  {x.entry.participant2Name && (
                                    <em> &amp; {x.entry.participant2Name}</em>
                                  )}
                                </span>
                              </span>
                              <span className="pts">{x.total}<small>/30</small></span>
                            </li>
                          ))}
                        </ol>
                      ) : (
                        <p className="criterion-empty-col">—</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

function ManageParticipantsView({ categories }: { categories: string[] }) {
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [participants, setParticipants] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [editingEntry, setEditingEntry] = useState<any>(null);
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadParticipants();
    setSelectedEntries(new Set()); // Clear selection when category changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory]);

  const loadParticipants = async () => {
    setLoading(true);
    setError('');
    try {
      if (selectedCategory === 'ALL') {
        // Load all categories
        const allData: any[] = [];
        for (const cat of categories) {
          const response = await apiService.getScoresByCategory(cat);
          allData.push(...response.data);
        }
        console.log('Loaded all participants:', allData);
        setParticipants(allData);
      } else {
        const response = await apiService.getScoresByCategory(selectedCategory);
        console.log('Loaded participants for', selectedCategory, ':', response.data);
        setParticipants(response.data);
      }
    } catch (error: any) {
      console.error('Failed to load participants:', error);
      const errorMsg = error.response?.data?.error || error.message || 'Failed to load participants';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (participants.length === 0) {
      alert('No participants to export');
      return;
    }

    // Sort by rank
    const sortedData = [...participants].sort((a, b) => {
      if (!a.rank && !b.rank) return 0;
      if (!a.rank) return 1;
      if (!b.rank) return -1;
      return a.rank - b.rank;
    });

    // Prepare export data
    const exportData = sortedData.map((entry) => ({
      'Cat': entry.categoryCode,
      'S.No': entry.entryNumber,
      'Dance Token': `${entry.categoryCode}${String(entry.entryNumber).padStart(2, '0')}`,
      'Participant Name': entry.participant2Name 
        ? `${entry.participant1Name} & ${entry.participant2Name}`
        : entry.participant1Name,
      'Judge1': entry.judge1Score?.totalScore || '-',
      'Judge2': entry.judge2Score?.totalScore || '-',
      'Judge3': entry.judge3Score?.totalScore || '-',
      'Total Score': entry.averageScore ? entry.averageScore.toFixed(2) : '-',
      'Rank': entry.rank || '-',
      'Remarks': ''
    }));

    // Create worksheet and workbook
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, selectedCategory);

    // Export file
    XLSX.writeFile(wb, `${selectedCategory}_Participants_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleEditClick = (entry: any) => {
    setEditingEntry({
      ...entry,
      originalCategoryCode: entry.categoryCode,
      originalEntryNumber: entry.entryNumber
    });
  };

  const handleCancelEdit = () => {
    setEditingEntry(null);
  };

  const handleSaveEdit = async () => {
    if (!editingEntry) return;

    if (!editingEntry.participant1Name.trim()) {
      alert('Participant name is required');
      return;
    }

    if (!editingEntry.entryNumber || editingEntry.entryNumber < 1) {
      alert('Valid entry number is required');
      return;
    }

    try {
      setLoading(true);
      await apiService.updateEntry(
        editingEntry.entryId,
        editingEntry.categoryCode,
        editingEntry.entryNumber,
        editingEntry.participant1Name.trim(),
        editingEntry.participant2Name?.trim() || undefined
      );
      
      alert('Entry updated successfully');
      setEditingEntry(null);
      
      // Reload data
      if (editingEntry.categoryCode !== editingEntry.originalCategoryCode) {
        // If category changed, reload the new category
        setSelectedCategory(editingEntry.categoryCode);
      } else {
        loadParticipants();
      }
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to update entry');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEntry = async (entry: any) => {
    const confirm = window.confirm(
      `Are you sure you want to delete entry ${entry.categoryCode}${String(entry.entryNumber).padStart(2, '0')}? This will also delete all associated scores.`
    );

    if (!confirm) return;

    try {
      setLoading(true);
      await apiService.deleteEntry(entry.entryId);
      loadParticipants();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to delete entry');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSelection = (entryId: string) => {
    const newSelection = new Set(selectedEntries);
    if (newSelection.has(entryId)) {
      newSelection.delete(entryId);
    } else {
      newSelection.add(entryId);
    }
    setSelectedEntries(newSelection);
  };

  const handleToggleAll = () => {
    if (selectedEntries.size === participants.length) {
      setSelectedEntries(new Set());
    } else {
      setSelectedEntries(new Set(participants.map(p => p.entryId)));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedEntries.size === 0) {
      alert('Please select entries to delete');
      return;
    }

    const confirm = window.confirm(
      `Are you sure you want to delete ${selectedEntries.size} selected entries? This will also delete all associated scores.`
    );

    if (!confirm) return;

    try {
      setLoading(true);
      let successCount = 0;
      let failCount = 0;

      for (const entryId of Array.from(selectedEntries)) {
        try {
          await apiService.deleteEntry(entryId);
          successCount++;
        } catch (error) {
          failCount++;
          console.error(`Failed to delete entry ${entryId}:`, error);
        }
      }

      alert(`Successfully deleted ${successCount} entries.${failCount > 0 ? ` Failed to delete ${failCount} entries.` : ''}`);
      setSelectedEntries(new Set());
      loadParticipants();
    } catch (error: any) {
      alert('Failed to delete selected entries');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAll = async () => {
    if (participants.length === 0) {
      alert('No entries to delete');
      return;
    }

    const categoryText = selectedCategory === 'ALL' ? 'all categories' : `category ${selectedCategory}`;
    const confirm = window.confirm(
      `⚠️ WARNING: Are you sure you want to delete ALL ${participants.length} entries in ${categoryText}? This action cannot be undone and will delete all associated scores!`
    );

    if (!confirm) return;

    const doubleConfirm = window.confirm(
      `This is your final confirmation. Delete ${participants.length} entries?`
    );

    if (!doubleConfirm) return;

    try {
      setLoading(true);
      let successCount = 0;
      let failCount = 0;

      for (const entry of participants) {
        try {
          await apiService.deleteEntry(entry.entryId);
          successCount++;
        } catch (error) {
          failCount++;
          console.error(`Failed to delete entry ${entry.entryId}:`, error);
        }
      }

      alert(`Successfully deleted ${successCount} entries.${failCount > 0 ? ` Failed to delete ${failCount} entries.` : ''}`);
      setSelectedEntries(new Set());
      loadParticipants();
    } catch (error: any) {
      alert('Failed to delete all entries');
    } finally {
      setLoading(false);
    }
  };

  if (loading && participants.length === 0) return <div>Loading participants...</div>;

  if (error) {
    return (
      <div className="error-message" style={{ color: 'red', padding: '20px' }}>
        <strong>Error loading participants:</strong> {error}
        <br />
        <button onClick={loadParticipants} style={{ marginTop: '10px' }}>Retry</button>
      </div>
    );
  }

  return (
    <div className="manage-participants-view">
      <div className="controls-row" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center', marginBottom: '15px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Category:</label>
            <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
              <option value="ALL">ALL</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <strong>Total Entries:</strong> {participants.length}
          </div>
        </div>
        <div className="participants-actions">
          <button onClick={handleExport} className="act-btn act-btn-ghost">
            Export to Excel
          </button>
          <button
            onClick={handleDeleteSelected}
            disabled={selectedEntries.size === 0}
            className="act-btn act-btn-warn"
          >
            Delete Selected ({selectedEntries.size})
          </button>
          <button
            onClick={handleDeleteAll}
            className="act-btn act-btn-danger"
          >
            Delete All
          </button>
        </div>
      </div>

      {participants.length > 0 ? (
        <table className="participants-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f0f0f0' }}>
              <th style={{ padding: '12px', border: '1px solid #ddd', width: '40px' }}>
                <input 
                  type="checkbox" 
                  checked={selectedEntries.size === participants.length && participants.length > 0}
                  onChange={handleToggleAll}
                  style={{ cursor: 'pointer' }}
                />
              </th>
              <th style={{ padding: '12px', border: '1px solid #ddd' }}>Cat</th>
              <th style={{ padding: '12px', border: '1px solid #ddd' }}>S.No</th>
              <th style={{ padding: '12px', border: '1px solid #ddd' }}>Dance Token</th>
              <th style={{ padding: '12px', border: '1px solid #ddd' }}>Participant Name</th>
              <th style={{ padding: '12px', border: '1px solid #ddd' }}>Judge1</th>
              <th style={{ padding: '12px', border: '1px solid #ddd' }}>Judge2</th>
              <th style={{ padding: '12px', border: '1px solid #ddd' }}>Judge3</th>
              <th style={{ padding: '12px', border: '1px solid #ddd' }}>Total Score</th>
              <th style={{ padding: '12px', border: '1px solid #ddd' }}>Rank</th>
              <th style={{ padding: '12px', border: '1px solid #ddd' }}>Remarks</th>
              <th style={{ padding: '12px', border: '1px solid #ddd' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {participants.map((entry) => (
              <tr key={entry.entryId}>
                {editingEntry && editingEntry.entryId === entry.entryId ? (
                  <>
                    <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>
                      <input 
                        type="checkbox" 
                        disabled
                        style={{ cursor: 'not-allowed' }}
                      />
                    </td>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                      <select
                        value={editingEntry.categoryCode}
                        onChange={(e) => setEditingEntry({ ...editingEntry, categoryCode: e.target.value })}
                        style={{ width: '100%', padding: '4px' }}
                      >
                        {categories.map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </td>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                      <input
                        type="number"
                        value={editingEntry.entryNumber}
                        onChange={(e) => setEditingEntry({ ...editingEntry, entryNumber: parseInt(e.target.value) || 0 })}
                        style={{ width: '60px', padding: '4px' }}
                        min="1"
                      />
                    </td>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                      <strong>{editingEntry.categoryCode}{String(editingEntry.entryNumber).padStart(2, '0')}</strong>
                    </td>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                      <input
                        type="text"
                        value={editingEntry.participant1Name}
                        onChange={(e) => setEditingEntry({ ...editingEntry, participant1Name: e.target.value })}
                        style={{ width: '100%', padding: '4px', marginBottom: '4px' }}
                        placeholder="Participant 1"
                      />
                      {editingEntry.categoryCode.startsWith('D') && (
                        <input
                          type="text"
                          value={editingEntry.participant2Name || ''}
                          onChange={(e) => setEditingEntry({ ...editingEntry, participant2Name: e.target.value })}
                          style={{ width: '100%', padding: '4px' }}
                          placeholder="Participant 2 (for duets)"
                        />
                      )}
                    </td>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>{entry.judge1Score?.totalScore || '-'}</td>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>{entry.judge2Score?.totalScore || '-'}</td>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>{entry.judge3Score?.totalScore || '-'}</td>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>{entry.averageScore ? entry.averageScore.toFixed(2) : '-'}</td>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>{entry.rank ? `#${entry.rank}` : '-'}</td>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>-</td>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                      <div className="row-actions">
                        <button
                          type="button"
                          onClick={handleSaveEdit}
                          className="icon-btn icon-btn-save"
                          title="Save changes"
                          aria-label="Save changes"
                        >
                          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M2.5 8.5l3.5 3.5 7.5-7.5" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          className="icon-btn icon-btn-cancel"
                          title="Cancel"
                          aria-label="Cancel"
                        >
                          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3.5 3.5l9 9" />
                            <path d="M12.5 3.5l-9 9" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>
                      <input 
                        type="checkbox" 
                        checked={selectedEntries.has(entry.entryId)}
                        onChange={() => handleToggleSelection(entry.entryId)}
                        style={{ cursor: 'pointer' }}
                      />
                    </td>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>{entry.categoryCode}</td>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>{entry.entryNumber}</td>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                      <strong>{entry.categoryCode}{String(entry.entryNumber).padStart(2, '0')}</strong>
                    </td>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                      {entry.participant1Name}
                      {entry.participant2Name && (
                        <><br /><span style={{ color: '#666' }}>{entry.participant2Name}</span></>
                      )}
                    </td>
                    <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>{entry.judge1Score?.totalScore || '-'}</td>
                    <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>{entry.judge2Score?.totalScore || '-'}</td>
                    <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>{entry.judge3Score?.totalScore || '-'}</td>
                    <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center', fontWeight: 'bold' }}>
                      {entry.averageScore ? entry.averageScore.toFixed(2) : '-'}
                    </td>
                    <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center', fontWeight: 'bold' }}>
                      {entry.rank ? `#${entry.rank}` : '-'}
                    </td>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>-</td>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                      <div className="row-actions">
                        <button
                          type="button"
                          onClick={() => handleEditClick(entry)}
                          className="icon-btn icon-btn-edit"
                          title="Edit entry"
                          aria-label="Edit entry"
                        >
                          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11.5 2.25l2.25 2.25L5 13.25l-3 .75.75-3L11.5 2.25z" />
                            <path d="M10 3.75l2.25 2.25" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteEntry(entry)}
                          className="icon-btn icon-btn-delete"
                          title="Delete entry"
                          aria-label="Delete entry"
                        >
                          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M2.5 4h11" />
                            <path d="M6 2h4" />
                            <path d="M3.75 4l.65 9.25a1.5 1.5 0 001.5 1.4h4.2a1.5 1.5 0 001.5-1.4L12.25 4" />
                            <path d="M6.5 7v5" />
                            <path d="M9.5 7v5" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>No participants found for this category.</p>
      )}
    </div>
  );
}

function ManageUsersView() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    password: '',
    role: 'judge',
    name: '',
    assignedCategories: [] as string[]
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await apiService.getAllUsers();
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to load users:', error);
      alert('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleAddClick = () => {
    setNewUser({
      username: '',
      email: '',
      password: '',
      role: 'judge',
      name: '',
      assignedCategories: []
    });
    setShowAddModal(true);
  };

  const handleCancelAdd = () => {
    setShowAddModal(false);
  };

  const handleSaveNewUser = async () => {
    console.log('=== CREATE USER CLICKED ===');
    console.log('User data:', newUser);
    
    if (!newUser.username.trim()) {
      alert('Username is required');
      return;
    }
    if (!newUser.email.trim()) {
      alert('Email is required');
      return;
    }
    if (!newUser.password.trim()) {
      alert('Password is required');
      return;
    }
    if (newUser.password.length < 4) {
      alert('Password must be at least 4 characters');
      return;
    }
    if (newUser.role === 'judge' && !newUser.name.trim()) {
      alert('Name is required for judge users');
      return;
    }

    try {
      setLoading(true);
      console.log('Sending create user request...');
      const response = await apiService.createUser(newUser);
      console.log('User created successfully:', response.data);
      alert('User created successfully');
      setShowAddModal(false);
      loadUsers();
    } catch (error: any) {
      console.error('Create user error:', error);
      console.error('Error response:', error.response);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to create user';
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (user: any) => {
    setEditingUser(user);
    setNewUsername(user.username);
    setNewPassword('');
  };

  const handleCancelEdit = () => {
    setEditingUser(null);
    setNewUsername('');
    setNewPassword('');
  };

  const handleSaveCredentials = async () => {
    if (!editingUser) return;

    const usernameChanged = newUsername !== editingUser.username;
    const passwordProvided = newPassword.trim().length > 0;

    if (!usernameChanged && !passwordProvided) {
      alert('No changes to save');
      return;
    }

    if (newUsername.trim().length === 0) {
      alert('Username cannot be empty');
      return;
    }

    if (passwordProvided && newPassword.length < 4) {
      alert('Password must be at least 4 characters');
      return;
    }

    try {
      setLoading(true);
      await apiService.updateUserCredentials(
        editingUser.id,
        usernameChanged ? newUsername : undefined,
        passwordProvided ? newPassword : undefined
      );
      alert('User credentials updated successfully');
      setEditingUser(null);
      setNewUsername('');
      setNewPassword('');
      loadUsers();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to update credentials');
    } finally {
      setLoading(false);
    }
  };

  if (loading && users.length === 0) return <div>Loading users...</div>;

  return (
    <div className="manage-users-view">
      <div className="users-header">
        <p className="users-description">
          Manage all users · update credentials or add new members
        </p>
        <button onClick={handleAddClick} className="act-btn act-btn-ink">
          Add New User
        </button>
      </div>

      {users.length > 0 ? (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f0f0f0' }}>
              <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>Username</th>
              <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>Email</th>
              <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>Role</th>
              <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                  <strong>{user.username}</strong>
                </td>
                <td style={{ padding: '12px', border: '1px solid #ddd' }}>{user.email}</td>
                <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                  <span style={{ 
                    padding: '4px 8px', 
                    borderRadius: '4px', 
                    backgroundColor: user.role === 'admin' ? '#ff9800' : '#2196F3',
                    color: 'white',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}>
                    {user.role.toUpperCase()}
                  </span>
                </td>
                <td style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'center' }}>
                  <button 
                    onClick={() => handleEditClick(user)}
                    style={{ 
                      padding: '6px 12px', 
                      backgroundColor: '#2196F3', 
                      color: 'white', 
                      border: 'none', 
                      borderRadius: '4px', 
                      cursor: 'pointer',
                      fontWeight: 'bold'
                    }}
                  >
                    ✏️ Edit Credentials
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>No users found</p>
      )}

      {/* Add New User Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={handleCancelAdd}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3>Add New User</h3>
              <button className="close-btn" onClick={handleCancelAdd}>×</button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                  Username: <span style={{ color: 'red' }}>*</span>
                </label>
                <input
                  type="text"
                  value={newUser.username}
                  onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                  style={{ 
                    width: '100%', 
                    padding: '10px', 
                    border: '1px solid #ddd', 
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                  placeholder="Enter username"
                />
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                  Email: <span style={{ color: 'red' }}>*</span>
                </label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  style={{ 
                    width: '100%', 
                    padding: '10px', 
                    border: '1px solid #ddd', 
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                  placeholder="Enter email"
                />
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                  Password: <span style={{ color: 'red' }}>*</span>
                </label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  style={{ 
                    width: '100%', 
                    padding: '10px', 
                    border: '1px solid #ddd', 
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                  placeholder="Enter password (min 4 characters)"
                />
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                  Role: <span style={{ color: 'red' }}>*</span>
                </label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  style={{ 
                    width: '100%', 
                    padding: '10px', 
                    border: '1px solid #ddd', 
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                >
                  <option value="judge">Judge</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              {newUser.role === 'judge' && (
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                    Judge Name: <span style={{ color: 'red' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    style={{ 
                      width: '100%', 
                      padding: '10px', 
                      border: '1px solid #ddd', 
                      borderRadius: '4px',
                      fontSize: '14px'
                    }}
                    placeholder="Enter judge name"
                  />
                  <small style={{ color: '#666', fontSize: '12px' }}>
                    This name will be displayed in the judge list
                  </small>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button 
                className="cancel-btn" 
                onClick={handleCancelAdd}
                style={{ padding: '10px 20px', marginRight: '10px' }}
              >
                Cancel
              </button>
              <button 
                className="save-btn" 
                onClick={handleSaveNewUser}
                disabled={loading}
                style={{ padding: '10px 20px' }}
              >
                {loading ? 'Creating...' : 'Create User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Credentials Modal */}
      {editingUser && (
        <div className="modal-overlay" onClick={handleCancelEdit}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3>Update Credentials: {editingUser.username}</h3>
              <button className="close-btn" onClick={handleCancelEdit}>×</button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                  Username:
                </label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  style={{ 
                    width: '100%', 
                    padding: '10px', 
                    border: '1px solid #ddd', 
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                  placeholder="Enter new username"
                />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                  New Password:
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{ 
                    width: '100%', 
                    padding: '10px', 
                    border: '1px solid #ddd', 
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                  placeholder="Leave empty to keep current password"
                />
                <small style={{ color: '#666', fontSize: '12px' }}>
                  Leave blank if you don't want to change the password
                </small>
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="cancel-btn" 
                onClick={handleCancelEdit}
                style={{ padding: '10px 20px', marginRight: '10px' }}
              >
                Cancel
              </button>
              <button 
                className="save-btn" 
                onClick={handleSaveCredentials}
                disabled={loading}
                style={{ padding: '10px 20px' }}
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
