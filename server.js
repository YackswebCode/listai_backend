// server.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// PostgreSQL pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Import upload router
const uploadRouter = require('./upload');
app.use('/api', uploadRouter); // mount under /api

// Your existing listings routes
app.post('/api/listings', async (req, res) => {
  try {
    const { title, description, keywords, platform, additionalInfo, imageUri, price } = req.body;

    const query = `
      INSERT INTO listings(
        title,
        description,
        keywords,
        platform,
        additionalinfo,
        imagepath,
        price,
        createdat
      )
      VALUES($1,$2,$3,$4,$5,$6,$7,NOW())
      RETURNING *;
    `;

    const values = [
      title || '',
      description || '',
      keywords || [],
      platform || '',
      additionalInfo || '',
      imageUri || null,
      price || null,
    ];

    const result = await pool.query(query, values);
    res.status(201).json({ message: 'Listing saved!', listing: result.rows[0] });
  } catch (err) {
    console.error('DB insert error', err);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

app.get('/api/listings', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM listings ORDER BY createdat DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('DB fetch error', err);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
