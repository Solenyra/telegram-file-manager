require('dotenv').config();
const express = require('express');
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const { sendFile, deleteMessage, loadMessages } = require('./bot');
const fs = require('fs');

const app = express();
const upload = multer({ dest: 'uploads/' });
const PORT = 3000;

app.use(session({
  secret: 'secure-session',
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

app.post('/upload', requireLogin, upload.single('file'), async (req, res) => {
  const result = await sendFile(req.file.path, req.body.caption || '');
  res.json(result);
});

app.get('/files', requireLogin, (req, res) => {
  res.json(loadMessages());
});

app.post('/delete', requireLogin, async (req, res) => {
  const { message_id } = req.body;
  await deleteMessage(message_id);
  const messages = loadMessages().filter(m => m.message_id !== message_id);
  fs.writeFileSync('data/messages.json', JSON.stringify(messages));
  res.sendStatus(200);
});

app.listen(PORT, () => console.log(`✅ Server running at http://localhost:${PORT}`));