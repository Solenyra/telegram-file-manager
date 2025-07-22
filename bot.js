require('dotenv').config();
const axios = require('axios');
const FormData = require('form-data');

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.BOT_TOKEN}`;

async function loadMessages() {
  try {
    const messages = await process.env.DATA.get('messages', { type: 'json' });
    return messages || [];
  } catch (e) {
    console.error("Failed to read messages from KV:", e);
    return [];
  }
}

async function saveMessages(messages) {
  try {
    await process.env.DATA.put('messages', JSON.stringify(messages, null, 2));
    return true;
  } catch (e) {
    console.error("Failed to write messages to KV:", e);
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
        const messages = await loadMessages();
        let thumb_file_id = fileData.thumb ? fileData.thumb.file_id : null;

        messages.push({
          fileName,
          mimetype: fileData.mime_type || mimetype,
          message_id: result.message_id,
          file_id: fileData.file_id,
          thumb_file_id: thumb_file_id,
          date: Date.now(),
        });

        if (await saveMessages(messages)) {
            return { success: true, data: res.data };
        } else {
            return { success: false, error: { description: "File uploaded but failed to save to KV database." } };
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
        let messages = await loadMessages();
        const remainingMessages = messages.filter(m => !results.success.includes(m.message_id));
        await saveMessages(remainingMessages);
    }
    return results;
}

async function getFileLink(file_id) {
  if (!file_id || typeof file_id !== 'string') return null;
  const cleaned_file_id = file_id.trim();
  try {
    const response = await axios.get(`${TELEGRAM_API}/getFile`, { params: { file_id: cleaned_file_id } });
    if (response.data.ok) return `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${response.data.result.file_path}`;
  } catch (error) { console.error("Failed to get file link:", error.response?.data?.description || error.message); }
  return null;
}

async function renameFileInDb(messageId, newFileName) {
    const messages = await loadMessages();
    const fileIndex = messages.findIndex(m => m.message_id === messageId);
    if (fileIndex > -1) {
        messages[fileIndex].fileName = newFileName;
        if (await saveMessages(messages)) {
            return { success: true, file: messages[fileIndex] };
        }
    }
    return { success: false, message: 'File not found or failed to save.' };
}

module.exports = {
  sendFile,
  loadMessages,
  getFileLink,
  renameFileInDb,
  deleteMessages,
};
