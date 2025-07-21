require('dotenv').config();
const express = require('express');
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const { sendFile, loadMessages, getFileLink, renameFileInDb, deleteMessages } = require('./bot.js');

const app = express();
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const PORT = process.env.PORT || 3000;

app.use(session({
  secret: process.env.SESSION_SECRET || 'your-strong-random-secret-here-please-change',
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

// --- 路由 ---
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'views/login.html')));
app.post('/login', (req, res) => {
  if (req.body.username === process.env.ADMIN_USER && req.body.password === process.env.ADMIN_PASS) {
    req.session.loggedIn = true;
    res.redirect('/');
  } else {
    res.status(401).send('Invalid credentials');
  }
});
app.get('/', requireLogin, (req, res) => res.sendFile(path.join(__dirname, 'views/manager.html')));
app.get('/upload-page', requireLogin, (req, res) => res.sendFile(path.join(__dirname, 'views/dashboard.html')));

// --- API 接口 ---
app.post('/upload', requireLogin, upload.array('files'), async (req, res) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ success: false, message: '沒有選擇文件' });
    }
    
    console.log('\n--- [server.js] /upload 路由開始 ---');

    const results = [];
    for (const file of req.files) {
        // *** 診斷日誌 1 ***
        console.log(`[診斷 1/5] Multer 處理後，最原始的文件名 (originalname): "${file.originalname}"`);
        
        const result = await sendFile(file.buffer, file.originalname, file.mimetype, req.body.caption || '');
        results.push(result);
    }
    
    console.log('--- [server.js] /upload 路由結束 ---\n');
    res.json({ success: true, results });
});

app.get('/files', requireLogin, (req, res) => res.json(loadMessages()));
app.get('/file/:message_id', requireLogin, async (req, res) => {
  const messageId = parseInt(req.params.message_id, 10);
  const messages = loadMessages();
  const fileInfo = messages.find(m => m.message_id === messageId);
  if (fileInfo && fileInfo.file_id) {
    const link = await getFileLink(fileInfo.file_id);
    if (link) return res.json({ success: true, url: link });
  }
  res.status(404).json({ success: false, message: '無法獲取文件。' });
});

app.post('/rename', requireLogin, async (req, res) => {
    const { messageId, newFileName } = req.body;
    if (!messageId || !newFileName) return res.status(400).json({ success: false, message: '缺少必要參數。'});
    const result = await renameFileInDb(parseInt(messageId, 10), newFileName);
    res.json(result);
});

app.post('/delete-multiple', requireLogin, async (req, res) => {
    const { messageIds } = req.body;
    if (!messageIds || !Array.isArray(messageIds)) return res.status(400).json({ success: false, message: '無效的 messageIds。' });
    const result = await deleteMessages(messageIds);
    res.json(result);
});

app.listen(PORT, () => console.log(`✅ 服務器運行在 http://localhost:${PORT}`));
