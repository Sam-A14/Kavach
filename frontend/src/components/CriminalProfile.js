import React, { useState } from 'react';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL;

function CriminalProfile({ criminal, onClose }) {
  const [aiAnalysis, setAiAnalysis] = useState(criminal.ai_threat_assessment || '');
  const [loadingAI, setLoadingAI] = useState(false);
  const token = localStorage.getItem('kavach_token');
  const headers = { Authorization: `Bearer ${token}` };

  const threatColor = (level) =>
    level >= 8 ? '#ef4444' : level >= 5 ? '#f97316' : '#22c55e';

  const getAIAnalysis = async () => {
    setLoadingAI(true);
    try {
      const res = await axios.post(
        `${API}/api/criminals/analyze/${criminal.id}`,
        {},
        { headers }
      );
      setAiAnalysis(res.data.analysis);
    } catch (err) {
      setAiAnalysis('AI analysis unavailable. Please check API key.');
    }
    setLoadingAI(false);
  };

  const InfoBox = ({ label, value }) => (
    <div style={{
      background: '#0a0f1e', padding: '10px 14px',
      borderRadius: '8px', border: '1px solid #2d3748'
    }}>
      <div style={{ color: '#475569', fontSize: '11px', marginBottom: '4px' }}>
        {label}
      </div>
      <div style={{ color: '#e2e8f0', fontSize: '13px', fontWeight: '600' }}>
        {value || 'Not recorded'}
      </div>
    </div>
  );

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.85)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px', overflowY: 'auto'
    }}>
      <div style={{
        background: '#1a2035', borderRadius: '16px',
        border: '1px solid #2d3748', width: '100%', maxWidth: '820px',
        maxHeight: '90vh', overflowY: 'auto', padding: '32px'
      }}>

        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', marginBottom: '24px',
          borderBottom: '1px solid #2d3748', paddingBottom: '16px'
        }}>
          <div>
            <h2 style={{ color: '#e2e8f0', fontSize: '20px' }}>
              🔍 Criminal Intelligence Profile
            </h2>
            <p style={{ color: '#475569', fontSize: '12px', marginTop: '4px' }}>
              KAVACH — National Law Enforcement Coordination Platform
            </p>
          </div>
          <button onClick={onClose} style={{
            background: '#2d3748', border: 'none', color: '#94a3b8',
            padding: '8px 18px', borderRadius: '8px', cursor: 'pointer',
            fontSize: '14px', fontWeight: '600'
          }}>
            ✕ Close
          </button>
        </div>

        {/* Top — Photo + Identity */}
        <div style={{ display: 'flex', gap: '24px', marginBottom: '24px' }}>

          {/* Photo */}
          <div style={{
            width: '160px', height: '190px', flexShrink: 0,
            background: '#0a0f1e', borderRadius: '12px',
            border: `2px solid ${threatColor(criminal.threat_level)}`,
            display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: '64px'
          }}>
            {criminal.photo_url
              ? <img src={criminal.photo_url} alt={criminal.name}
                  style={{ width: '100%', height: '100%',
                  objectFit: 'cover', borderRadius: '10px' }} />
              : '👤'
            }
          </div>

          {/* Identity details */}
          <div style={{ flex: 1 }}>
            <div style={{
              display: 'flex', alignItems: 'center',
              gap: '10px', marginBottom: '12px', flexWrap: 'wrap'
            }}>
              <h3 style={{ color: '#ffffff', fontSize: '26px', fontWeight: '700' }}>
                {criminal.name}
              </h3>
              <span style={{
                background: criminal.current_status === 'wanted' ? '#ef4444' : '#22c55e',
                color: 'white', padding: '4px 14px', borderRadius: '20px',
                fontSize: '12px', fontWeight: '700'
              }}>
                {criminal.current_status?.toUpperCase()}
              </span>
              {criminal.arrest_warrant && (
                <span style={{
                  background: '#7c3aed', color: 'white',
                  padding: '4px 14px', borderRadius: '20px',
                  fontSize: '12px', fontWeight: '700'
                }}>
                  ⚖️ WARRANT ACTIVE
                </span>
              )}
            </div>

            {criminal.alias && (
              <p style={{ color: '#94a3b8', marginBottom: '12px', fontSize: '14px' }}>
                Also known as: <span style={{ color: '#e2e8f0', fontWeight: '600' }}>
                  {criminal.alias}
                </span>
              </p>
            )}

            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr',
              gap: '8px'
            }}>
              <InfoBox label="CRIME TYPE" value={criminal.crime_type} />
              <InfoBox label="STATE OF ORIGIN" value={criminal.state_of_origin} />
              <InfoBox label="LAST SEEN LOCATION" value={criminal.last_seen_location} />
              <InfoBox label="FIR NUMBER" value={criminal.fir_number} />
              <InfoBox label="NATIONALITY" value={criminal.nationality} />
              <InfoBox label="WARRANT NUMBER" value={criminal.warrant_number} />
            </div>
          </div>

          {/* Threat Level */}
          <div style={{
            width: '130px', flexShrink: 0, background: '#0a0f1e',
            borderRadius: '12px', padding: '20px', textAlign: 'center',
            border: `2px solid ${threatColor(criminal.threat_level)}`
          }}>
            <div style={{ color: '#64748b', fontSize: '11px', marginBottom: '8px', fontWeight: '600' }}>
              THREAT LEVEL
            </div>
            <div style={{
              fontSize: '52px', fontWeight: '700', lineHeight: 1,
              color: threatColor(criminal.threat_level)
            }}>
              {criminal.threat_level}
            </div>
            <div style={{ color: '#64748b', fontSize: '11px', marginTop: '4px' }}>
              out of 10
            </div>
            <div style={{
              marginTop: '12px', padding: '6px',
              borderRadius: '6px', background: threatColor(criminal.threat_level),
              color: 'white', fontSize: '12px', fontWeight: '700'
            }}>
              {criminal.threat_level >= 8 ? '⚠️ EXTREME' :
               criminal.threat_level >= 5 ? '🔶 HIGH' : '🟢 MODERATE'}
            </div>
          </div>
        </div>

        {/* Description */}
        {criminal.description && (
          <div style={{
            background: '#0a0f1e', borderRadius: '10px',
            padding: '16px', marginBottom: '16px',
            border: '1px solid #2d3748'
          }}>
            <h4 style={{ color: '#64748b', fontSize: '11px',
              fontWeight: '700', marginBottom: '8px', letterSpacing: '1px' }}>
              CASE DESCRIPTION
            </h4>
            <p style={{ color: '#e2e8f0', lineHeight: '1.7', fontSize: '14px' }}>
              {criminal.description}
            </p>
          </div>
        )}

        {/* Physical Description */}
        {criminal.physical_description && (
          <div style={{
            background: '#0a0f1e', borderRadius: '10px',
            padding: '16px', marginBottom: '16px',
            border: '1px solid #2d3748'
          }}>
            <h4 style={{ color: '#64748b', fontSize: '11px',
              fontWeight: '700', marginBottom: '8px', letterSpacing: '1px' }}>
              PHYSICAL DESCRIPTION
            </h4>
            <p style={{ color: '#e2e8f0', lineHeight: '1.7', fontSize: '14px' }}>
              {criminal.physical_description}
            </p>
          </div>
        )}

        {/* Previous Crime Record */}
        {criminal.previous_crimes && (
          <div style={{
            background: '#0a0f1e', borderRadius: '10px',
            padding: '16px', marginBottom: '16px',
            border: '1px solid #ef444430'
          }}>
            <h4 style={{ color: '#ef4444', fontSize: '11px',
              fontWeight: '700', marginBottom: '8px', letterSpacing: '1px' }}>
              📋 PREVIOUS CRIME RECORD
            </h4>
            <p style={{ color: '#e2e8f0', lineHeight: '1.7',
              fontSize: '14px', whiteSpace: 'pre-line' }}>
              {criminal.previous_crimes}
            </p>
          </div>
        )}

        {/* Known Associates */}
        {criminal.known_associates && (
          <div style={{
            background: '#0a0f1e', borderRadius: '10px',
            padding: '16px', marginBottom: '16px',
            border: '1px solid #f9731630'
          }}>
            <h4 style={{ color: '#f97316', fontSize: '11px',
              fontWeight: '700', marginBottom: '8px', letterSpacing: '1px' }}>
              🔗 KNOWN ASSOCIATES
            </h4>
            <p style={{ color: '#e2e8f0', lineHeight: '1.7', fontSize: '14px' }}>
              {criminal.known_associates}
            </p>
          </div>
        )}

        {/* AI Threat Assessment */}
        <div style={{
          background: 'rgba(124,58,237,0.08)', borderRadius: '10px',
          padding: '16px', marginBottom: '16px',
          border: '1px solid #7c3aed50'
        }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', marginBottom: '12px'
          }}>
            <h4 style={{ color: '#a78bfa', fontSize: '12px',
              fontWeight: '700', letterSpacing: '1px' }}>
              🤖 AI INTELLIGENCE ASSESSMENT
            </h4>
            <button
              onClick={getAIAnalysis}
              disabled={loadingAI}
              style={{
                background: loadingAI
                  ? '#2d3748'
                  : 'linear-gradient(135deg, #7c3aed, #5b21b6)',
                color: 'white', border: 'none',
                padding: '7px 16px', borderRadius: '6px',
                fontSize: '12px', fontWeight: '700',
                cursor: loadingAI ? 'not-allowed' : 'pointer'
              }}>
              {loadingAI ? '⏳ Analyzing...' : '🔄 Run AI Analysis'}
            </button>
          </div>
          {aiAnalysis ? (
            <p style={{
              color: '#e2e8f0', lineHeight: '1.8',
              fontSize: '14px', whiteSpace: 'pre-line'
            }}>
              {aiAnalysis}
            </p>
          ) : (
            <p style={{ color: '#475569', fontSize: '13px', fontStyle: 'italic' }}>
              Click "Run AI Analysis" to generate an intelligence report for this criminal using AI.
            </p>
          )}
        </div>

        {/* Footer */}
        <div style={{
          borderTop: '1px solid #2d3748', paddingTop: '16px',
          display: 'flex', justifyContent: 'space-between',
          color: '#475569', fontSize: '12px'
        }}>
          <span>Profile ID: {criminal.id?.substring(0, 8)}...</span>
          <span>Added: {new Date(criminal.created_at).toLocaleString('en-IN')}</span>
        </div>
      </div>
    </div>
  );
}

export default CriminalProfile;