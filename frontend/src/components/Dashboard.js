import React, { useState, useEffect } from 'react';
import KavachEye from './KavachEye';
import { setupNotifications, showNotification } from '../utils/notifications';
import CrimeMap from './CrimeMap';
import CriminalProfile from './CriminalProfile';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL;

function Dashboard({ officer, onLogout, supabase }) {
  const [activeTab, setActiveTab] = useState('home');
  const [alerts, setAlerts] = useState([]);
  const [criminals, setCriminals] = useState([]);
  const [searchName, setSearchName] = useState('');
  const [alertForm, setAlertForm] = useState({ title: '', message: '', severity: 'medium' });
  const [stats, setStats] = useState({ criminals: 0, alerts: 0, wanted: 0 });
  const [liveAlerts, setLiveAlerts] = useState([]);
  const [selectedCriminal, setSelectedCriminal] = useState(null);

  const token = localStorage.getItem('kavach_token');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    loadAlerts();
    loadStats();
    setupNotifications().then(granted => {
      if (granted) {
        showNotification('KAVACH Activated', `Welcome ${officer.name}. You will receive live LOC alerts.`, 'low');
      }
    });
    setupRealtime();
  }, []);

  const setupRealtime = () => {
    supabase
      .channel('kavach-live-' + Date.now())
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'alerts' },
        (payload) => {
          const newAlert = payload.new;
          setLiveAlerts(prev => [newAlert, ...prev]);
          loadAlerts();
          showNotification(newAlert.title, newAlert.message, newAlert.severity);
          if (newAlert.severity === 'critical') {
            const audio = new Audio('https://www.soundjay.com/misc/sounds/bell-ringing-05.mp3');
            audio.volume = 0.5;
            audio.play().catch(() => {});
          }
        }
      )
      .subscribe();
  };

  const loadAlerts = async () => {
    try {
      const res = await axios.get(`${API}/api/alerts/active`, { headers });
      setAlerts(res.data.alerts || []);
    } catch (err) { console.error(err); }
  };

  const loadStats = async () => {
    try {
      const { count: crimCount } = await supabase.from('criminals').select('*', { count: 'exact', head: true });
      const { count: alertCount } = await supabase.from('alerts').select('*', { count: 'exact', head: true });
      const { count: wantedCount } = await supabase.from('criminals').select('*', { count: 'exact', head: true }).eq('current_status', 'wanted');
      setStats({ criminals: crimCount || 0, alerts: alertCount || 0, wanted: wantedCount || 0 });
    } catch (err) { console.error(err); }
  };

  const searchCriminals = async () => {
    try {
      const res = await axios.get(`${API}/api/criminals/search?name=${searchName}`, { headers });
      setCriminals(res.data.criminals || []);
    } catch (err) { console.error(err); }
  };

  const broadcastAlert = async () => {
    try {
      await axios.post(`${API}/api/alerts/broadcast`, {
        ...alertForm, target_states: ['ALL']
      }, { headers });
      setAlertForm({ title: '', message: '', severity: 'medium' });
      alert('✅ LOC issued to all states!');
      loadAlerts();
    } catch (err) { alert('Failed to issue LOC'); }
  };

  const resolveAlert = async (alertId) => {
    const action = window.prompt('Enter action taken (e.g. Criminal arrested, Area cleared):');
    if (!action) return;
    try {
      await axios.patch(`${API}/api/alerts/resolve/${alertId}`, { action_taken: action }, { headers });
      alert('✅ LOC marked as resolved!');
      loadAlerts();
    } catch (err) { alert('Failed to resolve LOC'); }
  };

  const severityColor = (s) =>
    s === 'critical' ? '#ef4444' :
    s === 'high' ? '#f97316' :
    s === 'medium' ? '#eab308' : '#22c55e';

  const tabStyle = (tab) => ({
    padding: '10px 20px', cursor: 'pointer', borderRadius: '8px',
    background: activeTab === tab ? '#3b82f6' : 'transparent',
    color: activeTab === tab ? 'white' : '#94a3b8',
    border: 'none', fontSize: '14px', fontWeight: '600',
    transition: 'all 0.3s'
  });

  return (
    <div style={{ minHeight: '100vh', background: '#0a0f1e' }}>

      {/* Top Navigation */}
      <div style={{
        background: '#1a2035', borderBottom: '1px solid #2d3748',
        padding: '0 24px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', height: '64px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '24px' }}>🛡️</span>
          <div>
            <span style={{ fontSize: '18px', fontWeight: '700', color: '#3b82f6' }}>KAVACH</span>
            <span style={{ color: '#475569', fontSize: '12px', marginLeft: '8px' }}>National Coordination Platform</span>
          </div>
        </div>

        {liveAlerts.length > 0 && (
          <div style={{
            background: 'rgba(239,68,68,0.2)', border: '1px solid #ef4444',
            borderRadius: '8px', padding: '6px 12px', color: '#ef4444', fontSize: '13px'
          }}>
            🚨 {liveAlerts.length} New LOC{liveAlerts.length > 1 ? 's' : ''}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '14px', fontWeight: '600' }}>{officer.name}</div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>{officer.rank} • {officer.state}</div>
          </div>
          <button onClick={onLogout} className="btn-danger">Logout</button>
        </div>
      </div>

      {/* Tab Bar */}
      <div style={{
        background: '#1a2035', borderBottom: '1px solid #2d3748',
        padding: '8px 24px', display: 'flex', gap: '8px'
      }}>
        <button style={tabStyle('home')} onClick={() => setActiveTab('home')}>📊 Dashboard</button>
        <button style={tabStyle('search')} onClick={() => setActiveTab('search')}>🔍 Criminal Search</button>
        <button style={tabStyle('alerts')} onClick={() => setActiveTab('alerts')}>📋 LOC Circulars</button>
        <button style={tabStyle('broadcast')} onClick={() => setActiveTab('broadcast')}>📡 Issue LOC</button>
        <button style={tabStyle('eye')} onClick={() => setActiveTab('eye')}>👁️ KAVACH EYE</button>
      </div>

      {/* Content */}
      <div style={{ padding: '24px' }}>

        {/* HOME TAB */}
        {activeTab === 'home' && (
          <div>
            <h2 style={{ marginBottom: '24px', color: '#e2e8f0' }}>
              Welcome back, {officer.rank} {officer.name}
            </h2>
            <div className="card" style={{ marginBottom: '24px' }}>
              <h3 style={{ marginBottom: '16px', color: '#e2e8f0' }}>🗺️ National Crime Hotspot Map</h3>
              <CrimeMap />
              <div style={{ display: 'flex', gap: '16px', marginTop: '12px', fontSize: '13px' }}>
                <span style={{ color: '#ef4444' }}>🔴 Critical</span>
                <span style={{ color: '#f97316' }}>🟠 High</span>
                <span style={{ color: '#eab308' }}>🟡 Medium</span>
                <span style={{ color: '#22c55e' }}>🟢 Low</span>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
              {[
                { label: 'Total Criminals', value: stats.criminals, icon: '👤', color: '#3b82f6' },
                { label: 'Wanted', value: stats.wanted, icon: '🎯', color: '#ef4444' },
                { label: 'Active LOCs', value: stats.alerts, icon: '📋', color: '#f97316' },
                { label: 'Live Updates', value: liveAlerts.length, icon: '📡', color: '#22c55e' },
              ].map((stat, i) => (
                <div key={i} className="card" style={{ borderLeft: `4px solid ${stat.color}` }}>
                  <div style={{ fontSize: '28px', marginBottom: '8px' }}>{stat.icon}</div>
                  <div style={{ fontSize: '32px', fontWeight: '700', color: stat.color }}>{stat.value}</div>
                  <div style={{ color: '#64748b', fontSize: '13px' }}>{stat.label}</div>
                </div>
              ))}
            </div>
            <div className="card">
              <h3 style={{ marginBottom: '16px', color: '#e2e8f0' }}>📋 Recent Lookout Circulars</h3>
              {alerts.length === 0 ? (
                <p style={{ color: '#475569' }}>No active LOCs</p>
              ) : (
                alerts.slice(0, 5).map((alert, i) => (
                  <div key={i} style={{
                    padding: '12px', borderRadius: '8px', marginBottom: '8px',
                    background: '#0a0f1e', borderLeft: `4px solid ${severityColor(alert.severity)}`
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: '600', color: '#e2e8f0' }}>{alert.title}</span>
                      <span style={{
                        background: severityColor(alert.severity), color: 'white',
                        padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '700'
                      }}>{alert.severity?.toUpperCase()}</span>
                    </div>
                    <p style={{ color: '#94a3b8', fontSize: '13px', marginTop: '4px' }}>{alert.message}</p>
                    <p style={{ color: '#475569', fontSize: '11px', marginTop: '4px' }}>
                      {new Date(alert.created_at).toLocaleString('en-IN')}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* CRIMINAL SEARCH TAB */}
        {activeTab === 'search' && (
          <div>
            <h2 style={{ marginBottom: '8px' }}>🔍 Criminal Database Search</h2>
            <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '16px' }}>Click on any criminal card to view full profile</p>
            <div className="card" style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <input
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  placeholder="Search by name, alias, FIR number..."
                  onKeyPress={(e) => e.key === 'Enter' && searchCriminals()}
                  style={{
                    flex: 1, padding: '12px 16px', background: '#0a0f1e',
                    border: '1px solid #2d3748', borderRadius: '8px',
                    color: 'white', fontSize: '14px', outline: 'none'
                  }}
                />
                <button onClick={searchCriminals} className="btn-primary" style={{ padding: '12px 24px' }}>Search</button>
              </div>
            </div>
            {criminals.length > 0 && (
              <div style={{ display: 'grid', gap: '12px' }}>
                {criminals.map((c, i) => (
                  <div key={i} className="card"
                    onClick={() => setSelectedCriminal(c)}
                    style={{
                      borderLeft: `4px solid ${c.threat_level >= 7 ? '#ef4444' : c.threat_level >= 4 ? '#f97316' : '#22c55e'}`,
                      cursor: 'pointer', transition: 'all 0.2s'
                    }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                      <div>
                        <h3 style={{ color: '#e2e8f0', marginBottom: '4px' }}>{c.name}</h3>
                        {c.alias && <p style={{ color: '#94a3b8', fontSize: '13px' }}>Alias: {c.alias}</p>}
                        <p style={{ color: '#94a3b8', fontSize: '13px' }}>Crime: {c.crime_type}</p>
                        <p style={{ color: '#94a3b8', fontSize: '13px' }}>State: {c.state_of_origin}</p>
                        {c.last_seen_location && <p style={{ color: '#94a3b8', fontSize: '13px' }}>Last seen: {c.last_seen_location}</p>}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{
                          background: c.current_status === 'wanted' ? '#ef4444' : '#22c55e',
                          color: 'white', padding: '4px 12px', borderRadius: '20px',
                          fontSize: '12px', fontWeight: '700', marginBottom: '8px'
                        }}>{c.current_status?.toUpperCase()}</div>
                        <div style={{ color: '#f97316', fontSize: '13px', fontWeight: '600' }}>Threat: {c.threat_level}/10</div>
                        <div style={{ color: '#3b82f6', fontSize: '11px', marginTop: '4px' }}>👆 Click to view profile</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {criminals.length === 0 && searchName && (
              <div className="card" style={{ textAlign: 'center', color: '#475569' }}>
                No criminals found matching "{searchName}"
              </div>
            )}
          </div>
        )}

        {/* LOC CIRCULARS TAB */}
        {activeTab === 'alerts' && (
          <div>
            <h2 style={{ marginBottom: '24px' }}>📋 Active Lookout Circulars (LOC)</h2>
            {liveAlerts.length > 0 && (
              <div style={{
                background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444',
                borderRadius: '12px', padding: '16px', marginBottom: '16px'
              }}>
                <h3 style={{ color: '#ef4444', marginBottom: '12px' }}>🔴 New Live LOCs</h3>
                {liveAlerts.map((a, i) => (
                  <div key={i} style={{ color: '#fca5a5', fontSize: '14px', marginBottom: '4px' }}>
                    • {a.title} — {a.message}
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'grid', gap: '12px' }}>
              {alerts.map((alert, i) => (
                <div key={i} className="card" style={{ borderLeft: `4px solid ${severityColor(alert.severity)}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <h3 style={{ color: '#e2e8f0' }}>{alert.title}</h3>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{
                        background: severityColor(alert.severity), color: 'white',
                        padding: '3px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: '700'
                      }}>{alert.severity?.toUpperCase()}</span>
                      <button onClick={() => resolveAlert(alert.id)} style={{
                        background: '#22c55e', color: 'white', border: 'none',
                        padding: '4px 12px', borderRadius: '6px', fontSize: '11px',
                        fontWeight: '700', cursor: 'pointer'
                      }}>✓ Mark Resolved</button>
                    </div>
                  </div>
                  <p style={{ color: '#94a3b8', marginBottom: '8px' }}>{alert.message}</p>
                  <p style={{ color: '#475569', fontSize: '12px' }}>
                    {new Date(alert.created_at).toLocaleString('en-IN')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ISSUE LOC TAB */}
        {activeTab === 'broadcast' && (
          <div>
            <h2 style={{ marginBottom: '24px' }}>📡 Issue Lookout Circular (LOC)</h2>
            <div className="card" style={{ maxWidth: '600px' }}>
              <p style={{ color: '#94a3b8', marginBottom: '24px', fontSize: '14px' }}>
                This LOC will be issued to ALL officers across ALL states instantly.
              </p>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '13px', marginBottom: '6px' }}>LOC Title</label>
                <input value={alertForm.title}
                  onChange={(e) => setAlertForm({ ...alertForm, title: e.target.value })}
                  placeholder="e.g. Wanted criminal spotted in Delhi"
                  style={{ width: '100%', padding: '12px', background: '#0a0f1e', border: '1px solid #2d3748', borderRadius: '8px', color: 'white', fontSize: '14px', outline: 'none' }}
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '13px', marginBottom: '6px' }}>Details</label>
                <textarea value={alertForm.message}
                  onChange={(e) => setAlertForm({ ...alertForm, message: e.target.value })}
                  placeholder="Provide full details..." rows={4}
                  style={{ width: '100%', padding: '12px', background: '#0a0f1e', border: '1px solid #2d3748', borderRadius: '8px', color: 'white', fontSize: '14px', outline: 'none', resize: 'vertical' }}
                />
              </div>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '13px', marginBottom: '6px' }}>Severity</label>
                <select value={alertForm.severity}
                  onChange={(e) => setAlertForm({ ...alertForm, severity: e.target.value })}
                  style={{ width: '100%', padding: '12px', background: '#0a0f1e', border: '1px solid #2d3748', borderRadius: '8px', color: 'white', fontSize: '14px', outline: 'none' }}>
                  <option value="low">🟢 Low</option>
                  <option value="medium">🟡 Medium</option>
                  <option value="high">🟠 High</option>
                  <option value="critical">🔴 Critical</option>
                </select>
              </div>
              <button onClick={broadcastAlert}
                disabled={!alertForm.title || !alertForm.message}
                style={{
                  width: '100%', padding: '14px',
                  background: !alertForm.title || !alertForm.message ? '#2d3748' : 'linear-gradient(135deg, #ef4444, #dc2626)',
                  color: 'white', border: 'none', borderRadius: '8px',
                  fontSize: '16px', fontWeight: '700',
                  cursor: !alertForm.title || !alertForm.message ? 'not-allowed' : 'pointer'
                }}>📋 Issue LOC to All States</button>
            </div>
          </div>
        )}

        {/* KAVACH EYE TAB */}
{activeTab === 'eye' && (
  <KavachEye supabase={supabase} officer={officer} />
)}

      </div>

      {/* Criminal Profile Modal */}
      {selectedCriminal && (
        <CriminalProfile
          criminal={selectedCriminal}
          onClose={() => setSelectedCriminal(null)}
        />
      )}
    </div>
  );
}

export default Dashboard;