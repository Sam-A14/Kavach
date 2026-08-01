const express = require('express');
const supabase = require('../database/db');
const { verifyToken } = require('../middleware/auth');
const router = express.Router();
router.use(verifyToken);

router.post('/broadcast', async (req, res) => {
  try {
    const { title, message, severity, criminal_id, target_states } = req.body;
    const { data, error } = await supabase
      .from('alerts')
      .insert([{
        title, message,
        severity: severity || 'medium',
        criminal_id: criminal_id || null,
        broadcast_by: req.officer.id,
        target_states: target_states || ['ALL'],
        is_active: true,
        resolved: false
      }])
      .select().single();
    if (error) throw error;
    res.status(201).json({ success: true, message: 'LOC issued to all states', alert: data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/active', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('alerts')
      .select('*')
      .eq('resolved', false)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    res.json({ success: true, alerts: data || [] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.patch('/resolve/:id', async (req, res) => {
  try {
    const { action_taken } = req.body;
    const { data, error } = await supabase
      .from('alerts')
      .update({
        resolved: true,
        resolved_by: req.officer.id,
        resolved_at: new Date().toISOString(),
        action_taken: action_taken || 'Action taken',
        is_active: false
      })
      .eq('id', req.params.id)
      .select().single();
    if (error) throw error;
    res.json({ success: true, message: 'LOC resolved', alert: data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/resolved', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('alerts')
      .select('*')
      .eq('resolved', true)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    res.json({ success: true, alerts: data || [] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;