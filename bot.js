require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.BOT_TOKEN}`;
const DATA_FILE = path.join(__dirname, 'data/messages.json');

function loadMessages() {
  return fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE)) : [];
}

function saveMessages(messages) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(messages, null, 2));
}

async function sendFile(filePath, caption = '') {
  const fileName = path.basename(filePath);
  const formData = new FormData();
  formData.append('chat_id', process.env.CHANNEL_ID);
  formData.append('caption', caption || fileName);
  formData.append('document', fs.createReadStream(filePath));

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
  }

  return res.data;
}

async function deleteMessage(message_id) {
  return axios.post(`${TELEGRAM_API}/deleteMessage`, {
    chat_id: process.env.CHANNEL_ID,
    message_id,
  });
}

module.exports = {
  sendFile,
  deleteMessage,
  loadMessages,
};