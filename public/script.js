document.getElementById('uploadForm').onsubmit = async function (e) {
  e.preventDefault();

  const formData = new FormData();
  const fileInput = e.target.querySelector('input[type="file"]');
  
  if (fileInput.files.length === 0) {
    showNotification('請先選擇至少一個文件', 'error');
    return;
  }
  
  // 將所有選擇的文件添加到 formData 中
  for (let i = 0; i < fileInput.files.length; i++) {
    formData.append('files', fileInput.files[i]);
  }
  
  // 添加可選的說明文字
  const caption = e.target.querySelector('input[type="text"]').value;
  if (caption) {
    formData.append('caption', caption);
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
      // 確保 progressEvent.total 有效
      if (progressEvent.total) {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        progressBar.style.width = percentCompleted + '%';
        progressBar.textContent = percentCompleted + '%';
      }
    }
  };

  try {
    const res = await axios.post('/upload', formData, config);
    
    // 檢查整體請求是否成功
    if (res.data.success) {
      const failedUploads = res.data.results.filter(r => !r.success);
      if (failedUploads.length > 0) {
        showNotification(`有 ${failedUploads.length} 個文件上傳失敗。`, 'error');
      } else {
        showNotification('所有文件上傳成功！', 'success');
      }
      e.target.reset(); // 清空表單
    } else {
      showNotification(res.data.message || '上傳請求失敗', 'error');
    }
  } catch (error) {
    // 處理網絡層或服務器內部錯誤
    const errorMessage = error.response ? (error.response.data.message || '服務器錯誤') : '網絡連接失敗';
    showNotification(`上傳失敗: ${errorMessage}`, 'error');
  } finally {
    // 恢復按鈕狀態並延遲隱藏進度條
    submitButton.disabled = false;
    submitButton.textContent = '上傳';
    setTimeout(() => {
        progressArea.style.display = 'none';
    }, 2000);
  }
};

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
        if (notification) {
          notification.remove();
        }
    }, 4000);
}
