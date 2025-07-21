require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.BOT_TOKEN}`;
const DATA_DIR = path.join(__dirname, 'data'); // 定義 data 文件夾路徑
const DATA_FILE = path.join(DATA_DIR, 'messages.json'); // 定義 messages.json 的完整路徑

// --- 內部函數 ---
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
    // *** 關鍵修正：確保 data 文件夾存在 ***
    if (!fs.existsSync(DATA_DIR)) {
      console.log(" 'data' 文件夾不存在，正在自動創建...");
      fs.mkdirSync(DATA_DIR);
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(messages, null, 2), 'utf-8');
  } catch (e) {
    console.error("寫入 messages.json 失敗:", e);
  }
}

// --- 導出的模塊函數 ---

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
      const result = res.data.result;
      const fileData = result.document || result.video || result.audio || result.photo;

      if (fileData && fileData.file_id) {
        const messages = loadMessages();
        messages.push({
          fileName,
          mimetype: fileData.mime_type || mimetype,
          message_id: result.message_id,
          file_id: fileData.file_id,
          date: Date.now(),
        });
        saveMessages(messages);
        return { success: true, data: res.data };
      }
    }
    
    console.error('Telegram API 返回的數據格式不正確或操作失敗:', res.data);
    return { success: false, error: res.data };

  } catch (error) {
    const errorData = error.response ? error.response.data : error.message;
    console.error('發送文件到 Telegram 失敗:', errorData);
    return { success: false, error: errorData };
  }
}

async function getFileLink(file_id) {
  if (!file_id || typeof file_id !== 'string') {
      return null;
  }
  const cleaned_file_id = file_id.trim();
  try {
    const response = await axios.get(`${TELEGRAM_API}/getFile`, {
      params: { file_id: cleaned_file_id }
    });
    if (response.data.ok) {
      const filePath = response.data.result.file_path;
      return `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${filePath}`;
    } else {
        console.error("Telegram getFile API 返回錯誤:", response.data);
    }
  } catch (error) {
    console.error("通過 getFile 獲取文件鏈接失敗:", error.response ? error.response.data : error.message);
  }
  return null;
}

async function renameFileInDb(messageId, newFileName) {
    const messages = loadMessages();
    const fileIndex = messages.findIndex(m => m.message_id === messageId);
    if (fileIndex > -1) {
        messages[fileIndex].fileName = newFileName;
        saveMessages(messages);
        return { success: true, file: messages[fileIndex] };
    }
    return { success: false, message: '文件未找到。' };
}

async function deleteMessages(messageIds) {
    const results = { success: [], failure: [] };
    let messages = loadMessages();
    const remainingMessages = messages.filter(m => !messageIds.includes(m.message_id));

    for (const messageId of messageIds) {
        try {
            const res = await axios.post(`${TELEGRAM_API}/deleteMessage`, {
                chat_id: process.env.CHANNEL_ID,
                message_id: messageId,
            });
            if (res.data.ok) {
                results.success.push(messageId);
            } else {
                const reason = res.data.description;
                if (reason.includes("message to delete not found")) {
                    results.success.push(messageId);
                } else {
                    results.failure.push({ id: messageId, reason });
                }
            }
        } catch (error) {
            const reason = error.response ? error.response.data.description : error.message;
            if (reason.includes("message to delete not found")) {
                results.success.push(messageId);
            } else {
                results.failure.push({ id: messageId, reason });
            }
        }
    }
    
    saveMessages(remainingMessages);
    return results;
}

module.exports = { sendFile, loadMessages, getFileLink, renameFileInDb, deleteMessages };
