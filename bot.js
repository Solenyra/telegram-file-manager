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
      return JSON.parse(fs.readFileSync(DATA_FILE));
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

async function sendFile(fileBuffer, fileName, caption = '') {
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
        message_id: res.data.result.message_id,
        date: Date.now(),
      });
      saveMessages(messages);
      return { success: true, data: res.data };
    } else {
      // 如果 Telegram 返回 ok: false，也作為一個錯誤來處理
      console.error('Telegram API 返回錯誤:', res.data);
      // 返回一個包含錯誤信息的對象，而不是拋出異常
      return { success: false, error: res.data };
    }
  } catch (error) {
    // 捕獲網絡層面的錯誤 (比如 404)
    const errorData = error.response ? error.response.data : error.message;
    console.error('發送文件到 Telegram 失敗:', errorData);
    // 返回一個包含錯誤信息的對象，而不是拋出異常
    return { success: false, error: errorData };
  }
}

async function deleteMessage(message_id) {
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
    throw error; // 刪除操作如果失敗，可以考慮繼續拋出異常
  }
}

module.exports = {
  sendFile,
  deleteMessage,
  loadMessages,
};
