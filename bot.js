require('dotenv').config();
const axios = require('axios');
const FormData = require('form-data');

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.BOT_TOKEN}`;

// KV 版本的 loadMessages
async function loadMessages() {
  try {
    // 從綁定的 KV 命名空間 'DATA' 中讀取 'messages'
    // Cloudflare Pages/Workers 會自動將綁定的 KV 注入 process.env
    const messages = await process.env.DATA.get('messages', { type: 'json' });
    return messages || [];
  } catch (e) {
    console.error("從 KV 讀取 messages 失敗:", e);
    return [];
  }
}

// KV 版本的 saveMessages
async function saveMessages(messages) {
  try {
    // 將 messages 寫入到 KV 中
    await process.env.DATA.put('messages', JSON.stringify(messages, null, 2));
    return true;
  } catch (e) {
    console.error("寫入 messages 到 KV 失敗:", e);
    return false;
  }
}

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
        const messages = await loadMessages(); // 改為異步讀取

        let thumb_file_id = null;
        if (fileData.thumb) {
            thumb_file_id = fileData.thumb.file_id;
        }

        messages.push({
          fileName,
          mimetype: fileData.mime_type || mimetype,
          message_id: result.message_id,
          file_id: fileData.file_id,
          thumb_file_id: thumb_file_id,
          date: Date.now(),
        });

        if (await saveMessages(messages)) { // 改為異步儲存
            return { success: true, data: res.data };
        } else {
            return { success: false, error: { description: "文件已上傳，但無法保存到 KV 數據庫。" } };
        }
      }
    }
    return { success: false, error: res.data };
  } catch (error) {
    const errorDescription = error.response ? (error.response.data.description || JSON.stringify(error.response.data)) : error.message;
    return { success: false, error: { description: errorDescription }};
  }
}

async function deleteMessages(messageIds) {
    const results = { success: [], failure: [] };
    if (!Array.isArray(messageIds)) return results;

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
        let messages = await loadMessages(); // 改為異步讀取
        const remainingMessages = messages.filter(m => !results.success.includes(m.message_id));
        await saveMessages(remainingMessages); // 改為異步儲存
    }

    return results;
}

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
    const messages = await loadMessages(); // 改為異步讀取
    const fileIndex = messages.findIndex(m => m.message_id === messageId);
    if (fileIndex > -1) {
        messages[fileIndex].fileName = newFileName;
        if (await saveMessages(messages)) { // 改為異步儲存
            return { success: true, file: messages[fileIndex] };
        }
    }
    return { success: false, message: '文件未找到或保存失敗。' };
}

module.exports = { sendFile, loadMessages, getFileLink, renameFileInDb, deleteMessages };
