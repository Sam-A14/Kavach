const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../database/db');
require('dotenv').config();

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { name, badge_number, rank, state, email, password, role } = req.body;
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const { data, error } = await supabase
      .from('officers')
      .insert([{ name, badge_number, rank, state, email, password_hash, role: role || 'officer' }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ success: true, message: 'Officer registered', officer: data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const { data: officer, error } = await supabase
      .from('officers')
      .select('*')
      .eq('email', email)
      .eq('is_active', true)
      .single();

    if (error || !officer) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, officer.password_hash);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const token = jwt.sign(
      { id: officer.id, name: officer.name, rank: officer.rank, state: officer.state, role: officer.role },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({ success: true, message: `Welcome ${officer.name}`, token, officer: { id: officer.id, name: officer.name, rank: officer.rank, state: officer.state, role: officer.role } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;