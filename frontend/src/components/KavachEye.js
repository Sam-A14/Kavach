import React, { useState, useEffect, useRef } from 'react';
import * as faceapi from 'face-api.js';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL;

function KavachEye({ supabase, officer }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [detections, setDetections] = useState([]);
  const [criminals, setCriminals] = useState([]);
  const [matches, setMatches] = useState([]);
  const [logs, setLogs] = useState([]);
  const [status, setStatus] = useState('Loading AI models...');
  const streamRef = useRef(null);
  const intervalRef = useRef(null);
  const criminalsRef = useRef([]);
  const token = localStorage.getItem('kavach_token');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    loadModels();
    loadCriminals();
    return () => stopCamera();
  }, []);

  const loadModels = async () => {
    try {
      setStatus('Loading face detection AI models...');
      const MODEL_URL = '/models';
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);
      setModelsLoaded(true);
      setStatus('✅ AI models loaded. Ready to scan.');
    } catch (err) {
      setStatus('❌ Failed to load models. Check /public/models folder.');
      console.error(err);
    }
  };

  const loadCriminals = async () => {
    try {
      const { data } = await supabase
        .from('criminals')
        .select('*')
        .eq('current_status', 'wanted');
      const list = data || [];
      setCriminals(list);
      criminalsRef.current = list;
      addLog(`Loaded ${list.length} wanted criminals (${list.filter(c => c.photo_url).length} with photos)`);
    } catch (err) {
      console.error('Failed to load criminals:', err);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
      setStatus('📷 Camera active. Click Start Scanning to begin.');
    } catch (err) {
      setStatus('❌ Camera access denied. Please allow camera permission.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
    if (intervalRef.current) clearInterval(intervalRef.current);
    setCameraActive(false);
    setScanning(false);
    setStatus('Camera stopped.');
  };

  const startScanning = () => {
    if (!modelsLoaded || !cameraActive) return;
    setScanning(true);
    setStatus('🔍 Scanning for faces...');
    intervalRef.current = setInterval(scanFrame, 2000);
  };

  const stopScanning = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setScanning(false);
    setStatus('⏸️ Scanning paused.');
  };

  const scanFrame = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    try {
      const detected = await faceapi
        .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({
          inputSize: 416,
          scoreThreshold: 0.3
        }))
        .withFaceLandmarks()
        .withFaceDescriptors();

      setDetections(detected);

      const dims = faceapi.matchDimensions(canvas, video, true);
      const resized = faceapi.resizeResults(detected, dims);

      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw blue box for all detected faces first
      resized.forEach(d => {
        const box = d.detection.box;
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.strokeRect(box.x, box.y, box.width, box.height);
        ctx.fillStyle = '#3b82f6';
        ctx.font = '13px Arial';
        ctx.fillText('Face detected', box.x, box.y - 5);
      });

      if (detected.length > 0) {
        setStatus(`👤 ${detected.length} face(s) detected — analyzing...`);
        addLog(`Detected ${detected.length} face(s) in frame`);

        const criminalsWithPhotos = criminalsRef.current.filter(c => c.photo_url);
        if (criminalsWithPhotos.length > 0) {
          await matchFaces(detected, criminalsWithPhotos, ctx, resized);
        } else {
          setStatus(`👤 ${detected.length} face(s) detected — no criminal photos to match`);
        }
      } else {
        setStatus('🔍 Scanning... no faces in frame');
      }
    } catch (err) {
      console.error('Scan error:', err);
    }
  };

  const matchFaces = async (detected, criminalsWithPhotos, ctx, resized) => {
    for (const criminal of criminalsWithPhotos) {
      try {
        addLog(`🔍 Checking against ${criminal.name}...`);

        const img = new Image();
        img.crossOrigin = 'anonymous';

        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = criminal.photo_url + '?t=' + Date.now();
        });

        const criminalDetection = await faceapi
          .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions({
            inputSize: 416,
            scoreThreshold: 0.3
          }))
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (!criminalDetection) {
          addLog(`⚠️ No face found in ${criminal.name}'s photo — try a clearer photo`);
          continue;
        }

        addLog(`✅ Face extracted from ${criminal.name}'s photo — comparing...`);

        for (let i = 0; i < detected.length; i++) {
          const distance = faceapi.euclideanDistance(
            detected[i].descriptor,
            criminalDetection.descriptor
          );

          const confidence = ((1 - distance) * 100).toFixed(1);
          addLog(`📊 Distance: ${distance.toFixed(3)} | Confidence: ${confidence}%`);

          if (distance < 0.7) {
            const box = resized[i].detection.box;

            // Draw red box for match
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 4;
            ctx.strokeRect(box.x, box.y, box.width, box.height);
            ctx.fillStyle = 'rgba(239,68,68,0.9)';
            ctx.fillRect(box.x, box.y - 28, box.width, 28);
            ctx.fillStyle = 'white';
            ctx.font = 'bold 13px Arial';
            ctx.fillText(`⚠️ ${criminal.name} (${confidence}%)`, box.x + 4, box.y - 8);

            addLog(`🚨 MATCH FOUND: ${criminal.name} — ${confidence}% confidence!`);
            setStatus(`🚨 MATCH: ${criminal.name} detected with ${confidence}% confidence!`);

            setMatches(prev => {
              const exists = prev.find(m => m.criminal.id === criminal.id);
              if (!exists) {
                autoIssueLOC(criminal, confidence);
                return [{ criminal, confidence, time: new Date().toLocaleString('en-IN') }, ...prev];
              }
              return prev;
            });
          }
        }
      } catch (err) {
        addLog(`❌ Error loading ${criminal.name}'s photo: ${err.message}`);
        console.error('Match error:', err);
      }
    }
  };

  const autoIssueLOC = async (criminal, confidence) => {
    try {
      await axios.post(`${API}/api/alerts/broadcast`, {
        title: `🚨 KAVACH EYE — ${criminal.name} DETECTED`,
        message: `Facial recognition match: ${criminal.name} (${confidence}% confidence). Crime: ${criminal.crime_type}. Threat Level: ${criminal.threat_level}/10. AUTO-DETECTED by KAVACH EYE surveillance system.`,
        severity: criminal.threat_level >= 7 ? 'critical' : 'high',
        target_states: ['ALL']
      }, { headers });
      addLog(`✅ Auto LOC issued for ${criminal.name}`);
    } catch (err) {
      addLog(`❌ Auto LOC failed: ${err.message}`);
    }
  };

  const addLog = (message) => {
    const entry = `[${new Date().toLocaleTimeString('en-IN')}] ${message}`;
    setLogs(prev => [entry, ...prev].slice(0, 30));
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ color: '#e2e8f0', marginBottom: '4px' }}>👁️ KAVACH EYE</h2>
          <p style={{ color: '#64748b', fontSize: '13px' }}>Real-time Facial Recognition Surveillance System</p>
        </div>
        <div style={{
          background: modelsLoaded ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
          border: `1px solid ${modelsLoaded ? '#22c55e' : '#ef4444'}`,
          borderRadius: '8px', padding: '8px 16px',
          color: modelsLoaded ? '#22c55e' : '#ef4444', fontSize: '13px'
        }}>
          {modelsLoaded ? '✅ AI Ready' : '⏳ Loading AI...'}
        </div>
      </div>

      {/* Status bar */}
      <div style={{
        background: status.includes('MATCH') ? 'rgba(239,68,68,0.2)' : '#1a2035',
        borderRadius: '8px', padding: '12px 16px', marginBottom: '16px',
        border: `1px solid ${status.includes('MATCH') ? '#ef4444' : '#2d3748'}`,
        color: status.includes('MATCH') ? '#ef4444' : '#94a3b8',
        fontSize: '13px', fontWeight: status.includes('MATCH') ? '700' : '400'
      }}>
        {status}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>

        {/* Camera Feed */}
        <div className="card">
          <h3 style={{ marginBottom: '16px', color: '#e2e8f0' }}>📷 Live Camera Feed</h3>
          <div style={{ position: 'relative', background: '#000', borderRadius: '8px', overflow: 'hidden', marginBottom: '12px' }}>
            <video ref={videoRef} style={{ width: '100%', display: 'block' }} muted />
            <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} />
            {!cameraActive && (
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: '#0a0f1e', color: '#475569', fontSize: '14px', minHeight: '200px'
              }}>
                📷 Camera not started
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {!cameraActive ? (
              <button onClick={startCamera} disabled={!modelsLoaded} style={{
                flex: 1, padding: '10px',
                background: modelsLoaded ? '#3b82f6' : '#2d3748',
                color: 'white', border: 'none', borderRadius: '8px',
                cursor: modelsLoaded ? 'pointer' : 'not-allowed', fontWeight: '600'
              }}>📷 Start Camera</button>
            ) : (
              <button onClick={stopCamera} style={{
                flex: 1, padding: '10px', background: '#475569',
                color: 'white', border: 'none', borderRadius: '8px',
                cursor: 'pointer', fontWeight: '600'
              }}>⏹ Stop Camera</button>
            )}
            {cameraActive && !scanning ? (
              <button onClick={startScanning} style={{
                flex: 1, padding: '10px', background: '#22c55e',
                color: 'white', border: 'none', borderRadius: '8px',
                cursor: 'pointer', fontWeight: '600'
              }}>🔍 Start Scanning</button>
            ) : cameraActive && scanning ? (
              <button onClick={stopScanning} style={{
                flex: 1, padding: '10px', background: '#f97316',
                color: 'white', border: 'none', borderRadius: '8px',
                cursor: 'pointer', fontWeight: '600'
              }}>⏸ Pause Scan</button>
            ) : null}
          </div>
        </div>

        {/* Stats + Matches */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {[
              { label: 'Faces Detected', value: detections.length, color: '#3b82f6' },
              { label: 'Criminal Matches', value: matches.length, color: '#ef4444' },
              { label: 'Criminals Loaded', value: criminals.length, color: '#f97316' },
              { label: 'With Photos', value: criminals.filter(c => c.photo_url).length, color: '#22c55e' },
            ].map((s, i) => (
              <div key={i} className="card" style={{ borderLeft: `3px solid ${s.color}`, padding: '12px' }}>
                <div style={{ fontSize: '22px', fontWeight: '700', color: s.color }}>{s.value}</div>
                <div style={{ color: '#64748b', fontSize: '11px' }}>{s.label}</div>
              </div>
            ))}
          </div>

          <div className="card" style={{ flex: 1 }}>
            <h4 style={{ color: '#ef4444', marginBottom: '12px' }}>🚨 Criminal Matches</h4>
            {matches.length === 0 ? (
              <p style={{ color: '#475569', fontSize: '13px' }}>No matches detected yet</p>
            ) : (
              matches.map((m, i) => (
                <div key={i} style={{
                  background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444',
                  borderRadius: '8px', padding: '12px', marginBottom: '8px'
                }}>
                  <div style={{ fontWeight: '700', color: '#ef4444' }}>⚠️ {m.criminal.name}</div>
                  <div style={{ color: '#94a3b8', fontSize: '12px' }}>Confidence: {m.confidence}%</div>
                  <div style={{ color: '#94a3b8', fontSize: '12px' }}>Crime: {m.criminal.crime_type}</div>
                  <div style={{ color: '#475569', fontSize: '11px' }}>{m.time}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Activity Log */}
      <div className="card">
        <h4 style={{ color: '#94a3b8', marginBottom: '12px' }}>📋 Surveillance Activity Log</h4>
        {logs.length === 0 ? (
          <p style={{ color: '#475569', fontSize: '13px' }}>No activity yet</p>
        ) : (
          logs.map((log, i) => (
            <div key={i} style={{
              padding: '6px 0', borderBottom: '1px solid #1a2035',
              color: log.includes('MATCH') ? '#ef4444' :
                     log.includes('✅') ? '#22c55e' :
                     log.includes('⚠️') ? '#eab308' : '#64748b',
              fontSize: '12px', fontFamily: 'monospace'
            }}>{log}</div>
          ))
        )}
      </div>
    </div>
  );
}

export default KavachEye;