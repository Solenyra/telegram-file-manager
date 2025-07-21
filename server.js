require('dotenv').config();
const express = require('express');
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises; // 使用 promise 版本的 fs
const { sendFile, deleteMessage, loadMessages } = require('./bot');

const app = express();
const upload = multer({ dest: 'uploads/' });
const PORT = process.env.PORT || 8100;

app.use(session({
  secret: process.env.SESSION_SECRET, // 从 .env 文件加载密钥
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production' } // 在生产环境中建议使用 https
}));

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 登录验证中间件
function requireLogin(req, res, next) {
  if (req.session.loggedIn) {
    return next();
  }
  res.redirect('/login');
}

// 路由
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'views/login.html'));
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username === process.env.ADMIN_USER && password === process.env.ADMIN_PASS) {
    req.session.loggedIn = true;
    res.redirect('/');
  } else {
    res.status(401).send('无效的凭据');
  }
});

app.get('/', requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, 'views/dashboard.html'));
});

app.post('/upload', requireLogin, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: '没有选择文件' });
  }

  const filePath = req.file.path;
  try {
    const result = await sendFile(filePath, req.body.caption || '');
    if (result.ok) {
      res.json({ success: true, message: '文件上传成功', data: result });
    } else {
      res.status(500).json({ success: false, message: '文件上传失败', error: result });
    }
  } catch (error) {
    console.error('上传失败:', error);
    res.status(500).json({ success: false, message: '服务器内部错误' });
  } finally {
    // 无论成功与否都删除临时文件
    await fs.unlink(filePath);
  }
});

app.get('/files', requireLogin, async (req, res) => {
  try {
    const messages = await loadMessages();
    res.json(messages);
  } catch (error) {
    console.error('加载文件列表失败:', error);
    res.status(500).json([]);
  }
});

app.post('/delete', requireLogin, async (req, res) => {
  const { message_id } = req.body;
  try {
    await deleteMessage(message_id);
    res.sendStatus(200);
  } catch (error) {
    console.error('删除失败:', error);
    // 根据 Telegram API 的错误响应决定如何返回
    const statusCode = error.response && error.response.status ? error.response.status : 500;
    res.status(statusCode).json({ success: false, message: '删除失败' });
  }
});

app.listen(PORT, () => console.log(`✅ 服务器运行在 http://localhost:${PORT}`));
