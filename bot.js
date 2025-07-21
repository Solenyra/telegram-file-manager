require('dotenv').config();
const axios = require('axios');
const fs = require('fs').promises; // 使用 promise 版本的 fs
const path = require('path');
const FormData = require('form-data');

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.BOT_TOKEN}`;
const DATA_FILE = path.join(__dirname, 'data/messages.json');

async function loadMessages() {
  try {
    await fs.access(DATA_FILE);
    const data = await fs.readFile(DATA_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    // 如果文件不存在或无法读取，返回空数组
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

async function saveMessages(messages) {
  await fs.writeFile(DATA_FILE, JSON.stringify(messages, null, 2));
}

async function sendFile(filePath, caption = '') {
  const fileName = path.basename(filePath);
  const formData = new FormData();
  formData.append('chat_id', process.env.CHANNEL_ID);
  formData.append('caption', caption || fileName);
  formData.append('document', await fs.createReadStream(filePath)); // 使用 fs promise 创建流

  try {
    const res = await axios.post(`${TELEGRAM_API}/sendDocument`, formData, {
      headers: formData.getHeaders(),
    });

    if (res.data.ok) {
      const messages = await loadMessages();
      messages.push({
        fileName,
        message_id: res.data.result.message_id,
        date: Date.now(),
      });
      await saveMessages(messages);
    }
    return res.data;
  } catch (error) {
    console.error('发送文件到 Telegram 失败:', error.response ? error.response.data : error.message);
    throw error;
  }
}

async function deleteMessage(message_id) {
  try {
    const res = await axios.post(`${TELEGRAM_API}/deleteMessage`, {
      chat_id: process.env.CHANNEL_ID,
      message_id,
    });

    if (res.data.ok) {
      let messages = await loadMessages();
      messages = messages.filter(m => m.message_id !== message_id);
      await saveMessages(messages);
    }
    return res.data;
  } catch (error) {
    console.error('从 Telegram 删除消息失败:', error.response ? error.response.data : error.message);
    throw error;
  }
}

module.exports = {
  sendFile,
  deleteMessage,
  loadMessages,
};
