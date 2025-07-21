document.getElementById('uploadForm').onsubmit = async function (e) {
  e.preventDefault();

  const formData = new FormData(e.target);
  const fileInput = e.target.querySelector('input[type="file"]');
  
  if (!fileInput.files.length) {
    showNotification('請先選擇一個文件', 'error');
    return;
  }

  const submitButton = e.target.querySelector('button[type="submit"]');
  const progressArea = document.getElementById('progressArea');
  const progressBar = document.getElementById('progressBar');

  // 禁用按鈕並顯示進度條
  submitButton.disabled = true;
  submitButton.textContent = '上傳中...';
  progressArea.style.display = 'block';
  progressBar.style.width = '0%';
  progressBar.textContent = '0%';

  // Axios 配置，包含進度處理
  const config = {
    onUploadProgress: function(progressEvent) {
      const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
      progressBar.style.width = percentCompleted + '%';
      progressBar.textContent = percentCompleted + '%';
    }
  };

  try {
    const res = await axios.post('/upload', formData, config);
    if (res.data.success) {
      showNotification('上傳成功', 'success');
      loadFiles();
      e.target.reset(); // 清空表單
    } else {
      // 處理 Telegram API 返回的業務錯誤
      const errorMessage = res.data.error ? res.data.error.description : '上傳失敗';
      showNotification(`上傳失敗: ${errorMessage}`, 'error');
    }
  } catch (error) {
    // 處理網絡層或服務器內部錯誤
    const errorMessage = error.response ? (error.response.data.message || '服務器錯誤') : '網絡連接失敗';
    showNotification(`上傳失敗: ${errorMessage}`, 'error');
  } finally {
    // 恢復按鈕狀態並隱藏進度條
    submitButton.disabled = false;
    submitButton.textContent = '上傳';
    // 延遲一點時間再隱藏進度條，讓用戶能看到100%的狀態
    setTimeout(() => {
        progressArea.style.display = 'none';
    }, 2000);
  }
};

async function loadFiles() {
  try {
    const res = await axios.get('/files');
    const list = document.getElementById('fileList');
    list.innerHTML = ''; // 清空列表
    if (res.data.length === 0) {
      list.innerHTML = '<li>暫無文件</li>';
    }
    res.data.sort((a, b) => b.date - a.date); // 按時間倒序排序
    res.data.forEach(file => {
      const item = document.createElement('li');
      const fileDate = new Date(file.date).toLocaleString();
      item.innerHTML = `
        <span>${file.fileName}<br><small style="color: #6c757d;">${fileDate}</small></span>
        <button onclick="del(${file.message_id})">删除</button>
      `;
      list.appendChild(item);
    });
  } catch (error) {
    showNotification('加載文件列表失敗', 'error');
  }
}

async function del(msgId) {
  if (!confirm('確定要永久删除這個文件嗎？')) {
    return;
  }
  
  try {
    await axios.post('/delete', { message_id: msgId });
    showNotification('删除成功', 'success');
    loadFiles();
  } catch (error) {
    const errorMessage = error.response ? error.response.data.message : '删除失敗';
    showNotification(errorMessage, 'error');
  }
}

function showNotification(message, type = 'info') {
    const existingNotif = document.querySelector('.notification');
    if (existingNotif) {
        existingNotif.remove();
    }

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 4000);
}

// 頁面加載時，自動加載文件列表
loadFiles();
