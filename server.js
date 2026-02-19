const express = require('express');
const cors = require('cors');
const multer = require('multer');
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

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, 'uploads'));
  },
  filename: (req, file, cb) => {
    const name = `${Date.now()}-${file.originalname}`;
    cb(null, name);
  },
});
const upload = multer({ storage });

// Routes
app.post('/api/listings', upload.single('image'), async (req, res) => {
  try {
    console.log('BODY:', req.body);
    console.log('FILE:', req.file);

    const { title, description, keywords, platform, additionalInfo, imageUri, price } = req.body;

    // If mobile: use Multer file, otherwise use imageUri from web
    let imagePath = null;
    if (req.file) {
      imagePath = `/uploads/${req.file.filename}`;
    } else if (imageUri) {
      imagePath = imageUri; // web browser sends blob URL
    }

    let keywordsArray = [];
    if (keywords) {
      try {
        keywordsArray = typeof keywords === 'string' ? JSON.parse(keywords) : keywords;
      } catch (e) {
        keywordsArray = [];
      }
    }

    // Ensure price is a string or null
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