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

// Serve local uploads if needed (optional, mainly for testing)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Mount Cloudinary upload route
const uploadRouter = require('./upload'); // make sure upload.js is in same folder
app.use('/api', uploadRouter); // now /api/upload points to Cloudinary upload

// Listings routes
app.post('/api/listings', async (req, res) => {
  try {
    console.log('BODY:', req.body);

    const { title, description, keywords, platform, additionalInfo, imageUri, price } = req.body;

    // imageUri is already the Cloudinary URL sent from frontend
    const imagePath = imageUri || null;

    let keywordsArray = [];
    if (keywords) {
      try {
        keywordsArray = typeof keywords === 'string' ? JSON.parse(keywords) : keywords;
      } catch (e) {
        keywordsArray = [];
      }
    }

    const priceValue = price || null;

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
      keywordsArray,
      platform || '',
      additionalInfo || '',
      imagePath,
      priceValue,
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
    const listings = result.rows.map((row) => ({
      ...row,
      keywords: row.keywords || [],
    }));
    res.json(listings);
  } catch (err) {
    console.error('DB fetch error', err);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
