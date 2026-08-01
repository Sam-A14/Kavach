const express = require('express');
const supabase = require('../database/db');
const { verifyToken } = require('../middleware/auth');
const Groq = require('groq-sdk');

const router = express.Router();
router.use(verifyToken);

// SEARCH criminals
router.get('/search', async (req, res) => {
  try {
    const { name, crime_type, state, status, threat_level } = req.query;
    let query = supabase.from('criminals').select('*');
    if (name) query = query.ilike('name', `%${name}%`);
    if (crime_type) query = query.ilike('crime_type', `%${crime_type}%`);
    if (state) query = query.eq('state_of_origin', state);
    if (status) query = query.eq('current_status', status);
    if (threat_level) query = query.gte('threat_level', parseInt(threat_level));
    query = query.order('threat_level', { ascending: false });
    const { data, error } = await query;
    if (error) throw error;
    res.json({ success: true, count: data.length, criminals: data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ADD criminal
router.post('/add', async (req, res) => {
  try {
    const { name, alias, fir_number, crime_type, state_of_origin,
            last_seen_location, threat_level, description } = req.body;
    const { data, error } = await supabase
      .from('criminals')
      .insert([{
        name, alias, fir_number, crime_type, state_of_origin,
        last_seen_location, threat_level: threat_level || 1,
        description, added_by: req.officer.id
      }])
      .select().single();
    if (error) throw error;
    res.status(201).json({ success: true, message: 'Criminal added', criminal: data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// AI threat analysis using Groq
router.post('/analyze/:id', async (req, res) => {
  try {
    const { data: criminal, error } = await supabase
      .from('criminals')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error || !criminal) {
      return res.status(404).json({ success: false, message: 'Criminal not found' });
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const prompt = `You are a law enforcement intelligence analyst for KAVACH, India's national police coordination system.

Analyze this criminal profile and provide a threat assessment:

Name: ${criminal.name}
Alias: ${criminal.alias || 'None'}
Crime Type: ${criminal.crime_type}
State: ${criminal.state_of_origin}
Threat Level: ${criminal.threat_level}/10
Last Seen: ${criminal.last_seen_location || 'Unknown'}
Status: ${criminal.current_status}
Description: ${criminal.description || 'No description'}
Previous Crimes: ${criminal.previous_crimes || 'Not recorded'}
Known Associates: ${criminal.known_associates || 'None recorded'}

Provide a professional intelligence report with these sections:
1. THREAT SUMMARY
2. LIKELY NEXT MOVEMENTS
3. RECOMMENDED POLICE ACTION
4. STATES AT RISK
5. PRIORITY LEVEL

Keep it concise and professional like a real Indian police intelligence report.`;

    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
      max_tokens: 1000,
    });

    const analysis = completion.choices[0].message.content;

    await supabase
      .from('criminals')
      .update({ ai_threat_assessment: analysis })
      .eq('id', req.params.id);

    res.json({ success: true, analysis });

  } catch (error) {
    console.error('AI analysis error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET single criminal by ID
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('criminals')
      .select('*')
      .eq('id', req.params.id)
      .single();
    if (error || !data) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, criminal: data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
