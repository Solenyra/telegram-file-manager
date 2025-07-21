require('dotenv').config();
const axios = require('axios');
const fs = require('fs'); // 同步方法用於 messages.json
const path = require('path');
const FormData = require('form-data'); // 確保 form-data 已安裝

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.BOT_TOKEN}`;
const DATA_FILE = path.join(__dirname, 'data/messages.json');

// 注意：load/save messages 的邏輯保持不變
function loadMessages() {
  return fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE)) : [];
}

function saveMessages(messages) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(messages, null, 2));
}

// 1. 修改 sendFile 函數簽名以接收 Buffer 和文件名
async function sendFile(fileBuffer, fileName, caption = '') {
  const formData = new FormData();
  formData.append('chat_id', process.env.CHANNEL_ID);
  formData.append('caption', caption || fileName);

  // 2. 直接將 Buffer 附加到表單，並提供文件名
  formData.append('document', fileBuffer, { filename: fileName });

  try {
    const res = await axios.post(`${TELEGRAM_API}/sendDocument`, formData, {
      headers: formData.getHeaders(),
    });

    if (res.data.ok) {
      const messages = loadMessages();
      messages.push({
        fileName, // 使用傳入的文件名
        message_id: res.data.result.message_id,
        date: Date.now(),
      });
      saveMessages(messages);
    }
    return res.data;
  } catch (error) {
    console.error('發送文件到 Telegram 失敗:', error.response ? error.response.data : error.message);
    throw error;
  }
}

async function deleteMessage(message_id) {
  // 注意：刪除邏輯保持不變
  try {
    const res = await axios.post(`${TELEGRAM_API}/deleteMessage`, {
      chat_id: process.env.CHANNEL_ID,
      message_id,
    });
    if (res.data.ok) {
      let messages = loadMessages();
      messages = messages.filter(m => m.message_id !== message_id);
      saveMessages(messages);
    }
    return res.data;
  } catch (error) {
    console.error('從 Telegram 刪除消息失敗:', error.response ? error.response.data : error.message);
    throw error;
  }
}

module.exports = {
  sendFile,
  deleteMessage,
  loadMessages,
};
