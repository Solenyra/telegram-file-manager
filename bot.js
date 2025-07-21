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
      const fileContent = fs.readFileSync(DATA_FILE, 'utf-8');
      // *** 診斷日誌 5 ***
      console.log(`[診斷 5/5] 從 messages.json 讀取的原始文本 (片段): "${fileContent.substring(0, 200)}..."`);
      return JSON.parse(fileContent);
    }
  } catch (e) {
    console.error("讀取 messages.json 失敗:", e);
  }
  return [];
}

function saveMessages(messages) {
  try {
    const jsonString = JSON.stringify(messages, null, 2);
    // *** 診斷日誌 4 ***
    console.log(`[診斷 4/5] 準備寫入 JSON 的字符串 (片段): "${jsonString.substring(0, 200)}..."`);
    fs.writeFileSync(DATA_FILE, jsonString, 'utf-8');
  } catch (e) {
    console.error("寫入 messages.json 失敗:", e);
  }
}

// --- 導出的模塊函數 ---

async function sendFile(fileBuffer, fileName, mimetype, caption = '') {
  // *** 診斷日誌 2 ***
  console.log(`[診斷 2/5] 傳入 sendFile 函數的文件名: "${fileName}"`);
  
  const formData = new FormData();
  formData.append('chat_id', process.env.CHANNEL_ID);
  formData.append('caption', caption || fileName);
  formData.append('document', fileBuffer, { filename: fileName });

  try {
    const res = await axios.post(`${TELEGRAM_API}/sendDocument`, formData, {
      headers: formData.getHeaders(),
    });

    if (res.data.ok && res.data.result.document && res.data.result.document.file_id) {
      const messages = loadMessages();
      const newEntry = {
        fileName,
        mimetype,
        message_id: res.data.result.message_id,
        file_id: res.data.result.document.file_id,
        date: Date.now(),
      };
      // *** 診斷日誌 3 ***
      console.log(`[診斷 3/5] 準備保存到數據庫的新記錄中的 fileName: "${newEntry.fileName}"`);
      messages.push(newEntry);
      saveMessages(messages);
      return { success: true, data: res.data };
    } else {
      return { success: false, error: res.data };
    }
  } catch (error) {
    return { success: false, error: error.response ? error.response.data : error.message };
  }
}

// 其他函數保持不變
async function getFileLink(file_id) {
  if (!file_id || typeof file_id !== 'string') return null;
  const cleaned_file_id = file_id.trim();
  try {
    const response = await axios.get(`${TELEGRAM_API}/getFile`, { params: { file_id: cleaned_file_id } });
    if (response.data.ok) {
      return `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${response.data.result.file_path}`;
    }
  } catch (error) { console.error("獲取文件鏈接失敗:", error.response ? error.response.data : error.message); }
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
            const res = await axios.post(`${TELEGRAM_API}/deleteMessage`, { chat_id: process.env.CHANNEL_ID, message_id: messageId });
            if (res.data.ok) {
                results.success.push(messageId);
            } else {
                const reason = res.data.description;
                if (reason.includes("message to delete not found")) results.success.push(messageId);
                else results.failure.push({ id: messageId, reason });
            }
        } catch (error) {
            const reason = error.response ? error.response.data.description : error.message;
            if (reason.includes("message to delete not found")) results.success.push(messageId);
            else results.failure.push({ id: messageId, reason });
        }
    }
    saveMessages(remainingMessages);
    return results;
}

module.exports = { sendFile, loadMessages, getFileLink, renameFileInDb, deleteMessages };
