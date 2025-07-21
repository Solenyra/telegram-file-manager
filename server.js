require('dotenv').config();
const express = require('express');
const session = 'express-session');
const multer = require('multer');
const path = require('path');
const { sendFile } = require('./bot');

const app = express();
// 1. 配置 multer 使用內存存儲，而不是磁盤
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const PORT = 8100;

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

// 2. 修改 upload 路由以處理內存中的文件
app.post('/upload', requireLogin, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: '沒有選擇文件' });
  }

  try {
    // 3. 將文件的 Buffer 和原始文件名傳遞給 sendFile
    const result = await sendFile(
      req.file.buffer,
      req.file.originalname, // 傳遞原始文件名
      req.body.caption || ''
    );
    res.json(result);
  } catch (error) {
    console.error('上傳失敗:', error);
    res.status(500).json({ success: false, message: '服務器內部錯誤' });
  }
  // 4. 不再需要 fs.unlink，因為沒有文件寫入磁盤
});

app.get('/files', requireLogin, (req, res) => {
  // 注意：loadMessages 邏輯保持不變
  const { loadMessages } = require('./bot');
  res.json(loadMessages());
});

app.post('/delete', requireLogin, async (req, res) => {
  // 注意：刪除邏輯保持不變
  const { deleteMessage } = require('./bot');
  const { message_id } = req.body;
  await deleteMessage(message_id);
  res.sendStatus(200);
});

app.listen(PORT, () => console.log(`✅ Server running at http://localhost:${PORT}`));
