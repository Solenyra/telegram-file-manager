require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.BOT_TOKEN}`;
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'messages.json');

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

// *** 關鍵修正 1：讓保存函數返回操作結果 ***
function saveMessages(messages) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR);
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(messages, null, 2), 'utf-8');
    return true; // 保存成功
  } catch (e) {
    console.error("寫入 messages.json 失敗:", e);
    return false; // 保存失敗
  }
}

// --- 導出的模塊函數 ---

// *** 關鍵修正 2：檢查保存結果 ***
async function sendFile(fileBuffer, fileName, mimetype, caption = '') {
  try {
    const formData = new FormData();
    formData.append('chat_id', process.env.CHANNEL_ID);
    formData.append('caption', caption || fileName);
    formData.append('document', fileBuffer, { filename: fileName });
    
    const res = await axios.post(`${TELEGRAM_API}/sendDocument`, formData, { headers: formData.getHeaders() });

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
        
        // 檢查保存是否成功
        if (saveMessages(messages)) {
            return { success: true, data: res.data };
        } else {
            // 如果保存失敗，返回一個特定的錯誤
            return { success: false, error: { description: "文件已上傳，但無法保存到本地數據庫。請檢查服務器文件權限。" } };
        }
      }
    }
    return { success: false, error: res.data };
  } catch (error) {
    const errorDescription = error.response ? (error.response.data.description || JSON.stringify(error.response.data)) : error.message;
    return { success: false, error: { description: errorDescription }};
  }
}

// *** 關鍵修正 3：重構刪除邏輯 ***
async function deleteMessages(messageIds) {
    const results = { success: [], failure: [] };
    
    for (const messageId of messageIds) {
        try {
            const res = await axios.post(`${TELEGRAM_API}/deleteMessage`, {
                chat_id: process.env.CHANNEL_ID,
                message_id: messageId,
            });
            if (res.data.ok || (res.data.description && res.data.description.includes("message to delete not found"))) {
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

    if (results.success.length > 0) {
        let messages = loadMessages();
        const remainingMessages = messages.filter(m => !results.success.includes(m.message_id));
        saveMessages(remainingMessages);
    }
    
    return results;
}

// 其他函數保持不變
async function getFileLink(file_id) {
  if (!file_id || typeof file_id !== 'string') return null;
  const cleaned_file_id = file_id.trim();
  try {
    const response = await axios.get(`${TELEGRAM_API}/getFile`, { params: { file_id: cleaned_file_id } });
    if (response.data.ok) return `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${response.data.result.file_path}`;
  } catch (error) { console.error("獲取文件鏈接失敗:", error.response?.data?.description || error.message); }
  return null;
}

async function renameFileInDb(messageId, newFileName) {
    const messages = loadMessages();
    const fileIndex = messages.findIndex(m => m.message_id === messageId);
    if (fileIndex > -1) {
        messages[fileIndex].fileName = newFileName;
        if (saveMessages(messages)) {
            return { success: true, file: messages[fileIndex] };
        }
    }
    return { success: false, message: '文件未找到或保存失敗。' };
}

module.exports = { sendFile, loadMessages, getFileLink, renameFileInDb, deleteMessages };
