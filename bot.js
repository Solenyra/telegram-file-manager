require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.BOT_TOKEN}`;
const DATA_FILE = path.join(__dirname, 'data/messages.json');

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
    fs.writeFileSync(DATA_FILE, JSON.stringify(messages, null, 2));
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
    // *** 關鍵修正 ***
    // 移除了手動設置的 Content-Type，讓 axios 自動從 formData 生成正確的、包含 boundary 的 header。
    // form-data 庫會自動處理包含非 ASCII 字符的文件名，生成符合 RFC 規範的 header。
    const res = await axios.post(`${TELEGRAM_API}/sendDocument`, formData, {
      headers: formData.getHeaders(),
    });

    if (res.data.ok && res.data.result.document && res.data.result.document.file_id) {
      const messages = loadMessages();
      messages.push({
        fileName,
        mimetype,
        message_id: res.data.result.message_id,
        file_id: res.data.result.document.file_id,
        date: Date.now(),
      });
      saveMessages(messages);
      return { success: true, data: res.data };
    } else {
      console.error('Telegram API 返回的數據格式不正確或操作失敗:', res.data);
      return { success: false, error: res.data };
    }
  } catch (error) {
    const errorData = error.response ? error.response.data : error.message;
    console.error('發送文件到 Telegram 失敗:', errorData);
    return { success: false, error: errorData };
  }
}

async function getFileLink(file_id) {
  if (!file_id || typeof file_id !== 'string') {
      console.error("無效的 file_id 傳入 getFileLink:", file_id);
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
      return null;
    }
  } catch (error) {
    const errorData = error.response ? error.response.data : error.message;
    console.error("通過 getFile 獲取文件鏈接失敗:", errorData);
    return null;
  }
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
    const messages = loadMessages();
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
                results.failure.push({ id: messageId, reason: res.data.description });
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
