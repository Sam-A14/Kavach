import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import './App.css';

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_KEY
);

export { supabase };

function App() {
  const [officer, setOfficer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('kavach_officer');
    if (stored) setOfficer(JSON.parse(stored));
    setLoading(false);
  }, []);

  const handleLogin = (officerData) => {
    localStorage.setItem('kavach_officer', JSON.stringify(officerData));
    setOfficer(officerData);
  };

  const handleLogout = () => {
    localStorage.removeItem('kavach_officer');
    localStorage.removeItem('kavach_token');
    setOfficer(null);
  };

  if (loading) return <div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'100vh',background:'#0a0f1e',color:'white',fontSize:'20px'}}>Loading KAVACH...</div>;

  return (
    <div className="App">
      {!officer ? (
        <Login onLogin={handleLogin} />
      ) : (
        <Dashboard officer={officer} onLogout={handleLogout} supabase={supabase} />
      )}
    </div>
  );
}

export default App;
