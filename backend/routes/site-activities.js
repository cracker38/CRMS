const express = require('express');
const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/site-photos';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'site-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed'));
  }
});

// Get all site activities
router.get('/', authenticate, async (req, res) => {
  try {
    // Check if table exists
    try {
      await db.execute('SELECT 1 FROM site_activities LIMIT 1');
    } catch (tableError) {
      return res.json([]);
    }

    let query = `
      SELECT sa.*, 
        s.name as site_name,
        p.name as project_name,
        u.first_name as reported_by_first_name,
        u.last_name as reported_by_last_name
      FROM site_activities sa
      LEFT JOIN sites s ON sa.site_id = s.id
      LEFT JOIN projects p ON s.project_id = p.id
      LEFT JOIN users u ON sa.reported_by = u.id
    `;
    
    if (req.user.role === 'SITE_SUPERVISOR') {
      query += ' WHERE sa.reported_by = ?';
    }
    
    query += ' ORDER BY sa.activity_date DESC, sa.created_at DESC';
    
    const [activities] = req.user.role === 'SITE_SUPERVISOR'
      ? await db.execute(query, [req.user.id])
      : await db.execute(query);
    
    res.json(activities);
  } catch (error) {
    console.error('Get site activities error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create site activity (Site Supervisor)
router.post('/', authenticate, authorize('SITE_SUPERVISOR'), upload.array('photos', 5), async (req, res) => {
  try {
    // Create table if it doesn't exist
    try {
      await db.execute('SELECT 1 FROM site_activities LIMIT 1');
    } catch (tableError) {
      await db.execute(`
        CREATE TABLE IF NOT EXISTS site_activities (
          id INT AUTO_INCREMENT PRIMARY KEY,
          site_id INT NOT NULL,
          reported_by INT NOT NULL,
          activity_date DATE NOT NULL,
          work_description TEXT,
          progress_percentage DECIMAL(5,2) DEFAULT 0,
          workforce_count INT DEFAULT 0,
          equipment_used TEXT,
          issues_encountered TEXT,
          weather_conditions VARCHAR(255),
          photos TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
          FOREIGN KEY (reported_by) REFERENCES users(id) ON DELETE CASCADE
        )
      `);
    }

    const { site_id, activity_date, work_description, progress_percentage, workforce_count, equipment_used, issues_encountered, weather_conditions } = req.body;
    
    // Handle uploaded photos
    const photoPaths = req.files ? req.files.map(file => `/uploads/site-photos/${file.filename}`) : [];
    
    const [result] = await db.execute(
      'INSERT INTO site_activities (site_id, reported_by, activity_date, work_description, progress_percentage, workforce_count, equipment_used, issues_encountered, weather_conditions, photos) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [site_id, req.user.id, activity_date, work_description, progress_percentage || 0, workforce_count || 0, equipment_used || '', issues_encountered || '', weather_conditions || '', JSON.stringify(photoPaths)]
    );
    
    res.status(201).json({ message: 'Site activity recorded successfully', activityId: result.insertId });
  } catch (error) {
    console.error('Create site activity error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get sites for current supervisor
router.get('/sites', authenticate, authorize('SITE_SUPERVISOR'), async (req, res) => {
  try {
    // Check if sites table exists and has supervisor_id column
    try {
      const [sites] = await db.execute(`
        SELECT s.*, p.name as project_name
        FROM sites s
        LEFT JOIN projects p ON s.project_id = p.id
        WHERE s.supervisor_id = ? OR s.id IN (
          SELECT DISTINCT site_id FROM site_activities WHERE reported_by = ?
        )
        ORDER BY s.name
      `, [req.user.id, req.user.id]);
      res.json(sites);
    } catch (error) {
      // If supervisor_id column doesn't exist, return all sites
      const [sites] = await db.execute(`
        SELECT s.*, p.name as project_name
        FROM sites s
        LEFT JOIN projects p ON s.project_id = p.id
        ORDER BY s.name
      `);
      res.json(sites);
    }
  } catch (error) {
    console.error('Get sites error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
