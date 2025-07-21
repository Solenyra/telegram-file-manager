require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.BOT_TOKEN}`;
const DATA_FILE = path.join(__dirname, 'data/messages.json');

function loadMessages() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error("讀取 messages.json 失敗:", e);
  }
  return [];
}

function saveMessages(messages) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(messages, null, 2));
  } catch (e) {
    console.error("寫入 messages.json 失敗:", e);
  }
}

// 增加了 mimetype 參數
async function sendFile(fileBuffer, fileName, mimetype, caption = '') {
  const formData = new FormData();
  formData.append('chat_id', process.env.CHANNEL_ID);
  formData.append('caption', caption || fileName);
  formData.append('document', fileBuffer, { filename: fileName });

  try {
    const res = await axios.post(`${TELEGRAM_API}/sendDocument`, formData, {
      headers: formData.getHeaders(),
    });

    if (res.data.ok) {
      const messages = loadMessages();
      messages.push({
        fileName,
        mimetype, // 保存文件的 MIME type
        message_id: res.data.result.message_id,
        file_id: res.data.result.document.file_id, // 保存 file_id 以便後續獲取文件
        date: Date.now(),
      });
      saveMessages(messages);
      return { success: true, data: res.data };
    } else {
      console.error('Telegram API 返回錯誤:', res.data);
      return { success: false, error: res.data };
    }
  } catch (error) {
    const errorData = error.response ? error.response.data : error.message;
    console.error('發送文件到 Telegram 失敗:', errorData);
    return { success: false, error: errorData };
  }
}

// 新增：獲取文件臨時鏈接的函數
async function getFileLink(file_id) {
  try {
    const response = await axios.get(`${TELEGRAM_API}/getFile`, {
      params: { file_id }
    });
    if (response.data.ok) {
      const filePath = response.data.result.file_path;
      return `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${filePath}`;
    }
  } catch (error) {
    console.error("獲取文件鏈接失敗:", error);
  }
  return null;
}

async function deleteMessage(message_id) {
  try {
    const res = await axios.post(`${TELEGRAM_API}/deleteMessage`, {
      chat_id: process.env.CHANNEL_ID,
      message_id,
    });
    if (res.data.ok) {
      let messages = loadMessages();
      messages = messages.filter(m => m.message_id != message_id);
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
  getFileLink
};
