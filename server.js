require('dotenv').config();
const express = require('express');
const session = require('express-session'); // 已修正
const multer = require('multer');
const path = require('path');
const { sendFile, deleteMessage, loadMessages } = require('./bot');

const app = express();
const upload = multer({ dest: 'uploads/' });
const PORT = 3000;

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

// ==================== 診斷代碼開始 ====================
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  // 從 .env 文件讀取正確的用戶名和密碼
  const correctUser = process.env.ADMIN_USER;
  const correctPass = process.env.ADMIN_PASS;

  console.log('--- 開始登錄診斷 ---');
  console.log(`[來自 .env 文件] 正確的用戶名是: "${correctUser}" (類型: ${typeof correctUser})`);
  console.log(`[來自 .env 文件] 正確的密碼是: "${correctPass}" (類型: ${typeof correctPass})`);
  console.log('--------------------');
  console.log(`[來自登錄表單] 您輸入的用戶名是: "${username}" (類型: ${typeof username})`);
  console.log(`[來自登錄表單] 您輸入的密碼是: "${password}" (類型: ${typeof password})`);
  console.log('--------------------');

  if (username === correctUser && password === correctPass) {
    console.log('✅ 驗證成功！正在跳轉...');
    req.session.loggedIn = true;
    res.redirect('/');
  } else {
    console.log('❌ 驗證失敗！返回 "Invalid credentials"。');
    res.send('Invalid credentials');
  }
  console.log('--- 結束登錄診斷 ---\n');
});
// ==================== 診斷代碼結束 ====================

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
  require('fs').writeFileSync('data/messages.json', JSON.stringify(messages));
  res.sendStatus(200);
});

app.listen(PORT, () => console.log(`✅ Server running at http://localhost:${PORT}`));
