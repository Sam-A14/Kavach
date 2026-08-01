const jwt = require('jsonwebtoken');
require('dotenv').config();

const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'Access denied. Please login.' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.officer = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ success: false, message: 'Session expired. Please login again.' });
  }
};

module.exports = { verifyToken };