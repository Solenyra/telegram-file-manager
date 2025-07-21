require('dotenv').config();
const express = require('express');
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const { sendFile, deleteMessage, loadMessages, getFileLink } = require('./bot');

const app = express();
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const PORT = process.env.PORT || 8100;

app.use(session({
  secret: process.env.SESSION_SECRET || 'a_default_secret_for_development_only',
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

// Routes
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'views/login.html')));

app.post('/login', (req, res) => {
  if (req.body.username === process.env.ADMIN_USER && req.body.password === process.env.ADMIN_PASS) {
    req.session.loggedIn = true;
    res.redirect('/');
  } else {
    res.send('Invalid credentials');
  }
});

app.get('/', requireLogin, (req, res) => res.sendFile(path.join(__dirname, 'views/dashboard.html')));

// 新增：文件管理器頁面路由
app.get('/manager', requireLogin, (req, res) => res.sendFile(path.join(__dirname, 'views/manager.html')));

app.post('/upload', requireLogin, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: '沒有選擇文件' });
  }
  // 調用 sendFile 時傳入 mimetype
  const result = await sendFile(
    req.file.buffer,
    req.file.originalname,
    req.file.mimetype,
    req.body.caption || ''
  );
  res.json(result);
});

app.get('/files', requireLogin, (req, res) => {
  res.json(loadMessages());
});

// 新增：獲取文件臨時鏈接的接口
app.get('/file/:message_id', requireLogin, async (req, res) => {
  const messageId = parseInt(req.params.message_id, 10);
  const messages = loadMessages();
  const fileInfo = messages.find(m => m.message_id === messageId);

  if (fileInfo && fileInfo.file_id) {
    const link = await getFileLink(fileInfo.file_id);
    if (link) {
      res.json({ success: true, url: link });
    } else {
      res.status(500).json({ success: false, message: '無法獲取文件鏈接。' });
    }
  } else {
    res.status(404).json({ success: false, message: '文件未找到。' });
  }
});

app.post('/delete', requireLogin, async (req, res) => {
  await deleteMessage(req.body.message_id);
  res.sendStatus(200);
});

app.listen(PORT, () => console.log(`✅ 服務器運行在 http://localhost:${PORT}`));
