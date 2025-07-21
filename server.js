require('dotenv').config();
const express = require('express');
const session = require('express-session'); // This line is now correct
const multer = require('multer');
const path = require('path');
const { sendFile, deleteMessage, loadMessages } = require('./bot');

const app = express();
// Configure multer to use memory storage for streaming
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const PORT = process.env.PORT || 8100;

app.use(session({
  secret: process.env.SESSION_SECRET || 'a_default_secret_for_development',
  resave: false,
  saveUninitialized: false,
}));

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

function requireLogin(req, res, next) {
  if (req.session.loggedIn) return next();
  res.redirect('/login');
}

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'views/login.html'));
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username === process.env.ADMIN_USER && password === process.env.ADMIN_PASS) {
    req.session.loggedIn = true;
    res.redirect('/');
  } else {
    res.send('Invalid credentials');
  }
});

app.get('/', requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, 'views/dashboard.html'));
});

// Handle in-memory file upload
app.post('/upload', requireLogin, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file selected' });
  }

  try {
    const result = await sendFile(
      req.file.buffer,
      req.file.originalname,
      req.body.caption || ''
    );
    res.json(result);
  } catch (error) {
    console.error('Upload failed:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

app.get('/files', requireLogin, (req, res) => {
  res.json(loadMessages());
});

app.post('/delete', requireLogin, async (req, res) => {
  const { message_id } = req.body;
  await deleteMessage(message_id);
  res.sendStatus(200);
});

app.listen(PORT, () => console.log(`✅ Server running at http://localhost:${PORT}`));
