const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', require('./routes/auth'));
app.use('/api/criminals', require('./routes/criminals'));
app.use('/api/alerts', require('./routes/alerts'));

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'KAVACH server is running',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`KAVACH server running on http://localhost:${PORT}`);
  console.log(`Test it: http://localhost:${PORT}/api/health`);
});
