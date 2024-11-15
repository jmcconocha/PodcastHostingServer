import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import session from 'express-session';
import SQLiteStore from 'connect-sqlite3';
import { db, initDb } from './db.js';
import episodesRouter from './routes/episodes.js';
import feedRouter from './routes/feed.js';
import authRouter from './routes/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = process.env.PORT || 3000;
const SQLiteStoreSession = SQLiteStore(session);

app.use(cors());
app.use(express.json());
app.use(session({
  store: new SQLiteStoreSession({
    db: 'sessions.db',
    dir: '.'
  }),
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Serve static files
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Initialize database
initDb();

// Middleware to attach db to request object
app.use((req, res, next) => {
  req.db = db;
  next();
});

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/episodes', episodesRouter);
app.use('/feed', feedRouter);

// Serve the frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(port, () => {
  console.log(`Podcast server running at http://localhost:${port}`);
});