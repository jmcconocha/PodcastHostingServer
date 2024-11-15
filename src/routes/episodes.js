import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const sanitizedName = Date.now() + ext;
    cb(null, sanitizedName);
  }
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/mp4'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only MP3 and MP4 audio files are allowed.'));
    }
  },
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  }
}).single('audio');

// Middleware to check authentication for protected routes
const checkAuth = (req, res, next) => {
  if (req.method === 'GET') {
    return next(); // Allow public access to GET episodes
  }
  
  if (!req.session?.isAuthenticated) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

router.use(checkAuth);

// Add a new episode
router.post('/', (req, res) => {
  upload(req, res, (err) => {
    if (err) {
      console.error('Upload error:', err);
      return res.status(400).json({ error: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    const { title, description } = req.body;
    const audioUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;

    req.db.run(
      'INSERT INTO episodes (title, description, audio_url, published_at) VALUES (?, ?, ?, ?)',
      [title, description, audioUrl, new Date().toISOString()],
      function(err) {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: err.message });
        }
        res.json({
          id: this.lastID,
          title,
          description,
          audioUrl
        });
      }
    );
  });
});

// Get all episodes
router.get('/', (req, res) => {
  req.db.all('SELECT * FROM episodes ORDER BY published_at DESC', [], (err, rows) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Delete an episode
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  
  req.db.get('SELECT audio_url FROM episodes WHERE id = ?', [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (!row) {
      return res.status(404).json({ error: 'Episode not found' });
    }

    // Delete the audio file
    const audioPath = new URL(row.audio_url).pathname;
    const filePath = path.join(__dirname, '../../public', audioPath);
    
    fs.unlink(filePath, (err) => {
      if (err && err.code !== 'ENOENT') {
        console.error('Error deleting file:', err);
      }
      
      // Delete the database record
      req.db.run('DELETE FROM episodes WHERE id = ?', [id], (err) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        res.json({ message: 'Episode deleted successfully' });
      });
    });
  });
});

export default router;